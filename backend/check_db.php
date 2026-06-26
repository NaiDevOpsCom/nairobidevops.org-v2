<?php

// Simple DB connection checker. Includes config.local.php for credentials and
// attempts a lightweight test query. Exit codes:
// 0 = success, 1 = connection error, 2 = query failed

$localConfig = __DIR__ . '/config.local.php';
if (!file_exists($localConfig)) {
    fwrite(STDERR, "ERROR: config.local.php not found in backend/ - copy config.example.php and set your DB_* constants.\n");
    exit(1);
}

require_once $localConfig;

$host = \defined('DB_HOST') ? DB_HOST : '127.0.0.1';
$port = \defined('DB_PORT') ? DB_PORT : 3306;
$name = \defined('DB_NAME') ? DB_NAME : '';
$user = \defined('DB_USER') ? DB_USER : '';
$pass = \defined('DB_PASS') ? DB_PASS : '';

if (empty($name) || empty($user)) {
    fwrite(STDERR, "ERROR: DB_NAME or DB_USER not set in config.local.php\n");
    exit(1);
}

$dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5,
    ]);

    // lightweight test query
    $stmt = $pdo->query('SELECT 1');
    $val = $stmt ? $stmt->fetchColumn() : false;
    if ($val !== false) {
        echo "OK: connected to '{$name}' on {$host}:{$port}\n";
        exit(0);
    }

    fwrite(STDERR, "ERROR: test query returned no results\n");
    exit(2);
} catch (PDOException $e) {
    // Print a concise error for debugging (don't leak secrets in production)
    fwrite(STDERR, "ERROR: {$e->getMessage()}\n");
    exit(1);
}
