<?php
/**
 * get_jobs.php
 * Returns a paginated, filtered list of active approved job listings.
 *
 * Called via: GET /?action=jobs
 *
 * Query parameters (all optional):
 *   q               string   Full-text search: title, company, description
 *   role_type       string   Comma-separated role types e.g. "DevOps Engineer,SRE"
 *   location_type   string   Comma-separated: africa_remote,africa_onsite,international_remote
 *   africa_friendly int      1 = Africa-friendly only
 *   source          string   Comma-separated: remotive,weworkremotely
 *   sort            string   newest (default) | closing_soon | salary_desc
 *   page            int      Page number (default: 1)
 *   per_page        int      Results per page (default: 20, max: 100)
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/db.php';
require_once dirname(__DIR__) . '/helpers.php';

$db = getDB();

// ── Input sanitisation ────────────────────────────────────────────────────────

$q              = trim((string) ($_GET['q']              ?? ''));
$roleTypeRaw    = trim((string) ($_GET['role_type']      ?? ''));
$locationRaw    = trim((string) ($_GET['location_type']  ?? ''));
$africaFriendly = isset($_GET['africa_friendly']) ? (int) $_GET['africa_friendly'] : null;
$sourceRaw      = trim((string) ($_GET['source']         ?? ''));
$sort           = trim((string) ($_GET['sort']           ?? 'newest'));
$page           = max(1, (int) ($_GET['page']            ?? 1));
$perPage        = min(100, max(1, (int) ($_GET['per_page'] ?? 20)));
$offset         = ($page - 1) * $perPage;

// Valid sort values — reject anything else and fall back to newest
$validSorts = ['newest', 'closing_soon', 'salary_desc'];
if (!in_array($sort, $validSorts, true)) {
    $sort = 'newest';
}

// Parse comma-separated filter values into arrays, strip empty entries
$roleTypes     = $roleTypeRaw !== ''
    ? array_filter(array_map('trim', explode(',', $roleTypeRaw)))
    : [];
$locationTypes = $locationRaw !== ''
    ? array_filter(array_map('trim', explode(',', $locationRaw)))
    : [];
$sources       = $sourceRaw !== ''
    ? array_filter(array_map('trim', explode(',', $sourceRaw)))
    : [];

// ── Build WHERE clause dynamically ───────────────────────────────────────────

$conditions = ['is_active = 1', 'is_approved = 1'];
$params     = [];

// Full-text search — title, company, description
if ($q !== '') {
    $conditions[] = '(title LIKE ? OR company LIKE ? OR description LIKE ?)';
    $like = '%' . $q . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

// Role type filter (IN clause)
if (!empty($roleTypes)) {
    $placeholders = implode(',', array_fill(0, count($roleTypes), '?'));
    $conditions[] = "role_type IN ({$placeholders})";
    foreach ($roleTypes as $rt) {
        $params[] = $rt;
    }
}

// Location type filter (IN clause)
if (!empty($locationTypes)) {
    $placeholders = implode(',', array_fill(0, count($locationTypes), '?'));
    $conditions[] = "location_type IN ({$placeholders})";
    foreach ($locationTypes as $lt) {
        $params[] = $lt;
    }
}

// Africa-friendly toggle
if ($africaFriendly === 1) {
    $conditions[] = 'africa_friendly = 1';
}

// Source filter (IN clause)
if (!empty($sources)) {
    $placeholders = implode(',', array_fill(0, count($sources), '?'));
    $conditions[] = "source IN ({$placeholders})";
    foreach ($sources as $src) {
        $params[] = $src;
    }
}

$whereClause = 'WHERE ' . implode(' AND ', $conditions);

// ── Sort order ────────────────────────────────────────────────────────────────
// Featured jobs always float to the top within any sort mode.

$orderClause = match ($sort) {
    'closing_soon' => 'ORDER BY is_featured DESC, (CASE WHEN closes_at IS NULL THEN CAST("9999-12-31 23:59:59" AS DATETIME) ELSE closes_at END) ASC, posted_at DESC',
    'salary_desc'  => 'ORDER BY is_featured DESC, salary_max DESC, salary_min DESC, posted_at DESC',
    default        => 'ORDER BY is_featured DESC, posted_at DESC',
};

// ── Total count (for pagination) ──────────────────────────────────────────────

try {
    $countStmt = $db->prepare("SELECT COUNT(*) FROM jobs {$whereClause}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();
} catch (PDOException $e) {
    respondJson(500, ['error' => 'Database query failed']);
    exit;
}

// ── Fetch jobs ────────────────────────────────────────────────────────────────

try {
    $dataStmt = $db->prepare("
        SELECT
            id,
            title,
            company,
            company_logo_url,
            role_type,
            location_type,
            location_detail,
            africa_friendly,
            salary_min,
            salary_max,
            salary_currency,
            salary_period,
            experience_level,
            tags,
            apply_url,
            affiliate_apply_url,
            source,
            posted_at,
            closes_at,
            is_featured,
            description
        FROM jobs
        {$whereClause}
        {$orderClause}
        LIMIT ? OFFSET ?
    ");

    // Append pagination params (must come after WHERE params)
    $dataStmt->execute([...$params, $perPage, $offset]);
    $jobs = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    respondJson(500, ['error' => 'Database query failed']);
    exit;
}

// ── Post-process each job ─────────────────────────────────────────────────────

foreach ($jobs as &$job) {
    // Compute days remaining (null if no closes_at)
    $job['days_remaining'] = ($job['closes_at'] ?? null) !== null
        ? daysUntilClose($job['closes_at'])
        : null;

    // Cast booleans for JSON output
    $job['africa_friendly'] = (bool) $job['africa_friendly'];
    $job['is_featured']     = (bool) $job['is_featured'];

    // Decode tags JSON — return empty array if null or malformed
    $job['tags'] = !empty($job['tags'])
        ? (json_decode($job['tags'], true) ?? [])
        : [];

    // Cast salary fields to int or null
    $job['salary_min'] = $job['salary_min'] !== null ? (int) $job['salary_min'] : null;
    $job['salary_max'] = $job['salary_max'] !== null ? (int) $job['salary_max'] : null;
}
unset($job); // break reference

// ── Last updated timestamp ────────────────────────────────────────────────────

$lastUpdated = null;
try {
    $syncStmt  = $db->query('SELECT MAX(ran_at) FROM sync_log');
    $lastUpdated = $syncStmt->fetchColumn() ?: null;
} catch (PDOException $e) {
    // Non-fatal — fall back to jobs table
}

if ($lastUpdated === null) {
    try {
        $fetchedStmt = $db->query(
            'SELECT MAX(fetched_at) FROM jobs WHERE is_active = 1 AND is_approved = 1'
        );
        $lastUpdated = $fetchedStmt->fetchColumn() ?: null;
    } catch (PDOException $e) {
        // Ignore — null is acceptable
    }
}

// ── Response ──────────────────────────────────────────────────────────────────

respondJson(200, [
    'total'        => $total,
    'page'         => $page,
    'per_page'     => $perPage,
    'total_pages'  => $total > 0 ? (int) ceil($total / $perPage) : 0,
    'last_updated' => $lastUpdated,
    'jobs'         => $jobs,
]);
