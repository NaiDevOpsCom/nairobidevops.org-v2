<?php

declare(strict_types=1);

namespace Tests\Normalizer;

use App\Normalizer\WweRemoteNormalizer;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../helpers.php';

final class WweRemoteNormalizerTest extends TestCase
{
    #[Test]
    public function normalizeMapsCompanyAndTitleCorrectly(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'title' => 'Qualifyze: Senior DevOps Engineer',
        ]));

        self::assertSame('Qualifyze', $result['company']);
        self::assertSame('Senior DevOps Engineer', $result['title']);
    }

    #[Test]
    public function normalizeSplitsOnlyOnFirstColon(): void
    {
        // A job title that itself contains a colon must not get
        // further split — only the company/title boundary should split.
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'title' => 'Acme Corp: Senior Engineer: Platform Team',
        ]));

        self::assertSame('Acme Corp', $result['company']);
        self::assertSame('Senior Engineer: Platform Team', $result['title']);
    }

    #[Test]
    public function normalizeLeavesLocationDetailNullWhenNoAtSuffixPresent(): void
    {
        // Matches real live feed data as of Jul 2026 — most titles have
        // no location suffix at all.
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'title' => 'IO Global: DevOps Engineer - Midnight Foundation',
        ]));

        self::assertSame('DevOps Engineer - Midnight Foundation', $result['title']);
        self::assertNull($result['location_detail']);
        self::assertSame('international_remote', $result['location_type']);
    }

    #[Test]
    public function normalizeExtractsLocationSuffixWhenPresent(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'title' => 'Acme Corp: Senior Backend Engineer at Remote (US)',
        ]));

        self::assertSame('Senior Backend Engineer', $result['title']);
        self::assertSame('Remote (US)', $result['location_detail']);
        // Extracting a location string never auto-promotes location_type —
        // that stays international_remote until an admin reviews it.
        self::assertSame('international_remote', $result['location_type']);
    }

    #[Test]
    public function normalizeAmbiguousAtInTitleDoesNotTreatNonSuffixAsLocation(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'title' => 'Acme Corp: Engineering Manager at Acme at Remote',
        ]));

        self::assertSame('Engineering Manager at Acme', $result['title']);
        self::assertSame('Remote', $result['location_detail']);
        self::assertSame('international_remote', $result['location_type']);
    }

    #[Test]
    public function normalizeDelegatesToMapRoleTypeRatherThanReimplementingClassification(): void
    {
        $normalizer = new WweRemoteNormalizer();

        // "Sales Engineer" is on isNonTechRole()'s block list in
        // helpers.php — this must never be reimplemented or bypassed here.
        $result = $normalizer->normalize($this->rawItem([
            'title' => 'Acme Corp: Senior Sales Engineer',
        ]));

        self::assertSame('Uncategorised', $result['role_type']);
    }

    #[Test]
    public function normalizeClassifiesGenuineDevOpsTitleCorrectly(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'title' => 'Acme Corp: Site Reliability Engineer',
        ]));

        self::assertSame('SRE', $result['role_type']);
    }

    #[Test]
    public function normalizeSanitizesXssPayloadInTitleAndDescription(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'title' => 'Acme Corp: <script>alert(1)</script>DevOps Engineer',
            'description' => '<p>Great role</p><script>alert(1)</script>',
        ]));

        self::assertStringNotContainsString('<script>', $result['title']);
        self::assertStringNotContainsString('<script>', $result['description']);
        self::assertStringContainsString('Great role', $result['description']);
    }

    #[Test]
    public function normalizeProducesSourceAndSourceIdFromGuid(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'guid' => 'https://weworkremotely.com/remote-jobs/acme-devops-engineer',
        ]));

        self::assertSame('weworkremotely', $result['source']);
        self::assertSame('https://weworkremotely.com/remote-jobs/acme-devops-engineer', $result['source_id']);
    }

    #[Test]
    public function normalizeParsesPostedAtFromRfc2822PubDate(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([
            'pubDate' => 'Tue, 30 Jun 2026 20:30:46 +0000',
        ]));

        self::assertSame('2026-06-30 20:30:46', $result['posted_at']);
    }

    #[Test]
    public function normalizeLeavesSalaryFieldsNullSinceWwrHasNoSalaryField(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([]));

        self::assertNull($result['salary_min']);
        self::assertNull($result['salary_max']);
        self::assertSame('USD', $result['salary_currency']);
        self::assertNull($result['salary_period']);
    }

    #[Test]
    public function normalizeDefaultsAfricaFriendlyToFalse(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $result = $normalizer->normalize($this->rawItem([]));

        self::assertSame(0, $result['africa_friendly']);
    }

    #[Test]
    public function normalizeThrowsWhenTitleHasNoColonSeparator(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/no .Company: Title. separator/');

        $normalizer->normalize($this->rawItem([
            'title' => 'DevOps Engineer With No Company Prefix',
        ]));
    }

    #[Test]
    public function normalizeThrowsWhenGuidIsMissing(): void
    {
        $normalizer = new WweRemoteNormalizer();
        $rawItem = $this->rawItem([]);
        unset($rawItem['guid']);

        $this->expectException(InvalidArgumentException::class);

        $normalizer->normalize($rawItem);
    }

    #[Test]
    public function normalizeAllDropsMalformedRecordsWithoutThrowing(): void
    {
        $normalizer = new WweRemoteNormalizer();

        $goodItem = $this->rawItem(['title' => 'Acme Corp: DevOps Engineer']);
        $missingSeparatorItem = $this->rawItem(['title' => 'No Separator Here']);
        $missingGuidItem = $this->rawItem([]);
        unset($missingGuidItem['guid']);

        $results = $normalizer->normalizeAll([$goodItem, $missingSeparatorItem, $missingGuidItem]);

        self::assertCount(1, $results);
        self::assertSame('DevOps Engineer', $results[0]['title']);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function rawItem(array $overrides): array
    {
        return array_merge([
            'guid' => 'https://weworkremotely.com/remote-jobs/example-job',
            'title' => 'Example Corp: Example DevOps Engineer',
            'link' => 'https://weworkremotely.com/remote-jobs/example-job',
            'pubDate' => 'Mon, 16 Jun 2026 08:00:00 +0000',
            'description' => '<p>An example job description.</p>',
        ], $overrides);
    }
}
