# Database Schema

## Overview

MySQL/MariaDB database used by the Jobs Board feature. No ORM — raw PDO with prepared statements. Connection via `backend/db.php` singleton.

## Tables

### `jobs` — Main job listings table

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `title` | VARCHAR(255) NOT NULL | Sanitized via `sanitizeString()` |
| `company` | VARCHAR(255) NOT NULL | |
| `company_logo_url` | VARCHAR(512) | |
| `description` | TEXT | Cleaned HTML → plain text via `cleanDescription()` |
| `apply_url` | VARCHAR(512) NOT NULL | Validated URL scheme |
| `affiliate_apply_url` | VARCHAR(512) | With affiliate tracking param appended |
| `source` | VARCHAR(50) | `remotive`, `weworkremotely`, `manual`, `employer_submission` |
| `source_id` | VARCHAR(255) NOT NULL | Raw ID from source API |
| `role_type` | VARCHAR(100) | Classified by `mapRoleType()`. Default: 'Uncategorised' |
| `location_type` | VARCHAR(20) | `africa_remote`, `africa_onsite`, `international_remote` |
| `location_detail` | VARCHAR(255) | Free-text location |
| `africa_friendly` | TINYINT(1) DEFAULT 0 | Flagged for Africa-friendly roles |
| `salary_min` | INT UNSIGNED | Normalized to monthly |
| `salary_max` | INT UNSIGNED | Normalized to monthly |
| `salary_currency` | VARCHAR(10) DEFAULT 'USD' | USD, EUR, GBP, KES, NGN, ZAR |
| `salary_period` | VARCHAR(10) | Always 'monthly' (annual normalized on insert) |
| `experience_level` | VARCHAR(20) | `junior`, `mid`, `senior`, `lead`, `any` |
| `posted_at` | DATETIME | From source |
| `fetched_at` | DATETIME DEFAULT NOW | When we fetched it |
| `closes_at` | DATETIME | Application deadline |
| `closes_at_sort` | DATETIME GENERATED VIRTUAL | `IFNULL(closes_at, '2099-12-31 23:59:59')` — for NULL-safe sorting |
| `is_active` | TINYINT(1) DEFAULT 1 | Soft delete / expiry |
| `is_featured` | TINYINT(1) DEFAULT 0 | Promoted listing |
| `featured_until` | DATETIME | |
| `is_approved` | TINYINT(1) DEFAULT 1 | Employer submissions start at 0 |
| `is_notified` | TINYINT(1) DEFAULT 0 | Whether notified via digest/roundup |
| `tags` | JSON | Flexible tagging |
| `created_at` | DATETIME DEFAULT NOW | |
| `updated_at` | DATETIME DEFAULT NOW ON UPDATE | |

**Indexes:**

| Index | Columns | Purpose |
|---|---|---|
| `UNIQUE (source, source_id)` | source, source_id | Deduplication — same job from same source never inserted twice |
| `idx_listing_newest` | is_active, is_approved, is_featured, posted_at | Hot path: active + approved listings, newest first |
| `idx_listing_closing` | is_active, is_approved, is_featured, closes_at_sort | Hot path: active + approved, closing soon |
| `idx_location` | location_type | Filter by location |
| `idx_role` | role_type | Filter by role |
| `idx_closes_at` | closes_at | Expired job cleanup |
| `idx_fetched` | fetched_at | Sync diagnostics |
| `idx_notified` | is_notified | Notification processing |

### `sync_log` — Cron run logging

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `source` | VARCHAR(50) NOT NULL | Source name (not ENUM — new sources need no migration) |
| `ran_at` | DATETIME | |
| `jobs_fetched` | INT | Total from source |
| `jobs_inserted` | INT | Newly inserted |
| `jobs_skipped` | INT | Duplicates |
| `jobs_expired` | INT | Marked inactive |
| `jobs_purged` | INT | Deleted |
| `duration_sec` | INT | |
| `errors` | TEXT | Error details |

### `notifications_log` — Notification dispatch tracking

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `channel` | VARCHAR(50) NOT NULL | `telegram`, `discord` (not ENUM) |
| `notification_type` | VARCHAR(20) | `daily_digest`, `weekly_roundup`, `instant_alert` |
| `job_ids` | JSON | Jobs included in notification |
| `message_preview` | TEXT | First part of message |
| `sent_at` | DATETIME | |
| `status` | VARCHAR(10) | `sent`, `failed` |
| `error` | TEXT | Error message if failed |

### `job_clicks` — Affiliate click tracking

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `job_id` | INT NOT NULL | FK → jobs.id ON DELETE CASCADE |
| `click_type` | VARCHAR(20) | `apply`, `affiliate_apply` |
| `clicked_at` | DATETIME | |

Indexes: `(job_id)`, `(clicked_at)`

### `schema_migrations` — Migration tracking

| Column | Type |
|---|---|
| `version` | VARCHAR(255) PK |
| `filename` | VARCHAR(255) |
| `applied_at` | DATETIME |

## Migrations

| File | Purpose |
|---|---|
| `migrations/003_initial_schema.sql` | Canonical starting schema (5 tables) |
| `migrations/001_charset_and_index_fixes.sql` | utf8mb4 charset, ENUM→VARCHAR migration, composite indexes |
| `migrations/002_add_last_synced_at.sql` | Added `last_synced_at`, sync_log enhancements |

## Key Queries

### List active jobs (paginated, filtered, sorted)

```sql
SELECT id, title, company, role_type, location_type, salary_min, salary_max,
       salary_currency, apply_url, affiliate_apply_url, posted_at, closes_at,
       is_featured, description
FROM jobs
WHERE is_active = 1 AND is_approved = 1
  AND (title LIKE ? OR company LIKE ? OR description LIKE ?)  -- optional search
  AND role_type IN (?)          -- optional filter
  AND location_type IN (?)      -- optional filter
ORDER BY is_featured DESC, posted_at DESC
LIMIT ? OFFSET ?
```

### Insert new job (deduplicated)

```sql
INSERT INTO jobs (title, company, description, apply_url, source, source_id, ...)
VALUES (?, ?, ?, ?, ?, ?, ...)
-- Duplicate key (source, source_id) silently skips
```

### Track a click

```sql
INSERT INTO job_clicks (job_id, clicked_at) VALUES (?, NOW())
```

## Connection

```php
// backend/db.php
$pdo = new PDO(
    'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
    DB_USER, DB_PASS,
    [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]
);
```

Config loaded from `config.php` (symlinked by deploy) with fallback to `config.local.php` (local dev).

## Schema File

Canonical source: `backend/schema.sql`

Fresh install: `mysql -u root -p <dbname> < backend/schema.sql`

Existing install: run `backend/migrations/*.sql` in order.
