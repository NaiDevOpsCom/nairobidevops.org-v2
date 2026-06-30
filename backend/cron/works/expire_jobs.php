<?php

/**
 * expire_jobs.php — Soft-expire stale job listings.
 *
 * Run daily at midnight EAT (21:00 UTC) via cPanel cron:
 *   0 21 * * *  php /home/username/public_html/jobs-api/cron/works/expire_jobs.php >> /home/username/logs/expire.log 2>&1
 *
 * Or manually:
 *   php cron/works/expire_jobs.php
 *
 * Two expiry rules (from PRD):
 *   1. Job has a closes_at date that has passed → expire immediately
 *   2. Job has no closes_at AND was fetched more than 60 days ago → expire
 *
 * Never hard-deletes — sets is_active = 0 only.
 * Hard deletes happen monthly via purge_jobs.php (90 days after soft expiry).
 */

declare(strict_types=1);

$basePath = \dirname(__FILE__) . '/../../';
require_once $basePath . 'db.php';

$startTime = microtime(true);
$db        = getDB();

// ── Soft-expire ───────────────────────────────────────────────────────────────

$stmt = $db->prepare('
    UPDATE jobs
    SET    is_active  = 0,
           updated_at = NOW()
    WHERE  is_active = 1
    AND (
        -- Rule 1: deadline passed
        (closes_at IS NOT NULL AND closes_at < NOW())
        OR
        -- Rule 2: no deadline and fetched more than 60 days ago
        (closes_at IS NULL AND fetched_at < DATE_SUB(NOW(), INTERVAL 60 DAY))
    )
');

$stmt->execute();
$expired = $stmt->rowCount();

// ── Log to sync_log ───────────────────────────────────────────────────────────

$duration = (int) round((microtime(true) - $startTime) * 1000); // ms

$db->prepare("
    INSERT INTO sync_log (source, jobs_expired, duration_sec, errors)
    VALUES ('expire', :expired, :duration, NULL)
")->execute([
    ':expired'  => $expired,
    ':duration' => $duration,
]);

// ── Output ────────────────────────────────────────────────────────────────────

$remaining = (int) $db->query(
    'SELECT COUNT(*) FROM jobs WHERE is_active = 1 AND is_approved = 1'
)->fetchColumn();

echo '[Expire Jobs] ' . date('Y-m-d H:i:s') . "\n";
echo "  Expired  : {$expired} jobs set to is_active = 0\n";
echo "  Remaining: {$remaining} active approved jobs\n";
echo "  Duration : {$duration}ms\n";
