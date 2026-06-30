<?php

/**
 * notify_digest.php — Daily job digest to Telegram + Discord.
 *
 * Sends 10–15 new jobs every morning (09:00 EAT / 06:00 UTC).
 * Every message links back to nairobidevops.org/jobs to drive traffic.
 *
 * Channel-sending logic (sendTelegram, sendDiscord, sendToChannel,
 * splitMessage) and display helpers (locationEmoji, locationLabel,
 * currencySymbol) now live in helpers.php — shared with notify_weekly.php
 * instead of being duplicated in both files.
 *
 * ─── HOW TO TEST ON WINDOWS (local) ─────────────────────────────────────────
 * 1. Temporarily set define('APP_ENV', 'production') in config.local.php
 * 2. Open PowerShell from repo root:
 *      cd backend
 *      php cron\works\notify_digest.php
 * 3. Check Telegram group + Discord channel for the message
 * 4. Check notifications_log in TablePlus — should have a 'sent' row
 * 5. Check jobs table — is_notified should be 1 on included jobs
 * 6. RESTORE define('APP_ENV', 'local') in config.local.php immediately after
 *
 * ─── cPANEL CRON (06:00 UTC = 09:00 EAT daily) ──────────────────────────────
 * 0 6 * * *  php /home/username/public_html/jobs-api/cron/works/notify_digest.php >> /home/username/logs/digest.log 2>&1
 *
 * ─── CHANNELS STATUS ─────────────────────────────────────────────────────────
 *   ✅ Telegram   — active (posts into the "Opportunities Updates" topic — see config)
 *   ✅ Discord    — active
 *   🔜 WhatsApp  — Phase 2 (Meta Business verification required)
 *   🔜 LinkedIn  — Phase 2 (LinkedIn Developer App required)
 *   🔜 X/Twitter — Phase 2 (X Developer account + Elevated access required)
 *
 * Phase 2 setup instructions and commented-out implementations for
 * WhatsApp, LinkedIn, and X/Twitter live in helpers.php next to sendToChannel().
 */

require_once \dirname(__DIR__, 2) . '/db.php';
require_once \dirname(__DIR__, 2) . '/helpers.php';

// ── Environment guard ─────────────────────────────────────────────────────────
if (!\defined('APP_ENV') || APP_ENV !== 'production') {
    $env = \defined('APP_ENV') ? APP_ENV : 'unknown';
    echo "[notify_digest] Non-production environment ({$env}) — suppressed.\n";
    exit(0);
}

$db = getDB();

// ── Config ────────────────────────────────────────────────────────────────────
// ✏️ CUSTOMIZE: site link used in the message footer (see $message below).
$siteJobsUrl    = 'https://nairobidevops.org/jobs';
$minJobs        = 10;   // wait until we have at least this many before sending
$maxJobs        = 15;   // max jobs shown in digest (rest shown as "+N more")
$dedupWindowHrs = 20;   // hours — skip channel if already sent within this window

// ── Active channels ───────────────────────────────────────────────────────────
// Add 'whatsapp', 'linkedin', 'twitter' here when each Phase 2 integration is ready.
$allChannels = ['telegram', 'discord'];

// ── Anti-duplication: skip channels already notified today ────────────────────
$channelsToSend = [];
foreach ($allChannels as $channel) {
    $check = $db->prepare("
        SELECT id FROM notifications_log
        WHERE channel           = ?
          AND notification_type = 'daily_digest'
          AND status            = 'sent'
          AND sent_at           > DATE_SUB(NOW(), INTERVAL ? HOUR)
        LIMIT 1
    ");
    $check->execute([$channel, $dedupWindowHrs]);

    if ($check->fetch()) {
        echo "[notify_digest] {$channel}: already sent within last {$dedupWindowHrs}h — skipping.\n";
    } else {
        $channelsToSend[] = $channel;
    }
}

if (empty($channelsToSend)) {
    echo "[notify_digest] All channels already notified today — nothing to do.\n";
    exit(0);
}

// ── Count total unnotified jobs ───────────────────────────────────────────────
$totalNew = (int) $db->query("
    SELECT COUNT(*) FROM jobs
    WHERE is_notified = 0
      AND is_active   = 1
      AND is_approved = 1
      AND role_type NOT IN ('Frontend Engineer', 'Backend Engineer', 'Software', 'Uncategorised')
      AND posted_at > DATE_SUB(NOW(), INTERVAL 365 DAY)
      AND title NOT LIKE '%Intern%'
      AND title NOT LIKE '%Penetration Tester%'
")->fetchColumn();

if ($totalNew < $minJobs) {
    echo "[notify_digest] Only {$totalNew} new jobs (minimum is {$minJobs}) — waiting for more.\n";
    exit(0);
}

// ── Fetch jobs for the digest ─────────────────────────────────────────────────
// Priority: Africa Remote/Onsite first, then Africa-friendly, then International.
// Featured jobs always surface first within each group.
$stmt = $db->prepare("
    SELECT id, title, company, location_type, africa_friendly,
           salary_min, salary_max, salary_currency, salary_period,
           role_type, source, posted_at, closes_at
    FROM jobs
   WHERE is_notified = 0
      AND is_active   = 1
      AND is_approved = 1
      AND role_type NOT IN ('Frontend Engineer', 'Backend Engineer', 'Software', 'Uncategorised')
      AND posted_at > DATE_SUB(NOW(), INTERVAL 365 DAY)
      AND title NOT LIKE '%Intern%'
      AND title NOT LIKE '%Penetration Tester%'
    ORDER BY
        is_featured DESC,
        CASE location_type
            WHEN 'africa_remote'  THEN 1
            WHEN 'africa_onsite'  THEN 2
            ELSE 3
        END,
        africa_friendly DESC,
        posted_at DESC
    LIMIT :lim
");
$stmt->bindValue(':lim', $maxJobs, PDO::PARAM_INT);
$stmt->execute();
$jobs = $stmt->fetchAll();

if (empty($jobs)) {
    echo "[notify_digest] No jobs returned from query — exiting.\n";
    exit(0);
}

$moreCount = max(0, $totalNew - \count($jobs));

// ── Build message ─────────────────────────────────────────────────────────────
$today    = date('l, j F Y');
$jobLines = [];

foreach ($jobs as $i => $job) {
    $num      = $i + 1;
    $locEmoji = locationEmoji($job['location_type']);
    $locLabel = locationLabel($job['location_type']);
    $africa   = $job['africa_friendly'] ? ' ✅' : '';

    $salaryStr = '';
    if ($job['salary_min'] || $job['salary_max']) {
        $sym    = currencySymbol($job['salary_currency'] ?? 'USD');
        $period = ($job['salary_period'] === 'annual') ? '/yr' : '/mo';
        if ($job['salary_min'] && $job['salary_max']) {
            $salaryStr = " · {$sym}" . number_format((int)$job['salary_min'])
                       . "–{$sym}" . number_format((int)$job['salary_max']) . $period;
        } elseif ($job['salary_min']) {
            $salaryStr = " · From {$sym}" . number_format((int)$job['salary_min']) . $period;
        }
    }

    // Urgency flag — closing soon drives clicks
    $closingStr = '';
    if ($job['closes_at']) {
        $daysLeft = daysUntilClose($job['closes_at']);
        if ($daysLeft !== null && $daysLeft <= 7) {
            $closingStr = ' ⏰';
        }
    }

    $jobLines[] = "{$num}. *{$job['title']}* @ {$job['company']}{$africa}{$closingStr}"
                . "\n   {$locEmoji} {$locLabel}{$salaryStr}";
}

$jobBlock  = implode("\n\n", $jobLines);
$moreBlock = $moreCount > 0 ? "\n\n_... +{$moreCount} more on the board_" : '';

// ✏️ CUSTOMIZE BELOW — everything inside this heredoc is the literal message
// sent to Telegram + Discord. {$jobBlock} and {$moreBlock} are generated
// above and should stay where they are; the surrounding text (headline,
// CTA line, badge legend, closing footer) is yours to edit freely.
$message = <<<MSG
🚀 *New DevOps Jobs — {$today}*

{$jobBlock}{$moreBlock}

──────────────────────
👉 *All open roles → {$siteJobsUrl}*
✅ Africa-friendly clearly marked
⏰ = closing within 7 days — act fast

_Digest sent daily · 9am EAT_
MSG;
// ── End of customizable message block ──────────────────────────────────────

// ── Send to each active channel ───────────────────────────────────────────────
$jobIds     = array_column($jobs, 'id');
$jobIdsJson = json_encode($jobIds);
$msgPreview = mb_substr(strip_tags($message), 0, 200);
$anySent    = false;

foreach ($channelsToSend as $channel) {
    [$success, $error] = sendToChannel($channel, $message);

    $db->prepare("
        INSERT INTO notifications_log
            (channel, notification_type, job_ids, message_preview, sent_at, status, error)
        VALUES (:ch, 'daily_digest', :ids, :preview, NOW(), :status, :error)
    ")->execute([
        ':ch'      => $channel,
        ':ids'     => $jobIdsJson,
        ':preview' => $msgPreview,
        ':status'  => $success ? 'sent' : 'failed',
        ':error'   => $error,
    ]);

    if ($success) {
        $anySent = true;
        echo "[notify_digest] {$channel}: sent — {$totalNew} new jobs, showing " . \count($jobs) . "\n";
    } else {
        echo "[notify_digest] {$channel}: FAILED — {$error}\n";
    }
}

// ── Mark as notified only when at least one channel succeeded ─────────────────
if ($anySent && !empty($jobIds)) {
    $placeholders = implode(',', array_fill(0, \count($jobIds), '?'));
    $db->prepare("UPDATE jobs SET is_notified = 1 WHERE id IN ({$placeholders})")
       ->execute($jobIds);
    echo '[notify_digest] Marked ' . \count($jobIds) . " jobs as notified.\n";
}

echo "[notify_digest] Done. Total unnotified: {$totalNew}.\n";
