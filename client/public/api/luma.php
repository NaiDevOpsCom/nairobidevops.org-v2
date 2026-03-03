<?php
/**
 * Luma Calendar API Proxy (Hardened)
 * 
 * Securely proxies requests to api.luma.com while enforcing 
 * authentication, origin validation, rate limiting, and caching.
 */

require_once __DIR__ . '/config-loader.php';
require_once __DIR__ . '/security-utils.php';

// 1. Strict Origin & Referer Validation
$allowedOrigins = [
    'https://nairobidevops.org',
    'https://www.nairobidevops.org'
];

$validOrigin = SecurityUtils::validateOrigin($allowedOrigins);
if ($validOrigin !== null) {
    header("Access-Control-Allow-Origin: $validOrigin");
    header("Vary: Origin");
}

// 2. Preflight Handling
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$allowedMethods = ["GET", "POST", "OPTIONS", "HEAD"];

if ($method === 'OPTIONS') {
    if ($validOrigin !== null) {
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
    echo json_encode(['error' => 'Too Many Requests']);
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
if (!$isAuthenticated && !($validOrigin && $isAjax)) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// 5. Build Target URL
$base_url = 'https://api.luma.com';
$path = isset($_GET['path']) ? (string)$_GET['path'] : '';
$path = '/' . ltrim($path, '/');

// Validate path
if ($path === '/' || !preg_match('#^/[a-zA-Z0-9/_\.\-\?=&]*$#', $path) || str_contains($path, '..')) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$queryParams = $_GET;
unset($queryParams['path']);
$queryString = http_build_query($queryParams);
$target_url = $base_url . $path . ($queryString ? '?' . $queryString : '');

// 6. Caching (GET requests only)
$cacheFile = $cacheRootDir . '/api_responses/luma_' . md5($target_url) . '.json';
$cacheTTL = 300; // 5 minutes

if ($method === 'GET' && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
    $cachedData = file_get_contents($cacheFile);
    if ($cachedData) {
        header('Content-Type: application/json; charset=utf-8');
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
    echo json_encode(['error' => 'Upstream failed']);
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
}

if ($method !== 'HEAD') echo $response;
