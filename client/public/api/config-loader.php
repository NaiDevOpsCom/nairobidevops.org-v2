<?php
/**
 * Shared Configuration Loader
 * 
 * This file locates and loads the shared secrets.env.php file which lives
 * outside the public_html directory for security.
 */

function load_shared_config() {
    // 1. Try to find the config directory relative to this file.
    // Structure:
    // /home/user/config/secrets.env.php
    // /home/user/releases/TIMESTAMP/api/config-loader.php
    // /home/user/current -> /home/user/releases/TIMESTAMP
    
    $possiblePaths = [
        // From release dir: dirname(__DIR__, 3) / config
        dirname(__DIR__, 3) . '/config/secrets.env.php',
        // From symlinked dir (if current is at /home/user/current)
        dirname($_SERVER['DOCUMENT_ROOT'] ?? '', 1) . '/config/secrets.env.php',
        // Absolute fallback for common cPanel structures if others fail
        '/home/' . get_current_user() . '/config/secrets.env.php'
    ];

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
if (!load_shared_config()) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Internal Server Error: Configuration missing']);
    exit;
}
