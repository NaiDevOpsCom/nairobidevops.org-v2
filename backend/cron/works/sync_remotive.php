<?php

declare(strict_types=1);

/**
 * cron/works/sync_remotive.php — thin wiring only.
 *
 *   CurlHttpClient -> RemotiveFetcher -> RemotiveNormalizer -> JobRepository
 *
 * No HTTP calls, JSON parsing, or SQL live in this file — that
 * belongs in the src/ classes. This file wires the pieces together, counts
 * what happened, and writes one row to sync_log.
 *
 * SSL verification is environment-driven — see
 * App\Http\CurlHttpClient::forEnvironment().
 *
 * Windows usage (from repo root):
 *   cd backend
 *   php cron\works\sync_remotive.php
 */

require_once \dirname(__DIR__, 2) . '/vendor/autoload.php';
require_once \dirname(__DIR__, 2) . '/db.php';

use App\Exception\SourceUnavailableException;
use App\Fetcher\RemotiveFetcher;
use App\Http\CurlHttpClient;
use App\Normalizer\RemotiveNormalizer;
use App\Repository\JobRepository;

$startTime = microtime(true);

$appEnv = \defined('APP_ENV') ? APP_ENV : null;

$httpClient = CurlHttpClient::forEnvironment($appEnv);
$fetcher    = new RemotiveFetcher($httpClient);
$normalizer = new RemotiveNormalizer();
$repository = new JobRepository(getDB());

$jobsFetched  = 0;
$jobsInserted = 0;
$jobsUpdated  = 0;
$jobsSkipped  = 0;
$errors       = [];
$status       = 'success';

// ── Fetch ──────────────────────────────────────────────────────────────────
try {
    $rawJobs     = $fetcher->fetch();
    $jobsFetched = \count($rawJobs);

    foreach ($fetcher->getCategoryErrors() as $categoryError) {
        $errors[] = "Category degraded: {$categoryError}";
    }
} catch (SourceUnavailableException $e) {
    $rawJobs = [];
    $errors[] = 'Remotive fully unavailable: ' . $e->getMessage();
    $status = 'failed';
}

// ── Normalize + persist ────────────────────────────────────────────────────
if ($rawJobs !== []) {
    $result = $normalizer->normalizeAll($rawJobs);

    foreach ($result['dropped'] as $dropped) {
        $errors[] = 'Dropped malformed record: ' . $dropped['reason'];
    }

    foreach ($result['normalized'] as $job) {
        try {
            $outcome = $repository->upsert($job);

            match ($outcome['action']) {
                'inserted' => $jobsInserted++,
                'updated' => $jobsUpdated++,
                'skipped_duplicate' => $jobsSkipped++,
            };

            if ($outcome['action'] === 'skipped_duplicate') {
                $errors[] = \sprintf(
                    'Cross-source duplicate skipped: "%s" @ %s (matches existing job id %d)',
                    $job['title'],
                    $job['company'],
                    $outcome['duplicate_of'],
                );
            }
        } catch (\Throwable $e) {
            $errors[] = "DB error for source_id {$job['source_id']}: " . $e->getMessage();
        }
    }
}

if ($status === 'success' && $errors !== []) {
    $status = 'partial';
}

// ── Log the run ──────────────────────────────────────────────────────────
$duration = (int) round(microtime(true) - $startTime);

$log = getDB()->prepare('
    INSERT INTO sync_log
        (source, jobs_fetched, jobs_inserted, jobs_updated, jobs_skipped, duration_sec, status, errors)
    VALUES
        (\'remotive\', :fetched, :inserted, :updated, :skipped, :duration, :status, :errors)
');
$log->execute([
    ':fetched'  => $jobsFetched,
    ':inserted' => $jobsInserted,
    ':updated'  => $jobsUpdated,
    ':skipped'  => $jobsSkipped,
    ':duration' => $duration,
    ':status'   => $status,
    ':errors'   => $errors === [] ? null : implode(' | ', \array_slice($errors, 0, 20)),
]);

// ── Output ───────────────────────────────────────────────────────────────
echo "[Remotive Sync] {$status} in {$duration}s (SSL verification: "
    . ($httpClient->verifiesSsl() ? 'ON' : 'OFF — local/dev only') . ")\n";
echo "  Jobs fetched  : {$jobsFetched}\n";
echo "  Jobs inserted : {$jobsInserted}\n";
echo "  Jobs updated  : {$jobsUpdated}\n";
echo "  Jobs skipped  : {$jobsSkipped} (cross-source duplicate)\n";
echo '  Errors        : ' . \count($errors) . "\n";

foreach ($errors as $error) {
    echo "  ! {$error}\n";
}

// ── Purge old sync_log rows for this source (keep only the most recent) ─
$logPrune = getDB()->prepare(
    "DELETE FROM sync_log
     WHERE source = 'remotive'
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM sync_log
           WHERE source = 'remotive'
           ORDER BY ran_at DESC
           LIMIT 1
         ) AS keep_me
       )"
);
$logPrune->execute();
