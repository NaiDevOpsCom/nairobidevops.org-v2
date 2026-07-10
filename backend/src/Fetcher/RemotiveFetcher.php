<?php

declare(strict_types=1);

namespace App\Fetcher;

use App\Contracts\JobFetcherInterface;
use App\Exception\SourceUnavailableException;
use App\Http\HttpClientInterface;

/**
 * Fetches raw job listings from the Remotive API.
 *
 * HTTP concerns only — no parsing into the internal schema (RemotiveNormalizer's
 * job) and no DB access (JobRepository's job). Retries transient failures with
 * exponential backoff before giving up and throwing SourceUnavailableException.
 *
 * Rate limiting: Remotive allows max 4 fetches/day. This class makes one HTTP
 * call per category per fetch() invocation — the cron schedule (every 6 hours)
 * enforces the 4x/day cap, not this class.
 */
final class RemotiveFetcher implements JobFetcherInterface
{
    private const BASE_URL = 'https://remotive.com/api/remote-jobs';
    private const USER_AGENT = 'NairobiDevOps-JobsBot/1.0 (nairobidevops.org)';
    private const MAX_ATTEMPTS = 3;
    private const INITIAL_BACKOFF_MS = 500;

    /** @var string[] Remotive category slugs to fetch, per the PRD's Tier 1 source spec */
    private const CATEGORIES = ['devops-sysadmin', 'software-dev', 'cloud'];

    /**
     * Populated by the most recent fetch() call — the categories that failed
     * even though the overall call didn't throw (i.e. at least one other
     * category succeeded). Without this, a 2-of-3-categories-failed run
     * would silently report as a full success to the caller, which is
     * exactly the "don't fail silently" rule the brief calls out.
     *
     * @var string[]
     */
    private array $lastCategoryErrors = [];

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly int $timeoutSeconds = 20,
        private readonly int $limitPerCategory = 100,
    ) {
    }

    public function sourceName(): string
    {
        return 'remotive';
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     * @throws SourceUnavailableException only if every category fails after
     *         retries. Partial success (some categories fail, others succeed)
     *         returns what succeeded — call getCategoryErrors() afterward to
     *         see which categories degraded, so the caller can log it rather
     *         than treating a partial run as a clean success.
     */
    public function fetch(): array
    {
        $allJobs = [];
        $categoryErrors = [];

        foreach (self::CATEGORIES as $category) {
            try {
                $allJobs = [...$allJobs, ...$this->fetchCategory($category)];
            } catch (SourceUnavailableException $e) {
                $categoryErrors[] = "{$category}: {$e->getMessage()}";
            }
        }

        $this->lastCategoryErrors = $categoryErrors;

        if (empty($allJobs) && !empty($categoryErrors)) {
            throw new SourceUnavailableException(
                'Remotive fetch failed for all categories: ' . implode('; ', $categoryErrors)
            );
        }

        return $allJobs;
    }

    /**
     * Per-category failures from the most recent fetch() call that did NOT
     * cause fetch() to throw (i.e. at least one other category still
     * succeeded). Empty array means either fetch() hasn't been called yet,
     * or every category succeeded.
     *
     * @return string[]
     */
    public function getCategoryErrors(): array
    {
        return $this->lastCategoryErrors;
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     * @throws SourceUnavailableException after MAX_ATTEMPTS exhausted
     */
    private function fetchCategory(string $category): array
    {
        $url = self::BASE_URL . '?' . http_build_query([
            'category' => $category,
            'limit'    => $this->limitPerCategory,
        ]);

        $lastError = null;

        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            try {
                return $this->executeRequest($url);
            } catch (SourceUnavailableException $e) {
                $lastError = $e;

                if ($attempt < self::MAX_ATTEMPTS) {
                    $backoffMs = self::INITIAL_BACKOFF_MS * (2 ** ($attempt - 1));
                    usleep($backoffMs * 1000);
                }
            }
        }

        throw new SourceUnavailableException(
            "Remotive category '{$category}' failed after " . self::MAX_ATTEMPTS . ' attempts: '
                . ($lastError?->getMessage() ?? 'unknown error')
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     * @throws SourceUnavailableException on transport failure, non-200 response,
     *         invalid JSON, or a response missing the expected "jobs" key
     */
    private function executeRequest(string $url): array
    {
        $result = $this->httpClient->get(
            $url,
            ['User-Agent' => self::USER_AGENT, 'Accept' => 'application/json'],
            $this->timeoutSeconds
        );

        if ($result['error'] !== '') {
            throw new SourceUnavailableException("cURL error: {$result['error']}");
        }

        if ($result['status'] === 429) {
            throw new SourceUnavailableException('Rate limited (HTTP 429)');
        }

        if ($result['status'] !== 200) {
            throw new SourceUnavailableException("HTTP {$result['status']}");
        }

        if ($result['body'] === '') {
            throw new SourceUnavailableException('Empty response body');
        }

        $decoded = json_decode($result['body'], true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new SourceUnavailableException('Invalid JSON: ' . json_last_error_msg());
        }

        if (!\is_array($decoded) || !\array_key_exists('jobs', $decoded) || !\is_array($decoded['jobs'])) {
            throw new SourceUnavailableException('Response missing expected "jobs" array');
        }

        return $decoded['jobs'];
    }
}
