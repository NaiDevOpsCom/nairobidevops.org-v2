<?php
/**
 * Cloudinary API Proxy (Hardened)
 */

require_once __DIR__ . '/api-middleware.php';

$ctx = proxyRunMiddleware(['GET', 'OPTIONS']);

$allowedFolders = ['ndcCampusTour', 'ndcPartners'];
$folder = isset($_GET['folder']) ? trim($_GET['folder']) : '';
$nextCursor = isset($_GET['next_cursor']) ? trim($_GET['next_cursor']) : '';

if (!in_array($folder, $allowedFolders, true)) {
    proxyJsonError('Invalid folder', 400);
}

if ($nextCursor && !preg_match('/^[a-zA-Z0-9_\-\/=+]+$/', $nextCursor)) {
    proxyJsonError('Invalid cursor', 400);
}

$cursorHash = $nextCursor ? '_' . md5($nextCursor) : '_page1';
$cacheFile = $ctx['cacheRootDir'] . '/api_responses/cld_' . $folder . $cursorHash . '.json';
$cacheTTL = 300;

if ($ctx['method'] === 'GET' && proxyServeCache($cacheFile, $cacheTTL)) {
    exit;
}

$cloudName = defined('CLD_CLOUD_NAME') ? CLD_CLOUD_NAME : getenv('CLD_CLOUD_NAME');
$apiKey    = defined('CLD_API_KEY') ? CLD_API_KEY : getenv('CLD_API_KEY');
$apiSecret = defined('CLD_API_SECRET') ? CLD_API_SECRET : getenv('CLD_API_SECRET');

if (!$cloudName || !$apiKey || !$apiSecret) {
    proxyJsonError('Server configuration error', 500);
}

$auth = base64_encode($apiKey . ':' . $apiSecret);
$queryParams = [
    'max_results' => 12,
    'prefix'      => $folder . '/',
    'type'        => 'upload',
];
if ($nextCursor) {
    $queryParams['next_cursor'] = $nextCursor;
}

$apiUrl = "https://api.cloudinary.com/v1_1/{$cloudName}/resources/image?" . http_build_query($queryParams);

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Basic $auth"]);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $http_code !== 200) {
    proxyJsonError('Upstream error', 502);
}

$data = json_decode($response, true);
if (!$data || !isset($data['resources'])) {
    proxyJsonError('Invalid upstream response', 502);
}

$shapedResources = [];
foreach ($data['resources'] as $r) {
    if (isset($r['public_id'], $r['secure_url'])) {
        $shapedResources[] = [
            'publicId'   => $r['public_id'],
            'secureUrl'  => $r['secure_url'],
            'width'      => $r['width'] ?? 0,
            'height'     => $r['height'] ?? 0,
            'format'     => $r['format'] ?? '',
            'createdAt'  => $r['created_at'] ?? '',
        ];
    }
}

$shaped = [
    'folder'      => $folder,
    'images'      => $shapedResources,
    'nextCursor'  => $data['next_cursor'] ?? null,
    'hasMore'     => !empty($data['next_cursor']),
    'total'       => count($shapedResources),
];

$json = json_encode($shaped, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
if ($ctx['method'] === 'GET') {
    proxyWriteCache($cacheFile, $json);
}

header('Content-Type: application/json; charset=utf-8');
header('X-Cache: MISS');
echo $json;
