<?php

declare(strict_types=1);

namespace App\Fetcher;

use App\Contracts\JobFetcherInterface;
use App\Exception\SourceUnavailableException;
use App\Http\HttpClientInterface;
use SimpleXMLElement;

/**
 * Fetches raw job listings from We Work Remotely's RSS feeds.
 *
 * RSS/XML equivalent of RemotiveFetcher — same contract, same retry/backoff
 * rules, same partial-failure tolerance (one feed failing doesn't fail the
 * others). HTTP + XML-shape concerns only; parsing into the internal schema
 * is WweRemoteNormalizer's job, DB access is JobRepository's job.
 */
final class WweRemoteFetcher implements JobFetcherInterface
{
    private const USER_AGENT = 'NairobiDevOps-JobsBot/1.0 (nairobidevops.org)';
    private const MAX_ATTEMPTS = 3;
    private const INITIAL_BACKOFF_MS = 500;

    /**
     * WWR category feeds, per the PRD's Tier 1 source spec. Fetched
     * independently — a malformed or unreachable feed doesn't sink the others.
     *
     * @var string[]
     */
    private const FEEDS = [
        'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
        'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
    ];

    /**
     * Populated by the most recent fetch() call — feeds that failed even
     * though the overall call didn't throw (i.e. at least one other feed
     * succeeded). Without this, a partial failure would silently report as
     * a full success to the caller.
     *
     * @var string[]
     */
    private array $lastFeedErrors = [];

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly int $timeoutSeconds = 20,
    ) {
    }

    public function sourceName(): string
    {
        return 'weworkremotely';
    }

    /**
     * @return array<int, array<string, mixed>> Raw item dicts — unvalidated
     *   per-field, normalization happens in WweRemoteNormalizer.
     *
     * @throws SourceUnavailableException only if every feed fails after
     *         retries. Partial success returns what succeeded — call
     *         getFeedErrors() afterward to see which feeds degraded.
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

        $this->lastFeedErrors = $feedErrors;

        if (empty($allItems) && !empty($feedErrors)) {
            throw new SourceUnavailableException(
                'WWR fetch failed for all feeds: ' . implode('; ', $feedErrors)
            );
        }

        return $allItems;
    }

    /**
     * Per-feed failures from the most recent fetch() call that did NOT
     * cause fetch() to throw. Empty means fetch() hasn't run yet, or every
     * feed succeeded.
     *
     * @return string[]
     */
    public function getFeedErrors(): array
    {
        return $this->lastFeedErrors;
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     * @throws SourceUnavailableException after MAX_ATTEMPTS exhausted
     */
    private function fetchFeed(string $feedUrl): array
    {
        $lastError = null;

        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            try {
                return $this->executeRequest($feedUrl);
            } catch (SourceUnavailableException $e) {
                $lastError = $e;

                if ($attempt < self::MAX_ATTEMPTS) {
                    $backoffMs = self::INITIAL_BACKOFF_MS * (2 ** ($attempt - 1));
                    usleep($backoffMs * 1000);
                }
            }
        }

        throw new SourceUnavailableException(
            'WWR feed failed after ' . self::MAX_ATTEMPTS . ' attempts: '
                . ($lastError?->getMessage() ?? 'unknown error')
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     * @throws SourceUnavailableException on transport failure, non-200
     *         response, malformed XML, or a feed missing channel/item structure
     */
    private function executeRequest(string $feedUrl): array
    {
        $result = $this->httpClient->get(
            $feedUrl,
            ['User-Agent' => self::USER_AGENT, 'Accept' => 'application/rss+xml, application/xml, text/xml'],
            $this->timeoutSeconds,
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

        return $this->parseItems($result['body']);
    }

    /**
     * @return array<int, array<string, mixed>>
     *
     *
     * @throws SourceUnavailableException on malformed XML or a feed missing
     *         the expected channel/item structure. Never inspects individual
     *         item fields — that's the normalizer's concern.
     */
    private function parseItems(string $body): array
    {
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($body, SimpleXMLElement::class, LIBXML_NOCDATA);
        $xmlErrors = libxml_get_errors();
        libxml_clear_errors();

        if ($xml === false) {
            $message = $xmlErrors !== [] ? trim($xmlErrors[0]->message) : 'unknown parse error';

            throw new SourceUnavailableException("Malformed XML: {$message}");
        }

        if (!isset($xml->channel)) {
            throw new SourceUnavailableException('Response missing expected channel structure');
        }

        if (!isset($xml->channel->item)) {
            throw new SourceUnavailableException('Response missing expected channel/item structure');
        }

        $items = [];
        foreach ($xml->channel->item as $item) {
            $items[] = [
                'title'       => (string) $item->title,
                'link'        => (string) $item->link,
                'guid'        => (string) $item->guid,
                'pubDate'     => (string) $item->pubDate,
                'description' => (string) $item->description,
            ];
        }

        return $items;
    }
}
