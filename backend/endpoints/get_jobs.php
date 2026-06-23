<?php
require_once __DIR__ . '/../helpers.php';

$db = getDB();

$page = max(1, (int)($_GET['page'] ?? 1));
$per_page = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
$offset = ($page - 1) * $per_page;

// Count total
$total_stmt = $db->query("SELECT COUNT(*) FROM jobs WHERE is_active = 1 AND is_approved = 1");
$total = (int)$total_stmt->fetchColumn();

// Fetch jobs
$stmt = $db->prepare("
    SELECT * FROM jobs
    WHERE is_active = 1 AND is_approved = 1
    ORDER BY is_featured DESC, posted_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute([$per_page, $offset]);
$jobs = $stmt->fetchAll();

// Add days_remaining to each job
foreach ($jobs as &$job) {
    $job['days_remaining'] = daysUntilClose($job['closes_at'] ?? null);
}

respond(200, [
    'total'       => $total,
    'page'        => $page,
    'per_page'    => $per_page,
    'total_pages' => $total > 0 ? (int)ceil($total / $per_page) : 0,
    'jobs'        => $jobs
]);