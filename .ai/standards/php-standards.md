# PHP Standards

## Configuration

- PHP 8.4+ required (platform config: 8.5.7)
- PSR-12 coding style enforced by PHP-CS-Fixer
- Config in `backend/.php-cs-fixer.php`: short arrays, ordered imports, single quotes, trailing commas in multiline, no unused imports

## Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Classes | PascalCase | `RemotiveFetcher`, `NormalizedJob` |
| Interfaces | PascalCase + `Interface` suffix | `JobFetcherInterface` |
| Methods | camelCase | `getDB()`, `fetchJobs()`, `sanitizeString()` |
| Functions | camelCase | `respondJson()`, `mapRoleType()` |
| Constants | UPPER_SNAKE_CASE | `DB_HOST`, `APP_ENV` |
| Variables | camelCase | `$jobCount`, `$rawInput` |
| Files (classes) | PascalCase | `RemotiveFetcher.php` |
| Files (endpoints) | snake_case | `get_jobs.php`, `submit_job.php` |

## File Structure

```
backend/
├── index.php              # Router — uses match() with ?action=
├── db.php                 # getDB() PDO singleton
├── helpers.php            # All utility functions
├── endpoints/             # ?action= handler files
├── src/
│   ├── Contracts/         # Interfaces
│   ├── Fetcher/           # Source fetchers
│   ├── Http/              # HTTP client
│   ├── Migration/         # Migration runner
│   └── Model/             # DTOs
├── cron/                  # Scheduled tasks
├── migrations/            # SQL migrations
└── tests/                 # PHPUnit tests
```

## Code Style (PSR-12)

```php
<?php

declare(strict_types=1);

namespace App\Fetcher;

use App\Contracts\JobFetcherInterface;

class RemotiveFetcher implements JobFetcherInterface
{
    public function __construct(
        private readonly HttpClientInterface $http,
    ) {}

    public function fetch(): array
    {
        $response = $this->http->get('https://remotive.com/api/jobs');
        return json_decode($response, true)['jobs'] ?? [];
    }
}
```

## PDO Patterns

```php
// Connection — singleton
$db = getDB();

// SELECT with positional params
$stmt = $db->prepare('SELECT * FROM jobs WHERE id = ? AND is_active = 1');
$stmt->execute([$jobId]);
$job = $stmt->fetch(PDO::FETCH_ASSOC);

// INSERT
$stmt = $db->prepare('INSERT INTO jobs (title, company) VALUES (:title, :company)');
$stmt->execute([':title' => $title, ':company' => $company]);
$id = (int) $db->lastInsertId();

// Always use prepared statements — never interpolate values into SQL
// Bad:  $db->query("SELECT * FROM jobs WHERE id = $id");
// Good: $db->prepare('SELECT * FROM jobs WHERE id = ?');
```

## API Endpoint Pattern

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

$db = getDB();

// Validate input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['required_field'])) {
    respondJson(400, ['error' => 'Missing required field']);
}

try {
    // Database operation
    respondJson(200, ['data' => $result]);
} catch (PDOException $e) {
    respondJson(500, ['error' => 'Database query failed']);
}
```

## Error Handling

- Catch PDO exceptions per-endpoint, return 500 JSON response
- RuntimeException for connection failures (caught in router)
- Never expose internal error details (stack traces, SQL) in production responses
- Use `respondJson()` for all responses — it sets status, content-type, encodes JSON, and exits

## What Not to Do

- No string interpolation in SQL queries — always use prepared statements
- No `mysql_*` or `mysqli_*` functions — use PDO only
- No `extract()` — explicit variable assignment only
- No `eval()` or `assert()` for code execution
- No die/exit outside of respondJson helper
- No variables in class names or function calls (dynamic calls)
