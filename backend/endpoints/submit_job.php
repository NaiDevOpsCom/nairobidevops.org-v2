<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

$db = getDB();

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['title']) || empty($input['company']) || empty($input['apply_url'])) {
    respondJson(400, ['error' => 'Missing required fields: title, company, apply_url']);
}

try {
    $stmt = $db->prepare("
        INSERT INTO jobs (title, company, description, apply_url, source, is_active, is_approved)
        VALUES (:title, :company, :description, :apply_url, 'employer_submission', 0, 0)
    ");
    $stmt->execute([
        ':title'       => htmlspecialchars(strip_tags(trim($input['title'])), ENT_QUOTES, 'UTF-8'),
        ':company'     => htmlspecialchars(strip_tags(trim($input['company'])), ENT_QUOTES, 'UTF-8'),
        ':description' => isset($input['description']) ? htmlspecialchars(strip_tags(trim($input['description'])), ENT_QUOTES, 'UTF-8') : null,
        ':apply_url'   => filter_var(trim($input['apply_url']), FILTER_VALIDATE_URL) ? trim($input['apply_url']) : '',
    ]);

    respondJson(201, ['success' => true, 'id' => (int)$db->lastInsertId()]);
} catch (PDOException $e) {
    respondJson(500, ['error' => 'Failed to insert job']);
}
