<?php

declare(strict_types=1);

namespace App\Migration;

use App\Exception\MigrationException;
use PDO;
use PDOException;

/**
 * Applies versioned SQL migration files (backend/migrations/NNN_*.sql) against
 * a PDO connection, tracking what's already applied in schema_migrations so
 * re-running never re-applies a file that already succeeded.
 *
 * This class only orchestrates — it never opens its own DB connection and
 * never touches config.php. The caller (cron/migrate.php) supplies a PDO
 * from db.php's getDB().
 */
final class MigrationRunner
{
    public function __construct(
        private readonly PDO $db,
        private readonly string $migrationsPath,
    ) {
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function ensureMigrationsTableExists(): void
    {
        $this->db->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
            version    VARCHAR(20) PRIMARY KEY,
            filename   VARCHAR(255) NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )');
    }

    /**
     * @return string[] Already-applied version strings, e.g. ['001', '002']
     */
    public function appliedVersions(): array
    {
        $stmt = $this->db->query('SELECT version FROM schema_migrations ORDER BY version');

        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    /**
     * Scans the migrations directory for NNN_*.sql files.
     *
     * @return array<string, string> version => absolute filepath, sorted ascending by filename
     */
    public function discoverMigrationFiles(): array
    {
        $files = glob(rtrim($this->migrationsPath, '/\\') . '/*.sql') ?: [];
        sort($files);

        $out = [];
        foreach ($files as $file) {
            $filename = basename($file);
            if (!preg_match('/^(\d{3})_.+\.sql$/', $filename, $matches)) {
                throw new MigrationException("Invalid migration filename: {$filename}");
            }

            $version = $matches[1];
            if (\array_key_exists($version, $out)) {
                throw new MigrationException("Duplicate migration version {$version} in {$filename}");
            }

            $out[$version] = $file;
        }

        return $out;
    }

    /**
     * @return array<string, string> version => filepath, only those not yet applied
     */
    public function pendingMigrations(): array
    {
        $applied = $this->appliedVersions();

        return array_diff_key($this->discoverMigrationFiles(), array_flip($applied));
    }

    /**
     * Applies one migration file and records it in schema_migrations.
     * On failure: rolls back and never records the version, so a retry
     * after fixing the file will pick it up again as pending.
     *
     * @throws MigrationException on any failure reading or executing the file
     */
    public function apply(string $version, string $filepath): void
    {
        $sql = file_get_contents($filepath);
        if ($sql === false) {
            throw new MigrationException("Could not read migration file: {$filepath}");
        }

        $this->db->beginTransaction();

        // NOTE: MySQL DDL (ALTER TABLE, CREATE TABLE) auto-commits and cannot
        // be rolled back. The transaction here primarily protects the
        // schema_migrations INSERT — migration SQL files use idempotent guards
        // (IF NOT EXISTS, information_schema checks) to handle partial DDL.
        try {
            $this->db->exec($sql);
            $this->db->prepare(
                'INSERT INTO schema_migrations (version, filename) VALUES (?, ?)'
            )->execute([$version, basename($filepath)]);

            $this->db->commit();
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw new MigrationException(
                "Migration {$version} failed: {$e->getMessage()}",
                0,
                $e
            );
        } catch (MigrationException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    /**
     * Runs all pending migrations in ascending version order.
     * Stops at the first failure — later migrations are never attempted
     * against a DB left in a possibly-inconsistent state.
     */
    public function runAll(): void
    {
        $this->ensureMigrationsTableExists();

        foreach ($this->pendingMigrations() as $version => $filepath) {
            $this->apply($version, $filepath);
        }
    }
}
