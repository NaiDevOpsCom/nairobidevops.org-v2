---
name: database
description: Guide for working with the MySQL database. Covers schema structure, migration patterns, query optimization, and indexing strategy. Use when designing schema changes, writing migrations, or optimizing queries.
tags:
  - mysql
  - database
  - sql
  - migrations
  - schema
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# Database

## Connection

MySQL/MariaDB via PDO singleton in `backend/db.php`. Config loaded from `config.php` (symlinked by deploy) with fallback to `config.local.php`.

## Schema

Canonical source: `backend/schema.sql`. Five tables:

- **jobs** — Main job listings (27 columns, 8 indexes). Deduplicated via UNIQUE(source, source_id).
- **sync_log** — Cron run logging per source. Source is VARCHAR (not ENUM) so new sources need no migration.
- **notifications_log** — Notification dispatch tracking. Channel is VARCHAR (not ENUM).
- **job_clicks** — Affiliate click tracking with FK to jobs (CASCADE delete).
- **schema_migrations** — Tracks applied migration versions.

## Migrations

Migration files in `backend/migrations/`. Run via `backend/cron/migrate.php`.

Rules:
- Every migration must be idempotent — use `IF NOT EXISTS` / `information_schema` guards
- Name files with zero-padded sequence: `NNN_description.sql`
- New sources/channels use VARCHAR, never ENUM (avoids ALTER TABLE for additions)
- Fresh installs use `schema.sql` directly

```php
// Guard pattern for column additions
$check = $db->query("
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = '" . DB_NAME . "'
      AND TABLE_NAME = 'jobs'
      AND COLUMN_NAME = 'last_synced_at'
");
if ((int)$check->fetchColumn() === 0) {
    $db->exec('ALTER TABLE jobs ADD COLUMN last_synced_at DATETIME');
}
```

## Indexing Strategy

- Composite indexes for hot paths: `(is_active, is_approved, is_featured, posted_at)` for listings
- Deduplication: UNIQUE `(source, source_id)`
- Filter columns: single-column indexes on `location_type`, `role_type`, `closes_at`, `fetched_at`
- Generated column `closes_at_sort` with far-future sentinel for NULL-safe closing sort

## Key Queries

```sql
-- List active jobs (paginated, filtered)
SELECT id, title, company, role_type, location_type, salary_min, salary_max,
       salary_currency, apply_url, posted_at, closes_at, is_featured, description
FROM jobs
WHERE is_active = 1 AND is_approved = 1
  AND (title LIKE ? OR company LIKE ?)  -- optional search
ORDER BY is_featured DESC, posted_at DESC
LIMIT ? OFFSET ?

-- Insert with deduplication (UNIQUE key silently skips duplicates)
INSERT INTO jobs (...) VALUES (...)

-- Track click
INSERT INTO job_clicks (job_id, clicked_at) VALUES (?, NOW())
```

## Salary Storage

- All salaries normalized to monthly before storage (annual ÷ 12)
- Currency detected from symbol or code (USD, EUR, GBP, KES, NGN, ZAR)
- Period detected from keyword or magnitude heuristic (>= 20,000 → annual)
