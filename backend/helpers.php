<?php

/**
 * Send a JSON response and exit.
 */
function respondJson(int $status, array $data): void {
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

    // Step 2: Strip all remaining HTML tags (inline: strong, em, a, span, …)
    $text = strip_tags($text);

    // Step 3: Decode HTML entities — safe here because step 2 already removed tags
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    // Step 4: Collapse 3+ consecutive newlines → one blank line
    $text = preg_replace('/\n{3,}/', "\n\n", $text);

    // Step 5: Trim each line, then trim the whole string
    $lines = array_map('trim', explode("\n", $text));
    return trim(implode("\n", $lines));
}

/**
 * Calculate the number of days until a closing date.
 */
function daysUntilClose(?string $closesAt): int {
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
function sanitizeString(string $val): string {
    return htmlspecialchars(strip_tags(trim($val)), ENT_QUOTES, 'UTF-8');
}

/**
 * Map a job title to a role type that matches the frontend whitelist.
 * Valid values: 'Platform Engineering' | 'SRE' | 'Cloud Architect' | 'Security' | 'DevOps Engineer'
 */
function mapRoleType(string $title): string {
    $lower = strtolower($title);

    return match (true) {
        str_contains($lower, 'site reliability'),
        str_contains($lower, ' sre ')              => 'SRE',
        str_contains($lower, 'cloud architect'),
        str_contains($lower, 'solutions architect'),
        str_contains($lower, 'cloud engineer')     => 'Cloud Architect',
        str_contains($lower, 'security'),
        str_contains($lower, 'devsecops')           => 'Security',
        str_contains($lower, 'platform engineer'),
        str_contains($lower, 'platform eng')        => 'Platform Engineering',
        str_contains($lower, 'devops'),
        str_contains($lower, 'infrastructure'),
        str_contains($lower, 'kubernetes'),
        str_contains($lower, 'terraform'),
        str_contains($lower, 'backend engineer'),
        str_contains($lower, 'software engineer'),
        str_contains($lower, 'fullstack'),
        str_contains($lower, 'full stack'),
        str_contains($lower, 'full-stack'),
        str_contains($lower, 'data engineer'),
        str_contains($lower, 'ml engineer'),
        str_contains($lower, 'mlops'),
        str_contains($lower, 'ai engineer')         => 'DevOps Engineer',
        default                                     => 'Other',
    };
}

/**
 * Build an affiliate URL if affiliate ID is defined.
 */
function buildAffiliateUrl(string $url, string $source): string {
    if ($source !== 'remotive' || !defined('REMOTIVE_AFFILIATE_ID') || REMOTIVE_AFFILIATE_ID === '') {
        return $url;
    }

    $separator = str_contains($url, '?') ? '&' : '?';
    return $url . $separator . 'aff=' . REMOTIVE_AFFILIATE_ID;
}
