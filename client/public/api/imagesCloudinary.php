<?php
// public_html/api/images.php

// ─── Security Headers ────────────────────────────────────────────
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

$allowedOrigins = ['https://nairobidevops.org', 'https://www.nairobidevops.org'];

$headers = [];
if (function_exists('getallheaders')) {
    $headers = getallheaders();
} elseif (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
}

// Normalize for case-insensitive access
$headersLower = [];
foreach ($headers as $k => $v) {
    $headersLower[strtolower($k)] = $v;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? ($headersLower['origin'] ?? '');

if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Credentials: true');

// ─── Handle Preflight OPTIONS Request ──────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Credentials (from .env.php generated at deploy time) ──────────────
$envFile = __DIR__ . '/.env.php';
if (file_exists($envFile)) {
    require_once $envFile;
}

// ─── Authentication ────────────────────────────────────────────────
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($headersLower['authorization'] ?? '');
$expectedToken = defined('PROXY_API_TOKEN') ? PROXY_API_TOKEN : getenv('PROXY_API_TOKEN');

// Validate existence of token
if (empty($expectedToken)) {
    http_response_code(500);
    echo json_encode(['error' => 'Server authentication configuration missing']);
    exit;
}

// Verify the provided token safely to prevent timing attacks
if (empty($authHeader) || !preg_match("/^Bearer\s+(.*)$/i", $authHeader, $matches) || !hash_equals($expectedToken, $matches[1])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ─── Input Validation ─────────────────────────────────────────────
// Whitelist of valid Cloudinary folder names — update this as you add folders
$allowedFolders = [
    'ndcCampusTour',
    'ndcPartners',
    // Add more folder names here as you create them in Cloudinary
];

$folder      = isset($_GET['folder']) ? trim($_GET['folder']) : '';
$nextCursor  = isset($_GET['next_cursor']) ? trim($_GET['next_cursor']) : '';
$maxResults  = 12;

// Reject unknown folders — prevents probing your Cloudinary structure
if (!in_array($folder, $allowedFolders, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid folder']);
    exit;
}

// Validate next_cursor format (Cloudinary cursors are alphanumeric strings)
if ($nextCursor && !preg_match('/^[a-zA-Z0-9_\-\/=]+$/', $nextCursor)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid cursor']);
    exit;
}

// Constants CLD_CLOUD_NAME, CLD_API_KEY, CLD_API_SECRET are now defined.
$cloudName = defined('CLD_CLOUD_NAME') ? CLD_CLOUD_NAME : getenv('CLD_CLOUD_NAME');
$apiKey    = defined('CLD_API_KEY') ? CLD_API_KEY : getenv('CLD_API_KEY');
$apiSecret = defined('CLD_API_SECRET') ? CLD_API_SECRET : getenv('CLD_API_SECRET');

if (!$cloudName || !$apiKey || !$apiSecret) {
    http_response_code(500);
    error_log('imagesCloudinary.php: Cloudinary credentials are not configured.');
    echo json_encode(['error' => 'Server configuration error']);
    exit;
}

// ─── File Cache ───────────────────────────────────────────────────
// Cache per folder + cursor combination so each page is cached independently
$cursorHash = $nextCursor ? '_' . md5($nextCursor) : '_page1';
$cacheDir   = sys_get_temp_dir() . '/cld_cache/';
$cacheFile  = $cacheDir . $folder . $cursorHash . '.json';
$cacheTTL   = 300; // 5 minutes — adjust as needed

if (!is_dir($cacheDir)) {
    if (!mkdir($cacheDir, 0750, true) && !is_dir($cacheDir)) {
        error_log("imagesCloudinary.php: Failed to create cache directory: $cacheDir");
        // We'll continue and just serve without caching.
    }
}

if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
    // Attempt to serve from cache
    $cachedData = file_get_contents($cacheFile);
    if ($cachedData !== false) {
        // Validate JSON
        json_decode($cachedData);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo $cachedData;
            exit;
        } else {
            error_log("imagesCloudinary.php: Invalid JSON in cache file $cacheFile");
        }
    } else {
        error_log("imagesCloudinary.php: Failed to read cache file $cacheFile");
    }
}

// ─── Build Signed Cloudinary API Request ─────────────────────────
$timestamp = time();

// Parameters must be sorted alphabetically for signature
$sigParams = [
    'max_results' => $maxResults,
    'prefix'      => $folder . '/',
    'timestamp'   => $timestamp,
    'type'        => 'upload',
];

if ($nextCursor) {
    $sigParams['next_cursor'] = $nextCursor;
}

ksort($sigParams); // Critical: Cloudinary requires alphabetical sort for signing

// Build the signature string: key1=val1&key2=val2 + secret appended at end
$sigString = urldecode(http_build_query($sigParams)) . $apiSecret;
$signature = sha1($sigString);

// Build the final query with api_key and signature added (not part of sig string)
$queryParams = array_merge($sigParams, [
    'api_key'   => $apiKey,
    'signature' => $signature,
]);

$apiUrl = "https://api.cloudinary.com/v1_1/{$cloudName}/resources/image?"
        . http_build_query($queryParams);

// ─── Execute Request ──────────────────────────────────────────────
$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'ignore_errors' => true,
    ],
]);

$response   = file_get_contents($apiUrl, false, $context);
$httpStatus = $http_response_header[0] ?? '';

// Extract the numeric HTTP status exact match instead of substring match
$statusCode = 0;
if (preg_match('/HTTP\/\d(?:\.\d)?\s+(\d{3})/', $httpStatus, $matches)) {
    $statusCode = (int)$matches[1];
}

if ($response === false || $statusCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch from Cloudinary']);
    exit;
}

// ─── Shape the Response ───────────────────────────────────────────
// Only send the frontend what it needs — don't leak internal Cloudinary fields
$data = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid JSON from Cloudinary']);
    exit;
}

$resources = $data['resources'] ?? [];
$shapedResources = [];

foreach ($resources as $r) {
    if (isset($r['public_id'], $r['secure_url'], $r['width'], $r['height'], $r['format'], $r['created_at'])) {
        $shapedResources[] = [
            'publicId'   => $r['public_id'],
            'secureUrl'  => $r['secure_url'],
            'width'      => $r['width'],
            'height'     => $r['height'],
            'format'     => $r['format'],
            'createdAt'  => $r['created_at'],
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

// ─── Cache and Return ─────────────────────────────────────────────
$json = json_encode($shaped);

if ($json) {
    $writeResult = file_put_contents($cacheFile, $json);
    if ($writeResult === false) {
        $phpError = error_get_last();
        $errorMsg = $phpError ? $phpError['message'] : 'Unknown error';
        error_log(sprintf(
            "imagesCloudinary.php: Failed to write %d bytes to cache limit. File: %s. Error: %s",
            strlen($json), $cacheFile, $errorMsg
        ));
    }
}

echo $json;