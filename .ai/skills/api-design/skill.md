---
name: api-design
description: Guide for designing and modifying API endpoints. Covers routing, request validation, response format, CORS, and error handling patterns. Use when adding new endpoints or changing existing API behavior.
tags:
  - api
  - rest
  - php
  - endpoints
  - validation
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# API Design

## Adding a New Endpoint

1. Add a new case to the `match` statement in `backend/index.php`:

```php
match($action) {
    'jobs'   => require_once __DIR__ . '/endpoints/get_jobs.php',
    'submit' => require_once __DIR__ . '/endpoints/submit_job.php',
    'track'  => require_once __DIR__ . '/endpoints/track_click.php',
    'new'    => require_once __DIR__ . '/endpoints/new_action.php',
    default  => respondJson(404, ['error' => 'Unknown action']),
};
```

2. Create the endpoint file in `backend/endpoints/`:
   - Require `db.php` and `helpers.php`
   - Validate input at the top
   - Use prepared statements for all DB queries
   - Call `respondJson()` for output

3. Update the frontend proxy in `vite.config.ts` if needed (API paths proxied via `/endpoints` during dev)

## Request Validation Rules

- Validate JSON body: `$input = json_decode(file_get_contents('php://input'), true); if (!$input) ...`
- Check required fields exist and are non-empty
- Validate URL schemes (http/https only)
- Sanitize all string input via `sanitizeString()` or `strip_tags` + `htmlspecialchars`
- Cast numeric values to appropriate types
- Return 400 with `{'error': 'descriptive message'}` on validation failure

## Response Format

```json
// Success
{"total": 150, "page": 1, "jobs": [...]}

// Error
{"error": "Human-readable message"}

// Created
{"success": true, "id": 42}
```

## HTTP Status Codes

- `200` — Success
- `201` — Created (job submission)
- `400` — Validation failure
- `404` — Unknown action or resource not found
- `405` — Wrong HTTP method
- `500` — Server/database error

## CORS

CORS allowlist in `index.php`. Currently: `https://nairobidevops.org`, `https://staging.nairobidevops.org`, `http://localhost:5173`, `http://localhost:4000`.

Add new origins by appending to the `$allowedOrigins` array.

## Method Enforcement

POST-only actions listed in `$postActions` array. Unknown actions return 404. OPTIONS preflight handled globally (returns 204).

## Performance

- Paginate list endpoints with `LIMIT ? OFFSET ?`
- Set max page size (current: 100)
- Use composite indexes matching WHERE + ORDER BY
- Compute expensive fields (like `days_remaining`) in PHP, not SQL
