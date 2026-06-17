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

    // Resolve the deepest existing ancestor of the target path.
    $resolved = realpath($cacheFile);
    if ($resolved === false) {
        // File doesn't exist yet — resolve from the parent directory.
        $parentDir = realpath(dirname($cacheFile));
        if ($parentDir === false) {
            // Parent doesn't exist either; it will be created by proxyWriteCache.
            // Normalize logically to strip ".." segments.
            $relative = str_replace('\\', '/', substr(dirname($cacheFile), strlen(getProxyCacheDir())));
            // Reject if any remaining ".." segments exist after stripping the root.
            if (strpos($relative, '..') !== false) {
                proxyJsonError('Forbidden', 403);
            }
            return $cacheFile;
        }
        if (strpos($parentDir, $cacheRoot) !== 0) {
            proxyJsonError('Forbidden', 403);
        }
        return $parentDir . DIRECTORY_SEPARATOR . basename($cacheFile);
    }

    if (strpos($resolved, $cacheRoot) !== 0) {
        proxyJsonError('Forbidden', 403);
    }
    return $resolved;
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
    $dir = dirname($cacheFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    file_put_contents($cacheFile . '.tmp', $data, LOCK_EX);
    rename($cacheFile . '.tmp', $cacheFile);
}
