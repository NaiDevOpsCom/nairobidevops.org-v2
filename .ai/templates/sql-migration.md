---
description: Idempotent SQL migration template
---

```sql
-- {{description}}
-- Migration: {{sequence}}_{{date}}_{{name}}.sql

-- Guard: check if already applied
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '{{table}}'
  AND COLUMN_NAME = '{{column}}';

-- Apply if not exists
SET @sql = IF(@exists = 0,
    'ALTER TABLE {{table}} {{change_definition}}',
    'SELECT "already applied" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

## Usage

1. Save as `backend/migrations/{{NNN}}_{{description}}.sql` (zero-padded, e.g., `006_add_event_category.sql`)
2. Replace `{{table}}`, `{{column}}`, `{{change_definition}}` with actual values
3. Run via `cd backend && php composer.phar run migrate`

## Guard Pattern

Always use `information_schema` guards so the migration can run multiple times safely. Never use `DROP TABLE` or `DROP COLUMN` in migrations — backward-compatible changes only.
