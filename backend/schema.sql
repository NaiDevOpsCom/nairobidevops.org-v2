-- ============================================================================
-- schema.sql — NairobiDevOps Jobs Board
-- Baseline schema for fresh installs.
-- Always kept in sync with the latest migration in backend/migrations/.
-- Last updated by: migrations/001_charset_and_index_fixes.sql
--
-- Fresh install:  mysql -u root -p <dbname> < backend/schema.sql
-- Existing install: run migrations/00N_*.sql files in order instead.
-- ============================================================================

CREATE TABLE IF NOT EXISTS jobs (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    title               VARCHAR(255) NOT NULL,
    company             VARCHAR(255) NOT NULL,
    company_logo_url    VARCHAR(512),
    description         TEXT,
    apply_url           VARCHAR(512) NOT NULL,
    affiliate_apply_url VARCHAR(512),
    source              ENUM('remotive','weworkremotely','manual','employer_submission') NOT NULL,
    source_id           VARCHAR(255) NOT NULL,
    role_type           VARCHAR(100),
    location_type       ENUM('africa_remote','africa_onsite','international_remote'),
    location_detail     VARCHAR(255),
    africa_friendly     TINYINT(1)   DEFAULT 0,
    salary_min          INT UNSIGNED,
    salary_max          INT UNSIGNED,
    salary_currency     VARCHAR(10)  DEFAULT 'USD',
    salary_period       ENUM('monthly','annual'),
    experience_level    ENUM('junior','mid','senior','lead','any'),
    posted_at           DATETIME,
    fetched_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    closes_at           DATETIME,

    -- Generated column: substitutes a far-future sentinel for NULL so
    -- "closing soon" ORDER BY closes_at_sort ASC works cleanly on an
    -- index without NULLs floating to the wrong end of the sort.
    closes_at_sort      DATETIME
                          GENERATED ALWAYS AS
                          (IFNULL(closes_at, '2099-12-31 23:59:59')) VIRTUAL,

    is_active           TINYINT(1)   DEFAULT 1,
    is_featured         TINYINT(1)   DEFAULT 0,
    featured_until      DATETIME,
    is_approved         TINYINT(1)   DEFAULT 1,
    is_notified         TINYINT(1)   DEFAULT 0,
    tags                JSON,
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Deduplication anchor: same job from the same source is never inserted twice
    UNIQUE KEY  unique_source_job      (source, source_id),

    -- Hot path: WHERE is_active=1 AND is_approved=1 ORDER BY is_featured DESC, posted_at DESC
    INDEX idx_listing_newest           (is_active, is_approved, is_featured, posted_at),

    -- Hot path: WHERE is_active=1 AND is_approved=1 ORDER BY is_featured DESC, closes_at_sort ASC
    INDEX idx_listing_closing          (is_active, is_approved, is_featured, closes_at_sort),

    -- Supporting indexes for individual filter columns
    INDEX idx_location                 (location_type),
    INDEX idx_role                     (role_type),
    INDEX idx_closes_at                (closes_at),
    INDEX idx_fetched                  (fetched_at),
    INDEX idx_notified                 (is_notified)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- sync_log: one row per cron run, per source.
-- source is VARCHAR not ENUM -- new sources must never require a schema
-- migration just to be able to log their sync results.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_log (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    source        VARCHAR(50)  NOT NULL,
    ran_at        DATETIME     DEFAULT CURRENT_TIMESTAMP,
    jobs_fetched  INT          DEFAULT 0,
    jobs_inserted INT          DEFAULT 0,
    jobs_skipped  INT          DEFAULT 0,
    jobs_expired  INT          DEFAULT 0,
    jobs_purged   INT          DEFAULT 0,
    duration_sec  INT,
    errors        TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- notifications_log: one row per channel per send attempt.
-- channel is VARCHAR not ENUM -- new channels (whatsapp, linkedin, twitter)
-- must never require a schema migration just to log a send attempt.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications_log (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    channel           VARCHAR(50)  NOT NULL,
    notification_type ENUM('daily_digest','weekly_roundup','instant_alert') NOT NULL,
    job_ids           JSON,
    message_preview   TEXT,
    sent_at           DATETIME     DEFAULT CURRENT_TIMESTAMP,
    status            ENUM('sent','failed') NOT NULL,
    error             TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- job_clicks: fire-and-forget click tracking for affiliate revenue reporting.
-- click_type distinguishes organic Apply clicks from affiliate Apply clicks.
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_clicks (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    job_id      INT          NOT NULL,
    click_type  ENUM('apply','affiliate_apply') NOT NULL DEFAULT 'apply',
    clicked_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_job_id  (job_id),
    INDEX idx_clicked (clicked_at),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;