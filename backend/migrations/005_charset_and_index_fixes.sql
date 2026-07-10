-- ============================================================================
-- Migration: 005_charset_and_index_fixes.sql
--
-- IMPORTANT — renumbered from 001 to 005 (was originally authored as
-- "001_charset_and_index_fixes.sql", but version '001' was already recorded
-- in schema_migrations against a DIFFERENT, earlier file
-- ("001_initial_schema.sql") back on 2026-07-02. MigrationRunner keys
-- purely on the numeric prefix, so as long as this file kept the name
-- "001_...", it would NEVER run — version 001 was permanently considered
-- "done" regardless of this file's actual content. Renumbering to the next
-- genuinely unclaimed version is the only safe fix; editing/renaming an
-- already-applied version number is exactly the trap that caused this.
--
-- Also rewritten: every step below is now guarded via information_schema
-- checks (matching the pattern already used elsewhere in this project,
-- e.g. 003_initial_schema.sql's column/index guards) instead of relying on
-- "errors are safe to ignore, MySQL keeps going" — that assumption only
-- holds for `mysql --force < file.sql`, not for MigrationRunner's single
-- PDO::exec($sql) call, where one erroring statement can abort every
-- statement after it in the same batch.
--
-- Purpose: fix charset inconsistency, ENUM fragility, and correct indexes
--          ahead of adding new job source APIs.
-- Compatible with: MySQL 5.7, 8.0, 8.4, 9.x
-- Idempotent — safe to re-run; every step checks current state first.
-- ============================================================================

SET @schema = DATABASE();

-- ----------------------------------------------------------------------------
-- 1. CHARSET FIXES — jobs, sync_log, notifications_log, job_clicks
--    to utf8mb4_unicode_ci, each guarded so an already-correct table is a
--    no-op rather than a repeated (harmless but noisy/slow) CONVERT.
-- ----------------------------------------------------------------------------

SET @sql = (SELECT IF(
    (SELECT TABLE_COLLATION FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'jobs') <> 'utf8mb4_unicode_ci',
    'ALTER TABLE jobs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT TABLE_COLLATION FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'sync_log') <> 'utf8mb4_unicode_ci',
    'ALTER TABLE sync_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT TABLE_COLLATION FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'notifications_log') <> 'utf8mb4_unicode_ci',
    'ALTER TABLE notifications_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT TABLE_COLLATION FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'job_clicks') <> 'utf8mb4_unicode_ci',
    'ALTER TABLE job_clicks CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ----------------------------------------------------------------------------
-- 2. WIDEN sync_log.source FROM ENUM TO VARCHAR
-- Log tables must never require a schema migration just to accept a new
-- source name — that would silently break failure logging for new sources.
-- ----------------------------------------------------------------------------

SET @sql = (SELECT IF(
    (SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'sync_log' AND COLUMN_NAME = 'source') = 'enum',
    'ALTER TABLE sync_log MODIFY source VARCHAR(50) NOT NULL',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ----------------------------------------------------------------------------
-- 3. WIDEN notifications_log.channel FROM ENUM TO VARCHAR
-- Same reasoning — new channels (whatsapp, linkedin, twitter) should not
-- require a migration just to log a send attempt.
-- ----------------------------------------------------------------------------

SET @sql = (SELECT IF(
    (SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'notifications_log' AND COLUMN_NAME = 'channel') = 'enum',
    'ALTER TABLE notifications_log MODIFY channel VARCHAR(50) NOT NULL',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ----------------------------------------------------------------------------
-- 4. DROP OLD, SUPERSEDED INDEXES
-- idx_active_approved_posted / idx_active_approved_closes are superseded by
-- the featured-aware composite indexes added in step 6 below
-- (idx_listing_newest / idx_listing_closing, which lead with is_featured so
-- "featured jobs always first" queries avoid a filesort). Guarded via
-- information_schema so a missing index is a no-op, not an error.
-- ----------------------------------------------------------------------------

SET @sql = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'jobs' AND INDEX_NAME = 'idx_active_approved_posted'),
    'ALTER TABLE jobs DROP INDEX idx_active_approved_posted',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'jobs' AND INDEX_NAME = 'idx_active_approved_closes'),
    'ALTER TABLE jobs DROP INDEX idx_active_approved_closes',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ----------------------------------------------------------------------------
-- 5. GENERATED COLUMN FOR NULL-SAFE closes_at SORTING
-- Jobs with no deadline have closes_at = NULL. A plain index on closes_at
-- cannot sort NULLs predictably for "closing soon" ORDER BY. This generated
-- column substitutes a far-future sentinel so every row has a real sortable
-- value. VIRTUAL = no extra disk storage.
-- ----------------------------------------------------------------------------

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'closes_at_sort'),
    'ALTER TABLE jobs ADD COLUMN closes_at_sort DATETIME GENERATED ALWAYS AS (IFNULL(closes_at, \'2099-12-31 23:59:59\')) VIRTUAL',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ----------------------------------------------------------------------------
-- 6. CORRECT COMPOSITE INDEXES MATCHING ACTUAL QUERY PATTERNS
--
-- get_jobs.php hot path:
--   WHERE is_active = 1 AND is_approved = 1
--   ORDER BY is_featured DESC, posted_at DESC     (newest sort)
--   ORDER BY is_featured DESC, closes_at_sort ASC (closing soon sort)
--
-- is_featured must be in the index before posted_at/closes_at_sort so the
-- optimizer can narrow down rows efficiently.
--
-- MySQL 5.7 limitation: descending index columns are not supported, so the
-- closing_soon ORDER BY (is_featured DESC, closes_at_sort ASC, id DESC) will
-- still incur a filesort because the direction mix cannot be satisfied by a
-- single ascending index. Upgrading to MySQL 8+ would allow a DESC index
-- column on is_featured/id to eliminate the filesort entirely.
-- ----------------------------------------------------------------------------

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'jobs' AND INDEX_NAME = 'idx_listing_newest'),
    'ALTER TABLE jobs ADD INDEX idx_listing_newest (is_active, is_approved, is_featured, posted_at, id)',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'jobs' AND INDEX_NAME = 'idx_listing_closing'),
    'ALTER TABLE jobs ADD INDEX idx_listing_closing (is_active, is_approved, is_featured, closes_at_sort, id)',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ----------------------------------------------------------------------------
-- 7. click_type COLUMN ON job_clicks
-- ----------------------------------------------------------------------------

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'job_clicks' AND COLUMN_NAME = 'click_type'),
    'ALTER TABLE job_clicks ADD COLUMN click_type ENUM(\'apply\',\'affiliate_apply\') NOT NULL DEFAULT \'apply\' AFTER job_id',
    'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================================
-- REMINDER: Adding a new job source requires a new migration file
-- widening jobs.source further:
--   ALTER TABLE jobs MODIFY source
--     ENUM('remotive','weworkremotely','manual','employer_submission','<new>') NOT NULL;
-- Consider widening jobs.source to VARCHAR in a future migration for the
-- same reason sync_log.source and notifications_log.channel were widened
-- above — adding a source shouldn't require a schema migration either.
-- ============================================================================
