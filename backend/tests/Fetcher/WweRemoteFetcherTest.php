<?php

declare(strict_types=1);

namespace Tests\Fetcher;

use App\Exception\SourceUnavailableException;
use App\Fetcher\WweRemoteFetcher;
use App\Http\HttpClientInterface;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Coverage mirrors RemotiveFetcherTest.php's shape, adapted for the RSS/XML
 * pattern: all-feeds-succeed, one-feed-fails-others-succeed,
 * all-feeds-fail-after-retries, rate-limit (429) retries, malformed XML,
 * missing channel->item, source name.
 *
 * usleep() inside the fetcher's backoff means these tests are not
 * instantaneous (worst case: three feeds x up to 3 attempts each with
 * 0.5s/1s backoff) but they never touch the network — every HTTP call is
 * mocked via HttpClientInterface.
 */
final class WweRemoteFetcherTest extends TestCase
{
    /**
     * The one feed URL a test needs to name explicitly — to single it out
     * as "the one that fails" in the partial-failure test below. The other
     * two feeds are exercised identically by every test but never need to
     * be referenced by name, so they don't get constants (that's exactly
     * what SonarQube's S1068 was flagging: two unused private fields).
     */
    private const FEED_PROGRAMMING = 'https://weworkremotely.com/categories/remote-programming-jobs.rss';

    #[Test]
    public function sourceNameIsWeworkremotely(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $fetcher = $this->createFetcher($client);

        self::assertSame('weworkremotely', $fetcher->sourceName());
    }

    #[Test]
    public function fetchReturnsAllItemsWhenAllFeedsSucceed(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects(self::exactly(3))
            ->method('get')
            ->willReturn($this->okResponse($this->rssBody([
                ['guid' => 'guid-1', 'title' => 'Company A: Senior DevOps Engineer at Remote'],
            ])));

        $fetcher = $this->createFetcher($client);
        $items = $fetcher->fetch();

        // One matching item per feed x 3 feeds
        self::assertCount(3, $items);
        self::assertSame('guid-1', $items[0]['guid']);
        self::assertSame('Company A: Senior DevOps Engineer at Remote', $items[0]['title']);
    }

    #[Test]
    public function fetchThrowsOnPartialFailureWhenOneFeedFailsAfterRetries(): void
    {
        $client = $this->createMock(HttpClientInterface::class);

        $client->method('get')
            ->willReturnCallback(function (string $url) {
                if ($url === self::FEED_PROGRAMMING) {
                    // Every attempt for this feed fails
                    return ['status' => 500, 'body' => '', 'error' => ''];
                }

                return $this->okResponse($this->rssBody([
                    ['guid' => 'guid-ok', 'title' => 'Company B: SRE at Remote'],
                ]));
            });

        $fetcher = $this->createFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $this->expectExceptionMessageMatches('/partial failures/i');

        $fetcher->fetch();
    }

    #[Test]
    public function fetchThrowsWhenEveryFeedFailsAfterRetries(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn(['status' => 500, 'body' => '', 'error' => '']);

        $fetcher = $this->createFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $this->expectExceptionMessageMatches('/fetch failed for all feeds/');

        $fetcher->fetch();
    }

    #[Test]
    public function fetchRetriesOnRateLimitBeforeGivingUp(): void
    {
        $client = $this->createMock(HttpClientInterface::class);

        $callCountByUrl = [];
        $client->method('get')
            ->willReturnCallback(function (string $url) use (&$callCountByUrl) {
                $callCountByUrl[$url] = ($callCountByUrl[$url] ?? 0) + 1;

                // Fail the first two attempts with 429, succeed on the third
                if ($callCountByUrl[$url] < 3) {
                    return ['status' => 429, 'body' => '', 'error' => '', 'headers' => []];
                }

                return $this->okResponse($this->rssBody([
                    ['guid' => 'guid-retry', 'title' => 'Company C: Platform Engineer at Remote'],
                ]));
            });

        $fetcher = $this->createFetcher($client);
        $items = $fetcher->fetch();

        // All three feeds eventually succeed on their third attempt
        self::assertCount(3, $items);
        foreach ($callCountByUrl as $count) {
            self::assertSame(3, $count);
        }
    }

    #[Test]
    public function fetchThrowsSourceUnavailableWhenAllFeedsReturnMalformedXml(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn($this->okResponse('<not-valid-xml'));

        $fetcher = $this->createFetcher($client);

        $this->expectException(SourceUnavailableException::class);

        $fetcher->fetch();
    }

    #[Test]
    public function fetchThrowsSourceUnavailableWhenChannelItemIsMissing(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn(
            $this->okResponse('<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title></channel></rss>')
        );

        $fetcher = $this->createFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $this->expectExceptionMessageMatches('/channel->item/');

        $fetcher->fetch();
    }

    #[Test]
    public function fetchUsesRetryAfterHeaderForRateLimitBackoff(): void
    {
        $client = $this->createMock(HttpClientInterface::class);

        $callCountByUrl = [];
        $delays = [];
        $client->method('get')
            ->willReturnCallback(function (string $url) use (&$callCountByUrl) {
                $callCountByUrl[$url] = ($callCountByUrl[$url] ?? 0) + 1;

                if ($callCountByUrl[$url] === 1) {
                    return [
                        'status' => 429,
                        'body' => '',
                        'error' => '',
                        'headers' => ['retry-after' => '2'],
                    ];
                }

                return $this->okResponse($this->rssBody([
                    ['guid' => "guid-{$callCountByUrl[$url]}", 'title' => 'Company D: Site Reliability Engineer at Remote'],
                ]));
            });

        $fetcher = new WweRemoteFetcher($client, 20, static function (int $microseconds) use (&$delays): void {
            $delays[] = $microseconds;
        });

        $items = $fetcher->fetch();

        self::assertCount(3, $items);
        self::assertSame([2000000, 2000000, 2000000], $delays);
    }

    #[Test]
    public function fetchReturnsRawFieldsWithoutInspectingIndividualItems(): void
    {
        // A record missing e.g. <pubDate> is still returned raw — the
        // fetcher validates top-level shape only; individual malformed
        // records are WweRemoteNormalizer's concern, not this class's.
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn($this->okResponse($this->rssBody([
            ['guid' => 'guid-incomplete', 'title' => '', 'omitPubDate' => true],
        ])));

        $fetcher = $this->createFetcher($client);
        $items = $fetcher->fetch();

        self::assertNotEmpty($items);
        self::assertSame('', $items[0]['title']);
        self::assertArrayHasKey('pubDate', $items[0]);
    }

    /**
     * @return array{status: int, body: string, error: string, headers: array<string, string>}
     */
    private function okResponse(string $body): array
    {
        return ['status' => 200, 'body' => $body, 'error' => '', 'headers' => []];
    }

    private function createFetcher(HttpClientInterface $client): WweRemoteFetcher
    {
        return new WweRemoteFetcher($client, 20, static function (int $_): void {
            // no-op: skip real usleep() delays during tests
        });
    }

    /**
     * @param array<int, array<string, mixed>> $items
     */
    private function rssBody(array $items): string
    {
        $itemXml = '';
        foreach ($items as $item) {
            $guid = htmlspecialchars((string) ($item['guid'] ?? ''), ENT_XML1);
            $title = htmlspecialchars((string) ($item['title'] ?? ''), ENT_XML1);
            $link = htmlspecialchars((string) ($item['link'] ?? 'https://weworkremotely.com/jobs/1'), ENT_XML1);
            $description = htmlspecialchars((string) ($item['description'] ?? '<p>Job description</p>'), ENT_XML1);
            $pubDateXml = ($item['omitPubDate'] ?? false)
                ? ''
                : '<pubDate>' . htmlspecialchars((string) ($item['pubDate'] ?? 'Mon, 16 Jun 2026 08:00:00 +0000'), ENT_XML1) . '</pubDate>';

            $itemXml .= <<<XML
                <item>
                    <guid>{$guid}</guid>
                    <title>{$title}</title>
                    <link>{$link}</link>
                    {$pubDateXml}
                    <description>{$description}</description>
                </item>
                XML;
        }

        return <<<XML
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>We Work Remotely</title>
                    {$itemXml}
                </channel>
            </rss>
            XML;
    }
}
