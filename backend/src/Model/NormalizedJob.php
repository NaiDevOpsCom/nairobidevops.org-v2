<?php

declare(strict_types=1);

namespace App\Model;

use DateTimeImmutable;

/**
 * The single internal job shape every source's normalizer must produce.
 * A plain, immutable value object — no DB or HTTP concerns, no behavior
 * beyond holding validated, sanitized data.
 *
 * Field values here are always safe to store and safe to render — sanitization
 * happens in the normalizer before this object is constructed, not after.
 */
final class NormalizedJob
{
    /**
     * @param string[] $tags
     */
    public function __construct(
        public readonly string $title,
        public readonly string $company,
        public readonly ?string $companyLogoUrl,
        public readonly string $description,        // pre-sanitized plain text, no HTML
        public readonly string $applyUrl,
        public readonly string $source,               // matches jobs.source ENUM
        public readonly string $sourceId,              // dedup anchor within a source
        public readonly string $roleType,              // ALWAYS via mapRoleType() — see helpers.php
        public readonly string $locationType,          // default 'international_remote' unless source states otherwise
        public readonly ?string $locationDetail,
        public readonly bool $africaFriendly,           // ALWAYS false unless source explicitly confirms it
        public readonly ?int $salaryMin,
        public readonly ?int $salaryMax,
        public readonly string $salaryCurrency,
        public readonly ?string $salaryPeriod,
        public readonly ?DateTimeImmutable $postedAt,
        public readonly array $tags,
    ) {
    }
}
