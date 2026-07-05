<?php

declare(strict_types=1);

namespace App\Fetcher;

use App\Contracts\JobFetcherInterface;
use App\Exception\SourceUnavailableException;
use App\Http\HttpClientInterface;
use DateTimeImmutable;
use DateTimeZone;
use Exception;
use SimpleXMLElement;

/**
 * Fetches raw job listings from We Work Remotely's RSS feeds.
 *
 * HTTP + shape-validation concerns only — no parsing into the internal
 * schema (that is WweRemoteNormalizer's job) and no DB access (that is
 * JobRepository's job). This is the RSS/XML equivalent of RemotiveFetcher's
 * JSON-API pattern: same HttpClientInterface injection, same retry +
 * exponential backoff, same per-endpoint isolation, same
 * SourceUnavailableException contract — only the body-parsing step differs
 * (simplexml_load_string() against the response body instead of
 * json_decode(), and shape validation checks for $xml->channel->item
 * existing rather than a "jobs" array key).
 */
final class WweRemoteFetcher implements JobFetcherInterface
{
    private const USER_AGENT = 'NairobiDevOps-JobsBot/1.0 (nairobidevops.org)';
    private const MAX_ATTEMPTS = 3;
    private const INITIAL_BACKOFF_MS = 500;
    private const RATE_LIMIT_BACKOFF_MS = 30_000;

    /**
     * RSS feeds to fetch, per the PRD's Tier 1 source spec.
     *
     * @var string[]
     */
    private const FEEDS = [
        'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
        'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
    ];

    private $sleeper;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly int $timeoutSeconds = 20,
        $sleeper = null,
    ) {
        $this->sleeper = $sleeper ?? 'usleep';
    }

    public function sourceName(): string
    {
        return 'weworkremotely';
    }

    /**
     * @return array<int, array<string, mixed>> Raw RSS <item> dicts, unvalidated
     *                                            per-field — normalization happens
     *                                            in WweRemoteNormalizer.
     *
     * @throws SourceUnavailableException only if every feed fails after retries.
     *         Partial success (some feeds fail, others succeed) returns what
     *         succeeded — per-feed failures should be logged by the caller
     *         (cron/sync_wwremote.php via sync_log), not treated as a full
     *         WWR outage.
     */
    public function fetch(): array
    {
        $allItems = [];
        $feedErrors = [];

        foreach (self::FEEDS as $feedUrl) {
            try {
                $allItems = [...$allItems, ...$this->fetchFeed($feedUrl)];
            } catch (SourceUnavailableException $e) {
                $feedErrors[] = "{$feedUrl}: {$e->getMessage()}";
            }
        }

        if (!empty($feedErrors)) {
            $message = empty($allItems)
                ? 'weworkremotely fetch failed for all feeds: ' . implode('; ', $feedErrors)
                : 'weworkremotely fetch had partial failures: ' . implode('; ', $feedErrors);

            throw new SourceUnavailableException($message);
        }

        return $allItems;
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     * @throws SourceUnavailableException after MAX_ATTEMPTS exhausted
     */
    private function fetchFeed(string $url): array
    {
        $lastError = null;

        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            try {
                return $this->executeRequest($url);
            } catch (SourceUnavailableException $e) {
                $lastError = $e;

                if ($attempt < self::MAX_ATTEMPTS) {
                    $backoffMs = $this->getBackoffMs($e, $attempt);
                    ($this->sleeper)($backoffMs * 1000);
                }
            }
        }

        throw new SourceUnavailableException(
            "weworkremotely feed '{$url}' failed after " . self::MAX_ATTEMPTS . ' attempts: '
                . ($lastError?->getMessage() ?? 'unknown error')
        );
    }

    private function getBackoffMs(SourceUnavailableException $e, int $attempt): int
    {
        $isRateLimit = str_contains($e->getMessage(), 'Rate limited');
        if ($isRateLimit && preg_match('/Retry-After=(\d+)/', $e->getMessage(), $matches)) {
            return (int) $matches[1] * 1000;
        }

        if ($isRateLimit) {
            return self::RATE_LIMIT_BACKOFF_MS;
        }

        return self::INITIAL_BACKOFF_MS * (2 ** ($attempt - 1));
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     * @throws SourceUnavailableException on transport failure, non-200 response,
     *         malformed XML, or a response missing channel->item
     */
    private function executeRequest(string $url): array
    {
        $result = $this->httpClient->get(
            $url,
            [
                'User-Agent' => self::USER_AGENT,
                'Accept'     => 'application/rss+xml, application/xml, text/xml',
            ],
            $this->timeoutSeconds
        );

        if ($result['error'] !== '') {
            throw new SourceUnavailableException("cURL error: {$result['error']}");
        }

        if ($result['status'] === 429) {
            $retryAfterSeconds = $this->parseRetryAfterHeader($result['headers'] ?? []);
            $message = 'Rate limited (HTTP 429)';
            if ($retryAfterSeconds !== null) {
                $message .= "; Retry-After={$retryAfterSeconds}";
            }

            throw new SourceUnavailableException($message);
        }

        if ($result['status'] !== 200) {
            throw new SourceUnavailableException("HTTP {$result['status']}");
        }

        if ($result['body'] === '') {
            throw new SourceUnavailableException('Empty response body');
        }

        return $this->parseAndValidate($result['body']);
    }

    /**
     * @param array<string, string> $headers
     */
    private function parseRetryAfterHeader(array $headers): ?int
    {
        $retryAfter = null;
        foreach ($headers as $name => $value) {
            if (strtolower($name) === 'retry-after') {
                $retryAfter = trim($value);
                break;
            }
        }

        if ($retryAfter === null || $retryAfter === '') {
            return null;
        }

        if (ctype_digit($retryAfter)) {
            return (int) $retryAfter;
        }

        $result = null;
        try {
            $date = new DateTimeImmutable($retryAfter, new DateTimeZone('UTC'));
            $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
            $seconds = $date->getTimestamp() - $now->getTimestamp();
            $result = $seconds > 0 ? $seconds : 0;
        } catch (Exception) {
            // Keep $result as null
        }

        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     * @throws SourceUnavailableException if the body isn't parseable XML, or
     *         parses but has no channel->item node
     */
    private function parseAndValidate(string $body): array
    {
        $previousUseErrors = libxml_use_internal_errors(true);
        $xml = simplexml_load_string($body, SimpleXMLElement::class, LIBXML_NOCDATA | LIBXML_NONET);
        $xmlErrors = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($previousUseErrors);

        if ($xml === false) {
            $firstError = $xmlErrors[0]->message ?? 'unknown parse error';
            throw new SourceUnavailableException('Malformed XML: ' . trim($firstError));
        }

        if (!isset($xml->channel) || !isset($xml->channel->item) || $xml->channel->item->count() === 0) {
            throw new SourceUnavailableException('Response missing expected channel->item nodes');
        }

        $items = [];
        foreach ($xml->channel->item as $item) {
            $items[] = [
                'guid'        => (string) $item->guid,
                'title'       => (string) $item->title,
                'link'        => (string) $item->link,
                'pubDate'     => (string) $item->pubDate,
                'description' => (string) $item->description,
            ];
        }

        return $items;
    }
}
