<?php
/**
 * migrate_clean_descriptions.php
 *
 * One-off script to strip HTML from all job descriptions already in the DB.
 * Safe to run multiple times (idempotent — already-clean rows are updated with
 * the same clean value, which is a no-op for the data).
 *
 * Run once from CLI:
 *   php cron\migrate_clean_descriptions.php
 */

require_once dirname(__DIR__) . '/db.php';
require_once dirname(__DIR__) . '/helpers.php'; // provides cleanDescription()

$db = getDB();

// ── Stream rows with a forward-only cursor to keep memory bounded ─────────────

$stmt    = $db->query("SELECT id, description FROM jobs");
$stmt->setFetchMode(PDO::FETCH_ASSOC);

$total   = 0;
$updated = 0;
$skipped = 0;

$updateStmt = $db->prepare("UPDATE jobs SET description = :desc WHERE id = :id");

echo "Scanning jobs for HTML in description…\n\n";

while (($row = $stmt->fetch()) !== false) {
    $total++;
    $raw   = $row['description'] ?? '';
    $clean = cleanDescription($raw);

    // Only write if there's an actual change
    if ($clean === $raw) {
        $skipped++;
        continue;
    }

    $updateStmt->execute([':desc' => $clean, ':id' => $row['id']]);
    $updated++;

    echo "  Updated job #{$row['id']} (was " . strlen($raw) . " chars → now " . strlen($clean) . " chars)\n";
}

echo "\n─────────────────────────────────\n";
echo "Migration complete\n";
echo "  Total rows:  {$total}\n";
echo "  Updated:     {$updated}\n";
echo "  Already clean (skipped): {$skipped}\n";
echo "─────────────────────────────────\n";
