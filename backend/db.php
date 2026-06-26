<?php

// Load correct config — config.php is symlinked by the deploy workflow
// For local dev it won't exist, so we fall back to config.local.php
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    require_once __DIR__ . '/config.local.php';
}

function getDB(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';port=' . (\defined('DB_PORT') ? DB_PORT : '3306') . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
        } catch (PDOException $e) {
            if (php_sapi_name() !== 'cli') {
                http_response_code(500);
            }
            die(json_encode(['error' => 'Database connection failed']));
        }
    }

    return $pdo;
}
