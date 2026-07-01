-- ============================================================================
-- Migration: 001_charset_and_index_fixes.sql
-- Purpose:   Fix charset inconsistency, ENUM fragility, and missing indexes
--            ahead of adding new job source APIs.
--
-- Run this IDENTICALLY against: local -> staging -> production.
-- Safe to re-run: ALTER TABLE ... MODIFY / CONVERT statements are idempotent
-- in effect (re-applying them is a no-op if already applied), but the
-- ADD INDEX / ADD COLUMN statements will error on a second run unless you
-- guard them (see notes at bottom). Run once per environment and verify.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CHARSET FIXES
-- `jobs` already has utf8mb4 set explicitly. These three tables do not and
-- will have inherited whatever the server/database default was at creation
-- time (often latin1 or 3-byte utf8 on cPanel). Converting now prevents
-- silent truncation/corruption when non-Latin or emoji text (job titles,
-- error messages, message previews) gets inserted from new sources.
-- ----------------------------------------------------------------------------

ALTER TABLE sync_log
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE notifications_log
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE job_clicks
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 2. WIDEN `sync_log.source` FROM ENUM TO VARCHAR
-- This is a log table, not a dedup anchor (jobs.source is, and stays ENUM
-- below) -- there's no integrity benefit to constraining it, and every new
-- API source means a forgotten ALTER here breaks logging for that source's
-- failures silently, which is the opposite of what sync_log is for.
-- ----------------------------------------------------------------------------

ALTER TABLE sync_log
  MODIFY source VARCHAR(50) NOT NULL;


-- ----------------------------------------------------------------------------
-- 3. WIDEN `notifications_log.channel` FROM ENUM TO VARCHAR
-- Same reasoning -- you already added 'discord' once since the original
-- design. Next channel (whatsapp, linkedin, twitter per the PRD Phase 2
-- list) should not require a schema migration just to log a send attempt.
-- ----------------------------------------------------------------------------

ALTER TABLE notifications_log
  MODIFY channel VARCHAR(50) NOT NULL;


-- ----------------------------------------------------------------------------
-- 4. COMPOSITE INDEXES ON `jobs` FOR THE HOT QUERY PATH
-- get_jobs.php always filters WHERE is_active=1 AND is_approved=1, then
-- sorts by posted_at DESC (newest) or closes_at ASC (closing soon).
-- Single-column indexes force MySQL to pick one and filesort the rest.
-- There is currently no index on is_approved at all despite it being in
-- every query's WHERE clause.
-- ----------------------------------------------------------------------------

ALTER TABLE jobs
  ADD INDEX idx_active_approved_posted (is_active, is_approved, posted_at);

ALTER TABLE jobs
  ADD INDEX idx_active_approved_closes (is_active, is_approved, closes_at);


-- ----------------------------------------------------------------------------
-- 5. ADD `click_type` TO `job_clicks`
-- PRD distinguishes 'apply' vs 'affiliate_apply' clicks for revenue
-- reporting, but the table as built only records that a click happened.
-- Adding now avoids click data you can't retroactively categorise later.
-- ----------------------------------------------------------------------------

ALTER TABLE job_clicks
  ADD COLUMN click_type ENUM('apply','affiliate_apply') NOT NULL DEFAULT 'apply' AFTER job_id;


-- ============================================================================
-- NOT included in this migration (deliberately deferred):
--
-- - jobs.source stays ENUM (it's the dedup anchor, the constraint earns its
--   keep there) -- but remember: adding a new source still requires
--   ALTER TABLE jobs MODIFY source ENUM('remotive','weworkremotely','manual',
--   'employer_submission','NEW_SOURCE_HERE') NOT NULL;
--   as its own migration file when that day comes.
--
-- - source_id NOT NULL fragility for source='manual'/'employer_submission'
--   (synthetic ID generation at insert time, not a schema change) -- handle
--   in application code, separate task.
--
-- - FULLTEXT index on (title, company, description) for search -- not
--   urgent at current row counts, revisit when LIKE search measurably slows.
-- ============================================================================