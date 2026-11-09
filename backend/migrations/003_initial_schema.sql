-- 003_initial_schema.sql
-- Canonical starting schema. Idempotent — safe on a fresh DB or one that
-- already has some/all of these objects (should no-op, not error).

CREATE TABLE IF NOT EXISTS jobs (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    title               VARCHAR(255) NOT NULL,
    company             VARCHAR(255) NOT NULL,
    company_logo_url    VARCHAR(512),
    description         TEXT,
    apply_url           VARCHAR(512) NOT NULL,
    affiliate_apply_url VARCHAR(512),
    source              ENUM('remotive','weworkremotely','jobicy','jobscollider',
                             'manual','employer_submission') NOT NULL,
    source_id           VARCHAR(255) NOT NULL,
    role_type           VARCHAR(100) NOT NULL DEFAULT 'Uncategorised',
    location_type       ENUM('africa_remote','africa_onsite','international_remote'),
    location_detail     VARCHAR(255),
    africa_friendly     TINYINT(1)  NOT NULL DEFAULT 0,
    salary_min          INT,
    salary_max          INT,
    salary_currency     VARCHAR(10) DEFAULT 'USD',
    salary_period       ENUM('monthly','annual'),
    experience_level    ENUM('junior','mid','senior','lead','any'),
    posted_at           DATETIME,
    fetched_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closes_at           DATETIME,
    is_active           TINYINT(1)  NOT NULL DEFAULT 1,
    is_featured         TINYINT(1)  NOT NULL DEFAULT 0,
    featured_until      DATETIME,
    is_approved         TINYINT(1)  NOT NULL DEFAULT 1,
    is_notified         TINYINT(1)  NOT NULL DEFAULT 0,
    tags                JSON,
    created_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_source_job (source, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_log (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    source        VARCHAR(50) NOT NULL,
    ran_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    jobs_fetched  INT DEFAULT 0,
    jobs_inserted INT DEFAULT 0,
    jobs_skipped  INT DEFAULT 0,
    jobs_expired  INT DEFAULT 0,
    jobs_purged   INT DEFAULT 0,
    duration_sec  INT,
    errors        TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications_log (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    channel           VARCHAR(50) NOT NULL,
    notification_type ENUM('daily_digest','weekly_roundup','instant_alert') NOT NULL,
    job_ids           JSON,
    message_preview   TEXT,
    sent_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    status            ENUM('sent','failed') NOT NULL,
    error             TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version    VARCHAR(20) PRIMARY KEY,
    filename   VARCHAR(255) NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_clicks (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    job_id      INT          NOT NULL,
    click_type  ENUM('apply','affiliate_apply') NOT NULL DEFAULT 'apply',
    clicked_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_job_id  (job_id),
    INDEX idx_clicked (clicked_at),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Guarded column repairs for partially-created tables (safe to re-run) ───
SET @schema = DATABASE();

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='company_logo_url'),
    'ALTER TABLE jobs ADD COLUMN company_logo_url VARCHAR(512) AFTER company', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='affiliate_apply_url'),
    'ALTER TABLE jobs ADD COLUMN affiliate_apply_url VARCHAR(512) AFTER apply_url', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='role_type'),
    'ALTER TABLE jobs ADD COLUMN role_type VARCHAR(100) NOT NULL DEFAULT \'Uncategorised\' AFTER source_id', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='location_type'),
    'ALTER TABLE jobs ADD COLUMN location_type ENUM(\'africa_remote\',\'africa_onsite\',\'international_remote\') AFTER role_type', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='location_detail'),
    'ALTER TABLE jobs ADD COLUMN location_detail VARCHAR(255) AFTER location_type', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='africa_friendly'),
    'ALTER TABLE jobs ADD COLUMN africa_friendly TINYINT(1) NOT NULL DEFAULT 0 AFTER location_detail', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='salary_min'),
    'ALTER TABLE jobs ADD COLUMN salary_min INT AFTER africa_friendly', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='salary_max'),
    'ALTER TABLE jobs ADD COLUMN salary_max INT AFTER salary_min', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='salary_currency'),
    'ALTER TABLE jobs ADD COLUMN salary_currency VARCHAR(10) DEFAULT \'USD\' AFTER salary_max', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='salary_period'),
    'ALTER TABLE jobs ADD COLUMN salary_period ENUM(\'monthly\',\'annual\') AFTER salary_currency', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='experience_level'),
    'ALTER TABLE jobs ADD COLUMN experience_level ENUM(\'junior\',\'mid\',\'senior\',\'lead\',\'any\') AFTER salary_period', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='posted_at'),
    'ALTER TABLE jobs ADD COLUMN posted_at DATETIME AFTER experience_level', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='fetched_at'),
    'ALTER TABLE jobs ADD COLUMN fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER posted_at', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='closes_at'),
    'ALTER TABLE jobs ADD COLUMN closes_at DATETIME AFTER fetched_at', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='is_active'),
    'ALTER TABLE jobs ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER closes_at', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='is_featured'),
    'ALTER TABLE jobs ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='featured_until'),
    'ALTER TABLE jobs ADD COLUMN featured_until DATETIME AFTER is_featured', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='is_approved'),
    'ALTER TABLE jobs ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 1 AFTER featured_until', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='is_notified'),
    'ALTER TABLE jobs ADD COLUMN is_notified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_approved', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='tags'),
    'ALTER TABLE jobs ADD COLUMN tags JSON AFTER is_notified', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='created_at'),
    'ALTER TABLE jobs ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER tags', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='jobs' AND column_name='updated_at'),
    'ALTER TABLE jobs ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='jobs_fetched'),
    'ALTER TABLE sync_log ADD COLUMN jobs_fetched INT DEFAULT 0', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='jobs_inserted'),
    'ALTER TABLE sync_log ADD COLUMN jobs_inserted INT DEFAULT 0', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='jobs_skipped'),
    'ALTER TABLE sync_log ADD COLUMN jobs_skipped INT DEFAULT 0', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='jobs_expired'),
    'ALTER TABLE sync_log ADD COLUMN jobs_expired INT DEFAULT 0', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='jobs_purged'),
    'ALTER TABLE sync_log ADD COLUMN jobs_purged INT DEFAULT 0', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='duration_sec'),
    'ALTER TABLE sync_log ADD COLUMN duration_sec INT', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='sync_log' AND column_name='errors'),
    'ALTER TABLE sync_log ADD COLUMN errors TEXT', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='notifications_log' AND column_name='channel'),
    'ALTER TABLE notifications_log ADD COLUMN channel VARCHAR(50) NOT NULL', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='notifications_log' AND column_name='notification_type'),
    'ALTER TABLE notifications_log ADD COLUMN notification_type ENUM(\'daily_digest\',\'weekly_roundup\',\'instant_alert\') NOT NULL', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='notifications_log' AND column_name='job_ids'),
    'ALTER TABLE notifications_log ADD COLUMN job_ids JSON', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='notifications_log' AND column_name='message_preview'),
    'ALTER TABLE notifications_log ADD COLUMN message_preview TEXT', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='notifications_log' AND column_name='sent_at'),
    'ALTER TABLE notifications_log ADD COLUMN sent_at DATETIME DEFAULT CURRENT_TIMESTAMP', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='notifications_log' AND column_name='status'),
    'ALTER TABLE notifications_log ADD COLUMN status ENUM(\'sent\',\'failed\') NOT NULL', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='notifications_log' AND column_name='error'),
    'ALTER TABLE notifications_log ADD COLUMN error TEXT', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='schema_migrations' AND column_name='filename'),
    'ALTER TABLE schema_migrations ADD COLUMN filename VARCHAR(255) NOT NULL', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                WHERE table_schema=@schema AND table_name='schema_migrations' AND column_name='applied_at'),
    'ALTER TABLE schema_migrations ADD COLUMN applied_at DATETIME DEFAULT CURRENT_TIMESTAMP', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Guarded index adds (information_schema-checked, safe to re-run) ──────────
SET @schema = DATABASE();

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_is_active'),
    'CREATE INDEX idx_is_active ON jobs (is_active)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_closes_at'),
    'CREATE INDEX idx_closes_at ON jobs (closes_at)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_location_type'),
    'CREATE INDEX idx_location_type ON jobs (location_type)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_role_type'),
    'CREATE INDEX idx_role_type ON jobs (role_type)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_is_notified'),
    'CREATE INDEX idx_is_notified ON jobs (is_notified)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_fetched_at'),
    'CREATE INDEX idx_fetched_at ON jobs (fetched_at)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                WHERE table_schema=@schema AND table_name='jobs' AND index_name='idx_posted_at'),
    'CREATE INDEX idx_posted_at ON jobs (posted_at)', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;