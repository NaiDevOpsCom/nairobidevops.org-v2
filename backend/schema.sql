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
    africa_friendly     TINYINT(1) DEFAULT 0,
    salary_min          INT UNSIGNED,
    salary_max          INT UNSIGNED,
    salary_currency     VARCHAR(10) DEFAULT 'USD',
    salary_period       ENUM('monthly','annual'),
    experience_level    ENUM('junior','mid','senior','lead','any'),
    posted_at           DATETIME,
    fetched_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    closes_at           DATETIME,
    is_active           TINYINT(1) DEFAULT 1,
    is_featured         TINYINT(1) DEFAULT 0,
    featured_until      DATETIME,
    is_approved         TINYINT(1) DEFAULT 1,
    is_notified         TINYINT(1) DEFAULT 0,
    tags                JSON,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_source_job (source, source_id),
    INDEX idx_is_active   (is_active),
    INDEX idx_closes_at   (closes_at),
    INDEX idx_location    (location_type),
    INDEX idx_role        (role_type),
    INDEX idx_notified    (is_notified),
    INDEX idx_fetched     (fetched_at)
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    source        ENUM('remotive','weworkremotely','manual','employer_submission') NOT NULL,
    ran_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    jobs_fetched  INT DEFAULT 0,
    jobs_inserted INT DEFAULT 0,
    jobs_skipped  INT DEFAULT 0,
    jobs_expired  INT DEFAULT 0,
    jobs_purged   INT DEFAULT 0,
    duration_sec  INT,
    errors        TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications_log (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    channel           ENUM('telegram','slack','whatsapp','twitter','linkedin') NOT NULL,
    notification_type ENUM('daily_digest','weekly_roundup','instant_alert') NOT NULL,
    job_ids           JSON,
    message_preview   TEXT,
    sent_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    status            ENUM('sent','failed') NOT NULL,
    error             TEXT
  );
  