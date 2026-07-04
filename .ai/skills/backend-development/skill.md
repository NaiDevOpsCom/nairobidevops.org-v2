---
name: backend-development
description: Guide for developing the PHP API backend. Covers API routing, PDO database patterns, PSR-12 coding standards, cron job structure, error handling, and security patterns. Use when modifying API endpoints, adding backend features, or fixing backend issues.
tags:
  - php
  - pdo
  - mysql
  - psr-12
  - backend
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# Backend Development

## Tech Stack

- PHP 8.4+ (platform config: 8.5.7)
- MySQL/MariaDB via raw PDO (no ORM)
- Composer for dependency management
- PHP-CS-Fixer (PSR-12) for code style
- PHPUnit for testing

## Architecture

Single-entry API router at `backend/index.php`. All requests dispatch via `?action=`:

```
GET  ?action=jobs   → backend/endpoints/get_jobs.php
POST ?action=submit → backend/endpoints/submit_job.php
POST ?action=track  → backend/endpoints/track_click.php
```

## Code Structure

```
backend/
├── index.php              # Router (single entry point)
├── db.php                 # PDO singleton connection
├── helpers.php            # Utility functions
├── config.example.php     # Configuration template
├── endpoints/             # API endpoint handlers
├── src/
│   ├── Contracts/         # JobFetcherInterface, JobNormalizerInterface
│   ├── Fetcher/           # RemotiveFetcher
│   ├── Http/              # CurlHttpClient, HttpClientInterface
│   ├── Migration/         # MigrationRunner
│   └── Model/             # NormalizedJob
├── cron/                  # Scheduled tasks
│   ├── works/             # sync_remotive, sync_wwremote, expire_jobs
│   └── notification/      # notify_digest, notify_weekly
├── migrations/            # SQL migration files
└── tests/                 # PHPUnit tests
```

## PDO Patterns

```php
// Connection (db.php) — singleton, prepared statements only
function getDB(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}

// Query pattern — always use prepared statements
$stmt = $db->prepare('SELECT * FROM jobs WHERE id = ? AND is_active = 1');
$stmt->execute([$jobId]);
$result = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

## Coding Standards (PSR-12)

- Run `composer cs-fix` (PHP-CS-Fixer) before committing
- Config in `backend/.php-cs-fixer.php`: short arrays, ordered imports, single quotes, trailing commas
- Declare `strict_types=1` in all new endpoint files
- Use typed properties and return types

## Response Pattern

```php
respondJson(200, ['data' => $result]);
// Defined in helpers.php — sets status, Content-Type, encodes JSON, exits
```

## Error Handling

- PDO exceptions caught per-endpoint
- `RuntimeException` for database connection failures (caught in router)
- Never expose internal error details in production responses
- All errors return `{'error': 'message'}` JSON

## Input Sanitization

- `sanitizeString()`: decode entities → strip tags → trim
- `cleanDescription()`: block tags → newlines → decode → strip → collapse whitespace
- Employer submissions: `strip_tags` + `htmlspecialchars` with ENT_QUOTES
- URL validation: must have http/https scheme via `filter_var`
