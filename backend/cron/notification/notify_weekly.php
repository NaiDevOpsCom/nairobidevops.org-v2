<?php

/**
 * notify_weekly.php — End-of-week detailed job roundup to Telegram + Discord.
 *
 * Sends a comprehensive summary every Friday at 17:00 EAT (14:00 UTC).
 * More detailed than the daily digest — includes stats, salary ranges,
 * closing deadlines, and a strong CTA to drive weekend traffic to the site.
 *
 * Channel-sending logic (sendTelegram, sendDiscord, sendToChannel,
 * splitMessage) and display helpers (locationEmoji, locationLabel,
 * currencySymbol) now live in helpers.php — shared with notify_digest.php
 * instead of being duplicated in both files.
 *
 * ─── HOW TO TEST ON WINDOWS (local) ─────────────────────────────────────────
 * 1. Temporarily set define('APP_ENV', 'production') in config.local.php
 * 2. Open PowerShell from repo root:
 *      cd backend
 *      php cron\notification\notify_weekly.php
 * 3. Check Telegram + Discord for the message
 * 4. RESTORE define('APP_ENV', 'local') immediately after
 *
 * ─── cPANEL CRON (14:00 UTC Friday = 17:00 EAT) ─────────────────────────────
 * 0 14 * * 5  php /home/username/public_html/jobs-api/cron/notification/notify_weekly.php >> /home/username/logs/weekly.log 2>&1
 *
 * ─── CHANNELS STATUS ─────────────────────────────────────────────────────────
 *   ✅ Telegram   — active (posts into the "Opportunities Updates" topic — see config)
 *   ✅ Discord    — active
 *   🔜 WhatsApp  — Phase 2
 *   🔜 LinkedIn  — Phase 2 (weekly post performs well on LinkedIn)
 *   🔜 X/Twitter — Phase 2 (weekly thread gets more reach than daily)
 *
 * Phase 2 setup instructions and commented-out implementations for
 * WhatsApp, LinkedIn, and X/Twitter live in helpers.php next to sendToChannel().
 */

require_once \dirname(__DIR__, 2) . '/db.php';
require_once \dirname(__DIR__, 2) . '/helpers.php';

// ── Environment guard ─────────────────────────────────────────────────────────
if (!\defined('APP_ENV') || APP_ENV !== 'production') {
    $env = \defined('APP_ENV') ? APP_ENV : 'unknown';
    echo "[notify_weekly] Non-production environment ({$env}) — suppressed.\n";
    exit(0);
}

$db          = getDB();
// ✏️ CUSTOMIZE: site link used in the message footer (see $message below).
$siteJobsUrl = 'https://nairobidevops.org/jobs';

// ── Active channels ───────────────────────────────────────────────────────────
// Add 'whatsapp', 'linkedin', 'twitter' here when Phase 2 integrations are ready.
$allChannels = ['telegram', 'discord'];

// ── Anti-duplication: already sent this week? ─────────────────────────────────
$channelsToSend = [];
foreach ($allChannels as $channel) {
    $check = $db->prepare("
        SELECT id FROM notifications_log
        WHERE channel           = ?
          AND notification_type = 'weekly_roundup'
          AND status            = 'sent'
          AND sent_at           > DATE_SUB(NOW(), INTERVAL 6 DAY)
        LIMIT 1
    ");
    $check->execute([$channel]);

    if ($check->fetch()) {
        echo "[notify_weekly] {$channel}: weekly roundup already sent this week — skipping.\n";
    } else {
        $channelsToSend[] = $channel;
    }
}

if (empty($channelsToSend)) {
    echo "[notify_weekly] All channels already received weekly roundup — nothing to do.\n";
    exit(0);
}

// ── Fetch this week's top jobs ────────────────────────────────────────────────
// Top 12 from the past 7 days.
// Priority: Africa Remote/Onsite first, africa_friendly, then International.
// Featured always surfaces first.
$weeklyJobs = $db->query("
    SELECT id, title, company, location_type, africa_friendly,
           salary_min, salary_max, salary_currency, salary_period,
           role_type, source, posted_at, closes_at, is_featured
    FROM jobs
    WHERE is_active   = 1
      AND is_approved = 1
      AND fetched_at  > DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND role_type NOT IN ('Frontend Engineer', 'Backend Engineer', 'Uncategorised')
      AND posted_at   > DATE_SUB(NOW(), INTERVAL 365 DAY)
      AND title NOT LIKE '%Intern%'
      AND title NOT LIKE '%Penetration Tester%'
    ORDER BY
        is_featured DESC,
        CASE location_type
            WHEN 'africa_remote' THEN 1
            WHEN 'africa_onsite' THEN 2
            ELSE 3
        END,
        africa_friendly DESC,
        posted_at DESC
    LIMIT 12
")->fetchAll();

if (empty($weeklyJobs)) {
    echo "[notify_weekly] No jobs from this week — nothing to send.\n";
    exit(0);
}

// ── Board stats for the summary section ──────────────────────────────────────
$totalActive = (int) $db->query('
    SELECT COUNT(*) FROM jobs WHERE is_active = 1 AND is_approved = 1
')->fetchColumn();

$africaFriendlyCount = (int) $db->query('
    SELECT COUNT(*) FROM jobs
    WHERE is_active = 1 AND is_approved = 1 AND africa_friendly = 1
')->fetchColumn();

$africaRemoteCount = (int) $db->query("
    SELECT COUNT(*) FROM jobs
    WHERE is_active = 1 AND is_approved = 1 AND location_type = 'africa_remote'
")->fetchColumn();

$closingSoonCount = (int) $db->query('
    SELECT COUNT(*) FROM jobs
    WHERE is_active = 1 AND is_approved = 1
      AND closes_at IS NOT NULL
      AND closes_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
')->fetchColumn();

// New jobs added this week
$newThisWeek = (int) $db->query('
    SELECT COUNT(*) FROM jobs
    WHERE is_active = 1 AND is_approved = 1
      AND fetched_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
')->fetchColumn();

// ── Build the detailed weekly message ────────────────────────────────────────
$weekEndDate = date('j F Y');
$jobLines    = [];

foreach ($weeklyJobs as $i => $job) {
    $num       = $i + 1;
    $locEmoji  = locationEmoji($job['location_type']);
    $locLabel  = locationLabel($job['location_type']);
    $africa    = $job['africa_friendly'] ? ' ✅' : '';
    $featured  = $job['is_featured'] ? ' ⭐' : '';

    // Full salary line for weekly (more detail than daily digest)
    $salaryLine = '';
    if ($job['salary_min'] || $job['salary_max']) {
        $sym    = currencySymbol($job['salary_currency'] ?? 'USD');
        if ($job['salary_period'] === 'annual') {
            $period = '/yr';
        } else {
            $period = '/mo';
        }
        if ($job['salary_min'] && $job['salary_max']) {
            $salaryLine = "\n   💰 {$sym}" . number_format((int)$job['salary_min'])
                        . " – {$sym}" . number_format((int)$job['salary_max']) . $period;
        } elseif ($job['salary_min']) {
            $salaryLine = "\n   💰 From {$sym}" . number_format((int)$job['salary_min']) . $period;
        }
    }

    // Closing deadline — more detail in weekly
    $deadlineLine = '';
    if ($job['closes_at']) {
        $daysLeft = daysUntilClose($job['closes_at']);
        if ($daysLeft !== null) {
            $deadlineLine = '';
            if ($daysLeft <= 3) {
                $deadlineLine = "\n   ⏰ Closes in {$daysLeft} day";
                if ($daysLeft !== 1) {
                    $deadlineLine .= 's';
                }
                $deadlineLine .= ' — urgent!';
            } elseif ($daysLeft <= 14) {
                $deadlineLine = "\n   📅 Closes in {$daysLeft} days";
            }
        }
    }

    $safeTitle   = escapeTelegramMarkdown($job['title']);
    $safeCompany = escapeTelegramMarkdown($job['company']);
    $jobLines[] = "{$num}.{$featured} *{$safeTitle}* @ {$safeCompany}{$africa}"
                . "\n   {$locEmoji} {$locLabel}{$salaryLine}{$deadlineLine}";
}

$jobBlock = implode("\n\n", $jobLines);

// ✏️ CUSTOMIZE: stats block shown under the job list. Add/remove a line
// here to change what board stats appear in the weekly roundup.
$statsBlock = '📊 *Board this week:*'
            . "\n• {$newThisWeek} new roles added"
            . "\n• {$totalActive} total active listings"
            . "\n• {$africaFriendlyCount} Africa-friendly ✅"
            . "\n• {$africaRemoteCount} Africa Remote 🌍"
            . ($closingSoonCount > 0 ? "\n• {$closingSoonCount} closing within 7 days ⏰" : '');

// ✏️ CUSTOMIZE BELOW — everything inside this heredoc is the literal message
// sent to Telegram + Discord. {$jobBlock} and {$statsBlock} are generated
// above and should stay where they are; the surrounding text (headline,
// subtitle, CTA line, badge legend, closing footer) is yours to edit freely.
$message = <<<MSG
📋 *Weekly DevOps Jobs Roundup — {$weekEndDate}*
_Top roles this week for African engineers_

{$jobBlock}

──────────────────────
{$statsBlock}

👉 *Browse all roles → {$siteJobsUrl}*
⭐ = featured listing · ✅ = Africa-friendly · ⏰ = closing soon

💡 *Know someone job hunting?* Share this with them.
_New digest every morning at 9am EAT · Full roundup every Friday_
MSG;
// ── End of customizable message block ──────────────────────────────────────

// ── Send to each active channel ───────────────────────────────────────────────
$jobIds     = array_column($weeklyJobs, 'id');
$jobIdsJson = json_encode($jobIds);
$msgPreview = mb_substr(strip_tags($message), 0, 200);

foreach ($channelsToSend as $channel) {
    [$success, $error] = sendToChannel($channel, $message);

    $db->prepare("
        INSERT INTO notifications_log
            (channel, notification_type, job_ids, message_preview, sent_at, status, error)
        VALUES (:ch, 'weekly_roundup', :ids, :preview, NOW(), :status, :error)
    ")->execute([
        ':ch'      => $channel,
        ':ids'     => $jobIdsJson,
        ':preview' => $msgPreview,
        ':status'  => $success ? 'sent' : 'failed',
        ':error'   => $error,
    ]);

    if ($success) {
        echo "[notify_weekly] {$channel}: sent — " . \count($weeklyJobs) . " jobs included\n";
    } else {
        echo "[notify_weekly] {$channel}: FAILED — {$error}\n";
    }
}

echo "[notify_weekly] Done.\n";
