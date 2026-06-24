<?php

/**
 * Send a JSON response and exit.
 */
function respondJson(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

/**
 * Normalize various status inputs to a small set of canonical strings.
 * This demonstrates refactoring from many returns to a single return value.
 */
function normalizeStatus(mixed $input): string {
    // Default result value — a single return at the end keeps control flow clear
    $status = 'unknown';

    if ($input === null) {
        $status = 'missing';
    } elseif (is_int($input)) {
        $status = normalizeIntStatus($input);
    } elseif (is_string($input)) {
        $status = normalizeStringStatus($input);
    }

    return $status;
}

/**
 * Normalize an integer HTTP status code to a canonical status string.
 */
function normalizeIntStatus(int $code): string {
    return match (true) {
        $code >= 200 && $code < 300 => 'ok',
        $code >= 400 && $code < 500 => 'client_error',
        $code >= 500                => 'server_error',
        default                     => 'other',
    };
}

/**
 * Normalize a string status label to a canonical status string.
 */
function normalizeStringStatus(string $label): string {
    return match (strtolower(trim($label))) {
        'ok', 'success' => 'ok',
        'error'         => 'error',
        default         => 'other',
    };
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
 * Map a job title to a specific role type.
 */
function mapRoleType(string $title): string {
    $lower = strtolower($title);

    return match (true) {
        str_contains($lower, 'devops')              => 'DevOps',
        str_contains($lower, 'cloud'),
        str_contains($lower, 'aws'),
        str_contains($lower, 'azure'),
        str_contains($lower, 'gcp')                 => 'Cloud',
        str_contains($lower, 'sysadmin'),
        str_contains($lower, 'system administrator') => 'SysAdmin',
        default                                     => 'Software Engineer',
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
