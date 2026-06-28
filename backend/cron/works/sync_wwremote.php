<?php

/**
 * sync_wwremote.php
 * Fetches DevOps-adjacent jobs from We Work Remotely RSS feeds.
 *
 * Run every 6 hours via cPanel cron (offset 30 min from Remotive), or manually:
 *   php cron/sync_wwremote.php
 *
 * Goals
 * ─────
 *   • Pull DevOps/SRE/Cloud/Backend roles from WWR's public RSS feeds
 *   • Skip jobs whose location restrictions exclude Africa
 *   • Flag jobs that explicitly welcome Africa as africa_friendly = 1
 *   • Follow the same patterns as sync_remotive.php for consistency
 *   • Stay non-breaking: same DB schema, same helpers.php surface
 *
 * WWR RSS feeds are public — no account or API key needed.
 */

declare(strict_types=1);

// ── Bootstrap ────────────────────────────────────────────────────────────────

$basePath = \dirname(__FILE__) . '/../../';
require_once $basePath . 'db.php';
require_once $basePath . 'helpers.php';

$startTime = time();

// ── Config ───────────────────────────────────────────────────────────────────

/**
 * WWR RSS feeds to pull.
 *
 * Each entry is:
 *   'url'      → the RSS feed URL
 *   'gated'    → whether title-keyword filtering applies (true for broad feeds)
 *
 * devops-sysadmin → core audience; no keyword gate (every title passes)
 * programming     → broad; gated by DEVOPS_TITLE_KEYWORDS
 * back-end        → broad; gated by DEVOPS_TITLE_KEYWORDS
 *
 * To add a new feed: append here and optionally add a keyword set.
 */
const WWR_FEEDS = [
    [
        'url'   => 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
        'gated' => false,
    ],
    [
        'url'   => 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        'gated' => true,
    ],
    [
        'url'   => 'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
        'gated' => true,
    ],
];

/**
 * Title keywords for the gated (broad) feeds.
 * Covers all role types in the frontend whitelist:
 *   SRE · Cloud Architect · Security · Platform Engineering
 *   DevOps Engineer · Backend Engineer · Frontend Engineer · Sysadmin
 */
const WWR_DEVOPS_KEYWORDS = [
    // SRE
    'sre',
    'site reliability',
    'reliability engineer',

    // Cloud Architect
    'cloud engineer',
    'cloud architect',
    'solutions architect',

    // Security
    'devsecops',
    'security engineer',
    'security architect',
    'appsec',
    'application security',

    // Platform Engineering
    'platform engineer',
    'developer experience',
    'devex engineer',

    // Sysadmin
    'sysadmin',
    'system administrator',
    'systems administrator',
    'linux administrator',
    'network engineer',
    'network administrator',

    // DevOps Engineer
    'devops',
    'infrastructure engineer',
    'kubernetes',
    'k8s',
    'terraform',
    'ci/cd',
    'pipeline',
    'automation engineer',
    'mlops',
    'ml engineer',
    'ai engineer',
    'data engineer',

    // Frontend Engineer
    'frontend',
    'front-end',
    'front end',
    'ui engineer',
    'react engineer',
    'vue engineer',
    'angular engineer',

    // Backend Engineer
    'backend',
    'back-end',
    'back end',
    'software engineer',
    'fullstack',
    'full stack',
    'full-stack',
    'api engineer',
    'systems engineer',
];

/**
 * Location strings that signal the role explicitly welcomes Africa.
 * Mirrors AFRICA_POSITIVE_SIGNALS in sync_remotive.php.
 */
const WWR_AFRICA_POSITIVE = [
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
    'emea',
    'worldwide',
    'anywhere',
];

/**
 * Location strings that signal the role EXCLUDES Africa.
 * Mirrors AFRICA_EXCLUDE_SIGNALS in sync_remotive.php.
 */
const WWR_AFRICA_EXCLUDE = [
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
    'middle east',
    'brazil',
    'mexico',
    'argentina',
    'colombia',
    'chile',
    'peru',
];

/**
 * Exact-match non-African countries and cities.
 * Mirrors LOCATION_COUNTRIES in sync_remotive.php.
 */
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
const WWR_SLEEP_BETWEEN = 2; // seconds between feed requests

// ── Counters ─────────────────────────────────────────────────────────────────

$totalFetched  = 0;
$totalInserted = 0;
$totalSkipped  = 0;
$totalExcluded = 0;
$errors        = [];

// ── DB connection ─────────────────────────────────────────────────────────────

$db = getDB();

// ── Dedicated exception ───────────────────────────────────────────────────────

class WwrFeedException extends RuntimeException
{
}

// ── SSL guard ─────────────────────────────────────────────────────────────────

function wwrShouldDisableSsl(): bool
{
    if (\defined('APP_ENV')) {
        $env = APP_ENV;
    } else {
        $env = getenv('APP_ENV') ?: 'local';
    }
    if ($env === 'production' || $env === 'staging') {
        return false;
    }
    return filter_var(getenv('DISABLE_SSL_VERIFY'), FILTER_VALIDATE_BOOLEAN);
}

// ── Transport: cURL ───────────────────────────────────────────────────────────

/**
 * Fetch an RSS feed URL via cURL and return the raw XML string.
 *
 * @throws WwrFeedException on network or HTTP error
 */
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
        throw new WwrFeedException("cURL error for {$url}: {$curlErr}");
    }
    if ($httpCode !== 200) {
        throw new WwrFeedException("HTTP {$httpCode} from WWR for {$url}");
    }

    return $response;
}

// ── Transport: stream fallback ────────────────────────────────────────────────

/**
 * Fetch an RSS feed URL via file_get_contents when cURL is unavailable.
 *
 * @throws WwrFeedException on network or HTTP error
 */
function wwrFetchViaStream(string $url): string
{
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        throw new WwrFeedException("Invalid URL: {$url}");
    }

    $disableSsl = wwrShouldDisableSsl();

    $context  = stream_context_create([
        'http' => [
            'method'          => 'GET',
            'header'          => "Accept: application/rss+xml\r\nUser-Agent: " . WWR_USER_AGENT . "\r\n",
            'timeout'         => 60,
            'ignore_errors'   => true,
            'follow_location' => 0,
        ],
        'ssl'  => [
            'verify_peer'      => !$disableSsl,
            'verify_peer_name' => !$disableSsl,
        ],
    ]);

    $response = file_get_contents($url, false, $context);

    if ($response === false) {
        throw new WwrFeedException("file_get_contents failed for {$url}");
    }

    $httpCode = 500;
    // PHP 8.5+: $http_response_header is deprecated; use the new function.
    $responseHeaders = \function_exists('http_get_last_response_headers')
        ? http_get_last_response_headers()
        : ($http_response_header ?? []); // @phpstan-ignore-line
    if (!empty($responseHeaders)) {
        preg_match('{HTTP\/\S*\s(\d\d\d)}', $responseHeaders[0], $m);
        if (isset($m[1])) {
            $httpCode = (int) $m[1];
        }
    }

    if ($httpCode !== 200) {
        throw new WwrFeedException("HTTP {$httpCode} from WWR for {$url}");
    }

    return $response;
}

// ── Fetch + parse one RSS feed ────────────────────────────────────────────────

/**
 * Fetch an RSS feed URL and return a SimpleXMLElement of the channel items.
 *
 * @return SimpleXMLElement[]
 * @throws WwrFeedException
 */
function wwrFetchFeed(string $url): array
{
    $raw = \function_exists('curl_init')
        ? wwrFetchViaCurl($url)
        : wwrFetchViaStream($url);

    if (\strlen($raw) > 5 * 1024 * 1024) {
        throw new WwrFeedException("Response too large (> 5 MB) for {$url}");
    }

    // Suppress libxml warnings — malformed RSS shouldn't crash the cron
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($raw);
    libxml_clear_errors();

    if ($xml === false) {
        throw new WwrFeedException("Failed to parse XML from {$url}");
    }

    $items = $xml->channel->item ?? [];

    // SimpleXMLElement implements Traversable but not Countable in all PHP versions
    // — convert to array so callers can use count() and array functions safely
    $result = [];
    foreach ($items as $item) {
        $result[] = $item;
    }

    return $result;
}

// ── WWR title parser ──────────────────────────────────────────────────────────

/**
 * WWR RSS titles follow the format: "Company: Job Title at Location"
 * or sometimes just "Company: Job Title".
 *
 * Split on the FIRST ": " only — company names can contain colons.
 * Strip the trailing "at Location" from the job title when present.
 *
 * @return array{company: string, title: string}
 */
function parseWwrTitle(string $raw): array
{
    $raw = trim($raw);

    // Split on first ": " — everything before is the company
    $colonPos = strpos($raw, ': ');

    if ($colonPos === false) {
        // No colon — treat the whole string as the title, company unknown
        return ['company' => '', 'title' => $raw];
    }

    $company = trim(substr($raw, 0, $colonPos));
    $rest    = trim(substr($raw, $colonPos + 2));

    // Strip trailing " at Location" — WWR sometimes appends this
    // e.g. "Senior DevOps Engineer at Worldwide"
    $atPos = strrpos($rest, ' at ');
    $title = $atPos !== false ? trim(substr($rest, 0, $atPos)) : $rest;

    return ['company' => $company, 'title' => $title];
}

// ── Location parser ───────────────────────────────────────────────────────────

/**
 * Extract a plain-text location from a WWR RSS <region> or <description> field.
 *
 * WWR's RSS provides a dedicated <region> element and also encodes location
 * in the <description> CDATA block using an <li> tag:
 *   <li>Anywhere in the World</li>  or  <li>USA Only</li>
 *
 * We prefer <region> (authoritative), then fall back to the first <li>.
 * Falls back to an empty string if neither is found.
 */
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

// ── Africa eligibility (WWR-scoped, mirrors Remotive classifier) ──────────────

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

/**
 * Classify a WWR job's Africa eligibility.
 *
 * @return string 'africa_friendly' | 'neutral' | 'exclude_africa'
 */
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

// ── Relevance gate ────────────────────────────────────────────────────────────

/**
 * Return true if the job title matches at least one DevOps keyword.
 * Only called for feeds where gated = true.
 */
function wwrIsRelevant(string $title): bool
{
    $lower = strtolower($title);
    foreach (WWR_DEVOPS_KEYWORDS as $kw) {
        if (str_contains($lower, $kw)) {
            return true;
        }
    }
    return false;
}

// ── Salary hint extractor ─────────────────────────────────────────────────────

/**
 * Scan a WWR job description CDATA block for salary patterns and return
 * the first matching snippet for parseSalary() to process.
 *
 * WWR has no dedicated salary RSS field, so this is best-effort. It will
 * match patterns like:
 *   "$80,000 – $120,000/year"   →  "$80,000 – $120,000/year"
 *   "Salary: $4,000/month"      →  "$4,000/month"
 *   "€60k per year"             →  "€60k per year"
 *
 * Returns an empty string when no salary pattern is found, which causes
 * parseSalary() to return all-null — that is the correct outcome for
 * listings that don't publish compensation.
 */
function wwrExtractSalaryHint(string $descriptionCdata): string
{
    // Strip HTML so patterns aren't broken across tags (e.g. <strong>$80k</strong>)
    $plain = strip_tags($descriptionCdata);

    $patterns = [
        // Range with currency: $80k – $120k, $80,000–$120,000
        '/[\$€£][\d,]+k?\s*[-–—]\s*\$?[\d,]+k?(?:\s*\/\s*(?:year|yr|month|mo))?/i',
        // "Salary: $X" or "Salary range: $X"
        '/salary(?:\s+range)?[:\s]+[\$€£]?[\d,]+k?(?:\s*[-–]\s*[\$€£]?[\d,]+k?)?/i',
        // "$X per year/month" or "$X/year"
        '/[\$€£][\d,]+k?\s*(?:\/|\bper\b)\s*(?:year|yr|annual|month|mo)/i',
        // "USD/EUR/GBP X" or "X USD"
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

// ── Deduplication ─────────────────────────────────────────────────────────────

function wwrJobExists(PDO $db, string $sourceId): bool
{
    $stmt = $db->prepare(
        "SELECT id FROM jobs WHERE source = 'weworkremotely' AND source_id = ? LIMIT 1"
    );
    $stmt->execute([$sourceId]);
    return (bool) $stmt->fetch();
}

// ── Refresh existing rows ─────────────────────────────────────────────────────

/**
 * Keep already-stored WWR jobs clean across re-syncs without re-inserting them.
 *
 * Required params:
 *   $db, $sourceId, $cleanDesc, $locationDetail, $africaFriendly
 *
 * Optional enrichment via $extras array (all keys optional, safe to omit):
 *   'logo'   string  — company_logo_url; backfilled when stored row is NULL
 *   'tags'   string  — JSON-encoded tag array; backfilled when stored row is NULL
 *   'salary' array   — parseSalary() result; backfilled when salary_min is NULL
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
    // Refresh description when it has changed or was NULL
    $db->prepare(
        "UPDATE jobs
            SET description = :desc
          WHERE source = 'weworkremotely'
            AND source_id = :sid
            AND (description IS NULL OR description != :desc2)"
    )->execute([':desc' => $cleanDesc, ':sid' => $sourceId, ':desc2' => $cleanDesc]);

    // Backfill location_detail when it was NULL
    if ($locationDetail !== '') {
        $db->prepare(
            "UPDATE jobs
                SET location_detail = :loc
              WHERE source = 'weworkremotely'
                AND source_id = :sid
                AND location_detail IS NULL"
        )->execute([':loc' => $locationDetail, ':sid' => $sourceId]);
    }

    // Backfill africa_friendly = 1 for rows stored before classifier existed
    if ($africaFriendly === 1) {
        $db->prepare(
            "UPDATE jobs
                SET africa_friendly = 1
              WHERE source = 'weworkremotely'
                AND source_id = :sid
                AND africa_friendly = 0"
        )->execute([':sid' => $sourceId]);
    }

    // Backfill company_logo_url when it was NULL and we now have a URL
    if ($logoUrl !== '') {
        $db->prepare(
            "UPDATE jobs
                SET company_logo_url = :logo
              WHERE source = 'weworkremotely'
                AND source_id = :sid
                AND company_logo_url IS NULL"
        )->execute([':logo' => $logoUrl, ':sid' => $sourceId]);
    }

    // Backfill tags when they were NULL
    $db->prepare(
        "UPDATE jobs
            SET tags = :tags
          WHERE source = 'weworkremotely'
            AND source_id = :sid
            AND tags IS NULL"
    )->execute([':tags' => $tags, ':sid' => $sourceId]);

    // Backfill salary fields when salary_min was NULL and we now have a value
    if (!empty($salary['salary_min'])) {
        $db->prepare(
            "UPDATE jobs
                SET salary_min      = :min,
                    salary_max      = :max,
                    salary_currency = :cur,
                    salary_period   = :per
              WHERE source = 'weworkremotely'
                AND source_id = :sid
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
        title,
        company,
        company_logo_url,
        description,
        apply_url,
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
        'weworkremotely',
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

$feeds = WWR_FEEDS;

foreach ($feeds as $index => $feed) {
    $feedUrl = $feed['url'];
    $isGated = $feed['gated'];

    echo "Fetching feed: {$feedUrl} ...\n";

    try {
        $items = wwrFetchFeed($feedUrl);
    } catch (WwrFeedException $e) {
        $msg = 'FETCH ERROR: ' . $e->getMessage();
        echo $msg . "\n";
        $errors[] = $msg;
        continue;
    }

    $feedCount     = \count($items);
    $totalFetched += $feedCount;
    echo "  → {$feedCount} items returned\n";

    foreach ($items as $item) {
        // ── Extract raw fields from RSS item ──────────────────────────────────
        $rawGuid        = trim((string) ($item->guid        ?? ''));
        $rawTitle       = trim((string) ($item->title       ?? ''));
        $rawLink        = trim((string) ($item->link        ?? ''));
        $rawPubDate     = trim((string) ($item->pubDate     ?? ''));
        $rawDescription = trim((string) ($item->description ?? ''));

        // ── source_id: use guid, fall back to link ────────────────────────────
        $sourceId = $rawGuid !== '' ? $rawGuid : $rawLink;

        if ($sourceId === '' || $rawTitle === '') {
            $totalSkipped++;
            continue;
        }

        // ── Parse WWR title into company + job title ──────────────────────────
        $parsed  = parseWwrTitle($rawTitle);
        $company = sanitizeString($parsed['company']);
        $title   = sanitizeString($parsed['title']);

        if ($title === '' || $company === '') {
            $totalSkipped++;
            continue;
        }

        // ── Apply URL: WWR link tags often carry a redirect wrapper ───────────
        // Use the link as-is — it always resolves to the correct listing page
        $applyUrl = $rawLink;

        if (filter_var($applyUrl, FILTER_VALIDATE_URL) === false) {
            $totalSkipped++;
            echo "  ✗ Skipped (invalid apply URL): {$title} @ {$company}\n";
            continue;
        }

        // ── Keyword gate for broad feeds ──────────────────────────────────────
        if ($isGated && !wwrIsRelevant($title)) {
            $totalSkipped++;
            continue;
        }

        // ── Role type (same mapper as Remotive) ───────────────────────────────
        $roleType = mapRoleType($title);

        // Skip titles with no DevOps-adjacent keywords
        if ($roleType === 'Other') {
            $totalSkipped++;
            continue;
        }

        // ── Location: prefer RSS <region>, fall back to description CDATA ─────
        $locationDetail = sanitizeString(parseWwrLocation($rawDescription, (string) ($item->region ?? '')));

        // ── Africa eligibility ────────────────────────────────────────────────
        $eligibility    = wwrClassifyAfrica($locationDetail);

        if ($eligibility === 'exclude_africa') {
            $totalExcluded++;
            echo "  ✗ Excluded (restricts Africa): {$title} @ {$company} [{$locationDetail}]\n";
            continue;
        }

        $africaFriendly = ($eligibility === 'africa_friendly') ? 1 : 0;

        // ── Description: strip HTML ───────────────────────────────────────────
        $description = cleanDescription($rawDescription);

        // ── Company logo: prefer <enclosure url="...">, fall back to first <img> ──
        // WWR RSS items include a company logo via an <enclosure> element.
        // The URL lives in the 'url' XML attribute, not as element text, so
        // SimpleXML accesses it via $item->enclosure['url'].
        $logoUrl = '';
        if (isset($item->enclosure) && !empty((string) $item->enclosure['url'])) {
            $candidate = trim((string) $item->enclosure['url']);
            if (filter_var($candidate, FILTER_VALIDATE_URL) !== false) {
                $logoUrl = $candidate;
            }
        }
        // Fallback: extract first <img src="..."> from description CDATA
        if ($logoUrl === '' && preg_match('/<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $rawDescription, $imgMatch)) {
            $candidate = trim($imgMatch[1]);
            if (filter_var($candidate, FILTER_VALIDATE_URL) !== false) {
                $logoUrl = $candidate;
            }
        }

        // ── Tags: collect RSS <category> elements + derive a slug from the feed URL ──
        // WWR items may carry one or more <category> children.
        // We also append the feed's category slug (e.g. "devops sysadmin")
        // so every job has at least one searchable tag.
        $rawTags = [];
        foreach (($item->category ?? []) as $cat) {
            $catStr = trim((string) $cat);
            if ($catStr !== '') {
                $rawTags[] = $catStr;
            }
        }
        // Derive a human-readable tag from the feed URL slug
        if (preg_match('/categories\/remote-(.+?)-jobs\.rss/', $feedUrl, $slugMatch)) {
            $slugTag = str_replace('-', ' ', $slugMatch[1]);
            if ($slugTag !== '' && !\in_array($slugTag, $rawTags, true)) {
                $rawTags[] = $slugTag;
            }
        }
        $tags = json_encode(
            array_values(
                array_filter(
                    array_map('trim', $rawTags),
                    static fn (string $t): bool => $t !== ''
                )
            ),
            JSON_UNESCAPED_UNICODE
        );

        // ── Salary: attempt to parse from description CDATA ───────────────────
        // WWR RSS has no dedicated salary field. We scan the plain-text version
        // of the description for common salary patterns (e.g. "$80k–$120k/year",
        // "USD 4,000/month"). This will be null for most listings — that is
        // expected and acceptable; it matches what the source provides.
        $salary = parseSalary(wwrExtractSalaryHint($rawDescription));

        // ── Posted at ─────────────────────────────────────────────────────────
        $parsedTime = strtotime($rawPubDate);
        $postedAt   = date('Y-m-d H:i:s', $parsedTime !== false ? $parsedTime : time());

        // ── Deduplication ─────────────────────────────────────────────────────
        if (wwrJobExists($db, $sourceId)) {
            wwrRefreshJob($db, $sourceId, $description, $locationDetail, $africaFriendly, [
                'logo'   => $logoUrl,
                'tags'   => $tags,
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
                ':title'           => $title,
                ':company'         => $company,
                ':company_logo_url' => $logoUrl !== '' ? $logoUrl : null,
                ':description'     => $description,
                ':apply_url'       => $applyUrl,
                ':source_id'       => $sourceId,
                ':role_type'       => $roleType,
                ':location_detail' => $locationDetail !== '' ? $locationDetail : null,
                ':africa_friendly' => $africaFriendly,
                ':salary_min'      => $salary['salary_min'],
                ':salary_max'      => $salary['salary_max'],
                ':salary_currency' => $salary['salary_currency'],
                ':salary_period'   => $salary['salary_period'],
                ':tags'            => $tags,
                ':posted_at'       => $postedAt,
            ]);
            $totalInserted++;
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                // Duplicate key from race condition — safe to skip
                $totalSkipped++;
            } else {
                $msg = "INSERT ERROR [job {$sourceId}]: " . $e->getMessage();
                echo $msg . "\n";
                $errors[] = $msg;
            }
        }
    }

    echo "  ✓ Feed done. Inserted so far: {$totalInserted}\n\n";

    // Polite delay between feed requests
    if ($index < \count($feeds) - 1) {
        sleep(WWR_SLEEP_BETWEEN);
    }
}

// ── Cleanup: deactivate stored WWR jobs that now match exclude_africa ─────────

$totalDeactivated = 0;

try {
    $storedJobs = $db->prepare(
        "SELECT id, location_detail
           FROM jobs
          WHERE source = 'weworkremotely'
            AND is_active = 1"
    );
    $storedJobs->execute();

    $deactivateStmt = $db->prepare(
        'UPDATE jobs SET is_active = 0 WHERE id = :id'
    );

    foreach ($storedJobs->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (wwrClassifyAfrica((string) $row['location_detail']) === 'exclude_africa') {
            $deactivateStmt->execute([':id' => (int) $row['id']]);
            $totalDeactivated++;
        }
    }
} catch (PDOException $e) {
    $msg = 'CLEANUP ERROR: ' . $e->getMessage();
    echo $msg . "\n";
    $errors[] = $msg;
}

// ── Log to sync_log ───────────────────────────────────────────────────────────

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

echo "─────────────────────────────────\n";
echo "We Work Remotely sync complete\n";
echo "  Fetched:     {$totalFetched}\n";
echo "  Inserted:    {$totalInserted}\n";
echo "  Excluded:    {$totalExcluded}  (location restricts Africa)\n";
echo "  Deactivated: {$totalDeactivated}  (reclassified as exclude_africa)\n";
echo "  Skipped:     {$totalSkipped}  (duplicates, invalid fields, or off-topic)\n";
echo "  Duration:    {$duration}s\n";

if (!empty($errors)) {
    echo '  Errors:      ' . \count($errors) . " (see sync_log for details)\n";
}

echo "─────────────────────────────────\n";
