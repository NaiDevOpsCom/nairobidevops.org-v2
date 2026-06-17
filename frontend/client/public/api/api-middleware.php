<?php
/**
 * Shared API Proxy Middleware
 *
 * Consolidates common middleware (CORS, preflight, rate limiting,
 * authentication, method allowlist) to eliminate duplication
 * across API proxy endpoints.
 */

require_once __DIR__ . '/config-loader.php';
require_once __DIR__ . '/security-utils.php';

const PROXY_ALLOWED_ORIGINS = [
    'https://nairobidevops.org',
    'https://www.nairobidevops.org',
];

const PROXY_JSON_FLAGS = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;

function proxyJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, PROXY_JSON_FLAGS);
    exit;
}

function proxyJsonError($message, $statusCode) {
    proxyJsonResponse(['error' => $message], $statusCode);
}

function proxyGetHeaders() {
    if (function_exists('getallheaders')) {
        return getallheaders();
    }
    if (function_exists('apache_request_headers')) {
        return apache_request_headers();
    }
    return [];
}

function proxyRunMiddleware($allowedMethods = ['GET', 'POST', 'OPTIONS']) {
    header('X-Content-Type-Options: nosniff');

    $validOrigin = SecurityUtils::validateOrigin(PROXY_ALLOWED_ORIGINS);
    if (!empty($validOrigin)) {
        header('Access-Control-Allow-Origin: ' . $validOrigin);
        header('Vary: Origin');
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'OPTIONS') {
        if (!empty($validOrigin)) {
            header('Access-Control-Allow-Methods: ' . implode(', ', $allowedMethods));
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Proxy-Token');
            header('Access-Control-Max-Age: 86400');
        }
        http_response_code(204);
        exit;
    }

    $cacheRootDir = getProxyCacheDir();
    if (!SecurityUtils::checkRateLimit($cacheRootDir . '/rate_limits', 30, 60)) {
        proxyJsonError('Too Many Requests', 429);
    }

    $headersLower = array_change_key_case(proxyGetHeaders(), CASE_LOWER);

    $authHeaderToken = $headersLower['x-proxy-token'] ?? '';
    if (preg_match('/Bearer\s+(.*)$/i', $authHeaderToken, $matches)) {
        $authHeaderToken = trim($matches[1]);
    }

    $expectedToken = defined('PROXY_API_TOKEN') ? PROXY_API_TOKEN : getenv('PROXY_API_TOKEN');
    $isAjax = strtolower($headersLower['x-requested-with'] ?? '') === 'xmlhttprequest';
    $isAuthenticated = SecurityUtils::validateToken($authHeaderToken, $expectedToken);

    if (!$isAuthenticated && !(!empty($validOrigin) && $isAjax)) {
        proxyJsonError('Unauthorized', 401);
    }

    if (!in_array($method, $allowedMethods, true)) {
        header('Allow: ' . implode(', ', $allowedMethods));
        proxyJsonError('Method Not Allowed', 405);
    }

    return [
        'method' => $method,
        'validOrigin' => $validOrigin,
        'cacheRootDir' => $cacheRootDir,
        'headersLower' => $headersLower,
    ];
}

/**
 * Check if a path resides within a trusted root directory.
 * Normalizes all path separators to '/' and resolves relative directory segments ('.' and '..').
 * Enforces directory boundaries to prevent sibling directory bypasses.
 *
 * @param string $path Target path to validate.
 * @param string $root Trusted root directory.
 * @return bool True if the path is within the root directory, false otherwise.
 */
function proxyIsPathWithinRoot($path, $root) {
    if ($path === '' || $root === '') {
        return false;
    }

    // Normalize separators to forward slashes
    $normalizedPath = str_replace('\\', '/', $path);
    $normalizedRoot = str_replace('\\', '/', $root);

    // Strip trailing slashes from root
    $normalizedRoot = rtrim($normalizedRoot, '/');

    // Logical canonicalization of relative path segments ('.' and '..')
    $segments = explode('/', $normalizedPath);
    $canonicalSegments = [];
    foreach ($segments as $segment) {
        if ($segment === '' || $segment === '.') {
            continue;
        }
        if ($segment === '..') {
            array_pop($canonicalSegments);
        } else {
            $canonicalSegments[] = $segment;
        }
    }

    $prefix = (strpos($normalizedPath, '/') === 0) ? '/' : '';
    $canonicalPath = $prefix . implode('/', $canonicalSegments);

    if ($canonicalPath === $normalizedRoot) {
        return true;
    }

    return strpos($canonicalPath, $normalizedRoot . '/') === 0;
}

/**
 * Validate that a cache file path resolves to within the trusted cache root.
 * Prevents path-traversal attacks (CWE-73) when the path is derived from
 * user-controlled input (query parameters, cursors, etc.).
 *
 * @return string The validated, canonicalized path.
 */
function proxySafeCachePath($cacheFile) {
    $cacheRoot = realpath(getProxyCacheDir());

    // If the cache root doesn't exist yet, create it so realpath works.
    if ($cacheRoot === false) {
        mkdir(getProxyCacheDir(), 0700, true);
        $cacheRoot = realpath(getProxyCacheDir());
    }

    // Fail closed if cache root cannot be resolved.
    if ($cacheRoot === false || $cacheRoot === '') {
        proxyJsonError('Forbidden', 403);
    }

    // Extract the safe basename using basename() which is a standard path traversal sanitizer.
    $safeFilename = basename($cacheFile);

    // Validate the filename format strictly (allow only alphanumeric, dashes, underscores, and dots).
    if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $safeFilename)) {
        proxyJsonError('Forbidden', 403);
    }

    // Reconstruct the safe cache path using the trusted responses directory.
    $responsesDir = $cacheRoot . DIRECTORY_SEPARATOR . 'api_responses';
    if (!is_dir($responsesDir)) {
        mkdir($responsesDir, 0700, true);
    }

    $safePath = $responsesDir . DIRECTORY_SEPARATOR . $safeFilename;

    // Enforce strict containment check.
    if (!proxyIsPathWithinRoot($safePath, $responsesDir)) {
        proxyJsonError('Forbidden', 403);
    }

    return $safePath;
}


function proxyServeCache($cacheFile, $cacheTTL, $contentType = 'application/json; charset=utf-8') {
    $cacheFile = proxySafeCachePath($cacheFile);
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
        $data = file_get_contents($cacheFile);
        if ($data) {
            header('Content-Type: ' . $contentType);
            header('X-Cache: HIT');
            echo $data;
            exit;
        }
    }
}

function proxyWriteCache($cacheFile, $data) {
    $cacheFile = proxySafeCachePath($cacheFile);
    file_put_contents($cacheFile . '.tmp', $data, LOCK_EX);
    rename($cacheFile . '.tmp', $cacheFile);
}

