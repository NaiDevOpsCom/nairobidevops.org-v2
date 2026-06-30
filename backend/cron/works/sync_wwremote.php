<?php

/**
 * sync_wwremote.php
 * Fetches jobs from We Work Remotely RSS feeds.
 *
 * Community scope: DevOps, SRE, Platform, Security, Networking, Cloud,
 * Backend, Frontend, Full-Stack, Data, ML, QA, Engineering Management,
 * Technical PM — all levels, all legitimate software engineering roles.
 *
 * Run every 6 hours via cPanel cron (offset 30 min from Remotive), or manually:
 *   php cron/sync_wwremote.php
 */

declare(strict_types=1);

// ── Bootstrap ────────────────────────────────────────────────────────────────

$basePath = \dirname(__FILE__) . '/../../';
require_once $basePath . 'db.php';
require_once $basePath . 'helpers.php';

$startTime = time();

// ── WWR RSS feeds ─────────────────────────────────────────────────────────────
//
// gated = true  → title must pass TECH_ROLE_KEYWORDS (blocks non-tech noise)
// gated = false → every item in the feed is accepted (feeds already scoped)
//
// WWR feed catalogue (confirmed live as of June 2026):
//   remote-devops-sysadmin-jobs      → DevOps, SRE, Sysadmin, Platform
//   remote-security-jobs             → Security, DevSecOps, Networking
//   remote-programming-jobs          → General software engineering
//   remote-back-end-programming-jobs → Backend-specific
//   remote-front-end-programming-jobs→ Frontend-specific
//   remote-full-stack-programming-jobs → Full-stack
//   remote-data-science-jobs         → Data Engineering, ML, AI
//   remote-qa-jobs                   → QA, SDET, Test Automation
//   remote-management-and-finance-jobs → Engineering Management, Tech PM
//                                       (gated — also contains non-tech mgmt)
//

const WWR_FEEDS = [
    // ── Core DevOps / SRE / Platform / Sysadmin ──────────────────────────────
    [
        'url'   => 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
        'gated' => false,
    ],
    // ── Backend ───────────────────────────────────────────────────────────────
    [
        'url'   => 'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
        'gated' => false,
    ],
    // ── Frontend ──────────────────────────────────────────────────────────────
    [
        'url'   => 'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss',
        'gated' => false,
    ],
    // ── Full-Stack ────────────────────────────────────────────────────────────
    [
        'url'   => 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
        'gated' => false,
    ],
    // ── General programming (gated) ───────────────────────────────────────────
    [
        'url'   => 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        'gated' => true,
    ],
    // ── Engineering Management / Technical PM (gated) ────────────────────────
    [
        'url'   => 'https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss',
        'gated' => true,
    ],
    // REMOVED: remote-security-jobs.rss     → 301, no redirect destination (dead)
    // REMOVED: remote-data-science-jobs.rss → 301, no redirect destination (dead)
    // REMOVED: remote-qa-jobs.rss           → 301, no redirect destination (dead)
];

// ── Non-tech block list (applied to ALL feeds including ungated ones) ─────────
//
// These title patterns indicate clearly non-tech roles that slip into
// WWR's broad categories. Block them regardless of feed.
// Rule: if ANY of these appear in the job title → skip.
//
const NON_TECH_BLOCK = [
    'copywriter',
    'copy writer',
    'sales assistant',
    'sales representative',
    'account executive',
    'account manager',
    'financial sales',
    'inside sales',
    'head of sales',
    'sales specialist',
    'video editor',
    'motion graphic',
    'graphic designer',
    'office assistant',
    'office manager',
    'data analyst',         // not a software engineering role
    'data entry',
    'online data analyst',
    'quality assurance rater',  // crowd-work / annotation — not QA engineer
    'freelance writer',
    'content writer',
    'technical writer',         // borderline — remove this line if you want tech writers
    'recruiter',
    'talent acquisition',
    'account payable',
    'account receivable',
    'bookkeeper',
    'payroll',
    'customer success',
    'customer support',
    'customer operations',
    'customer service',
    'community manager',
    'social media',
    'seo specialist',
    'paid media',
    'growth hacker',
    'business development',
    'partnerships manager',
    'legal counsel',
    'paralegal',
    'operations manager',       // non-tech ops
    'chief of staff',
    'executive assistant',
    'personal assistant',
    'help desk',                // tier-1 support, not engineering
    'it support',               // tier-1 support
    'service desk',
    'administrative',
    'oracle hcm',          // HR Cloud — not DevOps
    'oracle scm',          // Supply Chain — not DevOps
];

// ── Tech role keywords for GATED feeds ───────────────────────────────────────
//
// For the broad feeds (programming, management-and-finance), a title must
// contain at least one of these to be accepted.
//
const TECH_ROLE_KEYWORDS = [
    // Engineering roles
    'engineer', 'developer', 'architect', 'programmer', 'coder',
    // Specific tech stacks / disciplines
    'devops', 'sre', 'platform', 'infrastructure', 'cloud', 'security',
    'backend', 'back-end', 'back end', 'frontend', 'front-end', 'front end',
    'fullstack', 'full-stack', 'full stack',
    'data engineer', 'ml engineer', 'ai engineer', 'mlops', 'dataops',
    'kubernetes', 'terraform', 'docker', 'ansible',
    'python', 'golang', 'go developer', 'rust', 'java', 'kotlin',
    'node', 'react', 'vue', 'angular', 'typescript',
    'qa engineer', 'sdet', 'test automation', 'quality engineer',
    // Management — tech-specific only
    'engineering manager', 'engineering lead', 'tech lead', 'technical lead',
    'vp of engineering', 'head of engineering', 'cto',
    'director of engineering', 'staff engineer', 'principal engineer',
    'product manager', 'technical product manager', 'technical pm',
    // Qa terms
    'qa engineer', 'quality engineer', 'sdet', 'test automation',
    'data scientist', 'data engineer', 'ml engineer', 'ai engineer',
];

// ── Tech keyword list for TAG EXTRACTION from job titles ──────────────────────
//
// These are stored as the job's tags[] in the DB and shown as pills on cards.
// Ordered from most specific to most generic so longer matches aren't shadowed.
//
const TECH_TAG_KEYWORDS = [
    // Infrastructure / DevOps tools
    'kubernetes', 'k8s', 'terraform', 'ansible', 'helm', 'docker',
    'jenkins', 'gitlab', 'github', 'ci/cd', 'cicd', 'argocd', 'flux',
    'prometheus', 'grafana', 'datadog', 'splunk', 'elasticsearch',
    // Cloud platforms
    'aws', 'gcp', 'azure', 'cloudflare', 'digitalocean', 'heroku',
    // OS / Networking
    'linux', 'nginx', 'apache', 'haproxy', 'istio', 'envoy',
    // Databases
    'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'kafka',
    'cassandra', 'dynamodb', 'bigquery', 'snowflake',
    // Languages
    'python', 'golang', 'go', 'rust', 'java', 'kotlin', 'scala',
    'ruby', 'rails', 'php', 'laravel', 'node', 'nodejs',
    'typescript', 'javascript', 'elixir', 'haskell', 'c++', 'c#',
    // Frontend frameworks
    'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js',
    // APIs / Architecture
    'graphql', 'grpc', 'rest', 'api', 'microservices', 'serverless',
    // Data / ML
    'spark', 'airflow', 'dbt', 'pandas', 'tensorflow', 'pytorch',
    'llm', 'mlops', 'dataops',
    // Security
    'devsecops', 'appsec', 'soc', 'siem', 'pentest', 'zero trust',
    // Disciplines (broad — kept last so specific tools match first)
    'devops', 'sre', 'platform', 'infrastructure', 'infra', 'cloud',
    'backend', 'frontend', 'fullstack', 'security', 'networking',
    'automation', 'observability', 'monitoring',
];

// ── Africa signals (unchanged from your original) ────────────────────────────

const WWR_AFRICA_POSITIVE = [
    'africa', 'kenya', 'nigeria', 'ghana', 'south africa', 'egypt',
    'ethiopia', 'tanzania', 'uganda', 'rwanda', 'nairobi', 'lagos',
    'accra', 'cairo', 'emea', 'worldwide', 'anywhere',
];

const WWR_AFRICA_EXCLUDE = [
    'americas', 'north america', 'south america', 'latin america', 'latam',
    'usa only', 'us only', 'united states only', 'canada only',
    'europe only', 'eu only', 'european union',
    'asia', 'apac', 'asia pacific', 'australia', 'new zealand',
    'israel', 'middle east', 'brazil', 'mexico', 'argentina',
    'colombia', 'chile', 'peru',
];

const WWR_LOCATION_COUNTRIES = [
    'brazil', 'united states', 'usa', 'canada', 'mexico', 'argentina',
    'colombia', 'chile', 'peru', 'uruguay', 'venezuela',
    'united kingdom', 'uk', 'germany', 'france', 'spain', 'italy',
    'netherlands', 'portugal', 'poland', 'sweden', 'norway', 'denmark',
    'finland', 'switzerland', 'austria', 'belgium', 'ireland', 'ukraine',
    'czech republic', 'romania', 'hungary',
    'australia', 'new zealand', 'india', 'china', 'japan', 'singapore',
    'south korea', 'taiwan', 'vietnam', 'indonesia', 'malaysia', 'thailand',
    'israel', 'turkey', 'uae', 'united arab emirates', 'saudi arabia',
    'são paulo', 'sao paulo', 'rio de janeiro', 'new york', 'san francisco',
    'austin', 'seattle', 'chicago', 'boston', 'los angeles',
];

const WWR_USER_AGENT    = 'NairobiDevOps JobsBot/1.0 (nairobidevops.org)';
const WWR_SLEEP_BETWEEN = 2;

// ── Counters ──────────────────────────────────────────────────────────────────

$totalFetched  = 0;
$totalInserted = 0;
$totalSkipped  = 0;
$totalExcluded = 0;
$errors        = [];

$db = getDB();

// ── Helpers ───────────────────────────────────────────────────────────────────

class WwrFeedException extends RuntimeException
{
}

function wwrShouldDisableSsl(): bool
{
    $appEnvFromEnv = getenv('APP_ENV');
    $envFallback   = $appEnvFromEnv !== false ? $appEnvFromEnv : 'local';
    $env           = \defined('APP_ENV') ? APP_ENV : $envFallback;
    if ($env === 'production' || $env === 'staging') {
        return false;
    }
    return filter_var(getenv('DISABLE_SSL_VERIFY'), FILTER_VALIDATE_BOOLEAN);
}

function wwrFetchViaCurl(string $url): string
{
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        throw new WwrFeedException("Invalid URL: {$url}");
    }
    $disableSsl = wwrShouldDisableSsl();
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/rss+xml, application/xml, text/xml',
            'User-Agent: ' . WWR_USER_AGENT,
        ],
        CURLOPT_SSL_VERIFYPEER => !$disableSsl,
        CURLOPT_SSL_VERIFYHOST => $disableSsl ? 0 : 2,
        CURLOPT_FOLLOWLOCATION => true,   // follow future redirects silently
        CURLOPT_MAXREDIRS      => 3,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    // curl_close() removed — deprecated in PHP 8.5, no-op since PHP 8.0

    if ($curlErr) {
        throw new WwrFeedException("cURL error for {$url}: {$curlErr}");
    }
    if ($httpCode !== 200) {
        throw new WwrFeedException("HTTP {$httpCode} from WWR for {$url}");
    }

    return $response;
}

function wwrFetchFeed(string $url): array
{
    if (\function_exists('curl_init')) {
        $raw = wwrFetchViaCurl($url);
    } else {
        $raw = file_get_contents($url);
        if ($raw === false) {
            throw new WwrFeedException("Stream fetch failed: {$url}");
        }
    }

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($raw);
    libxml_clear_errors();

    if ($xml === false) {
        throw new WwrFeedException("Failed to parse XML from {$url}");
    }

    $result = [];
    foreach (($xml->channel->item ?? []) as $item) {
        $result[] = $item;
    }
    return $result;
}

function parseWwrTitle(string $raw): array
{
    $raw      = trim($raw);
    $colonPos = strpos($raw, ': ');
    if ($colonPos === false) {
        return ['company' => '', 'title' => $raw];
    }
    $company = trim(substr($raw, 0, $colonPos));
    $rest    = trim(substr($raw, $colonPos + 2));
    $atPos   = strrpos($rest, ' at ');
    $title   = $atPos !== false ? trim(substr($rest, 0, $atPos)) : $rest;
    return ['company' => $company, 'title' => $title];
}

function parseWwrLocation(string $descriptionCdata, string $region = ''): string
{
    $region = trim($region);
    if ($region !== '') {
        return $region;
    }
    if (preg_match('/<li[^>]*>\s*([^<]+?)\s*<\/li>/i', $descriptionCdata, $m)) {
        return trim(strip_tags($m[1]));
    }
    return '';
}

function wwrMatchesPositive(string $loc): bool
{
    foreach (WWR_AFRICA_POSITIVE as $signal) {
        if (str_contains($loc, $signal)) {
            return true;
        }
    }
    return false;
}

function wwrMatchesExactCountry(string $loc): bool
{
    return \in_array($loc, WWR_LOCATION_COUNTRIES, true);
}

function wwrMatchesExclude(string $loc): bool
{
    foreach (WWR_AFRICA_EXCLUDE as $signal) {
        if (str_contains($loc, $signal)) {
            return true;
        }
    }
    return false;
}

function wwrClassifyAfrica(string $locationDetail): string
{
    $loc = strtolower(trim($locationDetail));
    if ($loc === '') {
        return 'neutral';
    }
    if (wwrMatchesPositive($loc)) {
        return 'africa_friendly';
    }
    return (wwrMatchesExactCountry($loc) || wwrMatchesExclude($loc))
        ? 'exclude_africa'
        : 'neutral';
}

/**
 * Returns true if the title contains a non-tech keyword that should be blocked
 * regardless of which feed it came from.
 */
function wwrIsNonTech(string $title): bool
{
    $lower = strtolower($title);
    foreach (NON_TECH_BLOCK as $pattern) {
        if (str_contains($lower, $pattern)) {
            return true;
        }
    }
    return false;
}

/**
 * Returns true if the title matches at least one tech role keyword.
 * Only enforced on gated feeds.
 */
function wwrIsTechRole(string $title): bool
{
    $lower = strtolower($title);
    foreach (TECH_ROLE_KEYWORDS as $kw) {
        if (str_contains($lower, $kw)) {
            return true;
        }
    }
    return false;
}

/**
 * Extract tech stack keywords from a job title and return them as a
 * deduplicated array. These become the tag pills on job cards.
 *
 * Uses TECH_TAG_KEYWORDS checked against the lowercased title so we get
 * specific tool names (kubernetes, terraform) rather than category slugs.
 */
function wwrExtractTags(string $title): array
{
    $lower = strtolower($title);
    $found = [];
    foreach (TECH_TAG_KEYWORDS as $kw) {
        if (\strlen($kw) <= 3) {
            if (preg_match('/\b' . preg_quote($kw, '/') . '\b/', $lower)) {
                $found[] = $kw;
            }
        } else {
            if (str_contains($lower, $kw)) {
                $found[] = $kw;
            }
        }
    }
    return array_values(array_unique($found));
}

function wwrExtractSalaryHint(string $descriptionCdata): string
{
    $plain    = strip_tags($descriptionCdata);
    $patterns = [
        '/[\$€£][\d,]+k?\s*[-–—]\s*\$?[\d,]+k?(?:\s*\/\s*(?:year|yr|month|mo))?/i',
        '/salary(?:\s+range)?[:\s]+[\$€£]?[\d,]+k?(?:\s*[-–]\s*[\$€£]?[\d,]+k?)?/i',
        '/[\$€£][\d,]+k?\s*(?:\/|\bper\b)\s*(?:year|yr|annual|month|mo)/i',
        '/(?:USD|EUR|GBP)\s+[\d,]+k?(?:\s*[-–]\s*[\d,]+k?)?/i',
        '/[\d,]+k?\s*(?:USD|EUR|GBP)/i',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $plain, $match)) {
            return $match[0];
        }
    }
    return '';
}

function wwrJobExists(PDO $db, string $sourceId): bool
{
    $stmt = $db->prepare(
        "SELECT id FROM jobs WHERE source = 'weworkremotely' AND source_id = ? LIMIT 1"
    );
    $stmt->execute([$sourceId]);
    return (bool) $stmt->fetch();
}

/**
 * Refresh an already-stored WWR job with any new data from this sync run.
 * Only updates fields that have changed or were previously NULL.
 */
function wwrRefreshJob(
    PDO    $db,
    string $sourceId,
    string $cleanDesc,
    string $locationDetail,
    int    $africaFriendly,
    array  $extras = []
): void {
    $logoUrl = (string) ($extras['logo']   ?? '');
    $tags    = (string) ($extras['tags']   ?? '[]');
    $salary  = (array)  ($extras['salary'] ?? []);

    $db->prepare(
        "UPDATE jobs SET description = :desc
          WHERE source = 'weworkremotely' AND source_id = :sid
            AND (description IS NULL OR description != :desc2)"
    )->execute([':desc' => $cleanDesc, ':sid' => $sourceId, ':desc2' => $cleanDesc]);

    if ($locationDetail !== '') {
        $db->prepare(
            "UPDATE jobs SET location_detail = :loc
              WHERE source = 'weworkremotely' AND source_id = :sid
                AND location_detail IS NULL"
        )->execute([':loc' => $locationDetail, ':sid' => $sourceId]);
    }

    if ($africaFriendly === 1) {
        $db->prepare(
            "UPDATE jobs SET africa_friendly = 1
              WHERE source = 'weworkremotely' AND source_id = :sid AND africa_friendly = 0"
        )->execute([':sid' => $sourceId]);
    }

    if ($logoUrl !== '') {
        $db->prepare(
            "UPDATE jobs SET company_logo_url = :logo
              WHERE source = 'weworkremotely' AND source_id = :sid
                AND company_logo_url IS NULL"
        )->execute([':logo' => $logoUrl, ':sid' => $sourceId]);
    }

    // Always refresh tags — replaces old category slugs with new keyword tags
    $db->prepare(
        "UPDATE jobs SET tags = :tags
          WHERE source = 'weworkremotely' AND source_id = :sid"
    )->execute([':tags' => $tags, ':sid' => $sourceId]);

    if (!empty($salary['salary_min'])) {
        $db->prepare(
            "UPDATE jobs SET salary_min = :min, salary_max = :max,
                            salary_currency = :cur, salary_period = :per
              WHERE source = 'weworkremotely' AND source_id = :sid
                AND salary_min IS NULL"
        )->execute([
            ':min' => $salary['salary_min'],
            ':max' => $salary['salary_max'],
            ':cur' => $salary['salary_currency'],
            ':per' => $salary['salary_period'],
            ':sid' => $sourceId,
        ]);
    }
}

// ── Prepared INSERT ───────────────────────────────────────────────────────────

$insertStmt = $db->prepare("
    INSERT INTO jobs (
        title, company, company_logo_url, description,
        apply_url, source, source_id,
        role_type, location_type, location_detail,
        africa_friendly,
        salary_min, salary_max, salary_currency, salary_period,
        tags, posted_at,
        is_active, is_approved, is_notified
    ) VALUES (
        :title, :company, :company_logo_url, :description,
        :apply_url, 'weworkremotely', :source_id,
        :role_type, 'international_remote', :location_detail,
        :africa_friendly,
        :salary_min, :salary_max, :salary_currency, :salary_period,
        :tags, :posted_at,
        1, 1, 0
    )
");

// ── Main sync loop ────────────────────────────────────────────────────────────

foreach (WWR_FEEDS as $index => $feed) {
    $feedUrl = $feed['url'];
    $isGated = $feed['gated'];

    echo "Fetching: {$feedUrl}\n";

    try {
        $items = wwrFetchFeed($feedUrl);
    } catch (WwrFeedException $e) {
        $msg      = 'FETCH ERROR: ' . $e->getMessage();
        $errors[] = $msg;
        echo "  {$msg}\n\n";
        continue;
    }

    $feedCount     = \count($items);
    $totalFetched += $feedCount;
    echo "  → {$feedCount} items\n";

    foreach ($items as $item) {
        $rawGuid        = trim((string) ($item->guid        ?? ''));
        $rawTitle       = trim((string) ($item->title       ?? ''));
        $rawLink        = trim((string) ($item->link        ?? ''));
        $rawPubDate     = trim((string) ($item->pubDate     ?? ''));
        $rawDescription = trim((string) ($item->description ?? ''));

        $sourceId = $rawGuid !== '' ? $rawGuid : $rawLink;

        if ($sourceId === '' || $rawTitle === '') {
            $totalSkipped++;
            continue;
        }

        $parsed  = parseWwrTitle($rawTitle);
        $company = sanitizeString($parsed['company']);
        $title   = sanitizeString($parsed['title']);

        if ($title === '' || $company === '') {
            $totalSkipped++;
            continue;
        }

        $applyUrl = $rawLink;
        if (filter_var($applyUrl, FILTER_VALIDATE_URL) === false) {
            $totalSkipped++;
            continue;
        }

        // ── Block non-tech roles from ALL feeds ───────────────────────────────
        if (wwrIsNonTech($title)) {
            $totalSkipped++;
            echo "  ✗ Non-tech blocked: {$title}\n";
            continue;
        }

        // ── For gated feeds: require at least one tech keyword in title ────────
        if ($isGated && !wwrIsTechRole($title)) {
            $totalSkipped++;
            continue;
        }

        // ── Role type ─────────────────────────────────────────────────────────
        $roleType = mapRoleType($title);

        // ── Location ──────────────────────────────────────────────────────────
        $locationDetail = sanitizeString(
            parseWwrLocation($rawDescription, (string) ($item->region ?? ''))
        );

        // ── Africa eligibility ────────────────────────────────────────────────
        $eligibility = wwrClassifyAfrica($locationDetail);
        if ($eligibility === 'exclude_africa') {
            $totalExcluded++;
            continue;
        }
        $africaFriendly = ($eligibility === 'africa_friendly') ? 1 : 0;

        // ── Description ───────────────────────────────────────────────────────
        $description = cleanDescription($rawDescription);

        // ── Logo ──────────────────────────────────────────────────────────────
        $logoUrl = '';
        if (isset($item->enclosure) && !empty((string) $item->enclosure['url'])) {
            $candidate = trim((string) $item->enclosure['url']);
            if (filter_var($candidate, FILTER_VALIDATE_URL) !== false) {
                $logoUrl = $candidate;
            }
        }
        if ($logoUrl === '' && preg_match('/<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $rawDescription, $imgMatch)) {
            $candidate = trim($imgMatch[1]);
            if (filter_var($candidate, FILTER_VALIDATE_URL) !== false) {
                $logoUrl = $candidate;
            }
        }

        // ── Tags: extracted from job title, not category slugs ────────────────
        $extractedTags = wwrExtractTags($title);
        $tagsJson      = json_encode(
            array_values(array_unique($extractedTags)),
            JSON_UNESCAPED_UNICODE
        );

        // ── Salary ────────────────────────────────────────────────────────────
        $salary = parseSalary(wwrExtractSalaryHint($rawDescription));

        // ── Posted at ─────────────────────────────────────────────────────────
        $parsedTime = strtotime($rawPubDate);
        $postedAt   = date('Y-m-d H:i:s', $parsedTime !== false ? $parsedTime : time());

        // ── Deduplication ─────────────────────────────────────────────────────
        if (wwrJobExists($db, $sourceId)) {
            wwrRefreshJob($db, $sourceId, $description, $locationDetail, $africaFriendly, [
                'logo'   => $logoUrl,
                'tags'   => $tagsJson,
                'salary' => $salary,
            ]);
            $totalSkipped++;
            continue;
        }

        // ── Length guards ─────────────────────────────────────────────────────
        $title          = mb_substr($title, 0, 255);
        $company        = mb_substr($company, 0, 255);
        $locationDetail = mb_substr($locationDetail, 0, 255);
        $sourceId       = mb_substr($sourceId, 0, 255);

        // ── Insert ────────────────────────────────────────────────────────────
        try {
            $insertStmt->execute([
                ':title'            => $title,
                ':company'          => $company,
                ':company_logo_url' => $logoUrl !== '' ? $logoUrl : null,
                ':description'      => $description,
                ':apply_url'        => $applyUrl,
                ':source_id'        => $sourceId,
                ':role_type'        => $roleType,
                ':location_detail'  => $locationDetail !== '' ? $locationDetail : null,
                ':africa_friendly'  => $africaFriendly,
                ':salary_min'       => $salary['salary_min'],
                ':salary_max'       => $salary['salary_max'],
                ':salary_currency'  => $salary['salary_currency'],
                ':salary_period'    => $salary['salary_period'],
                ':tags'             => $tagsJson,
                ':posted_at'        => $postedAt,
            ]);
            $totalInserted++;
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                $totalSkipped++;
            } else {
                $msg      = "INSERT ERROR [{$sourceId}]: " . $e->getMessage();
                $errors[] = $msg;
                echo "  {$msg}\n";
            }
        }
    }

    echo "  ✓ Done. Inserted so far: {$totalInserted}\n\n";

    if ($index < \count(WWR_FEEDS) - 1) {
        sleep(WWR_SLEEP_BETWEEN);
    }
}

// ── Cleanup: deactivate stored WWR jobs that now match exclude_africa ─────────

$totalDeactivated = 0;
try {
    $storedJobs = $db->prepare(
        "SELECT id, location_detail FROM jobs
          WHERE source = 'weworkremotely' AND is_active = 1"
    );
    $storedJobs->execute();
    $deactivateStmt = $db->prepare('UPDATE jobs SET is_active = 0 WHERE id = :id');
    foreach ($storedJobs->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (wwrClassifyAfrica((string) $row['location_detail']) === 'exclude_africa') {
            $deactivateStmt->execute([':id' => (int) $row['id']]);
            $totalDeactivated++;
        }
    }
} catch (PDOException $e) {
    $errors[] = 'CLEANUP ERROR: ' . $e->getMessage();
}

// ── Log ───────────────────────────────────────────────────────────────────────

$duration  = time() - $startTime;
$errorText = empty($errors) ? null : implode("\n", $errors);

$db->prepare("
    INSERT INTO sync_log (source, jobs_fetched, jobs_inserted, jobs_skipped, duration_sec, errors)
    VALUES ('weworkremotely', :fetched, :inserted, :skipped, :duration, :errors)
")->execute([
    ':fetched'  => $totalFetched,
    ':inserted' => $totalInserted,
    ':skipped'  => $totalSkipped + $totalExcluded,
    ':duration' => $duration,
    ':errors'   => $errorText,
]);

// ── Summary ───────────────────────────────────────────────────────────────────

echo "─────────────────────────────────────────\n";
echo "We Work Remotely sync complete\n";
echo '  Feeds processed : ' . \count(WWR_FEEDS) . "\n";
echo "  Fetched         : {$totalFetched}\n";
echo "  Inserted        : {$totalInserted}\n";
echo "  Excluded        : {$totalExcluded}  (location restricts Africa)\n";
echo "  Deactivated     : {$totalDeactivated}  (reclassified on refresh)\n";
echo "  Skipped         : {$totalSkipped}  (duplicates / non-tech / off-topic)\n";
echo "  Duration        : {$duration}s\n";

if (!empty($errors)) {
    echo '  Errors          : ' . \count($errors) . " (see sync_log)\n";
    foreach ($errors as $err) {
        echo "    ! {$err}\n";
    }
}
echo "─────────────────────────────────────────\n";
