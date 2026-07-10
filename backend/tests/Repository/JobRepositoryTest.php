<?php

declare(strict_types=1);

namespace Tests\Repository;

use App\Repository\JobRepository;
use PDO;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Exercises JobRepository's dedup logic against an in-memory SQLite DB.
 *
 * SQLite (not the real MySQL schema) is used deliberately: JobRepository's
 * queries are written in portable ANSI SQL specifically so this class is
 * unit-testable without a live MySQL server — the fixture schema below only
 * needs to expose the columns the repository actually touches.
 */
final class JobRepositoryTest extends TestCase
{
    private PDO $db;
    private JobRepository $repository;

    protected function setUp(): void
    {
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->exec('
            CREATE TABLE jobs (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                title               TEXT NOT NULL,
                company             TEXT NOT NULL,
                company_logo_url    TEXT,
                description         TEXT,
                apply_url           TEXT NOT NULL,
                affiliate_apply_url TEXT,
                source              TEXT NOT NULL,
                source_id           TEXT NOT NULL,
                role_type           TEXT NOT NULL DEFAULT "Uncategorised",
                location_type       TEXT,
                location_detail     TEXT,
                africa_friendly     INTEGER NOT NULL DEFAULT 0,
                salary_min          INTEGER,
                salary_max          INTEGER,
                salary_currency     TEXT DEFAULT "USD",
                salary_period       TEXT,
                experience_level    TEXT,
                posted_at           TEXT,
                fetched_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_synced_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                closes_at           TEXT,
                is_active           INTEGER NOT NULL DEFAULT 1,
                is_approved         INTEGER NOT NULL DEFAULT 1,
                is_featured         INTEGER NOT NULL DEFAULT 0,
                tags                TEXT,
                created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        ');

        $this->repository = new JobRepository($this->db);
    }

    private function baseJob(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Senior DevOps Engineer',
            'company' => 'Andela',
            'apply_url' => 'https://andela.com/jobs/47',
            'source' => 'remotive',
            'source_id' => 'rm-47',
            'role_type' => 'DevOps Engineer',
            'posted_at' => '2026-07-01 08:00:00',
        ], $overrides);
    }

    #[Test]
    public function findBySourceIdReturnsNullWhenNoMatch(): void
    {
        self::assertNull($this->repository->findBySourceId('remotive', 'does-not-exist'));
    }

    #[Test]
    public function upsertInsertsANewJobWhenNothingMatches(): void
    {
        $result = $this->repository->upsert($this->baseJob());

        self::assertSame('inserted', $result['action']);
        self::assertNotNull($result['id']);
        self::assertNull($result['duplicate_of']);

        $stored = $this->repository->findBySourceId('remotive', 'rm-47');
        self::assertNotNull($stored);
        self::assertSame('Senior DevOps Engineer', $stored['title']);
        self::assertSame('Andela', $stored['company']);
    }

    #[Test]
    public function upsertUpdatesInPlaceOnMatchingSourceAndSourceId(): void
    {
        $first = $this->repository->upsert($this->baseJob());

        $second = $this->repository->upsert($this->baseJob([
            'title' => 'Senior DevOps Engineer (Updated Title)',
            'salary_min' => 4500,
        ]));

        self::assertSame('updated', $second['action']);
        self::assertSame($first['id'], $second['id']);

        // Confirm there is still exactly one row for this source_id — the
        // Level 1 UNIQUE KEY anchor is doing its job, not creating a duplicate.
        $countStmt = $this->db->query(
            "SELECT COUNT(*) FROM jobs WHERE source = 'remotive' AND source_id = 'rm-47'"
        );
        self::assertSame(1, (int) $countStmt->fetchColumn());

        $stored = $this->repository->findBySourceId('remotive', 'rm-47');
        self::assertSame('Senior DevOps Engineer (Updated Title)', $stored['title']);
        self::assertSame(4500, (int) $stored['salary_min']);
    }

    #[Test]
    public function upsertSkipsACrossSourceDuplicateWithinTheDedupWindow(): void
    {
        $original = $this->repository->upsert($this->baseJob([
            'source' => 'remotive',
            'source_id' => 'rm-47',
            'posted_at' => '2026-07-01 08:00:00',
        ]));

        // Same title + company, different source, posted 2 days later —
        // inside the 5-day dedup window, should be flagged as a duplicate.
        $result = $this->repository->upsert($this->baseJob([
            'source' => 'weworkremotely',
            'source_id' => 'wwr-999',
            'posted_at' => '2026-07-03 08:00:00',
        ]));

        self::assertSame('skipped_duplicate', $result['action']);
        self::assertNull($result['id']);
        self::assertSame($original['id'], $result['duplicate_of']);

        // The second source's row must never have been inserted at all —
        // first-inserted wins, per the PRD's Level 2 dedup rule.
        self::assertNull($this->repository->findBySourceId('weworkremotely', 'wwr-999'));

        $countStmt = $this->db->query('SELECT COUNT(*) FROM jobs');
        self::assertSame(1, (int) $countStmt->fetchColumn());
    }

    #[Test]
    public function upsertInsertsWhenSameTitleAndCompanyFallOutsideTheDedupWindow(): void
    {
        $this->repository->upsert($this->baseJob([
            'source' => 'remotive',
            'source_id' => 'rm-47',
            'posted_at' => '2026-01-01 08:00:00',
        ]));

        // Same title + company, different source, but six months later —
        // a genuinely separate posting, not a re-post of the same role.
        $result = $this->repository->upsert($this->baseJob([
            'source' => 'weworkremotely',
            'source_id' => 'wwr-999',
            'posted_at' => '2026-07-01 08:00:00',
        ]));

        self::assertSame('inserted', $result['action']);
        self::assertNotNull($result['id']);

        $countStmt = $this->db->query('SELECT COUNT(*) FROM jobs');
        self::assertSame(2, (int) $countStmt->fetchColumn());
    }

    #[Test]
    public function upsertInsertsWhenTitleAndCompanyMatchButPostedAtIsMissingOnCandidate(): void
    {
        $this->repository->upsert($this->baseJob([
            'source' => 'remotive',
            'source_id' => 'rm-47',
            'posted_at' => null,
        ]));

        // Candidate exists with the same title+company but no posted_at to
        // compare against — findPossibleDuplicate should skip it (it can't
        // confirm the window) rather than either false-flagging or crashing.
        $result = $this->repository->upsert($this->baseJob([
            'source' => 'weworkremotely',
            'source_id' => 'wwr-999',
            'posted_at' => '2026-07-01 08:00:00',
        ]));

        self::assertSame('inserted', $result['action']);
    }

    #[Test]
    public function findPossibleDuplicateExcludesTheGivenSource(): void
    {
        $this->repository->upsert($this->baseJob(['source' => 'remotive', 'source_id' => 'rm-47']));

        // A second Remotive posting with the same title+company (e.g. a
        // legitimately reposted listing) should not be flagged against
        // itself when the caller excludes its own source.
        $duplicate = $this->repository->findPossibleDuplicate(
            'Senior DevOps Engineer',
            'Andela',
            excludeSource: 'remotive',
            postedAt: '2026-07-02 08:00:00',
        );

        self::assertNull($duplicate);
    }

    #[Test]
    public function touchLastSyncedUpdatesOnlyThatColumn(): void
    {
        $result = $this->repository->upsert($this->baseJob());
        $before = $this->repository->findBySourceId('remotive', 'rm-47');

        $this->repository->touchLastSynced((int) $result['id']);

        $after = $this->repository->findBySourceId('remotive', 'rm-47');
        self::assertSame($before['title'], $after['title']);
        self::assertArrayHasKey('last_synced_at', $after);
    }

    #[Test]
    public function findPaginatedOnlyReturnsActiveApprovedJobs(): void
    {
        $this->repository->upsert($this->baseJob(['source_id' => 'rm-1']));
        $this->db->exec("
            INSERT INTO jobs (title, company, apply_url, source, source_id, is_active)
            VALUES ('Inactive Job', 'Ghost Co', 'https://x.test/2', 'remotive', 'rm-2', 0)
        ");
        $this->db->exec("
            INSERT INTO jobs (title, company, apply_url, source, source_id, is_approved)
            VALUES ('Pending Job', 'New Co', 'https://x.test/3', 'employer_submission', 'sub-1', 0)
        ");

        $result = $this->repository->findPaginated(['page' => 1, 'per_page' => 20]);

        self::assertSame(1, $result['total']);
        self::assertSame('Senior DevOps Engineer', $result['jobs'][0]['title']);
    }

    #[Test]
    public function findPaginatedFiltersByRoleTypeAndLocationType(): void
    {
        $this->repository->upsert($this->baseJob([
            'source_id' => 'rm-1',
            'role_type' => 'SRE',
            'location_type' => 'africa_remote',
        ]));
        $this->repository->upsert($this->baseJob([
            'source_id' => 'rm-2',
            'title' => 'Backend Engineer',
            'role_type' => 'Backend Engineer',
            'location_type' => 'international_remote',
        ]));

        $result = $this->repository->findPaginated([
            'role_type' => ['SRE'],
            'page' => 1,
            'per_page' => 20,
        ]);

        self::assertSame(1, $result['total']);
        self::assertSame('SRE', $result['jobs'][0]['role_type']);

        $result = $this->repository->findPaginated([
            'location_type' => ['international_remote'],
            'page' => 1,
            'per_page' => 20,
        ]);

        self::assertSame(1, $result['total']);
        self::assertSame('Backend Engineer', $result['jobs'][0]['title']);
    }

    #[Test]
    public function findPaginatedFiltersByAfricaFriendlyAndSearchQuery(): void
    {
        $this->repository->upsert($this->baseJob([
            'source_id' => 'rm-1',
            'africa_friendly' => true,
        ]));
        $this->repository->upsert($this->baseJob([
            'source_id' => 'rm-2',
            'title' => 'Platform Engineer',
            'company' => 'Flutterwave',
            'africa_friendly' => false,
        ]));

        $result = $this->repository->findPaginated(['africa_friendly' => true, 'page' => 1, 'per_page' => 20]);
        self::assertSame(1, $result['total']);
        self::assertSame('Andela', $result['jobs'][0]['company']);

        $result = $this->repository->findPaginated(['q' => 'flutterwave', 'page' => 1, 'per_page' => 20]);
        self::assertSame(1, $result['total']);
        self::assertSame('Platform Engineer', $result['jobs'][0]['title']);
    }

    #[Test]
    public function findPaginatedRespectsPageAndPerPage(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->repository->upsert($this->baseJob([
                'source_id' => "rm-{$i}",
                'title' => "Job {$i}",
            ]));
        }

        $result = $this->repository->findPaginated(['page' => 2, 'per_page' => 2]);

        self::assertSame(5, $result['total']);
        self::assertSame(2, $result['page']);
        self::assertSame(2, $result['per_page']);
        self::assertCount(2, $result['jobs']);
    }

    #[Test]
    public function findPaginatedCapsPerPageAtFifty(): void
    {
        $this->repository->upsert($this->baseJob());

        $result = $this->repository->findPaginated(['per_page' => 500]);

        self::assertSame(50, $result['per_page']);
    }

    #[Test]
    public function findPaginatedSortsFeaturedJobsFirstRegardlessOfSortMode(): void
    {
        $this->repository->upsert($this->baseJob(['source_id' => 'rm-1', 'title' => 'Regular Job']));
        $this->repository->upsert($this->baseJob(['source_id' => 'rm-2', 'title' => 'Featured Job']));
        $this->db->exec("UPDATE jobs SET is_featured = 1 WHERE source_id = 'rm-2'");

        $result = $this->repository->findPaginated(['sort' => 'newest', 'page' => 1, 'per_page' => 20]);

        self::assertSame('Featured Job', $result['jobs'][0]['title']);
    }

    #[Test]
    public function findPaginatedSalaryFilterIncludesOverlappingRangesAndNullBounds(): void
    {
        $this->repository->upsert($this->baseJob([
            'source_id' => 'rm-1',
            'title' => 'Well-paid role',
            'salary_min' => 5000,
            'salary_max' => 7000,
        ]));
        $this->repository->upsert($this->baseJob([
            'source_id' => 'rm-2',
            'title' => 'Low-paid role',
            'salary_min' => 1000,
            'salary_max' => 1500,
        ]));
        $this->repository->upsert($this->baseJob([
            'source_id' => 'rm-3',
            'title' => 'Undisclosed salary',
        ]));

        $result = $this->repository->findPaginated(['salary_min' => 4000, 'page' => 1, 'per_page' => 20]);
        $titles = array_column($result['jobs'], 'title');

        self::assertContains('Well-paid role', $titles);
        self::assertContains('Undisclosed salary', $titles);
        self::assertNotContains('Low-paid role', $titles);
    }
}
