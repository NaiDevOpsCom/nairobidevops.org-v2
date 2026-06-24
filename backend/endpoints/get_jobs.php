<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

$db = getDB();

// Count total
try {
    $total_stmt = $db->query("SELECT COUNT(*) FROM jobs WHERE is_active = 1 AND is_approved = 1");
    $total = (int)$total_stmt->fetchColumn();
} catch (PDOException $e) {
    respondJson(500, ['error' => 'Database query failed']);
}

$is_paginated = isset($_GET['page']) || isset($_GET['per_page']);

// Default page size when pagination params are absent. Keeps the endpoint
// bounded even for unpaginated requests that the frontend makes today.
const DEFAULT_PAGE_SIZE = 100;

try {
    $page     = max(1, (int)($_GET['page'] ?? 1));
    $per_page = $is_paginated
        ? min(100, max(1, (int)($_GET['per_page'] ?? 20)))
        : DEFAULT_PAGE_SIZE;
    $offset   = ($page - 1) * $per_page;

    $stmt = $db->prepare("
        SELECT * FROM jobs
        WHERE is_active = 1 AND is_approved = 1
        ORDER BY is_featured DESC, posted_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$per_page, $offset]);
    $jobs = $stmt->fetchAll();

    foreach ($jobs as &$job) {
        $job['days_remaining'] = daysUntilClose($job['closes_at'] ?? null);
    }
} catch (PDOException $e) {
    respondJson(500, ['error' => 'Database query failed']);
}

respondJson(200, [
    'total'       => $total,
    'page'        => $page,
    'per_page'    => $per_page,
    'total_pages' => $total > 0 ? (int)ceil($total / $per_page) : 0,
    'jobs'        => $jobs
]);
