<?php
/**
 * Shared Configuration Loader
 *
 * This file locates and loads the shared secrets.env.php file which lives
 * outside the public_html directory for security.
 */

/**
 * Returns the centralized cache root directory path.
 */
const CONFIG_LOADER_RELATIVE_PATH = '/config/secrets.env.php';
const CONFIG_LOADER_CACHE_DIR = '/cache';

function getProxyCacheDir() {
    return dirname(__DIR__, 3) . CONFIG_LOADER_CACHE_DIR;
}

/**
 * Returns the list of possible paths where the secrets.env.php configuration file might reside.
 */
function getProxyConfigPaths() {
    return [
        // From release dir: dirname(__DIR__, 3) / config
        dirname(__DIR__, 3) . CONFIG_LOADER_RELATIVE_PATH,
        // From symlinked dir (if current is at /home/user/current)
        dirname($_SERVER['DOCUMENT_ROOT'] ?? '', 1) . CONFIG_LOADER_RELATIVE_PATH,
        // Absolute fallback for common cPanel structures if others fail
        '/home/' . get_current_user() . CONFIG_LOADER_RELATIVE_PATH
    ];
}

function loadSharedConfig() {
    $possiblePaths = getProxyConfigPaths();

    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            require_once $path;
            return true;
        }
    }

    // Generic error if not found - do not leak paths in production
    error_log("Security Error: Shared configuration file not found.");
    return false;
}

// Execute immediately
if (!loadSharedConfig()) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Internal Server Error: Configuration missing']);
    exit;
}
