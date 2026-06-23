<?php
// Project helper utilities (kept small and Sonar-compliant).
// Examples show patterns to satisfy Sonar rules:
// - Always end file with a newline
// - Avoid excessive return statements in a single function
// - Always use braces for conditional blocks

/**
 * Send a JSON response and exit.
 */
function respond_json(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

/**
 * Normalize various status inputs to a small set of canonical strings.
 * This demonstrates refactoring from many returns to a single return value.
 */
function normalize_status($input): string {
    // Default result value — a single return at the end keeps control flow clear
    $status = 'unknown';

    if ($input === null) {
        $status = 'missing';
    } else {
        if (is_int($input)) {
            if ($input >= 200 && $input < 300) {
                $status = 'ok';
            } elseif ($input >= 400 && $input < 500) {
                $status = 'client_error';
            } elseif ($input >= 500) {
                $status = 'server_error';
            } else {
                $status = 'other';
            }
        } elseif (is_string($input)) {
            $val = strtolower(trim($input));
            if ($val === 'ok' || $val === 'success') {
                $status = 'ok';
            } elseif ($val === 'error') {
                $status = 'error';
            } else {
                $status = 'other';
            }
        }
    }

    return $status;
}

/**
 * Calculate the number of days until a closing date.
 */
function daysUntilClose(?string $closesAt): int {
    $days = 0;

    if ($closesAt !== null) {
        try {
            $now = new DateTime();
            $closeDate = new DateTime($closesAt);
            if ($closeDate > $now) {
                $diff = $now->diff($closeDate);
                $days = (int)$diff->days;
            }
        } catch (Exception $e) {
            // Ignore parse exception and return 0
        }
    }

    return $days;
}

