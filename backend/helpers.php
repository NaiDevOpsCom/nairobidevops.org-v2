<?php

/**
 * helpers.php — Shared utility functions for the NairobiDevOps Jobs Board.
 *
 * Loaded by every endpoint and every cron file via:
 *   require_once dirname(__DIR__) . '/helpers.php';    // from endpoints/
 *   require_once dirname(__DIR__, 2) . '/helpers.php'; // from cron/works/
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ FUNCTION INDEX                                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ HTTP / Response                                                         │
 * │   respondJson()          Send a JSON response and exit                  │
 * │                                                                         │
 * │ Input sanitisation                                                      │
 * │   sanitizeString()       Decode entities + strip tags + trim            │
 * │   cleanDescription()     HTML job description → clean plain text        │
 * │                                                                         │
 * │ Role classification                                                      │
 * │   mapRoleType()          Job title → frontend RoleType enum value       │
 * │                                                                         │
 * │ Salary parsing                                                          │
 * │   detectCurrency()       Extract currency code from salary string       │
 * │   detectPeriod()         Detect monthly/annual with magnitude heuristic │
 * │   extractSalaryNumbers() Pull numeric values from salary string         │
 * │   parseSalary()          Full parser → named array (primary function)   │
 * │   parseSalaryString()    Alias → positional array (legacy compat)       │
 * │                                                                         │
 * │ Affiliate URLs                                                          │
 * │   buildAffiliateUrl()    Append affiliate ID to supported source URLs   │
 * │                                                                         │
 * │ Closing date                                                            │
 * │   daysUntilClose()       Days remaining until closes_at (?int)         │
 * │                                                                         │
 * │ HTTP fetch (cron use)                                                   │
 * │   fetchJSON()            GET → decoded array (JSON API sources)         │
 * │   fetchRSS()             GET → SimpleXMLElement (RSS sources)           │
 * │                                                                         │
 * │ Notification channels (cron use)                                        │
 * │   sendToChannel()        Dispatch a message to a named channel          │
 * │   sendTelegram()         Send via Telegram Bot API (chunked + topic)    │
 * │   sendDiscord()          Send via Discord webhook (chunked)             │
 * │   splitMessage()         Split long text at newline boundaries          │
 * │                                                                         │
 * │ Digest/roundup display helpers                                          │
 * │   locationEmoji()        location_type → emoji                          │
 * │   locationLabel()        location_type → human-readable label           │
 * │   currencySymbol()       currency code → symbol                         │
 * │   escapeTelegramMarkdown()  Escape Markdown chars in external text      │
 * │                                                                         │
 * │ Polyfills                                                               │
 * │   mb_substr()            Fallback if mbstring extension not loaded      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ADDING A NEW SOURCE?
 *   JSON source → fetchJSON(), sanitizeString() on strings, mapRoleType($title),
 *                 parseSalary($salaryString), buildAffiliateUrl($url, $source)
 *   RSS source  → fetchRSS(), iterate $xml->channel->item, same helpers above
 *
 * mapRoleType() values match the frontend RoleType union in useJobs.ts exactly.
 * Never filter jobs based on mapRoleType() — 'Other' is a valid catch-all.
 */


// ════════════════════════════════════════════════════════════════════════════
// HTTP / RESPONSE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Send a JSON response and exit.
 * Used by all API endpoints in endpoints/.
 */
function respondJson(int $status, array $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_THROW_ON_ERROR);
    exit;
}


// ════════════════════════════════════════════════════════════════════════════
// INPUT SANITISATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize a plain-text field from an external API or user submission.
 *
 * Order matters:
 *   1. Decode HTML entities first (& → &, &#x27; → ')
 *   2. Strip any HTML tags that remain
 *   3. Trim surrounding whitespace
 *
 * Decoding before stripping ensures encoded tags (&#60;b&#62;) don't survive.
 * Use on every string field before storing in the database.
 *
 * Example:
 *   sanitizeString("  <b>Senior DevOps</b> Engineer  ")
 *   → "Senior DevOps Engineer"
 */
function sanitizeString(string $val): string
{
    $decoded = html_entity_decode(trim($val), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim(strip_tags($decoded));
}

/**
 * Convert a raw HTML job description to clean, readable plain text.
 *
 * Steps:
 *   1. Replace block-level tags with newlines so paragraphs / list-items separate
 *   2. Decode HTML entities (& → &, &#x27; → ')
 *   3. Strip all remaining HTML tags (inline: strong, em, a, span, …)
 *   4. Collapse runs of 3+ newlines → one blank line
 *   5. Trim each line, then trim the whole string
 *
 * Used when storing descriptions from Remotive / WWR so the frontend can
 * render plain text without needing to strip HTML itself.
 */
function cleanDescription(string $rawHtml): string
{
    if (trim($rawHtml) === '') {
        return '';
    }

    // Step 1: block-level tags → newline
    $text = preg_replace(
        '/<\s*\/?\s*(p|br|li|h[1-6]|div|blockquote|ul|ol|tr|td|th)[^>]*>/i',
        "\n",
        $rawHtml
    );

    // Step 2: decode entities (after tag replacement so encoded tags can't survive)
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    // Step 3: strip remaining inline tags
    $text = strip_tags($text);

    // Step 4: collapse 3+ newlines → one blank line
    $text = preg_replace('/\n{3,}/', "\n\n", $text);

    // Step 5: trim each line, then the whole string
    $lines = array_map('trim', explode("\n", $text));
    return trim(implode("\n", $lines));
}


// ════════════════════════════════════════════════════════════════════════════
// ROLE TYPE MAPPING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Words/phrases in a title that mean the role is definitively NOT
 * DevOps-adjacent, regardless of any other keyword that might also be
 * present (e.g. "Sales Engineer — Kubernetes" must still be blocked).
 *
 * Checked FIRST in mapRoleType(), before any positive keyword match.
 * This is what stops civil engineers, sales titles, designers, and
 * non-technical "X Engineer" titles from defaulting into DevOps Engineer.
 */
function isNonTechRole(string $lower): bool
{
    $blocked = [
        // Non-software engineering disciplines
        'civil engineer', 'electrical engineer', 'mechanical engineer',
        'structural engineer', 'chemical engineer', 'process engineer',
        'manufacturing engineer', 'industrial engineer', 'biomedical engineer',
        'aerospace engineer', 'automotive engineer',
        'eit -', 'eit-', 'eit ',

        // Sales / business / account roles
        'sales engineer', 'sales manager', 'sales representative',
        'account executive', 'account manager', 'relationship manager',
        'solutions consultant', 'business development',
        'director of strategic accounts', 'director of sales',
        'director of business development', 'partnerships',

        // People / support ops
        'recruiter', 'talent acquisition', 'customer support',
        'customer success', 'virtual assistant', 'data entry',

        // Finance / ERP
        'finance manager', 'financial analyst', 'accountant',
        'oracle cloud finance', 'oracle fusion finance', 'oracle erp',
        'oracle financials', 'oracle hcm', 'oracle scm',
        'sap fico', 'sap finance',

        // Design / content
        'web designer', 'graphic designer', 'ui designer', 'ux designer',
        'product designer', 'visual designer', 'motion designer',
        'copywriter', 'content writer', 'technical writer',

        // Non-infra research
        'ai research', 'research scientist',

        // Mobile/web dev explicitly not DevOps
        'wordpress', 'shopify', 'react native developer',
        'ios developer', 'android developer', 'mobile developer',
        'freelance web',

        // Generic PM unless paired with devops/cloud signal — block by default,
        // positive matches above never reach here anyway since this runs first
        // only when title has no devops/cloud/sre signal; see mapRoleType()
        'project manager', 'product manager',
    ];

    foreach ($blocked as $term) {
        if (str_contains($lower, $term)) {
            return true;
        }
    }

    return false;
}

/**
 * Classify a job title into one of the frontend RoleType values.
 *
 * Return values match the RoleType union in useJobs.ts exactly:
 *   'SRE' | 'Cloud Architect' | 'Security' | 'Platform Engineering'
 *   'DevOps Engineer' | 'Backend Engineer' | 'Frontend Engineer'
 *   'Sysadmin' | 'Uncategorised'
 *
 * Priority order:
 *   0. isNonTechRole()  — hard block, checked FIRST, overrides everything below
 *   1. SRE
 *   2. Security          ('devsecops' checked before 'devops')
 *   3. Cloud Architect
 *   4. Platform Engineering
 *   5. Sysadmin
 *   6. DevOps Engineer
 *   7. Frontend Engineer
 *   8. Backend Engineer
 *   9. Uncategorised     — true catch-all, NEVER promoted to DevOps Engineer
 *
 * IMPORTANT: the old default was 'DevOps Engineer', which silently swallowed
 * any title that didn't match a named bucket — including civil engineers,
 * sales engineers, and "Director of Strategic Accounts". The default is now
 * 'Uncategorised'. mapRoleType() still classifies every job (nothing is
 * dropped at sync time) — 'Uncategorised' is a valid stored value, just
 * excluded from the DevOps-specific digest/filter views downstream.
 *
 * @param string $title  Raw job title from the source API
 * @return string        One of the RoleType values listed above
 */
function mapRoleType(string $title): string
{
    $lower = strtolower($title);

    if (isNonTechRole($lower)) {
        return 'Uncategorised';
    }

    return match (true) {
        isSreRole($lower)                 => 'SRE',
        isSecurityRole($lower)            => 'Security',
        isCloudArchitectRole($lower)      => 'Cloud Architect',
        isPlatformEngineeringRole($lower) => 'Platform Engineering',
        isSysadminRole($lower)            => 'Sysadmin',
        isDevOpsRole($lower)              => 'DevOps Engineer',
        isFrontendRole($lower)            => 'Frontend Engineer',
        isBackendRole($lower)             => 'Backend Engineer',
        default                           => 'Uncategorised',
    };
}

/**
 * Check if the lowercased title matches SRE patterns.
 *
 * Leading-space guard on ' sre' prevents matching 'sre' inside words
 * like "presrequired". Titles that start with "sre" are also caught.
 */
function isSreRole(string $lower): bool
{
    return str_contains($lower, 'site reliability')
        || str_contains($lower, ' sre')
        || $lower === 'sre'
        || str_starts_with($lower, 'sre ');
}

/**
 * Check if the lowercased title matches Security / DevSecOps patterns.
 *
 * Must be checked before DevOps — "devsecops" contains "devops" and would
 * otherwise be swallowed by the DevOps branch.
 */
function isSecurityRole(string $lower): bool
{
    return str_contains($lower, 'devsecops')
        || str_contains($lower, 'security engineer')
        || str_contains($lower, 'security architect')
        || str_contains($lower, 'security analyst')
        || str_contains($lower, 'security researcher')
        || str_contains($lower, 'security consultant')
        || str_contains($lower, 'penetration tester')
        || str_contains($lower, 'penetration test')
        || str_contains($lower, 'pentest')
        || str_contains($lower, 'ethical hacker')
        || str_contains($lower, 'appsec')
        || str_contains($lower, 'application security')
        || str_contains($lower, 'cloud security')
        || str_contains($lower, 'cybersecurity')
        || str_contains($lower, 'cyber security')
        || str_contains($lower, 'infosec')
        || str_contains($lower, 'information security')
        || str_contains($lower, 'product security')
        || str_contains($lower, 'network security');
}

/**
 * Check if the lowercased title matches Cloud Architect patterns.
 *
 * Must be checked before DevOps — "cloud engineer" would otherwise fall into
 * DevOps via the default. Staff/principal engineer titles tend to be
 * senior cloud/infra roles so they land here too.
 */
function isCloudArchitectRole(string $lower): bool
{
    return str_contains($lower, 'cloud architect')
        || str_contains($lower, 'solutions architect')
        || str_contains($lower, 'cloud engineer')
        || str_contains($lower, 'cloud infrastructure')
        || str_contains($lower, 'cloud consultant')
        || str_contains($lower, 'aws engineer')
        || str_contains($lower, 'aws architect')
        || str_contains($lower, 'aws consultant')
        || str_contains($lower, 'gcp engineer')
        || str_contains($lower, 'gcp architect')
        || str_contains($lower, 'azure engineer')
        || str_contains($lower, 'azure architect')
        || str_contains($lower, 'azure consultant')
        || str_contains($lower, 'staff engineer')
        || str_contains($lower, 'principal engineer');
}

/**
 * Check if the lowercased title matches Platform Engineering patterns.
 */
function isPlatformEngineeringRole(string $lower): bool
{
    return str_contains($lower, 'platform engineer')
        || str_contains($lower, 'platform eng')
        || str_contains($lower, 'developer experience')
        || str_contains($lower, 'developer productivity')
        || str_contains($lower, 'devex engineer')
        || str_contains($lower, 'internal tools engineer')
        || str_contains($lower, 'internal developer platform');
}

/**
 * Check if the lowercased title matches Sysadmin patterns.
 */
function isSysadminRole(string $lower): bool
{
    return str_contains($lower, 'sysadmin')
        || str_contains($lower, 'sys admin')
        || str_contains($lower, 'system administrator')
        || str_contains($lower, 'systems administrator')
        || str_contains($lower, 'linux administrator')
        || str_contains($lower, 'linux admin')
        || str_contains($lower, 'linux engineer')
        || str_contains($lower, 'linux systems')
        || str_contains($lower, 'network engineer')
        || str_contains($lower, 'network administrator')
        || str_contains($lower, 'network admin')
        || str_contains($lower, 'it administrator')
        || str_contains($lower, 'it admin')
        || str_contains($lower, 'systems engineer');
}

/**
 * Check if the lowercased title matches DevOps Engineer patterns.
 */
function isDevOpsRole(string $lower): bool
{
    return str_contains($lower, 'devops')
        || str_contains($lower, 'dev ops')
        || str_contains($lower, 'infrastructure engineer')
        || str_contains($lower, 'infrastructure eng')
        || str_contains($lower, 'infra engineer')
        || str_contains($lower, 'kubernetes')
        || str_contains($lower, 'k8s')
        || str_contains($lower, 'terraform')
        || str_contains($lower, 'ci/cd')
        || str_contains($lower, 'cicd')
        || str_contains($lower, 'reliability engineer')
        || str_contains($lower, 'automation engineer')
        || str_contains($lower, 'release engineer')
        || str_contains($lower, 'build engineer')
        || str_contains($lower, 'mlops')
        || str_contains($lower, 'dataops')
        || str_contains($lower, 'ml engineer')
        || str_contains($lower, 'ai engineer')
        || str_contains($lower, 'data engineer');
}

/**
 * Check if the lowercased title matches Frontend Engineer patterns.
 *
 * Checked after DevOps — "DevOps / Frontend" composite titles stay DevOps.
 * Covers web, mobile, and cross-platform frontend roles.
 */
function isFrontendRole(string $lower): bool
{
    return str_contains($lower, 'frontend')
        || str_contains($lower, 'front-end')
        || str_contains($lower, 'front end')
        || str_contains($lower, 'ui engineer')
        || str_contains($lower, 'ui developer')
        || str_contains($lower, 'ux engineer')
        || str_contains($lower, 'react engineer')
        || str_contains($lower, 'react developer')
        || str_contains($lower, 'react native')
        || str_contains($lower, 'vue engineer')
        || str_contains($lower, 'vue developer')
        || str_contains($lower, 'angular engineer')
        || str_contains($lower, 'angular developer')
        || str_contains($lower, 'svelte engineer')
        || str_contains($lower, 'svelte developer')
        || str_contains($lower, 'next.js')
        || str_contains($lower, 'nextjs')
        || str_contains($lower, 'flutter developer')
        || str_contains($lower, 'flutter engineer')
        || str_contains($lower, 'ios developer')
        || str_contains($lower, 'ios engineer')
        || str_contains($lower, 'android developer')
        || str_contains($lower, 'android engineer')
        || str_contains($lower, 'mobile developer')
        || str_contains($lower, 'mobile engineer');
}

/**
 * Check if the lowercased title matches Backend Engineer patterns.
 *
 * Checked last among named buckets — catches fullstack, web developers,
 * and language-specific roles not matched above.
 */
function isBackendRole(string $lower): bool
{
    return str_contains($lower, 'backend')
        || str_contains($lower, 'back-end')
        || str_contains($lower, 'back end')
        || str_contains($lower, 'software engineer')
        || str_contains($lower, 'software developer')
        || str_contains($lower, 'web developer')
        || str_contains($lower, 'web engineer')
        || str_contains($lower, 'fullstack')
        || str_contains($lower, 'full stack')
        || str_contains($lower, 'full-stack')
        || str_contains($lower, 'api engineer')
        || str_contains($lower, 'api developer')
        || str_contains($lower, 'golang engineer')
        || str_contains($lower, 'golang developer')
        || str_contains($lower, 'go developer')
        || str_contains($lower, 'go engineer')
        || str_contains($lower, 'python engineer')
        || str_contains($lower, 'python developer')
        || str_contains($lower, 'ruby engineer')
        || str_contains($lower, 'ruby developer')
        || str_contains($lower, 'rails developer')
        || str_contains($lower, 'rails engineer')
        || str_contains($lower, 'java engineer')
        || str_contains($lower, 'java developer')
        || str_contains($lower, 'kotlin engineer')
        || str_contains($lower, 'kotlin developer')
        || str_contains($lower, 'scala engineer')
        || str_contains($lower, 'scala developer')
        || str_contains($lower, 'node engineer')
        || str_contains($lower, 'node developer')
        || str_contains($lower, 'nodejs engineer')
        || str_contains($lower, 'nodejs developer')
        || str_contains($lower, 'php engineer')
        || str_contains($lower, 'php developer')
        || str_contains($lower, 'laravel developer')
        || str_contains($lower, 'laravel engineer')
        || str_contains($lower, 'django developer')
        || str_contains($lower, 'django engineer')
        || str_contains($lower, '.net developer')
        || str_contains($lower, '.net engineer')
        || str_contains($lower, 'dotnet developer')
        || str_contains($lower, 'dotnet engineer')
        || str_contains($lower, 'rust developer')
        || str_contains($lower, 'rust engineer')
        || str_contains($lower, 'elixir developer')
        || str_contains($lower, 'elixir engineer')
        // QA / Test Automation — closest bucket to Backend in community context
        || str_contains($lower, 'qa engineer')
        || str_contains($lower, 'qe engineer')
        || str_contains($lower, 'quality engineer')
        || str_contains($lower, 'test automation')
        || str_contains($lower, 'automation tester')
        || str_contains($lower, 'sdet')
        || str_contains($lower, 'quality assurance engineer')
        || str_contains($lower, 'software tester');
}


// ════════════════════════════════════════════════════════════════════════════
// SALARY PARSING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Detect the currency code in a raw salary string.
 * Returns 'EUR', 'GBP', 'KES', 'NGN', 'ZAR', or 'USD' (default).
 */
function detectCurrency(string $raw): string
{
    if (stripos($raw, 'EUR') !== false || str_contains($raw, '€')) {
        $currency = 'EUR';
    } elseif (stripos($raw, 'GBP') !== false || str_contains($raw, '£')) {
        $currency = 'GBP';
    } elseif (stripos($raw, 'KES') !== false || stripos($raw, 'ksh') !== false) {
        $currency = 'KES';
    } elseif (stripos($raw, 'NGN') !== false || stripos($raw, 'naira') !== false) {
        $currency = 'NGN';
    } elseif (stripos($raw, 'ZAR') !== false || stripos($raw, 'rand') !== false) {
        $currency = 'ZAR';
    } else {
        $currency = 'USD';
    }

    return $currency;
}

/**
 * Detect the pay period in a raw salary string.
 * Returns 'annual' or 'monthly'.
 *
 * Explicit keyword detection takes priority. When no keyword is present,
 * a magnitude heuristic is applied: if the largest numeric value found is
 * >= 20,000 the figures are treated as annual, since monthly salaries
 * rarely reach that threshold. This correctly handles Remotive strings
 * like "$40,000–$60,000" that omit the period indicator.
 */
function detectPeriod(string $raw): string
{
    // Explicit annual keywords
    if (stripos($raw, 'year')   !== false
     || stripos($raw, 'annual') !== false
     || stripos($raw, '/yr')    !== false
     || stripos($raw, 'p.a.')   !== false) {
        return 'annual';
    }

    // Explicit monthly keywords
    if (stripos($raw, 'month') !== false
     || stripos($raw, '/mo')   !== false
     || stripos($raw, 'mo.')   !== false) {
        return 'monthly';
    }

    // Magnitude heuristic — no explicit keyword present
    preg_match_all('/[\d,]*\.?\d+k?/i', $raw, $matches);
    $max = 0;
    foreach ($matches[0] as $m) {
        $m = str_replace(',', '', $m);
        $val = stripos($m, 'k') !== false
            ? (int) round((float) str_ireplace('k', '', $m) * 1000)
            : (int) $m;
        if ($val > $max) {
            $max = $val;
        }
    }

    return $max >= 20_000 ? 'annual' : 'monthly';
}

/**
 * Extract numeric salary figures from a raw string.
 * Handles formats like "$4,000", "70k", "90000", "25.5k".
 * Filters out spurious values (< 500 or > 1,000,000).
 *
 * @return int[]
 */
function extractSalaryNumbers(string $raw): array
{
    preg_match_all('/[\d,]*\.?\d+k?/i', $raw, $matches);
    $numbers = [];

    foreach ($matches[0] as $m) {
        $m = str_replace(',', '', $m);
        $val = stripos($m, 'k') !== false
            ? (int) round((float) str_ireplace('k', '', $m) * 1000)
            : (int) $m;
        $numbers[] = $val;
    }

    return array_values(
        array_filter($numbers, static fn (int $n): bool => $n >= 500 && $n <= 1_000_000)
    );
}

/**
 * Parse a freeform salary string into structured salary fields.
 *
 * This is the primary salary function — use this everywhere.
 * Annual salaries are normalised to monthly before returning so all
 * values stored in the DB are on the same scale.
 *
 * Returns a named array matching the jobs table columns:
 *   salary_min      int|null   — monthly minimum (null if unparseable)
 *   salary_max      int|null   — monthly maximum (null if single value or unparseable)
 *   salary_currency string     — 'USD' | 'EUR' | 'GBP' | 'KES' | 'NGN' | 'ZAR'
 *   salary_period   string     — always 'monthly' (annual is normalised before return)
 *
 * Handles:
 *   "$4,000 - $6,000"             → {min:4000,  max:6000,  currency:'USD', period:'monthly'}
 *   "€80,000 - €100,000 per year" → {min:6667,  max:8333,  currency:'EUR', period:'monthly'}
 *   "$120k - $150k"               → {min:10000, max:12500, currency:'USD', period:'monthly'}
 *   "KES 300,000"                 → {min:25000, max:null,  currency:'KES', period:'monthly'}
 *   "Competitive" / ""            → {min:null,  max:null,  currency:'USD', period:'monthly'}
 *
 * @param string $raw  Raw salary string from the source API
 * @return array{salary_min: int|null, salary_max: int|null, salary_currency: string, salary_period: string}
 */
function parseSalary(string $raw): array
{
    $result = [
        'salary_min'      => null,
        'salary_max'      => null,
        'salary_currency' => 'USD',
        'salary_period'   => 'monthly',
    ];

    if (trim($raw) === '') {
        return $result;
    }

    $result['salary_currency'] = detectCurrency($raw);
    $result['salary_period']   = detectPeriod($raw);

    $numbers = extractSalaryNumbers($raw);

    if (\count($numbers) >= 2) {
        $result['salary_min'] = min($numbers[0], $numbers[1]);
        $result['salary_max'] = max($numbers[0], $numbers[1]);
    } elseif (\count($numbers) === 1) {
        $result['salary_min'] = $numbers[0];
    }

    // Normalise annual → monthly so all DB values share one scale
    if ($result['salary_period'] === 'annual') {
        if ($result['salary_min'] !== null) {
            $result['salary_min'] = (int) round($result['salary_min'] / 12);
        }
        if ($result['salary_max'] !== null) {
            $result['salary_max'] = (int) round($result['salary_max'] / 12);
        }
        $result['salary_period'] = 'monthly';
    }

    return $result;
}

/**
 * Positional-array alias for parseSalary().
 *
 * Provided for compatibility with sync_remotive.php which destructures:
 *   [$min, $max, $currency] = parseSalaryString($raw);
 *
 * Prefer parseSalary() for all new code — it returns named keys.
 *
 * @return array  [int|null $min, int|null $max, string $currency]
 */
function parseSalaryString(string $raw): array
{
    $parsed = parseSalary($raw);
    return [
        $parsed['salary_min'],
        $parsed['salary_max'],
        $parsed['salary_currency'],
    ];
}


// ════════════════════════════════════════════════════════════════════════════
// AFFILIATE URL BUILDER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Append an affiliate tracking parameter to a job's apply URL.
 *
 * Returns the original URL unchanged when:
 *   - The source has no affiliate programme configured
 *   - The relevant config constant is empty or undefined
 *
 * Currently active:
 *   remotive — appends ?via={REMOTIVE_AFFILIATE_ID}
 *              Sign up: remotive.com → footer → "Affiliate" (instant, no approval)
 *              Commission: 30% of first payment, 90-day cookie
 *
 * Phase 2 (uncomment when signed up):
 *   jobicy   — appends ?ref={JOBICY_AFFILIATE_ID}
 *
 * @param string $url     The original apply URL from the source
 * @param string $source  Source slug: 'remotive', 'weworkremotely', 'jobicy', etc.
 * @return string         URL with affiliate param, or original if not applicable
 */
function buildAffiliateUrl(string $url, string $source): string
{
    if (empty($url)) {
        return $url;
    }

    $result = $url;

    if ($source === 'remotive') {
        $id = \defined('REMOTIVE_AFFILIATE_ID') ? REMOTIVE_AFFILIATE_ID : '';
        if (!empty($id)) {
            $sep = str_contains($url, '?') ? '&' : '?';
            $result = $url . $sep . 'via=' . urlencode($id);
        }
    }

    // ── Phase 2 ──────────────────────────────────────────────────────────────
    // if ($source === 'jobicy') {
    //     $id = defined('JOBICY_AFFILIATE_ID') ? JOBICY_AFFILIATE_ID : '';
    //     if (empty($id)) return $url;
    //     $sep = str_contains($url, '?') ? '&' : '?';
    //     return $url . $sep . 'ref=' . urlencode($id);
    // }
    // ─────────────────────────────────────────────────────────────────────────

    return $result;
}


// ════════════════════════════════════════════════════════════════════════════
// CLOSING DATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Compute the number of days remaining until a job closes.
 *
 * Returns:
 *   null — closes_at is null or empty (no deadline set — "open / rolling")
 *   0    — deadline has already passed
 *   int  — positive days remaining (ceil so partial days count as 1)
 *
 * Used by:
 *   get_jobs.php          — adds days_remaining to every job in the API response
 *   notify_digest.php     — ⏰ urgency flag (closes within 7 days)
 *   notify_weekly.php     — deadline line in weekly roundup
 *
 * Returning null (not 0) for "no deadline" is intentional — the frontend and
 * notification scripts distinguish between "no deadline" and "already closed".
 *
 * @param string|null $closes_at  MySQL DATETIME string or null
 * @return int|null
 */
function daysUntilClose(?string $closes_at): ?int
{
    if ($closes_at === null || $closes_at === '') {
        return null;
    }

    $diff = strtotime($closes_at) - time();

    if ($diff <= 0) {
        return 0;
    }

    return (int) ceil($diff / 86400);
}


// ════════════════════════════════════════════════════════════════════════════
// HTTP FETCH HELPERS  (used by cron/works/ sync scripts)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Fetch a JSON API endpoint and return the decoded jobs array.
 *
 * Pattern A from the PRD — used by sync_remotive.php and (Phase 2) sync_jobicy.php.
 *
 * @param string      $url          Full URL to fetch
 * @param string|null $responseKey  Key to extract from the response.
 *                                  'jobs' matches Remotive's { "jobs": [...] } shape.
 *                                  Pass null to return the full decoded response.
 * @param int         $timeout      cURL timeout in seconds
 * @return array                    Decoded array, or [] on any failure
 */
function fetchJSON(string $url, ?string $responseKey = 'jobs', int $timeout = 20): array
{
    $disableSsl = filter_var(getenv('DISABLE_SSL_VERIFY'), FILTER_VALIDATE_BOOLEAN)
        || !\defined('APP_ENV')
        || (APP_ENV !== 'production' && APP_ENV !== 'staging');

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
        CURLOPT_SSL_VERIFYPEER => !$disableSsl,
        CURLOPT_SSL_VERIFYHOST => $disableSsl ? 0 : 2,
        CURLOPT_HTTPHEADER     => [
            'User-Agent: NairobiDevOps-JobsBot/1.0 (nairobidevops.org)',
            'Accept: application/json',
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    if (\PHP_VERSION_ID < 80000) {
        curl_close($ch);
    }

    $raw = validateHttpResponse($response, $httpCode, $curlErr, $url);
    if ($raw === null) {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        fwrite(STDERR, "[fetchJSON] JSON decode error for {$url}: " . json_last_error_msg() . "\n");
        return [];
    }

    return extractResponseKey($decoded, $responseKey, $url);
}

/**
 * Validate a cURL response and return the body string, or null on any error.
 * Logs the specific failure reason to STDERR.
 *
 * @param string|bool $response  Raw cURL response body (false on transport failure)
 * @param int         $httpCode  HTTP status code
 * @param string      $curlErr   cURL error string (empty string if none)
 * @param string      $url       Original request URL (for error messages)
 * @return string|null           Response body, or null if validation failed
 */
function validateHttpResponse(string|bool $response, int $httpCode, string $curlErr, string $url): ?string
{
    if ($curlErr !== '') {
        fwrite(STDERR, "[fetchJSON] cURL error for {$url}: {$curlErr}\n");
        return null;
    }
    if ($httpCode !== 200) {
        fwrite(STDERR, "[fetchJSON] HTTP {$httpCode} for {$url}\n");
        return null;
    }
    if (empty($response)) {
        fwrite(STDERR, "[fetchJSON] Empty response for {$url}\n");
        return null;
    }
    return (string) $response;
}

function extractResponseKey(array $decoded, ?string $responseKey, string $url): array
{
    if ($responseKey === null) {
        return \is_array($decoded) ? $decoded : [];
    }

    $data = $decoded[$responseKey] ?? [];

    if (!\is_array($data)) {
        fwrite(STDERR, "[fetchJSON] Key '{$responseKey}' is not an array in response from {$url}\n");
        return [];
    }

    return $data;
}

/**
 * Fetch an RSS feed and return a parsed SimpleXMLElement.
 *
 * Pattern B from the PRD — used by sync_wwremote.php and (Phase 2) sync_jobscollider.php.
 *
 * Returns false on any failure. Always check the return:
 *   if ($xml === false || !isset($xml->channel->item)) { ... }
 *
 * @param string $url      Full URL of the RSS feed
 * @param int    $timeout  Stream context timeout in seconds
 * @return SimpleXMLElement|false
 */
function fetchRSS(string $url, int $timeout = 20): SimpleXMLElement|false
{
    $context = stream_context_create([
        'http' => [
            'user_agent' => 'NairobiDevOps-JobsBot/1.0 (nairobidevops.org)',
            'timeout'    => $timeout,
            'header'     => "Accept: application/rss+xml, application/xml, text/xml\r\n",
        ],
        'ssl' => [
            'verify_peer'      => true,
            'verify_peer_name' => true,
        ],
    ]);

    $content = @file_get_contents($url, false, $context);

    if ($content === false) {
        fwrite(STDERR, "[fetchRSS] Failed to fetch RSS feed: {$url}\n");
        return false;
    }

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($content, 'SimpleXMLElement', LIBXML_NOCDATA);
    libxml_clear_errors();

    if ($xml === false) {
        fwrite(STDERR, "[fetchRSS] Failed to parse RSS feed: {$url}\n");
        return false;
    }

    return $xml;
}


// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CHANNELS  (used by cron/works/notify_digest.php and notify_weekly.php)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Dispatch a built message to one named channel.
 *
 * Both notify_digest.php and notify_weekly.php loop over their configured
 * $allChannels array and call this once per channel, so the message text
 * itself is built once and reused for every active channel unchanged.
 *
 * @param string $channel  'telegram' | 'discord' | (Phase 2) 'whatsapp' | 'linkedin' | 'twitter'
 * @param string $message  Fully-built message text (Telegram-flavoured Markdown)
 * @return array{0: bool, 1: string|null}  [success, error message or null]
 */
function sendToChannel(string $channel, string $message): array
{
    return match ($channel) {
        'telegram' => sendTelegram($message),
        'discord'  => sendDiscord($message),

        // ── Phase 2 — uncomment each block when the integration is ready ─────
        // 'whatsapp' => sendWhatsApp($message),
        // 'linkedin' => sendLinkedIn($message),
        // 'twitter'  => sendTwitter($message),
        // ─────────────────────────────────────────────────────────────────────

        default => [false, "Unknown channel: {$channel}"],
    };
}

/**
 * Send a message to the configured Telegram chat (and optional Forum Topic)
 * via the Bot API. Splits automatically if the message exceeds Telegram's
 * 4096 character limit — the weekly roundup is the message most likely to
 * need this.
 *
 * Setup (10 minutes):
 *   1. Telegram → search @BotFather → /newbot → copy the bot token
 *   2. Add the bot to your community group as admin
 *   3. Send any message in the group, then visit:
 *      https://api.telegram.org/bot{TOKEN}/getUpdates
 *      Find "chat": {"id": -XXXXXXXXX} — the negative number is your chat ID
 *   4. If posting into a Forum Topic (e.g. "Opportunities Updates") instead
 *      of "General", also grab "message_thread_id" from the same response —
 *      it appears once you've posted inside that specific topic at least once.
 *
 * Config constants required:
 *   TELEGRAM_BOT_TOKEN  string  required
 *   TELEGRAM_CHAT_ID    string  required
 *   TELEGRAM_THREAD_ID  string  optional — omit/leave blank to post to "General"
 *
 * @param string $message  Message text, Telegram Markdown formatting (*bold*, _italic_)
 * @return array{0: bool, 1: string|null}
 */
function sendTelegram(string $message): array
{
    $need = [];
    if (!\defined('TELEGRAM_BOT_TOKEN') || TELEGRAM_BOT_TOKEN === '') {
        $need[] = 'TELEGRAM_BOT_TOKEN';
    }
    if (!\defined('TELEGRAM_CHAT_ID') || TELEGRAM_CHAT_ID === '') {
        $need[] = 'TELEGRAM_CHAT_ID';
    }
    if ($need) {
        return [false, implode(' and ', $need) . ' not configured in config.php'];
    }

    $chunks = mb_strlen($message) > 4000
        ? splitMessage($message, 4000)
        : [$message];

    foreach ($chunks as $i => $chunk) {
        $result = sendTelegramChunk($chunk, $i, \count($chunks));

        if ($result[0] === false) {
            return $result;
        }
    }

    return [true, null];
}

function sendTelegramChunk(string $chunk, int $index, int $total): array
{
    $disableSsl = filter_var(getenv('DISABLE_SSL_VERIFY'), FILTER_VALIDATE_BOOLEAN)
        || !\defined('APP_ENV')
        || (APP_ENV !== 'production' && APP_ENV !== 'staging');

    $url     = 'https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/sendMessage';
    $payload = [
        'chat_id'                  => TELEGRAM_CHAT_ID,
        'text'                     => $chunk,
        'parse_mode'               => 'Markdown',
        'disable_web_page_preview' => true,
    ];

    if (\defined('TELEGRAM_THREAD_ID') && TELEGRAM_THREAD_ID !== '' && TELEGRAM_THREAD_ID !== null) {
        $payload['message_thread_id'] = (int) TELEGRAM_THREAD_ID;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => !$disableSsl,
        CURLOPT_SSL_VERIFYHOST => $disableSsl ? 0 : 2,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    if (\PHP_VERSION_ID < 80000) {
        curl_close($ch);
    }

    if ($curlErr) {
        return [false, "cURL: {$curlErr}"];
    }
    if ($httpCode !== 200) {
        $body = json_decode($response, true);

        return [false, "HTTP {$httpCode}: " . ($body['description'] ?? substr($response, 0, 150))];
    }

    if ($index < $total - 1) {
        usleep(500_000);
    }

    return [true, null];
}

/**
 * Send a message to the configured Discord channel via an Incoming Webhook.
 * Converts Telegram-style *bold* to Discord-style **bold**, and splits
 * automatically if the message exceeds Discord's 2000 character limit.
 *
 * Setup (2 minutes):
 *   1. Discord server → target channel → Edit Channel
 *   2. Integrations → Webhooks → New Webhook
 *   3. Name it (e.g. "NairobiDevOps Jobs"), copy the Webhook URL
 *   4. Add to config: DISCORD_WEBHOOK_URL
 *
 * Note: Discord returns HTTP 204 (No Content) on success — that is correct,
 * not a failure.
 *
 * @param string $message  Message text, Telegram Markdown formatting (converted below)
 * @return array{0: bool, 1: string|null}
 */
function sendDiscord(string $message): array
{
    if (!\defined('DISCORD_WEBHOOK_URL') || DISCORD_WEBHOOK_URL === '') {
        return [false, 'DISCORD_WEBHOOK_URL not configured in config.php'];
    }

    $discordMsg = preg_replace('/\*(.+?)\*/u', '**$1**', $message);

    $chunks = mb_strlen($discordMsg) > 2000
        ? splitMessage($discordMsg, 1900)
        : [$discordMsg];

    foreach ($chunks as $i => $chunk) {
        $disableSsl = filter_var(getenv('DISABLE_SSL_VERIFY'), FILTER_VALIDATE_BOOLEAN)
            || !\defined('APP_ENV')
            || (APP_ENV !== 'production' && APP_ENV !== 'staging');

        $payload = json_encode([
            'content'          => $chunk,
            'username'         => 'NairobiDevOps Jobs',
            'allowed_mentions' => ['parse' => []],
        ]);

        $ch = curl_init(DISCORD_WEBHOOK_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => !$disableSsl,
            CURLOPT_SSL_VERIFYHOST => $disableSsl ? 0 : 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        if (\PHP_VERSION_ID < 80000) {
            curl_close($ch);
        }

        $error = null;
        if ($curlErr) {
            $error = "cURL: {$curlErr}";
        } elseif ($httpCode !== 200 && $httpCode !== 204) {
            $error = "HTTP {$httpCode}: " . substr($response, 0, 150);
        }
        if ($error !== null) {
            return [false, $error];
        }

        if ($i < \count($chunks) - 1) {
            usleep(500_000); // 0.5s between chunks — avoid Discord rate limit
        }
    }

    return [true, null];
}


// ════════════════════════════════════════════════════════════════════════════
// PHASE 2 — WHATSAPP / LINKEDIN / X (TWITTER)
// ════════════════════════════════════════════════════════════════════════════
//
// ── WHATSAPP ───────────────────────────────────────────────────────────────
// WhatsApp API cannot post to groups — use WhatsApp Channels (broadcast).
// Recommended provider for a solo builder: Twilio (easier than raw Meta Cloud API).
//   1. business.facebook.com → verify your business identity
//   2. Create WhatsApp Business Account with a dedicated phone number
//      (cannot be a number already registered on personal WhatsApp)
//   3. Create a WhatsApp Channel named "NairobiDevOps Jobs"
//   4. Sign up at twilio.com → enable WhatsApp sandbox → go live after verification
//   5. composer require twilio/sdk
//   6. Config keys: TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM, WHATSAPP_CHANNEL_ID
//
// function sendWhatsApp(string $message): array {
//     require_once dirname(__DIR__, 2) . '/vendor/autoload.php';
//     $client = new Twilio\Rest\Client(TWILIO_SID, TWILIO_TOKEN);
//     try {
//         $client->messages->create(
//             'whatsapp:' . WHATSAPP_CHANNEL_ID,
//             ['from' => 'whatsapp:' . TWILIO_WHATSAPP_FROM, 'body' => strip_tags($message)]
//         );
//         return [true, null];
//     } catch (Throwable $e) {
//         return [false, $e->getMessage()];
//     }
// }
//
// ── LINKEDIN ───────────────────────────────────────────────────────────────
// Posts to the NairobiDevOps LinkedIn Page (not a personal profile).
// The weekly roundup tends to perform better here — longer posts with
// stats and multiple listings do well on the algorithm.
//   1. developer.linkedin.com → Create App → link to NairobiDevOps Page
//   2. Request permissions: w_member_social + r_organization_social
//   3. Complete OAuth 2.0 PKCE flow → long-lived access token (expires every 60 days)
//   4. Get your numeric Organization ID via
//      https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee
//   5. Config keys: LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORGANIZATION_ID
//
// function sendLinkedIn(string $message): array {
//     $orgUrn  = 'urn:li:organization:' . LINKEDIN_ORGANIZATION_ID;
//     $payload = json_encode([
//         'author'          => $orgUrn,
//         'lifecycleState'  => 'PUBLISHED',
//         'specificContent' => [
//             'com.linkedin.ugc.ShareContent' => [
//                 'shareCommentary'    => ['text' => strip_tags($message)],
//                 'shareMediaCategory' => 'NONE',
//             ],
//         ],
//         'visibility' => ['com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC'],
//     ]);
//     $ch = curl_init('https://api.linkedin.com/v2/ugcPosts');
//     curl_setopt_array($ch, [
//         CURLOPT_POST           => true,
//         CURLOPT_POSTFIELDS     => $payload,
//         CURLOPT_HTTPHEADER     => [
//             'Content-Type: application/json',
//             'Authorization: Bearer ' . LINKEDIN_ACCESS_TOKEN,
//             'X-Restli-Protocol-Version: 2.0.0',
//         ],
//         CURLOPT_RETURNTRANSFER => true,
//         CURLOPT_TIMEOUT        => 15,
//     ]);
//     $response = curl_exec($ch);
//     $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
//     curl_close($ch);
//     if ($httpCode !== 201) {
//         return [false, "HTTP {$httpCode}: " . substr($response, 0, 150)];
//     }
//     return [true, null];
// }
//
// ── X / TWITTER ────────────────────────────────────────────────────────────
// Daily digest → single tweet (280 char limit). Weekly roundup → works
// better as a thread (one tweet per job). Same auth/setup for either.
//   1. developer.twitter.com → Create Project + App → request "Elevated" access
//      (approval takes 1–7 days)
//   2. Generate API Key, API Secret, Access Token, Access Token Secret
//   3. Config keys: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
//   4. X v2 API needs OAuth 1.0a signing: composer require noweh/twitter-api-v2-php
//
// function sendTwitter(string $message): array {
//     $plain = strip_tags(preg_replace('/\*|_/', '', $message));
//     $tweet = mb_substr($plain, 0, 200) . "\n\n🔗 nairobidevops.org/jobs #DevOps #AfricaTech";
//     // $twitter = new \Noweh\TwitterApi\Tweet(X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET);
//     // try {
//     //     $twitter->performRequest('POST', $twitter->getEndpoint(), ['text' => $tweet]);
//     //     return [true, null];
//     // } catch (Throwable $e) {
//     //     return [false, $e->getMessage()];
//     // }
//     return [false, 'X/Twitter integration not yet implemented — see comments'];
// }
//
// When any Phase 2 channel is ready:
//   - Uncomment its function above
//   - Add its slug to $allChannels in notify_digest.php and/or notify_weekly.php
//   - Add its slug to the channel ENUM in schema.sql:
//     ALTER TABLE notifications_log MODIFY channel ENUM('telegram','discord','whatsapp','linkedin','twitter');
// ─────────────────────────────────────────────────────────────────────────────


/**
 * Split a long message into chunks at newline boundaries, never cutting a
 * line in half. Used by sendTelegram() and sendDiscord() to respect each
 * platform's max message length.
 *
 * @param string $text    Full message text
 * @param int    $maxLen  Maximum characters per chunk
 * @return string[]       One or more chunks, in order
 */
function splitMessage(string $text, int $maxLen): array
{
    if (mb_strlen($text) <= $maxLen) {
        return [$text];
    }

    $chunks = [];
    $lines  = explode("\n", $text);
    $chunk  = '';

    foreach ($lines as $line) {
        $candidate = $chunk === '' ? $line : $chunk . "\n" . $line;
        if (mb_strlen($candidate) > $maxLen && $chunk !== '') {
            $chunks[] = trim($chunk);
            $chunk    = $line;
        } else {
            $chunk = $candidate;
        }
    }

    if ($chunk !== '') {
        $chunks[] = trim($chunk);
    }

    return $chunks;
}


// ════════════════════════════════════════════════════════════════════════════
// DIGEST / ROUNDUP DISPLAY HELPERS
// Shared formatting used when building job lines in notify_digest.php and
// notify_weekly.php.
// ════════════════════════════════════════════════════════════════════════════

function locationEmoji(string $type): string
{
    return match ($type) {
        'africa_remote'        => '🌍',
        'africa_onsite'        => '📍',
        'international_remote' => '🌐',
        default                => '📌',
    };
}

function locationLabel(string $type): string
{
    return match ($type) {
        'africa_remote'        => 'Africa Remote',
        'africa_onsite'        => 'Africa Onsite',
        'international_remote' => 'International Remote',
        default                => ucwords(str_replace('_', ' ', $type)),
    };
}

function currencySymbol(string $currency): string
{
    return match (strtoupper(trim($currency))) {
        'USD'   => '$',
        'EUR'   => '€',
        'GBP'   => '£',
        'KES'   => 'KSh ',
        default => strtoupper($currency) . ' ',
    };
}

/**
 * Escape Telegram Markdown v1 special characters in a string.
 *
 * Job titles and company names from external APIs can contain characters
 * that Telegram's Markdown parser treats as formatting (e.g. underscores
 * in "Senior_SRE", backticks, square brackets). Without escaping, these
 * break the entire message or cause Telegram to reject the send request.
 *
 * Must be called BEFORE inserting user-supplied text into Markdown-formatted
 * message templates (*bold*, _italic_, etc.).
 *
 * @param string $text  Raw text to escape
 * @return string       Safe text for Telegram Markdown
 */
function escapeTelegramMarkdown(string $text): string
{
    $replacements = [
        '\\' => '\\\\',
        '*'  => '\\*',
        '_'  => '\\_',
        '`'  => '\\`',
        '['  => '\\[',
    ];

    return strtr($text, $replacements);
}


// ════════════════════════════════════════════════════════════════════════════
// POLYFILLS
// ════════════════════════════════════════════════════════════════════════════

/**
 * mb_substr polyfill — used when the mbstring extension is not loaded.
 * cPanel shared hosting almost always has mbstring, but this prevents a
 * fatal error if it ever isn't available.
 */
if (!\function_exists('mb_substr')) {
    function mb_substr(string $string, int $start, ?int $length = null, ?string $encoding = null): string // NOSONAR
    {
        if ($encoding !== null && strcasecmp($encoding, 'UTF-8') !== 0) {
            return (string) substr($string, $start, $length ?? \strlen($string));
        }

        preg_match_all('/./us', $string, $matches);
        if (empty($matches[0])) {
            return '';
        }

        $chars = $matches[0];
        $count = \count($chars);

        if ($start < 0) {
            $start = max(0, $count + $start);
        }
        if ($start >= $count) {
            return '';
        }

        if ($length === null) {
            return implode('', \array_slice($chars, $start));
        }
        if ($length < 0) {
            $length = max(0, $count - $start + $length);
        }

        return implode('', \array_slice($chars, $start, $length));
    }
}
