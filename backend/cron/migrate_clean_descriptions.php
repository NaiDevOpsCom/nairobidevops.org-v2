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

$db = getDB();

/**
 * Convert an HTML job description to clean, readable plain text.
 * Identical to the logic used in sync_remotive.php (keep in sync).
 */
function cleanDescription(string $rawHtml): string
{
    if (trim($rawHtml) === '') {
        return '';
    }

    // Step 1: Block-level tags → newline so paragraphs/list-items separate
    $text = preg_replace(
        '/<\s*\/?\s*(p|br|li|h[1-6]|div|blockquote|ul|ol|tr|td|th)[^>]*>/i',
        "\n",
        $rawHtml
    );

    // Step 2: Strip all remaining HTML tags (inline: strong, em, a, span, …)
    $text = strip_tags($text);

    // Step 3: Decode HTML entities (&amp; → &, &#x27; → ', …)
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    // Step 4: Collapse 3+ consecutive newlines → one blank line
    $text = preg_replace('/\n{3,}/', "\n\n", $text);

    // Step 5: Trim each line, then trim the whole string
    $lines = array_map('trim', explode("\n", $text));
    return trim(implode("\n", $lines));
}

// ── Fetch all jobs that still contain HTML tags ──────────────────────────────

$stmt    = $db->query("SELECT id, description FROM jobs");
$all     = $stmt->fetchAll(PDO::FETCH_ASSOC);

$total   = count($all);
$updated = 0;
$skipped = 0;

$updateStmt = $db->prepare("UPDATE jobs SET description = :desc WHERE id = :id");

echo "Scanning {$total} jobs for HTML in description…\n\n";

foreach ($all as $row) {
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
