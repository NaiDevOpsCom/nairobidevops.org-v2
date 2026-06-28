<?php

/**
 * sync_remotive.php
 * Fetches DevOps-adjacent jobs from the Remotive public API.
 *
 * Run every 6 hours via cPanel cron, or manually via CLI:
 *   php cron/sync_remotive.php
 *
 * Goals
 * ─────
 *   • Only store jobs relevant to the Nairobi DevOps community
 *   • Skip jobs whose location restrictions exclude Africa
 *   • Flag jobs that explicitly welcome Africa as africa_friendly = 1
 *   • Harden all I/O: validated inputs, typed constants, no raw interpolation
 *   • Stay non-breaking: same DB schema, same helpers.php surface
 *
 * No Remotive account needed to fetch. Affiliate ID is optional —
 * leave REMOTIVE_AFFILIATE_ID empty in config and affiliate URLs
 * will just match the regular apply URL.
 */

declare(strict_types=1);

// ── Bootstrap ────────────────────────────────────────────────────────────────

$basePath = __DIR__ . '/../../';
require_once $basePath . 'db.php';
require_once $basePath . 'helpers.php';

$startTime = time();

// ── Config ───────────────────────────────────────────────────────────────────

/**
 * Remotive categories to pull.
 *
 * Rationale for each:
 *   devops-sysadmin     → core DevOps/SRE audience; always included
 *   cloud               → cloud platform/infra roles; always included
 *   software-dev        → broad; gated by DEVOPS_TITLE_KEYWORDS below
 *   data-analyst        → data engineering + analytics; gated by DATA_ANALYTICS_KEYWORDS
 *   ai-ml               → AI/ML engineers; gated by AI_ML_KEYWORDS
 *   project-manager     → project/scrum/agile roles; gated by PROJECT_MANAGEMENT_KEYWORDS
 *   product-manager     → product management; gated by PRODUCT_MANAGEMENT_KEYWORDS
 *   operations          → ops engineers and operations; gated by OPERATIONS_KEYWORDS
 *   design              → UX/UI/product design; gated by DESIGN_KEYWORDS
 *   business-development → BD and account management; gated by BUSINESS_DEVELOPMENT_KEYWORDS
 *
 * To add a new category, append its Remotive slug here and add its
 * keyword set to CATEGORY_KEYWORDS_MAP — no other change is required.
 */
const REMOTIVE_CATEGORIES = [
    'devops-sysadmin',
    'cloud',
    'software-dev',
    'data-analyst',
    'ai-ml',
    'project-manager',
    'product-manager',
    'operations',
    'design',
    'business-development',
];

/**
 * Title keywords that signal a role is relevant to DevOps/SRE.
 * Lowercase; matched case-insensitively against the job title.
 * Add new terms here as the community's skill set evolves.
 */
const DEVOPS_TITLE_KEYWORDS = [
    'devops',
    'sre',
    'site reliability',
    'platform engineer',
    'infrastructure',
    'cloud engineer',
    'cloud architect',
    'kubernetes',
    'k8s',
    'terraform',
    'ci/cd',
    'pipeline',
    'systems engineer',
    'backend engineer',    // many Nairobi DevOps engineers cross over into backend
    'reliability engineer',
    'automation engineer',
];

/**
 * Title keywords for data analytics and data engineering roles.
 */
const DATA_ANALYTICS_KEYWORDS = [
    'data analyst',
    'analytics',
    'data engineer',
    'analytics engineer',
    'bi engineer',
    'business intelligence',
    'data scientist',
    'etl',
    'data pipeline',
    'sql',
    'tableau',
    'power bi',
];

/**
 * Title keywords for AI and machine learning roles.
 */
const AI_ML_KEYWORDS = [
    'ai engineer',
    'machine learning',
    'ml engineer',
    'deep learning',
    'nlp',
    'natural language',
    'computer vision',
    'llm',
    'generative ai',
    'neural network',
];

/**
 * Title keywords for project management and agile roles.
 */
const PROJECT_MANAGEMENT_KEYWORDS = [
    'project manager',
    'scrum master',
    'agile',
    'pmo',
    'product owner',
    'delivery manager',
    'program manager',
    'team lead',
];

/**
 * Title keywords for product management roles.
 */
const PRODUCT_MANAGEMENT_KEYWORDS = [
    'product manager',
    'product lead',
    ' pm ',          // word-boundary spacing to avoid false positives (e.g. "npm", "rpm")
    'head of product',
    'senior pm',
    'associate product',
];

/**
 * Title keywords for operations and ops engineering roles.
 */
const OPERATIONS_KEYWORDS = [
    'operations',
    'ops engineer',
    'operations manager',
    'ops manager',
    'operations lead',
    'process engineer',
    'compliance officer',
];

/**
 * Title keywords for design roles (UX/UI/product design).
 */
const DESIGN_KEYWORDS = [
    'designer',
    'ux designer',
    'ui designer',
    'product designer',
    'design lead',
    'interaction designer',
    'ux/ui',
    'user experience',
    'visual designer',
];

/**
 * Title keywords for business development roles.
 */
const BUSINESS_DEVELOPMENT_KEYWORDS = [
    'business development',
    'bd manager',
    'account manager',
    'account executive',
    'sales engineer',
    'partnerships',
    'growth manager',
    'business ops',
];

/**
 * Maps each broad Remotive category slug to its title-keyword array.
 * Used by the generic relevance gate to filter jobs from broad categories.
 */
const CATEGORY_KEYWORDS_MAP = [
    'software-dev'         => DEVOPS_TITLE_KEYWORDS,
    'data-analyst'         => DATA_ANALYTICS_KEYWORDS,
    'ai-ml'                => AI_ML_KEYWORDS,
    'project-manager'      => PROJECT_MANAGEMENT_KEYWORDS,
    'product-manager'      => PRODUCT_MANAGEMENT_KEYWORDS,
    'operations'           => OPERATIONS_KEYWORDS,
    'design'               => DESIGN_KEYWORDS,
    'business-development' => BUSINESS_DEVELOPMENT_KEYWORDS,
];

/**
 * Location strings that signal the role explicitly welcomes applicants
 * from Africa. Matched case-insensitively against candidate_required_location.
 *
 * "EMEA" is included because it covers Europe, Middle East, AND Africa —
 * Remotive jobs marked EMEA are overwhelmingly hirable from Kenya.
 */
const AFRICA_POSITIVE_SIGNALS = [
    'africa',
    'kenya',
    'nigeria',
    'ghana',
    'south africa',
    'egypt',
    'ethiopia',
    'tanzania',
    'uganda',
    'rwanda',
    'nairobi',
    'lagos',
    'accra',
    'cairo',
    'emea',          // Europe / Middle East / Africa — Africa is in scope
    'worldwide',     // truly global
    'anywhere',      // truly global
];

/**
 * Location strings that signal the role EXCLUDES Africa.
 * When any of these appear in candidate_required_location and no Africa-
 * positive signal is also present, the job is skipped entirely.
 *
 * Add new geo-restrictions here as you encounter them in Remotive data.
 * The classifier checks positive signals first, so "EMEA and Americas"
 * (an unusual but real format) would still pass as africa_friendly.
 */
const AFRICA_EXCLUDE_SIGNALS = [
    'americas',
    'north america',
    'south america',
    'latin america',
    'latam',
    'usa only',
    'us only',
    'united states only',
    'canada only',
    'europe only',
    'eu only',
    'european union',
    'asia',
    'apac',
    'asia pacific',
    'australia',
    'new zealand',
    'israel',
    'middle east',   // without Africa mentioned alongside
    'brazil',
    'mexico',
    'argentina',
    'colombia',
    'chile',
    'peru',
];

/**
 * Standalone country names and major cities where jobs are located.
 * Used for exact-match classification when candidate_required_location
 * is a single country/city (e.g., "Brazil" vs. a phrase like "Latin America").
 * Matched case-insensitively via in_array(..., true) with strtolower.
 */
const LOCATION_COUNTRIES = [
    // Latin America
    'brazil', 'united states', 'usa', 'canada', 'mexico', 'argentina',
    'colombia', 'chile', 'peru', 'uruguay', 'venezuela',
    // Europe
    'united kingdom', 'uk', 'germany', 'france', 'spain', 'italy',
    'netherlands', 'portugal', 'poland', 'sweden', 'norway', 'denmark',
    'finland', 'switzerland', 'austria', 'belgium', 'ireland', 'ukraine',
    'czech republic', 'romania', 'hungary',
    // Asia-Pacific
    'australia', 'new zealand', 'india', 'china', 'japan', 'singapore',
    'south korea', 'taiwan', 'vietnam', 'indonesia', 'malaysia', 'thailand',
    // Middle East
    'israel', 'turkey', 'uae', 'united arab emirates', 'saudi arabia',
    // Brazilian cities (most common in Remotive data — expand as needed)
    'são paulo', 'sao paulo', 'rio de janeiro',
    'florianópolis', 'florianopolis', 'porto alegre',
    'campinas', 'belo horizonte', 'brasília', 'brasilia', 'curitiba',
    // US cities
    'new york', 'san francisco', 'austin', 'seattle', 'chicago', 'boston',
    'los angeles', 'denver', 'atlanta', 'miami',
];

const REMOTIVE_BASE_URL = 'https://remotive.com/api/remote-jobs';
const USER_AGENT        = 'NairobiDevOps JobsBot/1.0 (nairobidevops.org)';
const JOBS_PER_CATEGORY = 100;   // Remotive max per request
const SLEEP_BETWEEN_REQUESTS = 2; // seconds; polite to the API

// ── Counters (logged to sync_log at the end) ─────────────────────────────────

$totalFetched        = 0;
$totalInserted       = 0;
$totalSkipped        = 0;
$totalExcluded       = 0; // jobs skipped specifically because they exclude Africa
$errors              = [];

// ── DB connection ─────────────────────────────────────────────────────────────

$db = getDB();

// ── Dedicated exception for Remotive API failures ────────────────────────────

class RemotiveApiException extends RuntimeException
{
}

// ── SSL guard ─────────────────────────────────────────────────────────────────

/**
 * Determine whether SSL verification should be disabled for outbound HTTP calls.
 *
 * When APP_ENV is 'production' or 'staging' SSL verification is ALWAYS
 * enforced — no env var can bypass it. On local/development environments
 * the DISABLE_SSL_VERIFY env var is respected for testing.
 *
 * @return bool True if SSL verification should be skipped.
 */
function shouldDisableSslVerification(): bool
{
    $env = getenv('APP_ENV');

    // Production and staging must never bypass SSL verification
    if ($env === 'production' || $env === 'staging') {
        return false;
    }

    return filter_var(getenv('DISABLE_SSL_VERIFY'), FILTER_VALIDATE_BOOLEAN);
}

// ── Transport: cURL (preferred) ───────────────────────────────────────────────

/**
 * Fetch a URL via cURL.
 *
 * SSL peer/host verification is enabled. On production and staging
 * it is enforced unconditionally; on local dev it can be disabled
 * via the DISABLE_SSL_VERIFY env var.
 *
 * @throws RemotiveApiException on network or HTTP error
 */
function fetchViaCurl(string $url, string $userAgent): string
{
    // Validate URL before passing to cURL
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        throw new RemotiveApiException("Invalid URL passed to fetchViaCurl: {$url}");
    }

    $disableSsl = shouldDisableSslVerification();

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'User-Agent: ' . $userAgent,
        ],
        // Only bypass SSL when explicitly opted-in via environment variable.
        // On production this env var should never be set.
        CURLOPT_SSL_VERIFYPEER => !$disableSsl,
        CURLOPT_SSL_VERIFYHOST => $disableSsl ? 0 : 2,
        // Prevent response-header injection / SSRF via redirects
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_MAXREDIRS      => 0,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    if (\PHP_VERSION_ID < 80000) {
        curl_close($ch);
    }

    if ($curlErr) {
        throw new RemotiveApiException("cURL error for {$url}: {$curlErr}");
    }

    if ($httpCode !== 200) {
        throw new RemotiveApiException("HTTP {$httpCode} from Remotive for {$url}");
    }

    return $response;
}

// ── Transport: stream (fallback when cURL unavailable) ────────────────────────

/**
 * Fetch a URL via file_get_contents / stream context.
 *
 * @throws RemotiveApiException on network or HTTP error
 */
function fetchViaStream(string $url, string $userAgent): string
{
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        throw new RemotiveApiException("Invalid URL passed to fetchViaStream: {$url}");
    }

    $disableSsl = shouldDisableSslVerification();

    $options = [
        'http' => [
            'method'        => 'GET',
            'header'        => "Accept: application/json\r\nUser-Agent: {$userAgent}\r\n",
            'timeout'       => 60,
            'ignore_errors' => true,
            'follow_location' => 0, // no redirects
        ],
        'ssl' => [
            'verify_peer'      => !$disableSsl,
            'verify_peer_name' => !$disableSsl,
        ],
    ];

    $context  = stream_context_create($options);
    $response = file_get_contents($url, false, $context);

    if ($response === false) {
        throw new RemotiveApiException("file_get_contents failed to retrieve {$url}");
    }

    $httpCode = 500;
    // PHP 8.5+: $http_response_header is deprecated; use the new function.
    $responseHeaders = \function_exists('http_get_last_response_headers')
        ? http_get_last_response_headers()
        : ($http_response_header ?? []); // @phpstan-ignore-line
    if (!empty($responseHeaders)) {
        preg_match('{HTTP\/\S*\s(\d\d\d)}', $responseHeaders[0], $matches);
        if (isset($matches[1])) {
            $httpCode = (int) $matches[1];
        }
    }

    if ($httpCode !== 200) {
        throw new RemotiveApiException("HTTP {$httpCode} from Remotive for {$url}");
    }

    return $response;
}

// ── Helper: fetch one Remotive category ──────────────────────────────────────

/**
 * Fetch and JSON-decode one Remotive category endpoint.
 * Delegates to cURL when available, falls back to stream transport.
 *
 * @return array<int, array<string, mixed>>
 * @throws RemotiveApiException
 */
function fetchRemotiveCategory(string $url, string $userAgent): array
{
    $response = \function_exists('curl_init')
        ? fetchViaCurl($url, $userAgent)
        : fetchViaStream($url, $userAgent);

    // Guard against unexpectedly large payloads (> 5 MB = likely error page)
    if (\strlen($response) > 5 * 1024 * 1024) {
        throw new RemotiveApiException("Response too large (> 5 MB) for {$url} — possible error page");
    }

    $data = json_decode($response, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RemotiveApiException("JSON decode failed for {$url}: " . json_last_error_msg());
    }

    if (!\is_array($data)) {
        throw new RemotiveApiException("Unexpected JSON root type for {$url}");
    }

    return $data['jobs'] ?? [];
}

// ── Helper: HTML → plain text ─────────────────────────────────────────────────

// cleanDescription() is defined in helpers.php and required above.
// See that file for the full implementation and step-by-step comments.

// ── Helper: deduplication ─────────────────────────────────────────────────────

/**
 * Return true if a Remotive job with the given source_id already exists in DB.
 */
function jobExists(PDO $db, string $sourceId): bool
{
    $stmt = $db->prepare(
        "SELECT id FROM jobs WHERE source = 'remotive' AND source_id = ? LIMIT 1"
    );
    $stmt->execute([$sourceId]);
    return (bool) $stmt->fetch();
}

// ── Helper: refresh an existing job row ───────────────────────────────────────

/**
 * Keep already-stored jobs clean across re-syncs without re-inserting them.
 *
 * Updates:
 *   • description        — when it has changed
 *   • affiliate_apply_url — when NULL and an affiliate ID is now configured
 *   • location_detail     — when NULL and we now have a value
 *   • africa_friendly     — backfill to 1 when location now qualifies
 */
function refreshJob(
    PDO    $db,
    string $sourceId,
    string $cleanDesc,
    string $applyUrl,
    string $locationDetail,
    int    $africaFriendly
): void {
    // Refresh description when it has changed or was NULL
    $stmt = $db->prepare(
        "UPDATE jobs
            SET description = :desc
          WHERE source = 'remotive'
            AND source_id = :sid
            AND (description IS NULL OR description != :desc2)"
    );
    $stmt->execute([':desc' => $cleanDesc, ':sid' => $sourceId, ':desc2' => $cleanDesc]);

    // Backfill affiliate URL when we now have an affiliate ID but stored NULL
    $affiliateUrl = buildAffiliateUrl($applyUrl, 'remotive');
    if ($affiliateUrl !== $applyUrl) {
        $stmt2 = $db->prepare(
            "UPDATE jobs
                SET affiliate_apply_url = :aff_url
              WHERE source = 'remotive'
                AND source_id = :sid
                AND affiliate_apply_url IS NULL"
        );
        $stmt2->execute([':aff_url' => $affiliateUrl, ':sid' => $sourceId]);
    }

    // Backfill location_detail when it was stored as NULL
    if ($locationDetail !== '') {
        $stmt3 = $db->prepare(
            "UPDATE jobs
                SET location_detail = :loc_detail
              WHERE source = 'remotive'
                AND source_id = :sid
                AND location_detail IS NULL"
        );
        $stmt3->execute([':loc_detail' => $locationDetail, ':sid' => $sourceId]);
    }

    // Backfill africa_friendly = 1 for rows stored before this classifier existed
    if ($africaFriendly === 1) {
        $stmt4 = $db->prepare(
            "UPDATE jobs
                SET africa_friendly = 1
              WHERE source = 'remotive'
                AND source_id = :sid
                AND africa_friendly = 0"
        );
        $stmt4->execute([':sid' => $sourceId]);
    }
}

// ── Helper: Africa eligibility classifier ────────────────────────────────────

/**
 * Extract a location hint from the last parenthetical segment of a job title.
 *
 * Many Remotive job titles encode the target city in parentheses, e.g.
 * "Staff Software Engineer, Product (São Paulo)". When candidate_required_location
 * is empty, this hint is used as a secondary classification signal.
 *
 * @param string $title The raw job title.
 * @return string       Lowercased location hint, or empty string if none found.
 */
function extractLocationFromTitle(string $title): string
{
    if (preg_match('/\(([^)]+)\)\s*$/', trim($title), $matches) === 1) {
        return strtolower(trim($matches[1]));
    }
    return '';
}

// ── Helper: Africa eligibility classifier ────────────────────────────────────

/**
 * Return true if the location string contains any Africa-positive signal.
 *
 * @param string $loc Lowercased, trimmed location string.
 * @return bool
 */
function matchesPositiveSignal(string $loc): bool
{
    foreach (AFRICA_POSITIVE_SIGNALS as $signal) {
        if (str_contains($loc, $signal)) {
            return true;
        }
    }
    return false;
}

/**
 * Return true if the location string exactly matches a known non-African country or city.
 *
 * @param string $loc Lowercased, trimmed location string.
 * @return bool
 */
function matchesExactCountry(string $loc): bool
{
    return \in_array($loc, LOCATION_COUNTRIES, true);
}

/**
 * Return true if the location string contains any Africa-exclusion signal phrase.
 *
 * @param string $loc Lowercased, trimmed location string.
 * @return bool
 */
function matchesExcludeSignal(string $loc): bool
{
    foreach (AFRICA_EXCLUDE_SIGNALS as $signal) {
        if (str_contains($loc, $signal)) {
            return true;
        }
    }
    return false;
}

/**
 * Classify whether a job is eligible for the Nairobi DevOps community.
 *
 * Checks both the candidate_required_location field and a secondary title hint
 * (the city name extracted from title parentheses). Positive signals always
 * take priority over exclusion signals.
 *
 * @param string $locationDetail The candidate_required_location from Remotive.
 * @param string $titleHint      Lowercased location hint extracted from the job title.
 * @return string                'africa_friendly' | 'neutral' | 'exclude_africa'
 */
function classifyAfricaEligibility(string $locationDetail, string $titleHint = ''): string
{
    $loc  = strtolower(trim($locationDetail));
    $hint = strtolower(trim($titleHint));

    $result = 'neutral';

    if ($loc !== '' || $hint !== '') {
        if (matchesPositiveSignal($loc) || matchesPositiveSignal($hint)) {
            $result = 'africa_friendly';
        } elseif (matchesExactCountry($loc) || matchesExactCountry($hint)) {
            $result = 'exclude_africa';
        } elseif (matchesExcludeSignal($loc) || matchesExcludeSignal($hint)) {
            $result = 'exclude_africa';
        }
    }

    return $result;
}

// ── Helper: DevOps relevance gate ────────────────────────────────────────────

/**
 * Return true if a job title matches at least one keyword from the
 * keyword set associated with the given Remotive category.
 *
 * Broad categories (those with keyword sets in CATEGORY_KEYWORDS_MAP)
 * are filtered by their respective keywords. Narrow categories such
 * as devops-sysadmin and cloud let every title through.
 *
 * @param string $title    The job title (raw, not sanitized).
 * @param string $category The Remotive category slug.
 * @return bool
 */
function isRelevantForCategory(string $title, string $category): bool
{
    if (!isset(CATEGORY_KEYWORDS_MAP[$category])) {
        return true; // narrow category — no keyword gate
    }

    $lower = strtolower($title);
    foreach (CATEGORY_KEYWORDS_MAP[$category] as $kw) {
        if (str_contains($lower, $kw)) {
            return true;
        }
    }
    return false;
}

// ── Salary helpers ────────────────────────────────────────────────────────────
//
// detectCurrency(), detectPeriod(), extractSalaryNumbers(), and parseSalary()
// are defined in helpers.php and available via the require_once above.
// They are shared with sync_wwremote.php.

// ── Prepared INSERT statement (built once, reused for every new job) ──────────

$insertStmt = $db->prepare("
    INSERT INTO jobs (
        title,
        company,
        company_logo_url,
        description,
        apply_url,
        affiliate_apply_url,
        source,
        source_id,
        role_type,
        location_type,
        location_detail,
        africa_friendly,
        salary_min,
        salary_max,
        salary_currency,
        salary_period,
        tags,
        posted_at,
        is_active,
        is_approved,
        is_notified
    ) VALUES (
        :title,
        :company,
        :company_logo_url,
        :description,
        :apply_url,
        :affiliate_apply_url,
        'remotive',
        :source_id,
        :role_type,
        'international_remote',
        :location_detail,
        :africa_friendly,
        :salary_min,
        :salary_max,
        :salary_currency,
        :salary_period,
        :tags,
        :posted_at,
        1,
        1,
        0
    )
");

// ── Main sync loop ────────────────────────────────────────────────────────────

foreach (REMOTIVE_CATEGORIES as $category) {
    $url = REMOTIVE_BASE_URL . '?category=' . urlencode($category) . '&limit=' . JOBS_PER_CATEGORY;

    echo "Fetching category: {$category} ...\n";

    try {
        $jobs = fetchRemotiveCategory($url, USER_AGENT);
    } catch (RemotiveApiException $e) {
        $msg = "FETCH ERROR [{$category}]: " . $e->getMessage();
        echo $msg . "\n";
        $errors[] = $msg;
        continue;
    }

    $categoryCount  = \count($jobs);
    $totalFetched  += $categoryCount;
    echo "  → {$categoryCount} jobs returned\n";

    foreach ($jobs as $job) {
        // ── Validate minimum required fields ──────────────────────────────────
        // Cast to string after null-coalescing so sanitizeString always receives a string.
        $sourceId = (string) ($job['id'] ?? '');
        $title    = sanitizeString((string) ($job['title']        ?? ''));
        $company  = sanitizeString((string) ($job['company_name'] ?? ''));
        $applyUrl = trim((string) ($job['url'] ?? ''));

        if ($sourceId === '' || $title === '' || $company === '' || $applyUrl === '') {
            $totalSkipped++;
            continue;
        }

        // Reject malformed apply URLs — prevents storing garbage links
        if (filter_var($applyUrl, FILTER_VALIDATE_URL) === false) {
            $totalSkipped++;
            echo "  ✗ Skipped (invalid apply URL): {$title} @ {$company}\n";
            continue;
        }

        // ── Category-specific relevance gate (broad categories only) ──────────
        // Keeps off-topic noise (e.g., frontend in software-dev, sales in design)
        // from polluting the board. Narrow categories like devops-sysadmin and
        // cloud let every title through.
        if (!isRelevantForCategory($title, $category)) {
            $totalSkipped++;
            continue;
        }

        // Final gate — if mapRoleType returns 'Other', the title has no
        // DevOps-adjacent keywords. Skip regardless of category.
        if (mapRoleType($title) === 'Other') {
            $totalSkipped++;
            continue;
        }

        // ── Africa eligibility gate ───────────────────────────────────────────
        $locationDetail    = sanitizeString((string) ($job['candidate_required_location'] ?? ''));
        $titleHint         = extractLocationFromTitle($title);
        $africaEligibility = classifyAfricaEligibility($locationDetail, $titleHint);

        if ($africaEligibility === 'exclude_africa') {
            $totalExcluded++;
            echo "  ✗ Excluded (restricts Africa): {$title} @ {$company} [{$locationDetail}]\n";
            continue;
        }

        $africaFriendly = ($africaEligibility === 'africa_friendly') ? 1 : 0;

        // ── Map remaining fields ──────────────────────────────────────────────
        $roleType     = mapRoleType($title);
        $affiliateUrl = buildAffiliateUrl($applyUrl, 'remotive');
        $logoUrl      = trim((string) ($job['company_logo'] ?? ''));
        $parsedTime   = strtotime((string) ($job['publication_date'] ?? ''));
        $postedAt     = date('Y-m-d H:i:s', $parsedTime !== false ? $parsedTime : time());
        $salary       = parseSalary((string) ($job['salary'] ?? ''));
        $description  = cleanDescription((string) ($job['description'] ?? ''));

        // Tags: Remotive returns an array of strings; encode as JSON for storage
        $rawTags = \is_array($job['tags'] ?? null) ? $job['tags'] : [];
        $tags    = json_encode(
            array_values(
                array_filter(
                    array_map('trim', $rawTags),
                    static fn (string $t): bool => $t !== ''
                )
            ),
            JSON_UNESCAPED_UNICODE
        );

        // ── Deduplication ─────────────────────────────────────────────────────
        if (jobExists($db, $sourceId)) {
            refreshJob($db, $sourceId, $description, $applyUrl, $locationDetail, $africaFriendly);
            $totalSkipped++;
            continue;
        }

        // ── Input length guards (truncate to column max lengths) ────────────────
        $title          = mb_substr($title, 0, 255);
        $company        = mb_substr($company, 0, 255);
        $locationDetail = mb_substr($locationDetail, 0, 255);

        // ── Insert ────────────────────────────────────────────────────────────
        try {
            $insertStmt->execute([
                ':title'               => $title,
                ':company'             => $company,
                ':company_logo_url'    => $logoUrl !== '' ? $logoUrl : null,
                ':description'         => $description,
                ':apply_url'           => $applyUrl,
                ':affiliate_apply_url' => $affiliateUrl !== $applyUrl ? $affiliateUrl : null,
                ':source_id'           => $sourceId,
                ':role_type'           => $roleType,
                ':location_detail'     => $locationDetail !== '' ? $locationDetail : null,
                ':africa_friendly'     => $africaFriendly,
                ':salary_min'          => $salary['salary_min'],
                ':salary_max'          => $salary['salary_max'],
                ':salary_currency'     => $salary['salary_currency'],
                ':salary_period'       => $salary['salary_period'],
                ':tags'                => $tags,
                ':posted_at'           => $postedAt,
            ]);
            $totalInserted++;
        } catch (PDOException $e) {
            // Duplicate key from a race condition — safe to treat as a skip
            if ($e->getCode() === '23000') {
                $totalSkipped++;
            } else {
                $msg = "INSERT ERROR [job {$sourceId}]: " . $e->getMessage();
                echo $msg . "\n";
                $errors[] = $msg;
            }
        }
    }

    echo "  ✓ Category done. Inserted so far: {$totalInserted}\n\n";

    // Polite delay between category requests
    if ($category !== REMOTIVE_CATEGORIES[array_key_last(REMOTIVE_CATEGORIES)]) {
        sleep(SLEEP_BETWEEN_REQUESTS);
    }
}

// ── Cleanup pass: deactivate jobs now known to exclude Africa ────────────────

/**
 * Re-classify already-stored Remotive jobs and deactivate those that now
 * match exclude_africa criteria. This handles cases where:
 *   • We missed an exclusion signal before
 *   • Job location details have been clarified since the last sync
 *   • Title hints weren't previously extracted from the DB
 */
$totalDeactivated = 0;

try {
    $storedJobs = $db->prepare(
        "SELECT id, title, location_detail
           FROM jobs
          WHERE source = 'remotive'
            AND is_active = 1"
    );
    $storedJobs->execute();

    $deactivateStmt = $db->prepare(
        'UPDATE jobs SET is_active = 0 WHERE id = :id'
    );

    foreach ($storedJobs->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $hint        = extractLocationFromTitle((string) $row['title']);
        $eligibility = classifyAfricaEligibility((string) $row['location_detail'], $hint);
        if ($eligibility === 'exclude_africa') {
            $deactivateStmt->execute([':id' => (int) $row['id']]);
            $totalDeactivated++;
        }
    }
} catch (PDOException $e) {
    $msg = 'CLEANUP ERROR: ' . $e->getMessage();
    echo $msg . "\n";
    $errors[] = $msg;
}

// ── Log run to sync_log ───────────────────────────────────────────────────────

$duration  = time() - $startTime;
$errorText = empty($errors) ? null : implode("\n", $errors);

$logStmt = $db->prepare("
    INSERT INTO sync_log (source, jobs_fetched, jobs_inserted, jobs_skipped, duration_sec, errors)
    VALUES ('remotive', :fetched, :inserted, :skipped, :duration, :errors)
");
$logStmt->execute([
    ':fetched'  => $totalFetched,
    ':inserted' => $totalInserted,
    ':skipped'  => $totalSkipped + $totalExcluded,
    ':duration' => $duration,
    ':errors'   => $errorText,
]);

// ── Summary ───────────────────────────────────────────────────────────────────

echo "─────────────────────────────────\n";
echo "Remotive sync complete\n";
echo "  Fetched:     {$totalFetched}\n";
echo "  Inserted:    {$totalInserted}\n";
echo "  Excluded:    {$totalExcluded}  (location restricts Africa)\n";
echo "  Deactivated: {$totalDeactivated}  (reclassified as exclude_africa)\n";
echo "  Skipped:     {$totalSkipped}  (duplicates, invalid fields, or off-topic)\n";
echo "  Duration:    {$duration}s\n";

if (!empty($errors)) {
    echo '  Errors:    ' . \count($errors) . " (see sync_log for details)\n";
}

echo "─────────────────────────────────\n";

// ── Smoke test (CLI-only, triggered by SMOKE_TEST=1) ──────────────────────────

if (PHP_SAPI === 'cli' && getenv('SMOKE_TEST')) {
    echo "\n=== SMOKE TEST: Africa eligibility classifier ===\n";

    /** @var array<string, array{location: string, hint: string, expected: string}> */
    $testCases = [
        'brazil_exact' => [
            'location' => 'Brazil',
            'hint'     => '',
            'expected' => 'exclude_africa',
        ],
        'sao_paulo_in_title' => [
            'location' => '',
            'hint'     => 'são paulo',
            'expected' => 'exclude_africa',
        ],
        'remote_in_title_no_location' => [
            'location' => '',
            'hint'     => 'remote',
            'expected' => 'neutral',
        ],
        'worldwide' => [
            'location' => 'Worldwide',
            'hint'     => '',
            'expected' => 'africa_friendly',
        ],
        'emea' => [
            'location' => 'EMEA',
            'hint'     => '',
            'expected' => 'africa_friendly',
        ],
        'americas_and_europe' => [
            'location' => 'Americas, Europe, Israel',
            'hint'     => '',
            'expected' => 'exclude_africa',
        ],
        'both_empty' => [
            'location' => '',
            'hint'     => '',
            'expected' => 'neutral',
        ],
        'kenya' => [
            'location' => 'Kenya',
            'hint'     => '',
            'expected' => 'africa_friendly',
        ],
        'remote_africa' => [
            'location' => 'Remote (Africa)',
            'hint'     => '',
            'expected' => 'africa_friendly',
        ],
    ];

    $passCount = 0;
    $failCount = 0;

    foreach ($testCases as $name => $test) {
        $result = classifyAfricaEligibility($test['location'], $test['hint']);
        if ($result === $test['expected']) {
            echo "  ✓ PASS: {$name}\n";
            $passCount++;
        } else {
            echo "  ✗ FAIL: {$name} (got '{$result}', expected '{$test['expected']}')\n";
            $failCount++;
        }
    }

    echo "\n  Results: {$passCount} passed, {$failCount} failed\n";

    if ($failCount > 0) {
        echo "  SMOKE TEST FAILED\n";
        exit(1);
    }

    echo "  SMOKE TEST PASSED\n";
    exit(0);
}
