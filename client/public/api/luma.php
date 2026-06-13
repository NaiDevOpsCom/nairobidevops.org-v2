<?php
/**
 * Luma Calendar API Proxy (Hardened)
 */

require_once __DIR__ . '/api-middleware.php';

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
const CONTENT_TYPE_HEADER = 'Content-Type: ';

$ctx = proxyRunMiddleware(['GET', 'POST', 'OPTIONS', 'HEAD']);

$base_url = 'https://api.luma.com';
$path = isset($_GET['path']) ? (string)$_GET['path'] : '';
$path = '/' . ltrim($path, '/');

if ($path === '/' || !preg_match('#^/[a-zA-Z0-9/_\.\-\?=&]*$#', $path) || strpos($path, '..') !== false) {
    proxyJsonError('Invalid path', 400);
}

$queryParams = $_GET;
unset($queryParams['path']);
$queryString = http_build_query($queryParams);
$target_url = $base_url . $path;
if ($queryString !== '') {
    $target_url .= (strpos($path, '?') === false ? '?' : '&') . $queryString;
}

$authContext = $ctx['headersLower']['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
$hasAuthorization = trim($authContext) !== '';
$cacheKey = md5($target_url . '|' . $authContext);
$cacheFile = $ctx['cacheRootDir'] . '/api_responses/luma_' . $cacheKey . '.json';
$cacheTTL = 300;

if ($ctx['method'] === 'GET' && !$hasAuthorization) {
    $cacheMetaFile = $cacheFile . '.meta';
    $cachedContentType = file_exists($cacheMetaFile) ? file_get_contents($cacheMetaFile) : JSON_CONTENT_TYPE;
    if (proxyServeCache($cacheFile, $cacheTTL, $cachedContentType)) {
        exit;
    }
}

$ch = curl_init($target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $ctx['method']);

if ($ctx['method'] === 'HEAD') {
    curl_setopt($ch, CURLOPT_NOBODY, true);
}
if (in_array($ctx['method'], ['POST', 'PUT', 'PATCH'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$forwardHeaders = [];
$forwardAuthHeader = !empty($authContext) ? $authContext : null;
if ($forwardAuthHeader) {
    $forwardHeaders[] = 'Authorization: ' . preg_replace('/\v+/', '', $forwardAuthHeader);
}
if (isset($_SERVER['CONTENT_TYPE'])) {
    $forwardHeaders[] = CONTENT_TYPE_HEADER . preg_replace('/\v+/', '', $_SERVER['CONTENT_TYPE']);
}
if (!empty($forwardHeaders)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

if (curl_errno($ch)) {
    error_log('Luma Proxy Error: ' . curl_error($ch));
    curl_close($ch);
    proxyJsonError('Upstream failed', 500);
}
curl_close($ch);

http_response_code($http_code);
header(CONTENT_TYPE_HEADER . ($contentType ?: JSON_CONTENT_TYPE));
header('X-Cache: ' . ($hasAuthorization ? 'BYPASS' : 'MISS'));

if ($ctx['method'] === 'GET' && !$hasAuthorization && $http_code === 200) {
    proxyWriteCache($cacheFile, $response);
    if ($contentType) {
        file_put_contents($cacheFile . '.meta', $contentType);
    }
}

if ($ctx['method'] !== 'HEAD') {
    echo $response;
}
