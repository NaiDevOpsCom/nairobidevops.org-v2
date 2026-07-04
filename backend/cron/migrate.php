<?php

declare(strict_types=1);

require_once \dirname(__DIR__) . '/vendor/autoload.php';

use App\Migration\MigrationRunner;

try {
    $runner = new MigrationRunner(getDB(), \dirname(__DIR__) . '/migrations');
    $runner->ensureMigrationsTableExists();

    $pending = $runner->pendingMigrations();
} catch (RuntimeException $e) {
    echo 'FAILED: ' . $e->getMessage() . "\n";
    exit(1);
}

if (empty($pending)) {
    echo "No pending migrations.\n";
    exit(0);
}

foreach ($pending as $version => $filepath) {
    echo "Applying {$version}: " . basename($filepath) . "...\n";

    try {
        $runner->apply($version, $filepath);
        echo "  done\n";
    } catch (RuntimeException $e) {
        echo '  FAILED: ' . $e->getMessage() . "\n";
        exit(1);
    }
}

echo "All migrations applied.\n";
