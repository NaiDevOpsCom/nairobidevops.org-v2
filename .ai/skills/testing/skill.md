---
name: testing
description: Guide for writing and running tests. Covers Vitest patterns for frontend, PHPUnit structure for backend, test data patterns, and CI integration. Use when writing new tests, debugging test failures, or improving coverage.
tags:
  - testing
  - vitest
  - phpunit
  - coverage
  - quality
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# Testing

## Frontend (Vitest)

### Configuration

Config in `frontend/vitest.config.ts`:
- Environment: jsdom
- Globals enabled (describe, it, expect without imports)
- Coverage: v8 provider (lcov, text, json, html reporters)
- Aliases match vite config (`@/`, `@shared/`, `@assets/`)

### Running Tests

```bash
cd frontend
npm run test          # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
npm run test:ui       # Vitest UI dashboard
```

### Test Patterns

- Test files go in `client/src/utils/__tests__/` or co-located with source
- Filename: `*.test.ts` or `*.spec.ts`
- Use `describe`/`it`/`expect` globally (no imports needed)
- Mock external dependencies (API calls, Cloudinary) with `vi.mock()`

```typescript
describe('safeNavigate', () => {
  it('blocks javascript: URLs', () => {
    expect(safeNavigate('javascript:alert(1)')).toBe(false);
  });
  it('allows valid https URLs', () => {
    expect(safeNavigate('https://example.com')).toBe(true);
  });
});
```

## Backend (PHPUnit)

### Configuration

Config in `backend/phpunit.xml`:
- Bootstrap: `vendor/autoload.php`
- Test suite: `Backend` → `tests/`
- Constants: `APP_ENV=test`, `DB_NAME=nairobidevops_jobs_test`, `PHPUNIT_RUNNING=1`

### Running Tests

```bash
cd backend
composer test         # Run PHPUnit
```

### Test Patterns

- Test files in `backend/tests/` mirroring source structure
- Extend `PHPUnit\Framework\TestCase`
- Use `setUp()` for test fixtures
- Test helpers (sanitizeString, mapRoleType, parseSalary) with data providers

```php
#[DataProvider('salaryProvider')]
public function testParseSalary(string $raw, ?int $expectedMin, ?int $expectedMax): void
{
    $result = parseSalary($raw);
    $this->assertSame($expectedMin, $result['salary_min']);
    $this->assertSame($expectedMax, $result['salary_max']);
}
```

## CI Integration

- Tests run automatically on PRs via `.github/workflows/project-checks.yml`
- Frontend: `npm run check` (lint + typecheck + format + test)
- Backend: composer lint + PHP-CS-Fixer + PHPUnit
- All checks must pass before merge to `main` or `pre-staging`

## Coverage Goals

- Thresholds currently at 0 (no failing builds) — aim to raise as coverage improves
- Focus on: helpers, utility functions, business logic (mapRoleType, parseSalary, sanitizeString)
