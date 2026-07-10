<?php

declare(strict_types=1);

namespace Tests\Fetcher;

use App\Exception\SourceUnavailableException;
use App\Fetcher\RemotiveFetcher;
use App\Http\HttpClientInterface;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class RemotiveFetcherTest extends TestCase
{
    private const CATEGORY_COUNT = 3;
    private const MAX_ATTEMPTS = 3;

    #[Test]
    public function it_returns_jobs_when_all_categories_succeed(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn([
            'status' => 200,
            'body'   => json_encode(['jobs' => [['id' => 1, 'title' => 'DevOps Engineer']]]),
            'error'  => '',
        ]);

        $fetcher = new RemotiveFetcher($client);
        $jobs = $fetcher->fetch();

        self::assertCount(self::CATEGORY_COUNT, $jobs);
        self::assertSame('DevOps Engineer', $jobs[0]['title']);
    }

    #[Test]
    public function it_returns_partial_results_when_one_category_fails(): void
    {
        $client = $this->createMock(HttpClientInterface::class);

        $client->method('get')->willReturnCallback(static function (string $url): array {
            if (str_contains($url, 'category=devops-sysadmin')) {
                return ['status' => 500, 'body' => '', 'error' => ''];
            }

            return [
                'status' => 200,
                'body'   => json_encode(['jobs' => [['id' => 2, 'title' => 'SRE']]]),
                'error'  => '',
            ];
        });

        $fetcher = new RemotiveFetcher($client);
        $jobs = $fetcher->fetch();

        // The implementation treats partial success as non-fatal — it returns
        // what succeeded and records per-category errors for logging.
        self::assertCount(2, $jobs);
        self::assertNotSame([], $fetcher->getCategoryErrors());
        self::assertStringContainsString('devops-sysadmin', $fetcher->getCategoryErrors()[0]);
    }

    #[Test]
    public function it_throws_when_every_category_fails_after_retries(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn(['status' => 500, 'body' => '', 'error' => '']);

        $fetcher = new RemotiveFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $this->expectExceptionMessageMatches('/failed for all categories/');

        $fetcher->fetch();
    }

    #[Test]
    public function it_retries_on_rate_limit_before_giving_up(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->expects(self::exactly(self::CATEGORY_COUNT * self::MAX_ATTEMPTS))
            ->method('get')
            ->willReturn(['status' => 429, 'body' => '', 'error' => '']);

        $fetcher = new RemotiveFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }

    #[Test]
    public function it_throws_on_malformed_json(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn(['status' => 200, 'body' => '{not valid json', 'error' => '']);

        $fetcher = new RemotiveFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }

    #[Test]
    public function it_throws_when_response_is_missing_jobs_key(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn([
            'status' => 200,
            'body'   => json_encode(['unexpected' => 'shape']),
            'error'  => '',
        ]);

        $fetcher = new RemotiveFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }

    #[Test]
    public function it_throws_when_jobs_key_is_not_an_array(): void
    {
        // Guards against a source returning {"jobs": "unexpected string"} —
        // json_decode succeeds, the key exists, but the shape is still wrong.
        // This is the "validate response shape, don't assume fields always
        // exist" requirement from the PRD, not just "does the key exist".
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn([
            'status' => 200,
            'body'   => json_encode(['jobs' => 'not-an-array']),
            'error'  => '',
        ]);

        $fetcher = new RemotiveFetcher($client);

        $this->expectException(SourceUnavailableException::class);
        $fetcher->fetch();
    }

    #[Test]
    public function it_passes_through_raw_job_entries_without_per_field_validation(): void
    {
        // The fetcher's contract stops at "is this a well-formed API response
        // with a jobs array?" — it does NOT inspect individual job fields.
        // Dropping a record because it's missing a title is normalizer work
        // (per the project's fetcher/normalizer/repository separation), so a
        // malformed-but-structurally-valid entry is expected to pass through
        // untouched here and be caught downstream instead.
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn([
            'status' => 200,
            'body'   => json_encode([
                'jobs' => [
                    ['id' => 1, 'title' => 'DevOps Engineer'],
                    ['id' => 2], // missing title — validation is the normalizer's job, not the fetcher's
                ],
            ]),
            'error'  => '',
        ]);

        $fetcher = new RemotiveFetcher($client);
        $jobs = $fetcher->fetch();

        // 3 categories × 2 raw entries each = 6; nothing is filtered at this layer
        self::assertCount(6, $jobs);
        self::assertArrayNotHasKey('title', $jobs[1]);
    }

    #[Test]
    public function it_returns_an_empty_array_when_a_category_has_zero_open_jobs(): void
    {
        // A valid, well-formed response with no listings is not an error
        // condition — it must not throw SourceUnavailableException.
        $client = $this->createMock(HttpClientInterface::class);
        $client->method('get')->willReturn([
            'status' => 200,
            'body'   => json_encode(['jobs' => []]),
            'error'  => '',
        ]);

        $fetcher = new RemotiveFetcher($client);
        $jobs = $fetcher->fetch();

        self::assertSame([], $jobs);
    }

    #[Test]
    public function source_name_is_remotive(): void
    {
        $client = $this->createMock(HttpClientInterface::class);
        $fetcher = new RemotiveFetcher($client);

        self::assertSame('remotive', $fetcher->sourceName());
    }
}
