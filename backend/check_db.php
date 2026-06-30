<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

echo "Testing database connection...\n";

try {
    $db = getDB();
    $db->query('SELECT 1');
    echo "✓ Connected to MySQL successfully.\n";
    echo '  Host: ' . DB_HOST . "\n";
    echo '  Database: ' . DB_NAME . "\n";
    exit(0);
} catch (Throwable $e) {
    echo '✗ Connection failed: ' . $e->getMessage() . "\n";
    exit(1);
}
