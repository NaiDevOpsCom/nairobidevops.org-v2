<?php
/**
 * Luma Calendar API Proxy (Hardened)
 * 
 * Securely proxies requests to api.luma.com while enforcing 
 * authentication, origin validation, rate limiting, and caching.
 */

require_once __DIR__ . '/config-loader.php';
require_once __DIR__ . '/security-utils.php';

header('X-Content-Type-Options: nosniff');

// 1. Strict Origin & Referer Validation
$allowedOrigins = [
    'https://nairobidevops.org',
    'https://www.nairobidevops.org'
];

$validOrigin = SecurityUtils::validateOrigin($allowedOrigins);
if (!empty($validOrigin)) {
    header("Access-Control-Allow-Origin: $validOrigin");
    header("Vary: Origin");
}

// 2. Preflight Handling
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$allowedMethods = ["GET", "POST", "OPTIONS", "HEAD"];

if ($method === 'OPTIONS') {
    if (!empty($validOrigin)) {
        header("Access-Control-Allow-Methods: " . implode(", ", $allowedMethods));
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Proxy-Token");
        header("Access-Control-Max-Age: 86400");
    }
    http_response_code(204);
    exit;
}

// 3. Rate Limiting (IP-based, outside public_html)
$cacheRootDir = dirname(__DIR__, 3) . '/cache'; // /home/user/cache
if (!SecurityUtils::checkRateLimit($cacheRootDir . '/rate_limits', 30, 60)) {
    http_response_code(429);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Too Many Requests'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    exit;
}

// 4. Authentication (Supports Rotation)
$headers = function_exists('getallheaders') ? getallheaders() : (function_exists('apache_request_headers') ? apache_request_headers() : []);
$headersLower = array_change_key_case($headers, CASE_LOWER);

$authHeaderToken = $headersLower['x-proxy-token'] ?? '';
if (preg_match('/Bearer\s+(.*)$/i', $authHeaderToken, $matches)) {
    $authHeaderToken = trim($matches[1]);
}

$expectedToken = defined('PROXY_API_TOKEN') ? PROXY_API_TOKEN : getenv('PROXY_API_TOKEN');
$isAjax = strtolower($headersLower['x-requested-with'] ?? '') === 'xmlhttprequest';
$isAuthenticated = SecurityUtils::validateToken($authHeaderToken, $expectedToken);

// Fix the 401: If not authenticated by token, allow ONLY if Trusted Origin + AJAX
if (!$isAuthenticated && !( !empty($validOrigin) && $isAjax)) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Unauthorized'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    exit;
}

// 5. Hardened Method Allowlist
if (!in_array($method, $allowedMethods, true)) {
    http_response_code(405);
    header('Allow: ' . implode(', ', $allowedMethods));
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Method Not Allowed'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    exit;
}

// 6. Build Target URL
$base_url = 'https://api.luma.com';
$path = isset($_GET['path']) ? (string)$_GET['path'] : '';
$path = '/' . ltrim($path, '/');

// Validate path
if ($path === '/' || !preg_match('#^/[a-zA-Z0-9/_\.\-\?=&]*$#', $path) || strpos($path, '..') !== false) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Invalid path'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    exit;
}

$queryParams = $_GET;
unset($queryParams['path']);
$queryString = http_build_query($queryParams);
$target_url = $base_url . $path . ($queryString ? '?' . $queryString : '');

// 7. Caching (GET requests only)
$authContext = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
$cacheKey = md5($target_url . '|' . $authContext);
$cacheFile = $cacheRootDir . '/api_responses/luma_' . $cacheKey . '.json';
$cacheTTL = 300; // 5 minutes

if ($method === 'GET' && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
    $cachedData = file_get_contents($cacheFile);
    $cacheMetaFile = $cacheFile . '.meta';
    $cachedContentType = file_exists($cacheMetaFile) ? file_get_contents($cacheMetaFile) : 'application/json; charset=utf-8';
    
    if ($cachedData) {
        header('Content-Type: ' . $cachedContentType);
        header('X-Cache: HIT');
        echo $cachedData;
        exit;
    }
}

// 7. Proxy the Request
$ch = curl_init($target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

if ($method === 'HEAD') curl_setopt($ch, CURLOPT_NOBODY, true);
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

// Forward Authorization
$forwardHeaders = [];
$forwardAuthHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
if ($forwardAuthHeader) $forwardHeaders[] = 'Authorization: ' . preg_replace('/\v+/', '', $forwardAuthHeader);
if (isset($_SERVER['CONTENT_TYPE'])) $forwardHeaders[] = 'Content-Type: ' . preg_replace('/\v+/', '', $_SERVER['CONTENT_TYPE']);
if (!empty($forwardHeaders)) curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

if (curl_errno($ch)) {
    http_response_code(500);
    error_log('Luma Proxy Error: ' . curl_error($ch));
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Upstream failed'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    curl_close($ch);
    exit;
}
curl_close($ch);

// 8. Cache result and output
http_response_code($http_code);
header('Content-Type: ' . ($contentType ?: 'application/json; charset=utf-8'));
header('X-Cache: MISS');

if ($method === 'GET' && $http_code === 200) {
    if (!is_dir(dirname($cacheFile))) mkdir(dirname($cacheFile), 0700, true);
    // Atomic write
    file_put_contents($cacheFile . '.tmp', $response, LOCK_EX);
    rename($cacheFile . '.tmp', $cacheFile);
    
    // Cache Content-Type metadata
    if ($contentType) {
        file_put_contents($cacheFile . '.meta', $contentType);
    }
}

if ($method !== 'HEAD') echo $response;
