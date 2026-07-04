---
description: PHP API endpoint template for NDC backend
---

```php
<?php

declare(strict_types=1);

// {{endpoint_name}} — {{description}}
// Action: {{action_name}}
// Method: {{http_method}}

function {{helper_function}}(): array
{
    $db = getDB();

    $stmt = $db->prepare('SELECT * FROM {{table}} WHERE {{condition}}');
    $stmt->execute([/* params */]);

    return $stmt->fetchAll();
}

// Main dispatch — this file is require_once'd by index.php
$action = $_GET['action'] ?? '';

if ($action !== '{{action_name}}') {
    return; // Let index.php handle 404
}

if ($_SERVER['REQUEST_METHOD'] !== '{{http_method}}') {
    http_response_code(405);
    respondJson(['error' => 'Method not allowed']);
}

try {
    $data = {{helper_function}}();
    respondJson($data);
} catch (PDOException $e) {
    http_response_code(500);
    respondJson(['error' => 'Internal server error']);
    // Log: error_log($e->getMessage());
}
```

## Usage

1. Place in `backend/endpoints/{{filename}}.php`
2. Replace all `{{placeholders}}`
3. Use `getDB()` for PDO connection — never create a new connection
4. All queries use prepared statements — never interpolate values
5. Respond with `respondJson()` — never `echo` or `exit` directly
6. Add the action to the router in `backend/index.php`

## Security Checklist

- [ ] Input sanitized via `sanitizeString()` or `filter_var`
- [ ] Prepared statements for all SQL
- [ ] Method validation for POST endpoints
- [ ] CORS allowlist in index.php covers this origin
- [ ] `declare(strict_types=1)` present
