<?php

declare(strict_types=1);

namespace Tests\Normalizer;

use App\Normalizer\WweRemoteNormalizer;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class WweRemoteNormalizerTest extends TestCase
{
    private WweRemoteNormalizer $normalizer;

    protected function setUp(): void
    {
        $this->normalizer = new WweRemoteNormalizer();
    }

    private function rawItem(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Andela: Senior DevOps Engineer at Anywhere in the World',
            'link' => 'https://weworkremotely.com/remote-jobs/andela-senior-devops-engineer',
            'guid' => 'https://weworkremotely.com/remote-jobs/andela-senior-devops-engineer',
            'pubDate' => 'Mon, 30 Jun 2026 20:33:15 +0000',
            'description' => '<p>Great <strong>DevOps</strong> role.</p>',
        ], $overrides);
    }

    #[Test]
    public function splitsCompanyTitleAndLocationFromWwrFormat(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem());

        self::assertSame('Andela', $job['company']);
        self::assertSame('Senior DevOps Engineer', $job['title']);
        self::assertSame('Anywhere in the World', $job['location_detail']);
    }

    #[Test]
    public function handlesTitleWithNoTrailingLocation(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'title' => 'Akamai: Senior Lead Software Engineer II',
        ]));

        self::assertSame('Akamai', $job['company']);
        self::assertSame('Senior Lead Software Engineer II', $job['title']);
        self::assertNull($job['location_detail']);
    }

    #[Test]
    public function delegatesRoleClassificationToMapRoleTypeForADevOpsTitle(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'title' => 'Andela: Senior DevOps Engineer at Anywhere in the World',
        ]));

        self::assertSame('DevOps Engineer', $job['role_type']);
    }

    #[Test]
    public function delegatesRoleClassificationAndNeverPromotesANonTechTitleToDevOps(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'title' => 'Some Corp: Civil Engineer - Bridge Projects at Remote',
        ]));

        self::assertSame('Uncategorised', $job['role_type']);
    }

    #[Test]
    public function alwaysLeavesSalaryNullRegardlessOfDescriptionContent(): void
    {
        // WWR has no discrete salary field. Even a description that mentions
        // dollar figures must NOT be scanned for a salary — a number lifted
        // from free text and presented as a real salary is actively
        // misleading, worse than showing "not disclosed" honestly.
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'description' => '<p>Compensation ranges from $100,000 to $150,000 per year depending on experience.</p>',
        ]));

        self::assertNull($job['salary_min']);
        self::assertNull($job['salary_max']);
        self::assertNull($job['salary_period']);
    }

    #[Test]
    public function sanitizesTitleCompanyAndDescriptionContainingXssPayload(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'title' => '<script>alert(1)</script>Andela: Senior DevOps Engineer',
            'description' => '<p>Role</p><script>alert(2)</script>',
        ]));

        self::assertStringNotContainsString('<script>', $job['company']);
        self::assertStringNotContainsString('<script>', $job['description']);
    }

    #[Test]
    public function setsSourceAndDefaultLocationTypeAndAfricaFriendly(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem());

        self::assertSame('weworkremotely', $job['source']);
        self::assertSame('international_remote', $job['location_type']);
        self::assertSame(0, $job['africa_friendly']);
    }

    #[Test]
    public function normalizesPubDateToMysqlDatetimeFormat(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'pubDate' => 'Tue, 30 Jun 2026 20:33:15 +0000',
        ]));

        self::assertSame('2026-06-30 20:33:15', $job['posted_at']);
    }

    #[Test]
    public function normalizeAllDropsARecordWithNoColonSeparatorAndKeepsProcessingTheRest(): void
    {
        $result = $this->normalizer->normalizeAll([
            $this->rawItem(['guid' => 'guid-1']),
            $this->rawItem(['guid' => 'guid-2', 'title' => 'Malformed Title With No Separator']),
            $this->rawItem(['guid' => 'guid-3']),
        ]);

        self::assertCount(2, $result['normalized']);
        self::assertCount(1, $result['dropped']);
        self::assertStringContainsString('Company: Title', $result['dropped'][0]['reason']);
    }

    #[Test]
    public function extractsTechStackTagsFromTheTitle(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'title' => 'Andela: Senior Kubernetes & Terraform Engineer (AWS) at Anywhere in the World',
        ]));

        self::assertContains('kubernetes', $job['tags']);
        self::assertContains('terraform', $job['tags']);
        self::assertContains('aws', $job['tags']);
    }

    #[Test]
    public function dropsAJobRestrictedToAnExactNonAfricaCountry(): void
    {
        $result = $this->normalizer->normalizeAll([
            $this->rawItem(['guid' => 'guid-1', 'title' => 'Akamai: Senior Engineer at Germany']),
        ]);

        self::assertCount(0, $result['normalized']);
        self::assertCount(1, $result['dropped']);
        self::assertStringContainsString('excluded', $result['dropped'][0]['reason']);
    }

    #[Test]
    public function dropsAJobRestrictedByAnExplicitOnlyPhrase(): void
    {
        $result = $this->normalizer->normalizeAll([
            $this->rawItem(['guid' => 'guid-1', 'title' => 'Acme: Senior Engineer at USA Only']),
        ]);

        self::assertCount(0, $result['normalized']);
        self::assertCount(1, $result['dropped']);
    }

    #[Test]
    public function keepsAJobExplicitlyOpenWorldwide(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'title' => 'Andela: Senior DevOps Engineer at Anywhere in the World',
        ]));

        self::assertSame('Anywhere in the World', $job['location_detail']);
    }

    #[Test]
    public function keepsAJobWithNoLocationDetailAtAll(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'title' => 'Akamai: Senior Lead Software Engineer II',
        ]));

        self::assertNull($job['location_detail']);
    }

    #[Test]
    public function doesNotSetAfricaFriendlyBasedOnLocationText(): void
    {
        // This function answers "is this excluded", not "is this Africa-
        // friendly" — the latter must stay admin-only per the PRD, even for
        // a job whose location text mentions Kenya/Nigeria/etc.
        $job = $this->normalizer->normalizeOne($this->rawItem([
            'title' => 'Andela: Senior DevOps Engineer at Kenya',
        ]));

        self::assertSame(0, $job['africa_friendly']);
    }

    #[Test]
    public function normalizeOneThrowsOnMissingGuid(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $raw = $this->rawItem();
        unset($raw['guid']);

        $this->normalizer->normalizeOne($raw);
    }

    #[Test]
    public function normalizeOneThrowsOnInvalidLink(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->normalizer->normalizeOne($this->rawItem(['link' => 'not-a-valid-url']));
    }
}
