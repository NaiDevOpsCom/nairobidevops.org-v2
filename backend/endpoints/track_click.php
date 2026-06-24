<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

$db = getDB();

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['job_id'])) {
    respondJson(400, ['error' => 'Missing required field: job_id']);
}

$jobId = (int)$input['job_id'];

try {
    $stmt = $db->prepare("SELECT id FROM jobs WHERE id = ? AND is_active = 1");
    $stmt->execute([$jobId]);

    if (!$stmt->fetch()) {
        respondJson(404, ['error' => 'Job not found']);
    }

    respondJson(200, ['success' => true]);
} catch (PDOException $e) {
    respondJson(500, ['error' => 'Database query failed']);
}
