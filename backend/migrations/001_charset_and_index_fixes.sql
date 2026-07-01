-- ============================================================================
-- Migration: 001_charset_and_index_fixes.sql
-- Purpose:   Fix charset inconsistency, ENUM fragility, and correct indexes
--            ahead of adding new job source APIs.
--
-- Compatible with: MySQL 5.7, 8.0, 8.4, 9.x
-- Run against:     local -> staging -> production (in that order)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. CHARSET FIXES — all four tables to utf8mb4_unicode_ci
-- ----------------------------------------------------------------------------

ALTER TABLE jobs
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE sync_log
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE notifications_log
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE job_clicks
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 2. WIDEN sync_log.source FROM ENUM TO VARCHAR
-- Log tables must never require a schema migration just to accept a new
-- source name — that would silently break failure logging for new sources.
-- ----------------------------------------------------------------------------

ALTER TABLE sync_log
  MODIFY source VARCHAR(50) NOT NULL;


-- ----------------------------------------------------------------------------
-- 3. WIDEN notifications_log.channel FROM ENUM TO VARCHAR
-- Same reasoning — new channels (whatsapp, linkedin, twitter) should not
-- require a migration just to log a send attempt.
-- ----------------------------------------------------------------------------

ALTER TABLE notifications_log
  MODIFY channel VARCHAR(50) NOT NULL;


-- ----------------------------------------------------------------------------
-- 4. DROP OLD INCORRECT INDEXES
-- Written without IF EXISTS for MySQL 5.7/8.0 compatibility.
-- These will error if the indexes don't exist — that is safe to ignore,
-- MySQL continues executing the rest of the file.
-- ----------------------------------------------------------------------------

ALTER TABLE jobs DROP INDEX idx_active_approved_posted;
ALTER TABLE jobs DROP INDEX idx_active_approved_closes;


-- ----------------------------------------------------------------------------
-- 5. GENERATED COLUMN FOR NULL-SAFE closes_at SORTING
-- Jobs with no deadline have closes_at = NULL. A plain index on closes_at
-- cannot sort NULLs predictably for "closing soon" ORDER BY.
-- This generated column substitutes a far-future sentinel so every row
-- has a real sortable value. VIRTUAL = no extra disk storage.
-- Written without IF NOT EXISTS for MySQL 5.7/8.0 compatibility.
-- ----------------------------------------------------------------------------

ALTER TABLE jobs
  ADD COLUMN closes_at_sort DATETIME
    GENERATED ALWAYS AS (IFNULL(closes_at, '2099-12-31 23:59:59')) VIRTUAL;


-- ----------------------------------------------------------------------------
-- 6. CORRECT COMPOSITE INDEXES MATCHING ACTUAL QUERY PATTERNS
--
-- get_jobs.php hot path:
--   WHERE is_active = 1 AND is_approved = 1
--   ORDER BY is_featured DESC, posted_at DESC    (newest sort)
--   ORDER BY is_featured DESC, closes_at_sort ASC (closing soon sort)
--
-- is_featured must be in the index before posted_at/closes_at_sort
-- so MySQL can avoid a filesort on the ORDER BY clause.
-- ----------------------------------------------------------------------------

ALTER TABLE jobs
  ADD INDEX idx_listing_newest (is_active, is_approved, is_featured, posted_at);

ALTER TABLE jobs
  ADD INDEX idx_listing_closing (is_active, is_approved, is_featured, closes_at_sort);


-- ----------------------------------------------------------------------------
-- 7. click_type COLUMN ON job_clicks
-- Written without IF NOT EXISTS for MySQL 5.7/8.0 compatibility.
-- Will error if column already exists (local dev created it this way) —
-- safe to ignore, the column is already correct in that case.
-- ----------------------------------------------------------------------------

ALTER TABLE job_clicks
  ADD COLUMN click_type
    ENUM('apply','affiliate_apply') NOT NULL DEFAULT 'apply'
    AFTER job_id;


-- ============================================================================
-- REMINDER: Adding a new job source requires a new migration file:
--   migrations/002_add_source_<name>.sql
-- containing:
--   ALTER TABLE jobs MODIFY source
--     ENUM('remotive','weworkremotely','manual','employer_submission','<new>') NOT NULL;
-- ============================================================================