<?php

declare(strict_types=1);

namespace Tests\Migration;

use App\Migration\MigrationRunner;
use PDO;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class MigrationRunnerTest extends TestCase
{
    private PDO $db;
    private string $fixturesPath;

    protected function setUp(): void
    {
        // SQLite in-memory — no MySQL connection needed for this test at all.
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->fixturesPath = sys_get_temp_dir() . '/migrations_test_' . uniqid();
        mkdir($this->fixturesPath);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->fixturesPath . '/*.sql') ?: [] as $file) {
            unlink($file);
        }
        rmdir($this->fixturesPath);
    }

    public function testPendingMigrationsExcludesAlreadyApplied(): void
    {
        file_put_contents($this->fixturesPath . '/001_a.sql', 'CREATE TABLE a (id INTEGER);');
        file_put_contents($this->fixturesPath . '/002_b.sql', 'CREATE TABLE b (id INTEGER);');

        $runner = new MigrationRunner($this->db, $this->fixturesPath);
        $runner->ensureMigrationsTableExists();
        $runner->apply('001', $this->fixturesPath . '/001_a.sql');

        $pending = $runner->pendingMigrations();

        self::assertArrayNotHasKey('001', $pending);
        self::assertArrayHasKey('002', $pending);
    }

    public function testFailedMigrationIsNotRecordedAndRollsBack(): void
    {
        $path = $this->fixturesPath . '/001_bad.sql';
        file_put_contents($path, "CREATE TABLE partial_test (id INTEGER);\nTHIS IS NOT VALID SQL;");

        $runner = new MigrationRunner($this->db, $this->fixturesPath);
        $runner->ensureMigrationsTableExists();

        try {
            $runner->apply('001', $path);
            self::fail('Expected RuntimeException was not thrown');
        } catch (RuntimeException) {
            // expected
        }

        self::assertSame([], $runner->appliedVersions());
        self::assertSame(['001' => $path], $runner->pendingMigrations());
        self::assertFalse($this->db->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'partial_test'")->fetchColumn());
    }

    public function testApplyThrowsOnInvalidSql(): void
    {
        $db = new PDO('sqlite::memory:');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $path = $this->fixturesPath . '/001_bad.sql';
        file_put_contents($path, 'THIS IS NOT VALID SQL;');

        $runner = new MigrationRunner($db, $this->fixturesPath);

        self::assertSame(PDO::ERRMODE_EXCEPTION, $db->getAttribute(PDO::ATTR_ERRMODE));

        $this->expectException(RuntimeException::class);
        $runner->apply('001', $path);
    }

    public function testMigrationsDiscoveredInAscendingFilenameOrder(): void
    {
        file_put_contents($this->fixturesPath . '/002_second.sql', 'CREATE TABLE second (id INTEGER);');
        file_put_contents($this->fixturesPath . '/001_first.sql', 'CREATE TABLE first (id INTEGER);');

        $runner = new MigrationRunner($this->db, $this->fixturesPath);
        $files = $runner->discoverMigrationFiles();

        self::assertSame(['001', '002'], array_keys($files));
    }

    public function testDiscoverMigrationFilesRejectsInvalidNamesAndDuplicates(): void
    {
        file_put_contents($this->fixturesPath . '/001_valid.sql', 'CREATE TABLE valid (id INTEGER);');
        file_put_contents($this->fixturesPath . '/001_duplicate.sql', 'CREATE TABLE duplicate (id INTEGER);');
        file_put_contents($this->fixturesPath . '/notes.sql', 'CREATE TABLE notes (id INTEGER);');

        $runner = new MigrationRunner($this->db, $this->fixturesPath);

        $this->expectException(RuntimeException::class);
        $runner->discoverMigrationFiles();
    }

    public function testRunAllAppliesEveryPendingMigrationInOrder(): void
    {
        file_put_contents($this->fixturesPath . '/001_a.sql', 'CREATE TABLE a (id INTEGER);');
        file_put_contents($this->fixturesPath . '/002_b.sql', 'CREATE TABLE b (id INTEGER);');

        $runner = new MigrationRunner($this->db, $this->fixturesPath);
        $runner->runAll();

        self::assertSame(['001', '002'], $runner->appliedVersions());
    }
}
