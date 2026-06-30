<?php

/**
 * sync_remotive.php — Fetch jobs from Remotive API.
 *
 * Windows usage (from repo root):
 *   cd backend
 *   php cron\works\sync_remotive.php
 *
 * What changed from v1:
 *  - Fetches ALL 5 categories instead of 3 — wider net
 *  - mapRoleType() is applied AFTER insert mapping, not as a gate
 *    meaning we never drop a job because the title didn't match a keyword
 *  - Salary parser handles Remotive's freeform salary string
 *  - description stored as-is (HTML) — frontend can strip tags when displaying
 *  - duration_sec logged per run
 */

require_once \dirname(__DIR__, 2) . '/db.php';
require_once \dirname(__DIR__, 2) . '/helpers.php';

$startTime = microtime(true);

// ── Remotive categories to fetch ──────────────────────────────────────────────
// Wider than before: we cast the net over everything DevOps-adjacent.
// mapRoleType() then classifies each job AFTER we decide to keep it.
// We never drop a job just because the category doesn't match a keyword.
// $categories = [
//     'devops-sysadmin',    // core DevOps / SRE / Sysadmin
//     'software-dev',       // backend/fullstack with Kubernetes/Terraform in description
//     'cloud',              // AWS / GCP / Azure roles
//     'backend',            // backend engineers who often need infra skills
//     'engineer',           // catches "Site Reliability Engineer", "Platform Engineer" etc.
// ];

$categories = [
    'devops-sysadmin',  // core — keep
    'software-dev',     // keep but add relevance filter below
    'cloud',            // keep — AWS/GCP/Azure roles
    // REMOVED: 'backend'   — too broad, pulls sales/writing/PM roles
    // REMOVED: 'engineer'  — too broad, pulls iOS/QA/data science roles
];

$db          = getDB();

$totalFetched  = 0;
$totalInserted = 0;
$totalSkipped  = 0;
$errors        = [];

// ── Pre-load existing source_ids to avoid per-job SELECT in the loop ──────────
$existing = [];
$stmt = $db->query("SELECT source_id FROM jobs WHERE source = 'remotive'");
foreach ($stmt->fetchAll() as $row) {
    $existing[$row['source_id']] = true;
}

// ── Fetch each category ───────────────────────────────────────────────────────
foreach ($categories as $category) {
    $url  = 'https://remotive.com/api/remote-jobs?category=' . urlencode($category) . '&limit=100';
    $jobs = fetchJSON($url);

    if (empty($jobs)) {
        $errors[] = "No data returned for category: {$category}";
        continue;
    }

    $totalFetched += \count($jobs);

    foreach ($jobs as $job) {
        $sourceId = (string) ($job['id'] ?? '');

        if (empty($sourceId)) {
            $errors[] = "Job missing id in category {$category}";
            continue;
        }

        // Skip if already in DB (in-memory check — no extra SELECT per job)
        if (isset($existing[$sourceId])) {
            $totalSkipped++;
            continue;
        }

        try {
            // ── Map fields ────────────────────────────────────────────────────
            $title       = sanitizeString($job['title']          ?? '');
            $company     = sanitizeString($job['company_name']   ?? '');

            // ── Relevance filter — reject non-DevOps jobs ─────────────────────────
            // Only keep jobs whose title contains at least one DevOps-relevant keyword.
            // This matters most for the broad 'software-dev' category.
            $devopsKeywords = [
                'devops', 'sre', 'site reliability', 'platform engineer', 'platform eng',
                'cloud', 'infrastructure', 'infra', 'kubernetes', 'k8s', 'terraform',
                'ci/cd', 'cicd', 'docker', 'ansible', 'helm', 'aws', 'gcp', 'azure',
                'devsecops', 'security engineer', 'sysadmin', 'systems admin',
                'network engineer', 'mlops', 'dataops', 'reliability engineer',
                'automation engineer', 'staff engineer', 'principal engineer',
                'solutions architect', 'cloud architect', 'backend engineer',
                'software engineer', 'fullstack', 'full stack', 'full-stack',
                'frontend engineer', 'front-end engineer',
            ];

            $titleLower = strtolower($title);
            $isRelevant = false;
            foreach ($devopsKeywords as $kw) {
                if (str_contains($titleLower, $kw)) {
                    $isRelevant = true;
                    break;
                }
            }

            if (!$isRelevant) {
                $totalSkipped++;
                continue; // skip Copywriter, Head of Sales, Office Assistant, etc.
            }
            // ── End relevance filter ───────────────────────────────────────────────


            $logoUrl     = sanitizeString($job['company_logo']   ?? '');
            $applyUrl    = sanitizeString($job['url']            ?? '');
            $description = $job['description']                   ?? ''; // keep HTML
            $postedAt    = $job['publication_date']              ?? null;
            $tagsRaw     = $job['tags']                          ?? [];

            if (empty($title) || empty($applyUrl)) {
                $errors[] = "Skipped job {$sourceId} — missing title or URL";
                continue;
            }

            // role_type — derived from title first, then fall back to category
            // Never drop a job because mapRoleType() returns 'DevOps' — that's
            // the correct catch-all, not a filtering gate.
            $roleType = mapRoleType($title);

            // Affiliate URL
            $affiliateUrl = buildAffiliateUrl($applyUrl, 'remotive');

            // Tags — Remotive returns them as strings already
            $tags = [];
            foreach ($tagsRaw as $tag) {
                $clean = sanitizeString(\is_string($tag) ? $tag : ($tag['name'] ?? ''));
                if ($clean !== '') {
                    $tags[] = strtolower($clean);
                }
            }
            $tagsJson = json_encode(array_values(array_unique($tags)));

            // Salary — Remotive provides a freeform string like "$4,000 - $6,000"
            // parseSalary() returns named keys; annual values are normalised to monthly.
            $salary        = parseSalary($job['salary'] ?? '');
            $salaryMin     = $salary['salary_min'];
            $salaryMax     = $salary['salary_max'];
            $salaryCurrency = $salary['salary_currency'];

            // posted_at — Remotive uses ISO 8601
            $postedAtFormatted = null;
            if ($postedAt) {
                $ts = strtotime($postedAt);
                if ($ts !== false) {
                    $postedAtFormatted = date('Y-m-d H:i:s', $ts);
                }
            }

            // ── Insert ────────────────────────────────────────────────────────
            $insert = $db->prepare("
                INSERT INTO jobs (
                    title, company, company_logo_url, description,
                    apply_url, affiliate_apply_url,
                    source, source_id,
                    role_type, location_type,
                    africa_friendly,
                    salary_min, salary_max, salary_currency, salary_period,
                    tags,
                    posted_at, fetched_at,
                    is_active, is_approved, is_notified
                ) VALUES (
                    :title, :company, :logo, :description,
                    :apply_url, :affiliate_url,
                    'remotive', :source_id,
                    :role_type, 'international_remote',
                    0,
                    :salary_min, :salary_max, :salary_currency, 'monthly',
                    :tags,
                    :posted_at, NOW(),
                    1, 1, 0
                )
            ");

            $insert->execute([
                ':title'         => $title,
                ':company'       => $company,
                ':logo'          => $logoUrl ?: null,
                ':description'   => $description,
                ':apply_url'     => $applyUrl,
                ':affiliate_url' => $affiliateUrl !== $applyUrl ? $affiliateUrl : null,
                ':source_id'     => $sourceId,
                ':role_type'     => $roleType,
                ':salary_min'    => $salaryMin,
                ':salary_max'    => $salaryMax,
                ':salary_currency' => $salaryCurrency,
                ':tags'          => $tagsJson,
                ':posted_at'     => $postedAtFormatted,
            ]);

            $existing[$sourceId] = true; // prevent re-insert if same job in multiple categories
            $totalInserted++;

        } catch (PDOException $e) {
            // Duplicate key = already in DB (race condition or category overlap) — not an error
            if ($e->getCode() === '23000') {
                $totalSkipped++;
                $existing[$sourceId] = true;
            } else {
                $errors[] = "DB error for job {$sourceId}: " . $e->getMessage();
            }
        } catch (Throwable $e) {
            $errors[] = "Unexpected error for job {$sourceId}: " . $e->getMessage();
        }
    }

    // Brief pause between category fetches — be a polite API citizen
    usleep(500_000); // 0.5 seconds
}

// ── Log to sync_log ───────────────────────────────────────────────────────────
$duration = (int) round(microtime(true) - $startTime);
$errorsStr = empty($errors) ? null : implode(' | ', \array_slice($errors, 0, 10));

$log = $db->prepare("
    INSERT INTO sync_log
        (source, jobs_fetched, jobs_inserted, jobs_skipped, duration_sec, errors)
    VALUES
        ('remotive', :fetched, :inserted, :skipped, :duration, :errors)
");
$log->execute([
    ':fetched'  => $totalFetched,
    ':inserted' => $totalInserted,
    ':skipped'  => $totalSkipped,
    ':duration' => $duration,
    ':errors'   => $errorsStr,
]);

// ── Output (visible when run manually via CLI) ────────────────────────────────
echo "[Remotive Sync] Done in {$duration}s\n";
echo '  Categories fetched : ' . \count($categories) . "\n";
echo "  Jobs fetched       : {$totalFetched}\n";
echo "  Jobs inserted      : {$totalInserted}\n";
echo "  Jobs skipped       : {$totalSkipped} (already in DB)\n";
echo '  Errors             : ' . \count($errors) . "\n";

if (!empty($errors)) {
    foreach ($errors as $err) {
        echo "  ! {$err}\n";
    }
}

// parseSalaryString() is defined in helpers.php
