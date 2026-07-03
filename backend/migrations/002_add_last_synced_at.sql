-- 002_add_last_synced_at.sql
-- Adds last_synced_at (for stale-listing expiry — distinct from fetched_at,
-- which only records first insert). Backfills role_type default. Adds
-- jobs_updated/status to sync_log for richer per-run reporting.
-- Every ALTER is information_schema-guarded — safe to re-run.

SET @schema = DATABASE();

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='last_synced_at'),
    'ALTER TABLE jobs ADD COLUMN last_synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER fetched_at',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='role_type'
                  AND column_default = 'Uncategorised'),
    'ALTER TABLE jobs MODIFY COLUMN role_type VARCHAR(100) NOT NULL DEFAULT \'Uncategorised\'',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='jobs_updated'),
    'ALTER TABLE sync_log ADD COLUMN jobs_updated INT DEFAULT 0 AFTER jobs_inserted',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @status_column_added = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='status'),
    '1', '0'));

SET @sql = (SELECT IF(
    @status_column_added = '1',
    'ALTER TABLE sync_log ADD COLUMN status ENUM(\'success\',\'partial\',\'failed\') NOT NULL DEFAULT \'success\' AFTER duration_sec',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    @status_column_added = '1',
    'UPDATE sync_log SET status = CASE WHEN COALESCE(TRIM(errors), \"\") = \"\" THEN \'success\' ELSE \'failed\' END',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_last_synced_at'),
    'CREATE INDEX idx_last_synced_at ON jobs (last_synced_at)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_active_approved_posted'),
    'CREATE INDEX idx_active_approved_posted ON jobs (is_active, is_approved, posted_at)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;