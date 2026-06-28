<?php

/**
 * Send a JSON response and exit.
 */
function respondJson(int $status, array $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_THROW_ON_ERROR);
    exit;
}

/**
 * Convert a raw HTML job description to clean, readable plain text.
 *
 * Steps:
 *   1. Replace block-level tags with newlines so paragraphs/list-items separate
 *   2. Strip all remaining HTML tags
 *   3. Decode HTML entities (&amp; → &, &#x27; → ', …)
 *   4. Collapse runs of 3+ newlines → one blank line
 *   5. Trim each line, then trim the whole string
 *
 * NOTE: Entities are decoded AFTER stripping so that encoded tags (e.g. &#60;b&#62;)
 * cannot re-introduce HTML into the output. The strip_tags call on step 2 removes
 * any literal tags; the decode on step 3 can only produce plain-text characters
 * because all angle brackets from the original HTML were already removed.
 */
function cleanDescription(string $rawHtml): string
{
    if (trim($rawHtml) === '') {
        return '';
    }

    // Step 1: Block-level tags → newline
    $text = preg_replace(
        '/<\s*\/?\s*(p|br|li|h[1-6]|div|blockquote|ul|ol|tr|td|th)[^>]*>/i',
        "\n",
        $rawHtml
    );

    // Step 2: Decode HTML entities first (prevents injection via encoded tags)
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    // Step 3: Strip all remaining HTML tags (inline: strong, em, a, span, …)
    $text = strip_tags($text);

    // Step 4: Collapse 3+ consecutive newlines → one blank line
    $text = preg_replace('/\n{3,}/', "\n\n", $text);

    // Step 5: Trim each line, then trim the whole string
    $lines = array_map('trim', explode("\n", $text));
    return trim(implode("\n", $lines));
}

/**
 * Calculate the number of days until a closing date.
 */
function daysUntilClose(?string $closesAt): int
{
    if ($closesAt === null) {
        return 0;
    }

    try {
        $now = new DateTime();
        $closeDate = new DateTime($closesAt);
        return $closeDate > $now ? (int)$now->diff($closeDate)->days : 0;
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * Sanitize a string by stripping HTML tags and trimming.
 */

function sanitizeString(string $val): string
{
    // Decode HTML entities first (e.g. &amp; → &), then strip any tags, then trim
    $decoded = html_entity_decode(trim($val), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim(strip_tags($decoded));
}

/**
 * Map a job title to a role type that matches the frontend whitelist.
 *
 * Valid values:
 *   'SRE' | 'Cloud Architect' | 'Security' | 'Platform Engineering'
 *   'DevOps Engineer' | 'Backend Engineer' | 'Frontend Engineer' | 'Sysadmin'
 *   'Other'
 *
 * Order matters — more specific patterns are checked first to avoid
 * misclassification (e.g. "DevSecOps" must hit Security before DevOps Engineer).
 */
function mapRoleType(string $title): string
{
    $lower = strtolower($title);

    return match (true) {
        // ── SRE ───────────────────────────────────────────────────────────────
        // Check ' sre' with leading space to avoid matching 'sre' inside words,
        // but also handle titles that START with 'sre' (no leading space).
        str_contains($lower, 'site reliability'),
        str_contains($lower, ' sre'),
        $lower === 'sre',
        str_starts_with($lower, 'sre ')                 => 'SRE',

        // ── Cloud Architect ───────────────────────────────────────────────────
        str_contains($lower, 'cloud architect'),
        str_contains($lower, 'solutions architect'),
        str_contains($lower, 'cloud engineer')          => 'Cloud Architect',

        // ── Security / DevSecOps ──────────────────────────────────────────────
        str_contains($lower, 'devsecops'),
        str_contains($lower, 'security engineer'),
        str_contains($lower, 'security architect'),
        str_contains($lower, 'appsec'),
        str_contains($lower, 'application security')    => 'Security',

        // ── Platform Engineering ──────────────────────────────────────────────
        str_contains($lower, 'platform engineer'),
        str_contains($lower, 'platform eng'),
        str_contains($lower, 'developer experience'),
        str_contains($lower, 'devex engineer')          => 'Platform Engineering',

        // ── Sysadmin ──────────────────────────────────────────────────────────
        str_contains($lower, 'sysadmin'),
        str_contains($lower, 'system administrator'),
        str_contains($lower, 'systems administrator'),
        str_contains($lower, 'linux administrator'),
        str_contains($lower, 'network engineer'),
        str_contains($lower, 'network administrator')   => 'Sysadmin',

        // ── DevOps Engineer ───────────────────────────────────────────────────
        str_contains($lower, 'devops'),
        str_contains($lower, 'infrastructure engineer'),
        str_contains($lower, 'infrastructure eng'),
        str_contains($lower, 'kubernetes'),
        str_contains($lower, 'k8s'),
        str_contains($lower, 'terraform'),
        str_contains($lower, 'ci/cd'),
        str_contains($lower, 'reliability engineer'),
        str_contains($lower, 'automation engineer'),
        str_contains($lower, 'mlops'),
        str_contains($lower, 'ml engineer'),
        str_contains($lower, 'ai engineer'),
        str_contains($lower, 'data engineer')           => 'DevOps Engineer',

        // ── Frontend Engineer ─────────────────────────────────────────────────
        str_contains($lower, 'frontend'),
        str_contains($lower, 'front-end'),
        str_contains($lower, 'front end'),
        str_contains($lower, 'ui engineer'),
        str_contains($lower, 'react engineer'),
        str_contains($lower, 'vue engineer'),
        str_contains($lower, 'angular engineer')        => 'Frontend Engineer',

        // ── Backend Engineer ──────────────────────────────────────────────────
        // Checked AFTER frontend so fullstack titles hit the next bucket
        str_contains($lower, 'backend'),
        str_contains($lower, 'back-end'),
        str_contains($lower, 'back end'),
        str_contains($lower, 'software engineer'),
        str_contains($lower, 'fullstack'),
        str_contains($lower, 'full stack'),
        str_contains($lower, 'full-stack'),
        str_contains($lower, 'api engineer'),
        str_contains($lower, 'golang engineer'),
        str_contains($lower, 'python engineer'),
        str_contains($lower, 'ruby engineer'),
        str_contains($lower, 'java engineer'),
        str_contains($lower, 'node engineer')           => 'Backend Engineer',

        default                                         => 'Other',
    };
}

// ── Salary helpers ────────────────────────────────────────────────────────────
//
// These are shared by sync_remotive.php and sync_wwremote.php.
// Remotive returns a dedicated salary string from its JSON API.
// WWR has no salary field — the helpers are called on text extracted
// from the job description CDATA when a salary pattern is found.

/**
 * Detect the currency symbol or code in a raw salary string.
 * Returns 'EUR', 'GBP', or 'USD' (default).
 */
function detectCurrency(string $raw): string
{
    if (stripos($raw, 'EUR') !== false || str_contains($raw, '€')) {
        return 'EUR';
    }
    if (stripos($raw, 'GBP') !== false || str_contains($raw, '£')) {
        return 'GBP';
    }
    return 'USD';
}

/**
 * Detect the pay period in a raw salary string.
 * Returns 'annual' or 'monthly' (default).
 */
function detectPeriod(string $raw): string
{
    $isAnnual = stripos($raw, 'year')   !== false
             || stripos($raw, 'annual') !== false
             || stripos($raw, 'yr')     !== false;

    return $isAnnual ? 'annual' : 'monthly';
}

/**
 * Extract numeric salary figures from a raw string.
 * Handles formats like "$4,000", "70k", "90000".
 * Filters out spurious year values (< 500 or > 1,000,000).
 *
 * @return int[]
 */
function extractSalaryNumbers(string $raw): array
{
    preg_match_all('/[\d,]+k?/i', $raw, $matches);
    $numbers = [];

    foreach ($matches[0] as $m) {
        $m = str_replace(',', '', $m);
        if (stripos($m, 'k') !== false) {
            $m = (int) str_ireplace('k', '', $m) * 1000;
        }
        $numbers[] = (int) $m;
    }

    $numbers = array_filter($numbers, static fn (int $n): bool => $n >= 500 && $n <= 1_000_000);
    return array_values($numbers);
}

/**
 * Parse a free-text salary string into structured min/max/currency/period.
 *
 * Returns nulls for fields that cannot be parsed — callers must handle nulls.
 * Annual salaries are normalised to monthly for consistency across sources.
 *
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

    // Normalise annual figures to monthly for consistency across sources
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
 * Build an affiliate URL if affiliate ID is defined.
 */
function buildAffiliateUrl(string $url, string $source): string
{
    if ($source !== 'remotive' || !\defined('REMOTIVE_AFFILIATE_ID') || REMOTIVE_AFFILIATE_ID === '') {
        return $url;
    }

    $separator = str_contains($url, '?') ? '&' : '?';
    return $url . $separator . 'via=' . REMOTIVE_AFFILIATE_ID;
}

/**
 * Polyfill for mb_substr if the mbstring extension is not loaded.
 */
if (!\function_exists('mb_substr')) {
    function mb_substr(string $string, int $start, ?int $length = null, ?string $encoding = null): string // NOSONAR
    {
        if ($encoding !== null && strcasecmp($encoding, 'UTF-8') !== 0) {
            return (string)substr($string, $start, $length ?? \strlen($string));
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
