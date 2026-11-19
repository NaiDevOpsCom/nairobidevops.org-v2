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
 */
function proxyIsPathWithinRoot($path, $root) {
    $isValid = false;
    if ($path !== '' && $root !== '') {
        $realPath = realpath($path);
        $realRoot = realpath($root);
        if ($realPath === false) {
            $parent = dirname($path);
            $realPath = realpath($parent);
        }
        if ($realPath !== false && $realRoot !== false) {
            $normalizedPath = str_replace('\\', '/', $realPath);
            $normalizedRoot = str_replace('\\', '/', $realRoot);
            $isValid = ($normalizedPath === $normalizedRoot || strpos($normalizedPath . '/', rtrim($normalizedRoot, '/') . '/') === 0);
        }
    }
    return $isValid;
}

function ensureDirectoryExists($dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    return realpath($dir);
}

function getSafePathSegments($cacheFile, $responsesDir) {
    $normalizedResponsesDir = rtrim(str_replace('\\', '/', $responsesDir), '/');
    $normalizedFile = str_replace('\\', '/', $cacheFile);
    if (strpos($normalizedFile, $normalizedResponsesDir . '/') === 0) {
        $relativePath = substr($normalizedFile, strlen($normalizedResponsesDir) + 1);
    } elseif ($normalizedFile === $normalizedResponsesDir) {
        $relativePath = '';
    } else {
        $relativePath = $cacheFile;
    }
    $segments = explode('/', str_replace('\\', '/', $relativePath));
    $canonicalSegments = [];
    foreach ($segments as $segment) {
        if ($segment === '' || $segment === '.') {
            continue;
        }
        if ($segment === '..') {
            array_pop($canonicalSegments);
        } else {
            if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $segment)) {
                proxyJsonError('Forbidden', 403);
            }
            $canonicalSegments[] = $segment;
        }
    }
    if (empty($canonicalSegments)) {
        proxyJsonError('Forbidden', 403);
    }
    return $canonicalSegments;
}

function proxySafeCachePath($cacheFile) {
    $cacheRoot = ensureDirectoryExists(getProxyCacheDir());
    if ($cacheRoot === false || $cacheRoot === '') {
        proxyJsonError('Forbidden', 403);
    }
    $responsesDir = ensureDirectoryExists($cacheRoot . DIRECTORY_SEPARATOR . 'api_responses');
    if ($responsesDir === false) {
        proxyJsonError('Forbidden', 403);
    }
    $canonicalSegments = getSafePathSegments($cacheFile, $responsesDir);
    $safePath = $responsesDir . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $canonicalSegments);
    $parentDir = dirname($safePath);
    if (ensureDirectoryExists($parentDir) === false) {
        proxyJsonError('Forbidden', 403);
    }
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
