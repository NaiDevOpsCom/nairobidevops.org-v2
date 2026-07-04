# Testing Standards

## Frontend (Vitest)

### Setup

Config in `frontend/vitest.config.ts`:
- Environment: jsdom (browser API simulation)
- Globals: `true` — `describe`, `it`, `expect`, `vi` available without imports
- Setup files: none currently
- Coverage: v8 provider with lcov, text, json, html reporters
- Alias resolution matches Vite: `@/`, `@shared/`, `@assets/`

### Running Tests

```bash
cd frontend
npm run test            # Single run
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
npm run test:ui         # Vitest UI dashboard
```

### File Organization

- Co-locate tests with source in `__tests__/` directories
- Naming: `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `*.spec.tsx`
- Existing: `client/src/utils/__tests__/safeNavigate.test.ts`, `hardenedBuildCheck.test.ts`

### Test Patterns

```typescript
// Unit test — pure function
describe('mapRoleType', () => {
  it('classifies SRE titles correctly', () => {
    expect(mapRoleType('Site Reliability Engineer')).toBe('SRE');
  });

  it('blocks non-tech roles', () => {
    expect(mapRoleType('Sales Engineer')).toBe('Uncategorised');
  });
});

// Mock external dependencies
vi.mock('@/lib/cloudinary', () => ({
  getImageUrl: vi.fn(() => 'https://res.cloudinary.com/...'),
}));
```

### What to Test

- Utility functions (sanitizeString, mapRoleType, parseSalary, safeNavigate)
- Business logic (sort, filter, classify)
- Edge cases (null values, empty arrays, boundary conditions)
- Error states (API failures, validation errors)

### What Not to Test

- shadcn/ui primitives (they're tested upstream)
- Third-party library internals
- Static data files (blogData, eventsData)
- Pure layout components (testing just markup)

## Backend (PHPUnit)

### Setup

Config in `backend/phpunit.xml`:
- Bootstrap: `vendor/autoload.php`
- Constants: `APP_ENV=test`, `PHPUNIT_RUNNING=1`
- Test directory: `backend/tests/`

### Running Tests

```bash
cd backend
composer test           # Run PHPUnit
```

### Test Organization

- Mirror source structure: `tests/Fetcher/`, `tests/Migration/`
- Extend `PHPUnit\Framework\TestCase`
- Use `#[DataProvider]` for data-driven tests
- Existing: `tests/HelpersTest.php`, `tests/Fetcher/RemotiveFetcherTest.php`, `tests/Migration/MigrationRunnerTest.php`

### Test Patterns

```php
#[DataProvider('salaryProvider')]
public function testParseSalary(string $raw, ?int $min, ?int $max, string $currency): void
{
    $result = parseSalary($raw);
    $this->assertSame($min, $result['salary_min']);
    $this->assertSame($max, $result['salary_max']);
    $this->assertSame($currency, $result['salary_currency']);
}

public static function salaryProvider(): array
{
    return [
        'range with dollar' => ['$4,000 - $6,000', 4000, 6000, 'USD'],
        'annual with euro'  => ['€80,000 - €100,000 per year', 6667, 8333, 'EUR'],
        'single k-value'    => ['KES 120k', 120000, null, 'KES'],
        'empty string'      => ['', null, null, 'USD'],
    ];
}
```

## CI Integration

- Tests run automatically on every PR via `.github/workflows/project-checks.yml`
- Frontend: `vitest run`
- Backend: `composer test`
- All tests must pass before merge

## Coverage Goals

- Current threshold: 0 (no build failures for low coverage)
- Target areas for improvement: helpers.php (mapRoleType, parseSalary), security utilities (safeNavigate)
