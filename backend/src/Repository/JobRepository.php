<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * All SQL against the `jobs` table lives here — no Fetcher, Normalizer, cron
 * script, or endpoint file executes a query against it directly.
 *
 * Dedup strategy (PRD §13 "Deduplication rules — three levels"):
 *
 *   Level 1 — source + source_id (primary, automated)
 *     Enforced by the `unique_source_job` UNIQUE KEY. Before any insert we
 *     check findBySourceId(): if a row already exists for this source's own
 *     ID, this is an UPDATE (refresh fields + last_synced_at), never a new row.
 *
 *   Level 2 — title + company (secondary, cross-source)
 *     The same job appearing on two different sources (e.g. Remotive and
 *     We Work Remotely) won't share a source_id, so Level 1 can't catch it.
 *     findPossibleDuplicate() checks title+company against every *other*
 *     source, narrowed to postings within DEDUP_WINDOW_DAYS of each other so
 *     a genuinely different "Senior DevOps Engineer @ Andela" role six months
 *     apart isn't flagged. Per the PRD, the first-inserted record wins: the
 *     new one is skipped, not merged, not auto-rejected silently — the
 *     caller (a sync cron) gets `skipped_duplicate` back and is expected to
 *     log it to sync_log for a human to reconcile later if needed.
 *
 *   Level 3 — employer submissions (human review)
 *     Not handled here — those go through manual admin approval, no
 *     automated fuzzy matching. Out of scope for this class.
 */
final class JobRepository
{
    /**
     * How close two same-title/company postings from different sources need
     * to be, in days, before we treat them as the same job rather than a
     * coincidentally identical title reposted much later.
     */
    private const DEDUP_WINDOW_DAYS = 5;

    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * Level 1 dedup lookup — the primary, automated anchor.
     *
     * @return array<string, mixed>|null
     */
    public function findBySourceId(string $source, string $sourceId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM jobs WHERE source = :source AND source_id = :source_id LIMIT 1'
        );
        $stmt->execute(['source' => $source, 'source_id' => $sourceId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $row;
    }

    /**
     * Level 2 dedup lookup — cross-source, title + company, date-windowed.
     *
     * Deliberately does the date-window comparison in PHP rather than SQL
     * (e.g. TIMESTAMPDIFF) so the same logic runs identically against MySQL
     * in production and SQLite in tests, and so a NULL posted_at on either
     * side degrades gracefully instead of silently excluding the row.
     *
     * @return array<string, mixed>|null  The earliest-created matching row, or null
     */
    public function findPossibleDuplicate(
        string $title,
        string $company,
        ?string $excludeSource = null,
        ?string $postedAt = null,
    ): ?array {
        $sql = 'SELECT * FROM jobs WHERE title = :title AND company = :company';
        $params = ['title' => $title, 'company' => $company];

        if ($excludeSource !== null) {
            $sql .= ' AND source != :exclude_source';
            $params['exclude_source'] = $excludeSource;
        }

        $sql .= ' ORDER BY created_at ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($candidates === []) {
            return null;
        }

        // No posted_at to compare against — fall back to "same title+company
        // exists at all" rather than refusing to flag a possible duplicate.
        if ($postedAt === null) {
            return $candidates[0];
        }

        $target = strtotime($postedAt);
        $windowSeconds = self::DEDUP_WINDOW_DAYS * 86400;

        $match = null;

        foreach ($candidates as $candidate) {
            if ($candidate['posted_at'] === null) {
                continue;
            }

            $candidateTime = strtotime((string) $candidate['posted_at']);

            if ($candidateTime !== false && abs($target - $candidateTime) <= $windowSeconds) {
                $match = $candidate;
                break;
            }
        }

        return $match;
    }

    /**
     * Insert-or-update a single normalized job record.
     *
     * Resolution order:
     *   1. Same (source, source_id) already on file → UPDATE in place,
     *      refresh last_synced_at. This is the common case on every
     *      subsequent sync of a job still open at the source.
     *   2. No source_id match, but a *different* source already has the
     *      same title+company within the dedup window → SKIP. Reported
     *      back as `skipped_duplicate` with the id it matched, so the
     *      caller can log a warning rather than the row vanishing with no
     *      trace.
     *   3. Neither match → INSERT a new row.
     *
     * @param array<string, mixed> $job Normalized job — see the Normalizer contract.
     *   Required keys: title, company, apply_url, source, source_id.
     *   Everything else is optional and defaults sensibly.
     * @return array{action: 'inserted'|'updated'|'skipped_duplicate', id: int|null, duplicate_of: int|null}
     */
    public function upsert(array $job): array
    {
        $existing = $this->findBySourceId($job['source'], $job['source_id']);

        if ($existing !== null) {
            $this->update((int) $existing['id'], $job);

            return ['action' => 'updated', 'id' => (int) $existing['id'], 'duplicate_of' => null];
        }

        $duplicate = $this->findPossibleDuplicate(
            $job['title'],
            $job['company'],
            $job['source'],
            $job['posted_at'] ?? null,
        );

        if ($duplicate !== null) {
            return [
                'action' => 'skipped_duplicate',
                'id' => null,
                'duplicate_of' => (int) $duplicate['id'],
            ];
        }

        $id = $this->insert($job);

        return ['action' => 'inserted', 'id' => $id, 'duplicate_of' => null];
    }

    /**
     * Touch last_synced_at with no other changes — for a job that's still
     * present at the source but whose normalized fields haven't changed.
     * Kept distinct from upsert() so a sync run can cheaply confirm
     * "still live" without rebuilding the full UPDATE parameter set.
     */
    public function touchLastSynced(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE jobs SET last_synced_at = CURRENT_TIMESTAMP WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    /**
     * Paginated, filtered read for the public jobs listing endpoint.
     * The only place a search/filter query against `jobs` is built —
     * every value is bound, never string-concatenated into the SQL text.
     *
     * @param array{
     *   q?: string,
     *   role_type?: string[],
     *   location_type?: string[],
     *   africa_friendly?: bool,
     *   experience_level?: string[],
     *   salary_min?: int,
     *   salary_max?: int,
     *   sort?: 'newest'|'closing_soon'|'salary_desc',
     *   page?: int,
     *   per_page?: int,
     * } $filters
     * @return array{jobs: array<int, array<string, mixed>>, total: int, page: int, per_page: int}
     */
    public function findPaginated(array $filters): array
    {
        $where = ['is_active = 1', 'is_approved = 1'];
        $params = [];

        if (!empty($filters['q'])) {
            $like = '%' . $filters['q'] . '%';
            $where[] = '(title LIKE :q_title OR company LIKE :q_company OR description LIKE :q_description)';
            $params['q_title'] = $like;
            $params['q_company'] = $like;
            $params['q_description'] = $like;
        }

        $this->addInClause($where, $params, 'role_type', $filters['role_type'] ?? []);
        $this->addInClause($where, $params, 'location_type', $filters['location_type'] ?? []);
        $this->addInClause($where, $params, 'experience_level', $filters['experience_level'] ?? []);

        if (!empty($filters['africa_friendly'])) {
            $where[] = 'africa_friendly = 1';
        }

        // A role is a salary match if its range overlaps the requested one at
        // all — a job with no upper bound shouldn't be excluded by a minimum
        // filter just because salary_max is NULL, and vice versa.
        if (isset($filters['salary_min'])) {
            $where[] = '(salary_max IS NULL OR salary_max >= :salary_min)';
            $params['salary_min'] = $filters['salary_min'];
        }

        if (isset($filters['salary_max'])) {
            $where[] = '(salary_min IS NULL OR salary_min <= :salary_max)';
            $params['salary_max'] = $filters['salary_max'];
        }

        $whereSql = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM jobs WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Featured jobs always sort first, within whatever sort mode is active.
        // Each branch appends `id DESC` as a stable unique tie-breaker so
        // pagination is deterministic when two rows share the primary sort key.
        $orderBy = 'is_featured DESC, ' . match ($filters['sort'] ?? 'newest') {
            'closing_soon' => 'closes_at IS NULL, closes_at ASC, id DESC',
            'salary_desc'  => 'salary_max IS NULL, salary_max DESC, id DESC',
            default        => 'posted_at DESC, id DESC',
        };

        $perPage = max(1, min(50, (int) ($filters['per_page'] ?? 20)));
        $page = max(1, (int) ($filters['page'] ?? 1));
        $offset = ($page - 1) * $perPage;

        $stmt = $this->db->prepare(
            "SELECT * FROM jobs WHERE {$whereSql} ORDER BY {$orderBy} LIMIT :limit OFFSET :offset"
        );

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        // LIMIT/OFFSET must be bound as integers explicitly — with native
        // (non-emulated) prepares, MySQL rejects a string-typed bind here.
        $stmt->bindValue('limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'jobs' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
        ];
    }

    /**
     * Appends a `column IN (:p0, :p1, ...)` clause built entirely from bound
     * placeholders — never interpolates $values directly into SQL text.
     *
     * @param string[] $where
     * @param array<string, mixed> $params
     * @param string[] $values
     */
    private function addInClause(array &$where, array &$params, string $column, array $values): void
    {
        if ($values === []) {
            return;
        }

        $placeholders = [];
        foreach (array_values($values) as $i => $value) {
            $key = "{$column}_{$i}";
            $placeholders[] = ":{$key}";
            $params[$key] = $value;
        }

        $where[] = "{$column} IN (" . implode(', ', $placeholders) . ')';
    }

    private function insert(array $job): int
    {
        $sql = 'INSERT INTO jobs (
                    title, company, company_logo_url, description, apply_url,
                    affiliate_apply_url, source, source_id, role_type,
                    location_type, location_detail, africa_friendly,
                    salary_min, salary_max, salary_currency, salary_period,
                    experience_level, posted_at, closes_at, tags,
                    fetched_at, last_synced_at
                ) VALUES (
                    :title, :company, :company_logo_url, :description, :apply_url,
                    :affiliate_apply_url, :source, :source_id, :role_type,
                    :location_type, :location_detail, :africa_friendly,
                    :salary_min, :salary_max, :salary_currency, :salary_period,
                    :experience_level, :posted_at, :closes_at, :tags,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($this->bindParams($job));

        return (int) $this->db->lastInsertId();
    }

    private function update(int $id, array $job): void
    {
        $sql = 'UPDATE jobs SET
                    title = :title,
                    company = :company,
                    company_logo_url = :company_logo_url,
                    description = :description,
                    apply_url = :apply_url,
                    affiliate_apply_url = :affiliate_apply_url,
                    role_type = :role_type,
                    location_type = :location_type,
                    location_detail = :location_detail,
                    africa_friendly = :africa_friendly,
                    salary_min = :salary_min,
                    salary_max = :salary_max,
                    salary_currency = :salary_currency,
                    salary_period = :salary_period,
                    experience_level = :experience_level,
                    posted_at = :posted_at,
                    closes_at = :closes_at,
                    tags = :tags,
                    last_synced_at = CURRENT_TIMESTAMP,
                    is_active = 1
                WHERE id = :id';

        // source/source_id are the Level 1 dedup anchor — deliberately never
        // touched by an UPDATE, so they're stripped from the shared param set
        // rather than passed in unused.
        $params = $this->bindParams($job);
        unset($params['source'], $params['source_id']);
        $params['id'] = $id;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
    }

    /**
     * @param array<string, mixed> $job
     * @return array<string, mixed>
     */
    private function bindParams(array $job): array
    {
        return [
            'title' => $job['title'],
            'company' => $job['company'],
            'company_logo_url' => $job['company_logo_url'] ?? null,
            'description' => $job['description'] ?? null,
            'apply_url' => $job['apply_url'],
            'affiliate_apply_url' => $job['affiliate_apply_url'] ?? null,
            'source' => $job['source'],
            'source_id' => $job['source_id'],
            'role_type' => $job['role_type'] ?? 'Uncategorised',
            'location_type' => $job['location_type'] ?? null,
            'location_detail' => $job['location_detail'] ?? null,
            'africa_friendly' => !empty($job['africa_friendly']) ? 1 : 0,
            'salary_min' => $job['salary_min'] ?? null,
            'salary_max' => $job['salary_max'] ?? null,
            'salary_currency' => $job['salary_currency'] ?? 'USD',
            'salary_period' => $job['salary_period'] ?? null,
            'experience_level' => $job['experience_level'] ?? null,
            'posted_at' => $job['posted_at'] ?? null,
            'closes_at' => $job['closes_at'] ?? null,
            'tags' => isset($job['tags']) ? json_encode(array_values($job['tags'])) : null,
        ];
    }
}
