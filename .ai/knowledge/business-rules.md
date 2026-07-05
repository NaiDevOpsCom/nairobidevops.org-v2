# Business Rules

## Job Board

### Listing Visibility

1. Jobs must have `is_active=1` AND `is_approved=1` to appear in public listings.
2. Employer submissions start with `is_active=0`, `is_approved=0` (pending moderation).
3. Synced jobs from Remotive/WWR start with `is_active=1`, `is_approved=1`.

### Deduplication

4. Jobs are deduplicated by the composite key `(source, source_id)`. The same job from the same external source is never inserted twice.

### Role Classification

5. Job titles are classified by `mapRoleType()` with a strict priority order:
   - Hard block (`isNonTechRole`) — overrides everything. Civil engineers, sales titles, designers, etc. map to 'Uncategorised'.
   - SRE → Security → Cloud Architect → Platform Engineering → Sysadmin → DevOps Engineer → Frontend Engineer → Backend Engineer → Uncategorised
6. The default is 'Uncategorised', NOT 'DevOps Engineer'. This prevents non-DevOps roles (including civil engineers, sales engineers) from polluting the DevOps-specific filters.

### Salary Normalization

7. All salaries are stored as monthly values. Annual salaries are divided by 12 before storage.
8. Salary parsing uses multi-step detection: currency symbol → period keyword → magnitude heuristic.
9. The magnitude heuristic treats values >= 20,000 as annual (since monthly salaries rarely reach that threshold).

### Affiliate Tracking

10. Remotive affiliate links append `?via={REMOTIVE_AFFILIATE_ID}` to the apply URL.
11. Affiliate URLs are built at sync time (when the job is stored), not at request time.

### Search & Sorting

12. Featured jobs (`is_featured=1`) always float to the top, regardless of sort mode.
13. `closes_at_sort` uses a generated column with a far-future sentinel ('2099-12-31') to ensure NULL closing dates sort last (not first) in "closing soon" order.

## Notifications

14. Daily digest notifies about jobs posted in the last 24 hours.
15. Weekly roundup notifies about jobs posted in the last 7 days.
16. Messages are sent to Telegram (Bot API) and Discord (Webhook) simultaneously.
17. Telegram messages use Markdown formatting; Discord messages convert `*bold*` to `**bold**`.
18. Messages exceeding platform limits (Telegram: 4096 chars, Discord: 2000 chars) are auto-split.
19. A 500ms delay is inserted between chunks to avoid rate limits.

## Cron Jobs

20. `sync_remotive.php` and `sync_wwremote.php` run every hour.
21. `expire_jobs.php` marks stale listings as inactive.
22. `migrate_clean_descriptions.php` is a one-off cleanup for previously stored HTML descriptions.
23. All cron scripts are guarded by a shared secret (`CRON_SECRET_KEY`) passed as a query parameter.

## Security

24. All user/API input is sanitized: HTML entities decoded, tags stripped, whitespace trimmed.
25. `apply_url` is validated for http/https scheme before storage.
26. Employer submissions use `strip_tags` + `htmlspecialchars` with ENT_QUOTES for XSS prevention.
27. All database queries use PDO prepared statements — no string interpolation in SQL.
28. CORS is restricted to an allowlist of known origins.
29. The `/jobs-api/` path is excluded from SPA rewrite rules via `.htaccess`.

## Deployment

30. Production deploys use atomic symlink switching: new release → `current` symlink atomically updated.
31. The previous release is kept for instant rollback.
32. Secret configuration (`config.php`) is symlinked by the deployment script, stored outside the webroot.
33. Hardened builds drop console/debugger at both the esbuild and terser levels, and omit sourcemaps.

## Schema Migrations

34. Migrations are guarded by `information_schema` checks to ensure idempotency (safe to run multiple times).
35. New sources are added as VARCHAR values, not ENUM members — no schema migration needed for source additions.
36. New notification channels similarly use VARCHAR, not ENUM.

## Code Quality Gate

37. All code changes must pass the complete quality gate before merging:
    - Frontend: ESLint (zero errors), Prettier formatting check, TypeScript strict type check, Vitest tests pass
    - Backend: PHP syntax check (`php -l`), PSR-12 formatting (PHP-CS-Fixer dry-run), PHPUnit tests pass
    - Static analysis: SonarQube scan must report zero new warnings (blocker, critical, major)
    - The quality gate is enforced by the pre-commit hook (local) and CI workflows (remote). SonarQube analysis runs in CI only.
