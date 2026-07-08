<?php

declare(strict_types=1);

/**
 * endpoints/get_jobs.php — GET /?action=jobs
 *
 * Wired in via index.php's action router. This file handles HTTP concerns
 * only: reading + validating query params, and shaping JobRepository's raw
 * DB rows into the JSON contract the frontend's useJobs.ts expects. No SQL
 * lives here — see JobRepository::findPaginated() for that.
 *
 * Every $_GET value is validated/cast before use; nothing is trusted as-is.
 */

require_once \dirname(__DIR__) . '/vendor/autoload.php';
require_once \dirname(__DIR__) . '/db.php';
require_once \dirname(__DIR__) . '/helpers.php';

use App\Repository\JobRepository;

if (!\function_exists('respond')) {
    /**
     * Send a JSON response and exit. Defined here (guarded with
     * function_exists) rather than assumed to already exist from index.php,
     * so this endpoint works correctly regardless of what the router itself
     * does or doesn't define — index.php's own respond(), if it has one,
     * still wins since this only defines it when missing.
     */
    function respond(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_THROW_ON_ERROR);
        exit;
    }
}

const ALLOWED_SORTS = ['newest', 'closing_soon', 'salary_desc'];
/** Reduced from 100 to 50 for performance — keep in sync with frontend useJobs.ts */
const MAX_PER_PAGE = 50;

/**
 * Splits a comma-separated query param into a clean list of non-empty
 * values. Returns [] for a missing/empty param rather than [""].
 *
 * @return string[]
 */
function parseCsvParam(?string $raw): array
{
    if ($raw === null || trim($raw) === '') {
        return [];
    }

    return array_values(array_filter(
        array_map('trim', explode(',', $raw)),
        static fn (string $value): bool => $value !== '',
    ));
}

/**
 * Maps a JobRepository row (raw DB shape) to the frontend's Job interface —
 * decodes the tags JSON column, coerces MySQL's 0/1 to real booleans,
 * normalizes MySQL's 'Y-m-d H:i:s' to an ISO-ish 'Y-m-d\TH:i:s' string the
 * frontend's Date.parse() can rely on consistently across browsers.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function formatJobForApi(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'company' => $row['company'],
        'company_logo_url' => $row['company_logo_url'],
        'role_type' => $row['role_type'],
        'location_type' => $row['location_type'],
        'location_detail' => $row['location_detail'],
        'africa_friendly' => (bool) $row['africa_friendly'],
        'salary_min' => $row['salary_min'] !== null ? (int) $row['salary_min'] : null,
        'salary_max' => $row['salary_max'] !== null ? (int) $row['salary_max'] : null,
        'salary_currency' => $row['salary_currency'],
        'salary_period' => $row['salary_period'],
        'experience_level' => $row['experience_level'],
        'tags' => $row['tags'] !== null ? (json_decode((string) $row['tags'], true) ?? []) : [],
        'apply_url' => $row['apply_url'],
        'affiliate_apply_url' => $row['affiliate_apply_url'],
        'source' => $row['source'],
        'posted_at' => formatIsoDate($row['posted_at'] ?? null),
        'closes_at' => formatIsoDate($row['closes_at'] ?? null),
        'days_remaining' => daysUntilClose($row['closes_at'] ?? null),
        'is_featured' => (bool) $row['is_featured'],
        'description' => $row['description'],
    ];
}

function formatIsoDate(?string $mysqlDatetime): ?string
{
    if ($mysqlDatetime === null || $mysqlDatetime === '') {
        return null;
    }

    return str_replace(' ', 'T', $mysqlDatetime);
}



// ── Parse + validate query params ───────────────────────────────────────────

$sortParam = $_GET['sort'] ?? 'newest';
$sort = \is_string($sortParam) && \in_array($sortParam, ALLOWED_SORTS, true) ? $sortParam : 'newest';

$page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT);
$page = ($page !== false && $page > 0) ? $page : 1;

$perPage = filter_var($_GET['per_page'] ?? 20, FILTER_VALIDATE_INT);
$perPage = ($perPage !== false && $perPage > 0) ? min($perPage, MAX_PER_PAGE) : 20;

$filters = [
    'q' =>
        isset($_GET['q']) && \is_string($_GET['q']) ? trim($_GET['q']) : '',
    'role_type' =>
        parseCsvParam(\is_string($_GET['role_type'] ?? null) ? $_GET['role_type'] : null),
    'location_type' =>
        parseCsvParam(\is_string($_GET['location_type'] ?? null) ? $_GET['location_type'] : null),
    'africa_friendly' => (($_GET['africa_friendly'] ?? null) === '1'),
    'experience_level' =>
        parseCsvParam(\is_string($_GET['experience_level'] ?? null) ? $_GET['experience_level'] : null),
    'sort'     => $sort,
    'page'     => $page,
    'per_page' => $perPage,
];

$salaryMin = filter_var($_GET['salary_min'] ?? null, FILTER_VALIDATE_INT);
if ($salaryMin !== false && $salaryMin !== null) {
    $filters['salary_min'] = $salaryMin;
}

$salaryMax = filter_var($_GET['salary_max'] ?? null, FILTER_VALIDATE_INT);
if ($salaryMax !== false && $salaryMax !== null) {
    $filters['salary_max'] = $salaryMax;
}

// ── Query + respond ──────────────────────────────────────────────────────────

$db = getDB();
$repository = new JobRepository($db);
$result = $repository->findPaginated($filters);

$totalPages = $result['per_page'] > 0 ? (int) ceil($result['total'] / $result['per_page']) : 0;

respond(200, [
    'total' => $result['total'],
    'page' => $result['page'],
    'per_page' => $result['per_page'],
    'total_pages' => $totalPages,
    'last_updated' => $repository->getLastSyncedAt(),
    'jobs' => array_map('formatJobForApi', $result['jobs']),
]);
