<?php

declare(strict_types=1);

/**
 * check_db_health.php (v2)
 *
 * Run this against local, staging, and production to confirm:
 *   1. The `jobs` table has index COVERAGE for every column your app
 *      actually filters/sorts/dedupes on — checked by column list, not by
 *      guessing a specific index name, since real-world schemas accumulate
 *      renamed/merged/composite indexes over time
 *   2. MySQL's optimizer actually USES an index for the real query shapes
 *      get_jobs.php runs — with row-count awareness, so a near-empty table
 *      (common on local/staging) doesn't produce false failures
 *   3. All migration files in backend/migrations/ have been applied
 *      according to schema_migrations — and if that table itself doesn't
 *      exist, that's called out explicitly rather than silently continuing
 *   4. PHP OPcache is enabled for CLI
 *
 * This version ALWAYS shows its own errors (forces display_errors on and
 * registers a shutdown handler for fatals) regardless of server-wide PHP
 * settings, specifically because a prior run against production exited
 * with zero output and no clue why. If you see nothing at all, something is
 * failing before this file's own code runs (e.g. wrong path, PHP parse
 * error) — run with `php -d display_errors=1 -d error_reporting=E_ALL` and
 * check the PHP error log if this file itself somehow still stays silent.
 *
 * Usage:
 *   php scripts/check_db_health.php
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);

register_shutdown_function(static function (): void {
    $err = error_get_last();
    if ($err !== null && \in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        fwrite(STDERR, "\n❌ FATAL: {$err['message']} in {$err['file']}:{$err['line']}\n");
    }
});

// ── Bootstrap ─────────────────────────────────────────────────────────────
$backendRoot = \dirname(__DIR__);
echo "Looking for config in: {$backendRoot}\n";

if (file_exists($backendRoot . '/config.php')) {
    echo "Using config.php\n";
    require_once $backendRoot . '/config.php';
} elseif (file_exists($backendRoot . '/config.local.php')) {
    echo "Using config.local.php\n";
    require_once $backendRoot . '/config.local.php';
} else {
    fwrite(STDERR, "❌ Could not find config.php or config.local.php in {$backendRoot}\n");
    fwrite(STDERR, "   If this is production/staging: has the backend actually been deployed here yet?\n");
    exit(1);
}

foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $const) {
    if (!\defined($const)) {
        fwrite(STDERR, "❌ {$const} is not defined — config file loaded but incomplete\n");
        exit(1);
    }
}

$failures = 0;
$warnings = 0;

function pass(string $msg): void
{
    echo "  ✅ {$msg}\n";
}

function fail(string $msg): void
{
    global $failures;
    $failures++;
    echo "  ❌ {$msg}\n";
}

function warn(string $msg): void
{
    global $warnings;
    $warnings++;
    echo "  ⚠️  {$msg}\n";
}

function section(string $title): void
{
    echo "\n=== {$title} ===\n";
}

/**
 * True if any index's leading columns (in order) match $requiredLeading.
 * $indexColumns is Key_name => [col1, col2, ...] in index order.
 *
 * @param array<string, string[]> $indexColumns
 * @param string[] $requiredLeading
 */
function hasIndexCoveringLeadingColumns(array $indexColumns, array $requiredLeading): ?string
{
    $requiredLeading = array_map('strtolower', $requiredLeading);

    foreach ($indexColumns as $keyName => $cols) {
        $cols = array_map('strtolower', $cols);
        if (\array_slice($cols, 0, \count($requiredLeading)) === $requiredLeading) {
            return $keyName;
        }
    }

    return null;
}

// ── Connect ───────────────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST
            . ';port=' . (\defined('DB_PORT') ? DB_PORT : '3306')
            . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    fwrite(STDERR, "❌ Could not connect to database: {$e->getMessage()}\n");
    exit(1);
}

$env = \defined('APP_ENV') ? APP_ENV : 'unknown';
echo "Environment: {$env}\n";
echo 'Database:    ' . DB_NAME . ' @ ' . DB_HOST . "\n";

// ── 0. Does the jobs table even exist? ───────────────────────────────────────
section('Table existence');

try {
    $exists = $pdo->query("SHOW TABLES LIKE 'jobs'")->fetch();
    if ($exists) {
        pass('jobs table exists');
    } else {
        fail("jobs table does NOT exist — nothing has been migrated on this environment yet. Run 'php migrate.php' here before anything else will work.");
        echo "\n=== Summary ===\n  Stopping early — no jobs table to inspect.\n\n";
        exit(1);
    }
} catch (PDOException $e) {
    fail("Could not check for jobs table: {$e->getMessage()}");
    exit(1);
}

$rowCount = (int) $pdo->query('SELECT COUNT(*) AS c FROM jobs')->fetch()['c'];
echo "Row count: {$rowCount}\n";
$lowData = $rowCount < 20;
if ($lowData) {
    warn("Table has only {$rowCount} row(s) — MySQL's optimizer may legitimately skip indexes on small tables. EXPLAIN failures below are downgraded to warnings, not failures, because of this.");
}

// ── 1. Index COVERAGE by column, not by name ─────────────────────────────────
section('Index coverage — jobs table');

$stmt = $pdo->query('SHOW INDEX FROM jobs');
$rawIndexRows = $stmt->fetchAll();

/** @var array<string, string[]> $indexColumns */
$indexColumns = [];
foreach ($rawIndexRows as $row) {
    $indexColumns[$row['Key_name']][(int) $row['Seq_in_index'] - 1] = $row['Column_name'];
}
foreach ($indexColumns as $key => $cols) {
    ksort($cols);
    $indexColumns[$key] = array_values($cols);
}

echo "Indexes found on jobs:\n";
foreach ($indexColumns as $keyName => $cols) {
    echo '   - ' . $keyName . ': (' . implode(', ', $cols) . ")\n";
}
echo "\n";

$requiredCoverage = [
    'is_active (base filter every listing query uses)'          => ['is_active'],
    'location_type (location filter)'                           => ['location_type'],
    'role_type (role filter)'                                    => ['role_type'],
    'is_notified (digest cron query)'                           => ['is_notified'],
    'title + company, in that order (cross-source dedup check)' => ['title', 'company'],
    // closes_at_sort is validated above via the idx_listing_closing sequence check;
    // it is always accessed as part of that composite index, never as a leading column.
];


// Verify idx_listing_closing specifically covers the closing-soon sort sequence.
$closingIndexName = 'idx_listing_closing';
if (isset($indexColumns[$closingIndexName])) {
    $expectedClosing = ['is_active', 'is_approved', 'is_featured', 'closes_at_sort', 'id'];
    $actualClosing   = array_map('strtolower', $indexColumns[$closingIndexName]);
    if ($actualClosing === $expectedClosing) {
        pass("{$closingIndexName}: columns match expected " . implode(', ', $expectedClosing));
    } else {
        warn("{$closingIndexName}: columns are (" . implode(', ', $actualClosing) . ") — expected (" . implode(', ', $expectedClosing) . "). Index may not optimally serve the closing-soon ORDER BY.");
    }
} else {
    fail("{$closingIndexName} does not exist — closing-soon sort will full-scan or use a suboptimal index");
}

foreach ($requiredCoverage as $label => $requiredLeading) {
    $match = hasIndexCoveringLeadingColumns($indexColumns, $requiredLeading);
    if ($match !== null) {
        pass("{$label}: covered by '{$match}'");
    } else {
        fail("{$label}: NO index has these as leading columns — queries filtering on this will full-scan");
    }
}

// ── 2. Confirm the optimizer actually USES an index ──────────────────────────
section('Query plans — EXPLAIN on real filter shapes');

$queries = [
    'Active+approved listing (newest — base filter every request uses)' =>
        'EXPLAIN FORMAT=TRADITIONAL SELECT * FROM jobs WHERE is_active = 1 AND is_approved = 1
         ORDER BY is_featured DESC, posted_at DESC, id DESC LIMIT 20 OFFSET 0',

    'Location type filter' =>
        "EXPLAIN FORMAT=TRADITIONAL SELECT * FROM jobs WHERE is_active = 1 AND is_approved = 1
         AND location_type = 'africa_remote' LIMIT 20",

    'Role type filter' =>
        "EXPLAIN FORMAT=TRADITIONAL SELECT * FROM jobs WHERE is_active = 1 AND is_approved = 1
         AND role_type = 'DevOps Engineer' LIMIT 20",

    'Closing soon sort (uses closes_at_sort generated column + idx_listing_closing)' =>
        'EXPLAIN FORMAT=TRADITIONAL SELECT * FROM jobs WHERE is_active = 1 AND is_approved = 1
         ORDER BY is_featured DESC, closes_at_sort ASC, id DESC LIMIT 20',

    'Cross-source dedup check (title+company)' =>
        "EXPLAIN FORMAT=TRADITIONAL SELECT id FROM jobs WHERE title = 'Senior DevOps Engineer'
         AND company = 'Andela'",

    'Notification digest query (is_notified)' =>
        'EXPLAIN FORMAT=TRADITIONAL SELECT * FROM jobs WHERE is_notified = 0 AND is_active = 1
         AND is_approved = 1 ORDER BY posted_at DESC LIMIT 8',
];

foreach ($queries as $label => $sql) {
    try {
        $stmt = $pdo->query($sql);
        $plan = $stmt->fetch();

        $key      = $plan['key']   ?? null;
        $type     = $plan['type']  ?? null;
        $rows     = $plan['rows']  ?? '?';
        $extra    = $plan['Extra'] ?? '';
        $filesort = str_contains($extra, 'Using filesort');

        if ($key !== null && $type !== 'ALL') {
            $detail = "using index '{$key}' (type={$type}, rows examined≈{$rows}";
            if ($filesort) {
                $detail .= ", Extra={$extra}";
            }
            $detail .= ')';

            if ($filesort) {
                // Filesort despite index usage is expected on MySQL 5.7 for
                // mixed-direction ORDER BY — record as a warning, not a failure.
                warn("{$label}: {$detail} — filesort present; acceptable on MySQL 5.7 for mixed-direction ORDER BY, but resolve by upgrading to MySQL 8+ with DESC index support");
            } else {
                pass("{$label}: {$detail}");
            }
        } elseif ($lowData) {
            warn("{$label}: no index used (type={$type}) — but table only has {$rowCount} rows, optimizer may be correctly choosing a scan. Re-check once real data volume exists.");
        } else {
            fail("{$label}: no index used despite {$rowCount} rows (type={$type}, rows examined≈{$rows}) — investigate");
        }
    } catch (PDOException $e) {
        // EXPLAIN failure means the query cannot be planned at all (e.g. unknown
        // column) — this is a definitive failure, not a warning.
        fail("{$label}: EXPLAIN failed — {$e->getMessage()}");
    }
}

// ── 3. Migrations ────────────────────────────────────────────────────────────
section('Migrations');

$migrationsDir = $backendRoot . '/migrations';

if (!is_dir($migrationsDir)) {
    warn("Migrations directory not found at {$migrationsDir} — skipping this check");
} else {
    $migrationFiles = array_values(array_filter(
        scandir($migrationsDir),
        static fn ($f) => str_ends_with($f, '.sql') && $f !== 'schema_migrations.sql'
    ));
    sort($migrationFiles);

    $migrationsTableExists = (bool) $pdo->query("SHOW TABLES LIKE 'schema_migrations'")->fetch();

    if (!$migrationsTableExists) {
        fail("schema_migrations table does not exist — migrate.php has never run here, or ran against a different DB than expected. The jobs table indexes you see above were applied some other way (direct SQL import?), so this environment's migration history can't be trusted.");
    } else {
        // MigrationRunner tracks by numeric version (e.g. '005'), not filename.
        // Fetch both columns so we can detect renames as well as genuine gaps.
        $stmt = $pdo->query('SELECT version, filename FROM schema_migrations ORDER BY version');
        /** @var array<string, string> $appliedByVersion  version => filename */
        $appliedByVersion = array_column($stmt->fetchAll(), 'filename', 'version');

        foreach ($migrationFiles as $file) {
            // Extract the leading numeric version from the filename (e.g. '005').
            if (!preg_match('/^(\d{3})_/', $file, $m)) {
                warn("Skipping non-standard filename: {$file}");
                continue;
            }
            $version = $m[1];

            if (!\array_key_exists($version, $appliedByVersion)) {
                fail("NOT applied: {$file} (version {$version}) — run 'php migrate.php', or reconcile schema_migrations manually if the schema change is already present");
            } elseif ($appliedByVersion[$version] !== $file) {
                // Version exists but under a different filename — likely a rename.
                warn("Version {$version} applied as '{$appliedByVersion[$version]}', current filename is '{$file}' — file was renamed after being applied. Update schema_migrations.filename if the rename is intentional.");
            } else {
                pass("Applied: {$file}");
            }
        }
    }
}

// ── 4. PHP OPcache ────────────────────────────────────────────────────────────
section('PHP OPcache (CLI)');

if (!\function_exists('opcache_get_status')) {
    fail('OPcache extension not loaded at all for this PHP CLI binary. On cPanel: check Select PHP Version → Extensions (or MultiPHP INI Editor) — this is a server config change, not something fixable from within the app.');
} else {
    $enabled = \ini_get('opcache.enable');
    $enabledCli = \ini_get('opcache.enable_cli');

    if ($enabled === '1' || $enabled === 'On') {
        pass('opcache.enable is On');
    } else {
        warn('opcache.enable is Off (affects web/FPM requests, not this CLI script)');
    }

    if ($enabledCli === '1' || $enabledCli === 'On') {
        pass('opcache.enable_cli is On — cron scripts benefit from cached bytecode');
    } else {
        warn('opcache.enable_cli is Off — cron scripts are recompiled on every run. Enable in php.ini for faster cron execution.');
    }

    $status = @opcache_get_status(false);
    if ($status !== false && !empty($status['opcache_enabled'])) {
        $stats = $status['opcache_statistics'] ?? [];
        $hits = $stats['hits'] ?? 0;
        $misses = $stats['misses'] ?? 0;
        $hitRate = $stats['opcache_hit_rate'] ?? null;
        echo '     Hits: ' . $hits . ', Misses: ' . $misses
            . ($hitRate !== null ? \sprintf(', Hit rate: %.1f%%', $hitRate) : '')
            . "\n";
    }
}

// ── Summary ───────────────────────────────────────────────────────────────
section('Summary');

if ($failures === 0 && $warnings === 0) {
    echo "  All checks passed cleanly. ✅\n";
} elseif ($failures === 0) {
    echo "  No failures, {$warnings} warning(s) worth a look. ⚠️\n";
} else {
    echo "  {$failures} failure(s), {$warnings} warning(s). ❌\n";
}

echo "\n";
exit($failures > 0 ? 1 : 0);
