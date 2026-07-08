<?php

declare(strict_types=1);

namespace Tests\Normalizer;

use App\Normalizer\RemotiveNormalizer;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Runs against the project's real helpers.php (required internally by
 * RemotiveNormalizer) rather than a mock — the whole point of several of
 * these tests is proving the normalizer delegates to the real
 * mapRoleType()/sanitizeString()/parseSalary(), not a reimplementation.
 */
final class RemotiveNormalizerTest extends TestCase
{
    private RemotiveNormalizer $normalizer;

    protected function setUp(): void
    {
        $this->normalizer = new RemotiveNormalizer();
    }

    private function rawJob(array $overrides = []): array
    {
        return array_merge([
            'id' => 12345,
            'title' => 'Senior DevOps Engineer',
            'company_name' => 'Andela',
            'company_logo' => 'https://remotive.com/logos/andela.png',
            'url' => 'https://remotive.com/remote-jobs/devops/senior-devops-engineer-12345',
            'category' => 'devops-sysadmin',
            'tags' => ['kubernetes', 'terraform', 'gcp'],
            'publication_date' => '2026-06-10T08:00:00',
            'salary' => '$4,000 - $6,000',
            'description' => '<p>We are looking for a <strong>Senior DevOps Engineer</strong>.</p>',
        ], $overrides);
    }

    #[Test]
    public function mapsAllFieldsOnAHappyPathRecord(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawJob());

        self::assertSame('Senior DevOps Engineer', $job['title']);
        self::assertSame('Andela', $job['company']);
        self::assertSame('https://remotive.com/logos/andela.png', $job['company_logo_url']);
        self::assertSame('https://remotive.com/remote-jobs/devops/senior-devops-engineer-12345', $job['apply_url']);
        self::assertSame('remotive', $job['source']);
        self::assertSame('12345', $job['source_id']);
        self::assertSame(['kubernetes', 'terraform', 'gcp'], $job['tags']);
        self::assertSame('2026-06-10 08:00:00', $job['posted_at']);
        self::assertSame('international_remote', $job['location_type']);
        self::assertSame(0, $job['africa_friendly']);
        self::assertNull($job['closes_at']);
        self::assertNull($job['location_detail']);
    }

    #[Test]
    public function delegatesRoleClassificationToMapRoleTypeForADevOpsTitle(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawJob(['title' => 'Senior DevOps Engineer']));

        self::assertSame('DevOps Engineer', $job['role_type']);
    }

    #[Test]
    public function delegatesRoleClassificationAndNeverPromotesANonTechTitleToDevOps(): void
    {
        // This is the exact regression class the brief calls out by name:
        // a civil engineer title must never resolve to a DevOps-adjacent
        // role_type, even though "Engineer" appears in the title.
        $job = $this->normalizer->normalizeOne($this->rawJob(['title' => 'Civil Engineer - Bridge Projects']));

        self::assertSame('Uncategorised', $job['role_type']);
    }

    #[Test]
    public function delegatesSalaryParsingToParseSalary(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawJob(['salary' => '$4,000 - $6,000']));

        self::assertSame(4000, $job['salary_min']);
        self::assertSame(6000, $job['salary_max']);
        self::assertSame('USD', $job['salary_currency']);
        self::assertSame('monthly', $job['salary_period']);
    }

    #[Test]
    public function sanitizesATitleAndDescriptionContainingAnXssPayload(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawJob([
            'title' => '<script>alert("xss")</script>Senior DevOps Engineer',
            'description' => '<p>Great role</p><script>alert(1)</script>',
        ]));

        self::assertStringNotContainsString('<script>', $job['title']);
        self::assertStringNotContainsString('<script>', $job['description']);
        self::assertStringContainsString('Senior DevOps Engineer', $job['title']);
    }

    #[Test]
    public function sanitizesEachTag(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawJob([
            'tags' => ['<b>kubernetes</b>', 'terraform'],
        ]));

        self::assertSame(['kubernetes', 'terraform'], $job['tags']);
    }

    #[Test]
    public function dropsAnInvalidCompanyLogoUrlRatherThanStoringIt(): void
    {
        $job = $this->normalizer->normalizeOne($this->rawJob(['company_logo' => 'not-a-url']));

        self::assertNull($job['company_logo_url']);
    }

    #[Test]
    public function buildsAffiliateUrlViaHelperAndFallsBackToOriginalWhenNoAffiliateIdConfigured(): void
    {
        // REMOTIVE_AFFILIATE_ID is not defined in the test environment, so
        // buildAffiliateUrl() must return the URL unchanged rather than
        // appending an empty/malformed ?via= param.
        $job = $this->normalizer->normalizeOne($this->rawJob());

        self::assertSame($job['apply_url'], $job['affiliate_apply_url']);
    }

    #[Test]
    public function normalizeAllDropsAMalformedRecordAndKeepsProcessingTheRest(): void
    {
        $result = $this->normalizer->normalizeAll([
            $this->rawJob(['id' => 1, 'title' => 'DevOps Engineer']),
            $this->rawJob(['id' => 2, 'title' => '']), // malformed — empty title
            $this->rawJob(['id' => 3, 'title' => 'SRE']),
        ]);

        self::assertCount(2, $result['normalized']);
        self::assertCount(1, $result['dropped']);
        self::assertStringContainsString('title', $result['dropped'][0]['reason']);
    }

    #[Test]
    public function normalizeOneThrowsOnMissingId(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $raw = $this->rawJob();
        unset($raw['id']);

        $this->normalizer->normalizeOne($raw);
    }

    #[Test]
    public function normalizeOneThrowsOnMissingCompany(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->normalizer->normalizeOne($this->rawJob(['company_name' => '']));
    }

    #[Test]
    public function normalizeOneThrowsOnInvalidApplyUrl(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->normalizer->normalizeOne($this->rawJob(['url' => 'not-a-valid-url']));
    }
}
