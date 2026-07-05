<?php

declare(strict_types=1);

namespace Tests\Normalizer;

use App\Normalizer\RemotiveNormalizer;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../helpers.php';

final class RemotiveNormalizerTest extends TestCase
{
    #[Test]
    public function normalizeMapsCoreFieldsCorrectly(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob([
            'title' => 'Senior DevOps Engineer',
            'company_name' => 'Acme Corp',
            'url' => 'https://remotive.com/remote-jobs/devops/senior-devops-engineer-123',
        ]));

        self::assertSame('Senior DevOps Engineer', $result['title']);
        self::assertSame('Acme Corp', $result['company']);
        self::assertSame(
            'https://remotive.com/remote-jobs/devops/senior-devops-engineer-123',
            $result['apply_url']
        );
        self::assertSame('remotive', $result['source']);
    }

    #[Test]
    public function normalizeProducesSourceIdFromId(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob(['id' => 987654]));

        self::assertSame('987654', $result['source_id']);
    }

    #[Test]
    public function normalizeSanitizesXssPayloadInTitleCompanyAndDescription(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob([
            'title' => '<script>alert(1)</script>DevOps Engineer',
            'company_name' => 'Acme<script>alert(2)</script>Corp',
            'description' => '<p>Great role</p><script>alert(3)</script>',
        ]));

        self::assertStringNotContainsString('<script>', $result['title']);
        self::assertStringNotContainsString('<script>', $result['company']);
        self::assertStringNotContainsString('<script>', $result['description']);
        self::assertStringContainsString('Great role', $result['description']);
    }

    #[Test]
    public function normalizeDelegatesToMapRoleTypeUsingTitleNotCategory(): void
    {
        $normalizer = new RemotiveNormalizer();

        // Remotive's own `category` field is deliberately ignored here —
        // classification must come from mapRoleType($title), never from
        // the source's own taxonomy. A "software-dev" category job with a
        // non-tech title must still land as Uncategorised.
        $result = $normalizer->normalize($this->rawJob([
            'title' => 'Senior Sales Engineer',
            'category' => 'software-dev',
        ]));

        self::assertSame('Uncategorised', $result['role_type']);
    }

    #[Test]
    public function normalizeClassifiesGenuineDevOpsTitleCorrectly(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob(['title' => 'Site Reliability Engineer']));

        self::assertSame('SRE', $result['role_type']);
    }

    #[Test]
    public function normalizeParsesDollarRangeSalaryAndNormalizesAnnualToMonthly(): void
    {
        $normalizer = new RemotiveNormalizer();

        // $120k-$150k has no explicit period keyword — detectPeriod()'s
        // magnitude heuristic (>= 20,000 => annual) applies, then
        // parseSalary() normalizes annual -> monthly before returning.
        $result = $normalizer->normalize($this->rawJob(['salary' => '$120,000 - $150,000']));

        self::assertSame(10000, $result['salary_min']);
        self::assertSame(12500, $result['salary_max']);
        self::assertSame('USD', $result['salary_currency']);
        self::assertSame('monthly', $result['salary_period']);
    }

    #[Test]
    public function normalizeLeavesSalaryNullWhenFieldAbsentOrUnparseable(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob(['salary' => 'Competitive']));

        self::assertNull($result['salary_min']);
        self::assertNull($result['salary_max']);
    }

    #[Test]
    public function normalizeDelegatesAffiliateUrlConstructionRatherThanBuildingItInline(): void
    {
        $normalizer = new RemotiveNormalizer();
        $applyUrl = 'https://remotive.com/remote-jobs/devops/example-456';

        $result = $normalizer->normalize($this->rawJob(['url' => $applyUrl]));

        // Assert delegation, not a specific string — whether
        // REMOTIVE_AFFILIATE_ID happens to be defined in this process is
        // buildAffiliateUrl()'s concern, not this normalizer's. Hardcoding
        // an assumed "unaffiliated" output here would make this test
        // fragile against that global constant's state.
        self::assertSame(buildAffiliateUrl($applyUrl, 'remotive'), $result['affiliate_apply_url']);
    }

    #[Test]
    public function normalizeDefaultsLocationTypeToInternationalRemoteAndAfricaFriendlyToFalse(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob([]));

        self::assertSame('international_remote', $result['location_type']);
        self::assertSame(0, $result['africa_friendly']);
    }

    #[Test]
    public function normalizeExtractsLocationDetailWhenCandidateRequiredLocationPresent(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob([
            'candidate_required_location' => 'USA, Canada',
        ]));

        self::assertSame('USA, Canada', $result['location_detail']);
    }

    #[Test]
    public function normalizeLeavesLocationDetailNullWhenAbsent(): void
    {
        $normalizer = new RemotiveNormalizer();
        $rawJob = $this->rawJob([]);
        unset($rawJob['candidate_required_location']);

        $result = $normalizer->normalize($rawJob);

        self::assertNull($result['location_detail']);
    }

    #[Test]
    public function normalizeFiltersNonScalarTagsAndSanitizesRemaining(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob([
            'tags' => ['kubernetes', 'terraform', ['nested' => 'array'], null, ''],
        ]));

        self::assertSame(['kubernetes', 'terraform'], $result['tags']);
    }

    #[Test]
    public function normalizeReturnsEmptyTagsArrayWhenTagsFieldIsNotAnArray(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob(['tags' => 'not-an-array']));

        self::assertSame([], $result['tags']);
    }

    #[Test]
    public function normalizeParsesPostedAtFromPublicationDate(): void
    {
        $normalizer = new RemotiveNormalizer();

        $result = $normalizer->normalize($this->rawJob([
            'publication_date' => '2026-06-16 08:00:00',
        ]));

        self::assertSame('2026-06-16 08:00:00', $result['posted_at']);
    }

    #[Test]
    public function normalizeThrowsWhenRequiredFieldMissing(): void
    {
        $normalizer = new RemotiveNormalizer();
        $rawJob = $this->rawJob([]);
        unset($rawJob['company_name']);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessageMatches("/missing required field 'company_name'/");

        $normalizer->normalize($rawJob);
    }

    #[Test]
    public function normalizeAllDropsMalformedRecordsWithoutThrowing(): void
    {
        $normalizer = new RemotiveNormalizer();

        $goodJob = $this->rawJob(['id' => 1, 'title' => 'DevOps Engineer']);
        $missingUrlJob = $this->rawJob(['id' => 2]);
        unset($missingUrlJob['url']);

        $results = $normalizer->normalizeAll([$goodJob, $missingUrlJob]);

        self::assertCount(1, $results);
        self::assertSame('DevOps Engineer', $results[0]['title']);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function rawJob(array $overrides): array
    {
        return array_merge([
            'id' => 123,
            'title' => 'Example DevOps Engineer',
            'company_name' => 'Example Corp',
            'company_logo' => 'https://remotive.com/logos/example.png',
            'url' => 'https://remotive.com/remote-jobs/devops/example-123',
            'category' => 'devops-sysadmin',
            'tags' => ['docker', 'aws'],
            'candidate_required_location' => 'Worldwide',
            'salary' => '',
            'description' => '<p>An example job description.</p>',
            'publication_date' => '2026-06-01 00:00:00',
        ], $overrides);
    }
}
