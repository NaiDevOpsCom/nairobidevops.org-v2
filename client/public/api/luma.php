<?php
// client/public/api/luma.php

// 1. Robust CORS handling
$allowed_origins = [
    "https://nairobidevops.org",
    "https://www.nairobidevops.org",
];

// Determine the origin from both $_SERVER and headers for broad compatibility
$headers = [];
if (function_exists('getallheaders')) {
    $headers = getallheaders();
} elseif (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
}
$headersLower = array_change_key_case($headers ?: [], CASE_LOWER);

$origin = $_SERVER["HTTP_ORIGIN"] ?? ($headersLower['origin'] ?? "");
$isSameOrigin = ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'same-origin';
$isTrustedOrigin = in_array($origin, $allowed_origins, true) || $isSameOrigin;

if ($isTrustedOrigin) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Vary: Origin");
}

$allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

// Handle preflight requests
if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "OPTIONS") {
    if ($isTrustedOrigin) {
        header("Access-Control-Allow-Methods: " . implode(", ", $allowedMethods));
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Proxy-Token");
        header("Access-Control-Max-Age: 86400"); // 24 hours
    }
    http_response_code(204);
    exit;
}

// 2. Credentials (from .env.php generated at deploy time)
$envFile = __DIR__ . '/.env.php';
if (file_exists($envFile)) {
    require_once $envFile;
}

// 3. Authentication
$authHeaderToken = $headersLower['x-proxy-token'] ?? ($headersLower['authorization'] ?? '');
$expectedToken = defined('PROXY_API_TOKEN') ? PROXY_API_TOKEN : getenv('PROXY_API_TOKEN');

// Validate existence of backend secret
if (empty($expectedToken)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Server authentication configuration missing']);
    exit;
}

// Keep proxy auth on the server:
// Allow requests without a token IF they are AJAX calls from our trusted origin.
$isAjax = strtolower($headersLower['x-requested-with'] ?? '') === 'xmlhttprequest';
$isAuthenticated = !empty($authHeaderToken) && hash_equals($expectedToken, $authHeaderToken);

if (!$isAuthenticated && !($isTrustedOrigin && $isAjax)) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// 4. Prepare the destination URL
$base_url = 'https://api.luma.com';

// Get the path after /api/luma
$path = isset($_GET['path']) ? (string)$_GET['path'] : '';

// Normalize + validate path to avoid absolute URLs / traversal
$path = '/' . ltrim($path, '/');

if (
    $path === '/' ||
    str_contains($path, '://') ||
    str_starts_with($path, '//') ||
    str_contains($path, '..') ||
    !preg_match('#^/[a-zA-Z0-9/_\.\-\?=&]*$#', $path)
) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

// Build query string from remaining parameters
$queryParams = $_GET;
unset($queryParams['path']);
$queryString = http_build_query($queryParams);

$target_url = $base_url . '/' . ltrim($path, '/');
if ($queryString) {
    $target_url .= (strpos($target_url, '?') === false ? '?' : '&') . $queryString;
}

// 3. Forward the request
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, $allowedMethods, true)) {
    http_response_code(405);
    header('Allow: ' . implode(', ', $allowedMethods));
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(['error' => 'Method not allowed'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    exit;
}
$ch = curl_init($target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
if ($method === 'HEAD') {
    curl_setopt($ch, CURLOPT_NOBODY, true);
}
curl_setopt($ch, CURLOPT_BUFFERSIZE, 128 * 1024); // 128KB buffer
curl_setopt($ch, CURLOPT_MAXFILESIZE, 10 * 1024 * 1024); // 10MB max file size

// Forward request body for methods that may have one
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Helper to sanitize header values (strip CRLF and other vertical whitespace)
function sanitizeHeader($value) {
    return preg_replace('/\v+/', '', $value);
}

// Forward selected headers (Authorization, Content-Type)
$forwardHeaders = [];
$forwardAuthHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
if ($forwardAuthHeader) {
    $forwardHeaders[] = 'Authorization: ' . sanitizeHeader($forwardAuthHeader);
}
if (isset($_SERVER['CONTENT_TYPE'])) {
    $forwardHeaders[] = 'Content-Type: ' . sanitizeHeader($_SERVER['CONTENT_TYPE']);
}
if (!empty($forwardHeaders)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$upstreamContentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

if (curl_errno($ch)) {
    http_response_code(500);
    error_log('Luma Proxy Error: ' . curl_error($ch));
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(['error' => 'Upstream request failed'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    curl_close($ch);
    exit;
}

curl_close($ch);

// 4. Output the response
http_response_code($http_code);
if (!empty($upstreamContentType)) {
    header('Content-Type: ' . $upstreamContentType);
} else {
    header('Content-Type: application/json');
}

if ($method !== 'HEAD') {
    echo $response;
}
