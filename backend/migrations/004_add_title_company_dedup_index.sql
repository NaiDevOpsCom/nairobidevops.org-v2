-- 004_add_title_company_dedup_index.sql
-- Adds the index that JobRepository::findPossibleDuplicate() (Level 2 —
-- cross-source dedup, per PRD §13) queries against. Without this index that
-- query does a full table scan on every single upsert() call, and it only
-- gets worse as more sources are added. Guarded/idempotent, safe to re-run.

SET @schema = DATABASE();

SET
    @sql = (
        SELECT IF(
                NOT EXISTS (
                    SELECT 1
                    FROM information_schema.STATISTICS
                    WHERE
                        table_schema = @schema
                        AND table_name = 'jobs'
                        AND index_name = 'idx_title_company'
                ), 'CREATE INDEX idx_title_company ON jobs (title, company)', 'SELECT 1'
            )
    );

PREPARE stmt FROM @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;