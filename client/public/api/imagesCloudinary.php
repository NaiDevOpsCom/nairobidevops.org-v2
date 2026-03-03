<?php
/**
 * Cloudinary API Proxy (Hardened)
 */

require_once __DIR__ . '/config-loader.php';
require_once __DIR__ . '/security-utils.php';

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// 1. Strict Origin & Referer Validation
$allowedOrigins = [
    'https://nairobidevops.org',
    'https://www.nairobidevops.org'
];

$validOrigin = SecurityUtils::validateOrigin($allowedOrigins);
if ($validOrigin !== null) {
    header('Access-Control-Allow-Origin: ' . $validOrigin);
    header('Vary: Origin');
}

// 2. Preflight Handling
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    if ($validOrigin !== null) {
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Proxy-Token');
        header('Access-Control-Max-Age: 86400');
    }
    http_response_code(204);
    exit;
}

// 3. Rate Limiting
$cacheRootDir = dirname(__DIR__, 3) . '/cache';
if (!SecurityUtils::checkRateLimit($cacheRootDir . '/rate_limits', 30, 60)) {
    http_response_code(429);
    echo json_encode(['error' => 'Too Many Requests']);
    exit;
}

// 4. Input Validation
$allowedFolders = ['ndcCampusTour', 'ndcPartners'];
$folder = isset($_GET['folder']) ? trim($_GET['folder']) : '';
$nextCursor = isset($_GET['next_cursor']) ? trim($_GET['next_cursor']) : '';

if (!in_array($folder, $allowedFolders, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid folder']);
    exit;
}

if ($nextCursor && !preg_match('/^[a-zA-Z0-9_\-\/=+]+$/', $nextCursor)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid cursor']);
    exit;
}

// 5. Authentication
$headers = function_exists('getallheaders') ? getallheaders() : (function_exists('apache_request_headers') ? apache_request_headers() : []);
$headersLower = array_change_key_case($headers, CASE_LOWER);

$authHeaderToken = $headersLower['x-proxy-token'] ?? '';
if (preg_match('/Bearer\s+(.*)$/i', $authHeaderToken, $matches)) {
    $authHeaderToken = trim($matches[1]);
}

$expectedToken = defined('PROXY_API_TOKEN') ? PROXY_API_TOKEN : getenv('PROXY_API_TOKEN');
$isAjax = strtolower($headersLower['x-requested-with'] ?? '') === 'xmlhttprequest';
$isAuthenticated = SecurityUtils::validateToken($authHeaderToken, $expectedToken);

if (!$isAuthenticated && !($validOrigin && $isAjax)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// 6. Caching (GET requests only)
$cursorHash = $nextCursor ? '_' . md5($nextCursor) : '_page1';
$cacheFile = $cacheRootDir . '/api_responses/cld_' . $folder . $cursorHash . '.json';
$cacheTTL = 300;

if ($method === 'GET' && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
    $cachedData = file_get_contents($cacheFile);
    if ($cachedData) {
        header('X-Cache: HIT');
        echo $cachedData;
        exit;
    }
}

// 7. Cloudinary Admin API Request
$cloudName = defined('CLD_CLOUD_NAME') ? CLD_CLOUD_NAME : getenv('CLD_CLOUD_NAME');
$apiKey    = defined('CLD_API_KEY') ? CLD_API_KEY : getenv('CLD_API_KEY');
$apiSecret = defined('CLD_API_SECRET') ? CLD_API_SECRET : getenv('CLD_API_SECRET');

if (!$cloudName || !$apiKey || !$apiSecret) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error']);
    exit;
}

$auth = base64_encode($apiKey . ':' . $apiSecret);
$queryParams = [
    'max_results' => 12,
    'prefix'      => $folder . '/',
    'type'        => 'upload',
];
if ($nextCursor) $queryParams['next_cursor'] = $nextCursor;

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
    http_response_code(502);
    echo json_encode(['error' => 'Upstream error']);
    exit;
}

// 8. Shape and Cache Response
$data = json_decode($response, true);
if (!$data || !isset($data['resources'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid upstream response']);
    exit;
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
    'returned'    => count($shapedResources),
];

$json = json_encode($shaped);
if ($method === 'GET') {
    if (!is_dir(dirname($cacheFile))) mkdir(dirname($cacheFile), 0700, true);
    file_put_contents($cacheFile . '.tmp', $json, LOCK_EX);
    rename($cacheFile . '.tmp', $cacheFile);
}

header('X-Cache: MISS');
echo $json;
