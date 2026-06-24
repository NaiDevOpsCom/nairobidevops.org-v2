<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

$db = getDB();

// Count total
$total_stmt = $db->query("SELECT COUNT(*) FROM jobs WHERE is_active = 1 AND is_approved = 1");
$total = (int)$total_stmt->fetchColumn();

$is_paginated = isset($_GET['page']) || isset($_GET['per_page']);

if ($is_paginated) {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $per_page = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $per_page;

    // Fetch jobs (paginated)
    $stmt = $db->prepare("
        SELECT * FROM jobs
        WHERE is_active = 1 AND is_approved = 1
        ORDER BY is_featured DESC, posted_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$per_page, $offset]);
} else {
    $page = 1;
    $per_page = $total;

    // Fetch all jobs
    $stmt = $db->prepare("
        SELECT * FROM jobs
        WHERE is_active = 1 AND is_approved = 1
        ORDER BY is_featured DESC, posted_at DESC
    ");
    $stmt->execute();
}
$jobs = $stmt->fetchAll();

// Add days_remaining to each job
foreach ($jobs as &$job) {
    $job['days_remaining'] = daysUntilClose($job['closes_at'] ?? null);
}

respondJson([
    'total'       => $total,
    'page'        => $page,
    'per_page'    => $per_page,
    'total_pages' => $total > 0 ? (int)ceil($total / $per_page) : 0,
    'jobs'        => $jobs
]);