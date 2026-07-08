<?php

declare(strict_types=1);

namespace Tests\Fetcher;

use App\Exception\SourceUnavailableException;
use App\Fetcher\WweRemoteFetcher;
use App\Http\HttpClientInterface;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class WweRemoteFetcherTest extends TestCase
{
    private const VALID_RSS = <<<'XML'
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>We Work Remotely</title>
            <item>
              <title>Andela: Senior DevOps Engineer at Anywhere in the World</title>
              <link>https://weworkremotely.com/remote-jobs/andela-senior-devops-engineer</link>
              <guid>https://weworkremotely.com/remote-jobs/andela-senior-devops-engineer</guid>
              <pubDate>Tue, 30 Jun 2026 20:33:15 +0000</pubDate>
              <description>&lt;p&gt;Great DevOps role.&lt;/p&gt;</description>
            </item>
          </channel>
        </rss>
        XML;

    private function makeSuccessResult(string $body): array
    {
        return ['status' => 200, 'body' => $body, 'error' => ''];
    }

    #[Test]
    public function sourceNameIsWeworkremotely(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $fetcher = new WweRemoteFetcher($client);

        self::assertSame('weworkremotely', $fetcher->sourceName());
    }

    #[Test]
    public function fetchReturnsItemsFromAllFeedsWhenEverythingSucceeds(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn($this->makeSuccessResult(self::VALID_RSS));

        $fetcher = new WweRemoteFetcher($client);
        $items = $fetcher->fetch();

        // 3 feeds x 1 item each in the mocked response
        self::assertCount(3, $items);
        self::assertSame([], $fetcher->getFeedErrors());
        self::assertSame(
            'Andela: Senior DevOps Engineer at Anywhere in the World',
            $items[0]['title'],
        );
    }

    #[Test]
    public function fetchReturnsPartialResultsWhenOneFeedFailsAfterRetries(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $callCount = 0;

        $client->method('get')->willReturnCallback(function () use (&$callCount) {
            $callCount++;
            // First feed (calls 1-3, exhausting retries) always fails.
            if ($callCount <= 3) {
                return ['status' => 500, 'body' => '', 'error' => ''];
            }

            return $this->makeSuccessResult(self::VALID_RSS);
        });

        $fetcher = new WweRemoteFetcher($client);
        $items = $fetcher->fetch();

        self::assertCount(2, $items); // 2 surviving feeds x 1 item
        self::assertCount(1, $fetcher->getFeedErrors());
        self::assertStringContainsString('HTTP 500', $fetcher->getFeedErrors()[0]);
    }

    #[Test]
    public function fetchThrowsWhenEveryFeedFailsAfterRetries(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn(['status' => 503, 'body' => '', 'error' => '']);

        $fetcher = new WweRemoteFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }

    #[Test]
    public function fetchRetriesOnRateLimitForEachFeedBeforeGivingUp(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        // 3 feeds x MAX_ATTEMPTS (3) retries each = 9 total calls before
        // fetch() finally gives up and throws.
        $client->expects(self::exactly(9))
            ->method('get')
            ->willReturn(['status' => 429, 'body' => '', 'error' => '']);

        $fetcher = new WweRemoteFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }

    #[Test]
    public function fetchThrowsOnMalformedXml(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn($this->makeSuccessResult('<rss><channel><item><title>Unclosed'));

        $fetcher = new WweRemoteFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }

    #[Test]
    public function fetchThrowsWhenChannelItemStructureIsMissing(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn($this->makeSuccessResult('<rss><channel><title>Empty</title></channel></rss>'));

        $fetcher = new WweRemoteFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }

    #[Test]
    public function fetchThrowsOnEmptyResponseBody(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn(['status' => 200, 'body' => '', 'error' => '']);

        $fetcher = new WweRemoteFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }
}
