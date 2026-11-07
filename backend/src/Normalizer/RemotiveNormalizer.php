<?php

declare(strict_types=1);

namespace App\Normalizer;

use InvalidArgumentException;

// helpers.php is global, non-namespaced, and shared by every source's
// normalizer — see PRD §8. It is not part of the App\ PSR-4 tree, so it's
// require_once'd here rather than autoloaded, matching the contract every
// Fetcher/Normalizer pair follows.
require_once \dirname(__DIR__, 2) . '/helpers.php';

/**
 * Maps raw Remotive job dicts (as returned by RemotiveFetcher::fetch()) into
 * the unified internal `jobs` schema consumed by JobRepository::upsert().
 *
 * Field mapping (see PRD §7, Source 1: Remotive):
 *   id               -> source_id
 *   title            -> title            (via sanitizeString())
 *   company_name     -> company          (via sanitizeString())
 *   company_logo     -> company_logo_url (validated as a URL, dropped if not)
 *   url              -> apply_url + affiliate_apply_url (via buildAffiliateUrl())
 *   tags             -> tags             (each tag sanitized)
 *   publication_date -> posted_at        (normalized to 'Y-m-d H:i:s')
 *   salary           -> salary_min/max/currency/period (via parseSalary())
 *   description      -> description      (via cleanDescription() — XSS defense)
 *
 * role_type is ALWAYS derived via mapRoleType($title) — never reimplemented
 * here, per the non-negotiable rule in the PRD and task plan. location_type
 * defaults to 'international_remote' and africa_friendly always defaults to
 * 0, per PRD §6 — neither is ever inferred from source data.
 *
 * A malformed individual record (missing/invalid title, company, url, or id)
 * is dropped and reported back via normalizeAll()'s `dropped` list — it never
 * throws, so one bad record can't sink an otherwise-good batch. This mirrors
 * RemotiveFetcher's own contract: shape validation stops the batch, per-record
 * validation just logs and continues.
 */
final class RemotiveNormalizer
{
    private const SOURCE = 'remotive';

    /**
     * @param array<int, array<string, mixed>> $rawJobs Raw dicts from RemotiveFetcher::fetch()
     * @return array{
     *     normalized: array<int, array<string, mixed>>,
     *     dropped: array<int, array{reason: string, raw: array<string, mixed>}>
     * }
     */
    public function normalizeAll(array $rawJobs): array
    {
        $normalized = [];
        $dropped = [];

        foreach ($rawJobs as $raw) {
            if (!\is_array($raw)) {
                $dropped[] = ['reason' => 'Record is not an array', 'raw' => $raw];
                continue;
            }

            try {
                $normalized[] = $this->normalizeOne($raw);
            } catch (InvalidArgumentException $e) {
                $dropped[] = ['reason' => $e->getMessage(), 'raw' => $raw];
            }
        }

        return ['normalized' => $normalized, 'dropped' => $dropped];
    }

    /**
     * @param array<string, mixed> $raw
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException if a required field is missing or invalid.
     *   Caught by normalizeAll() — never let this escape a batch run.
     */
    public function normalizeOne(array $raw): array
    {
        [
            'sourceId' => $sourceId,
            'title' => $title,
            'company' => $company,
            'applyUrl' => $applyUrl,
        ] = $this->validateRequiredFields($raw);

        [
            'cleanTitle' => $cleanTitle,
            'cleanCompany' => $cleanCompany,
        ] = $this->validateAndSanitizeStrings($sourceId, $title, $company);

        $cleanDescription = cleanDescription((string) ($raw['description'] ?? ''));
        $salary = parseSalary((string) ($raw['salary'] ?? ''));
        $tags = $this->normalizeTags($raw['tags'] ?? null);
        $companyLogoUrl = $this->normalizeCompanyLogoUrl($raw['company_logo'] ?? null);
        $postedAt = $this->normalizePostedAt($raw['publication_date'] ?? null);

        return [
            'title' => $cleanTitle,
            'company' => $cleanCompany,
            'company_logo_url' => $companyLogoUrl,
            'description' => $cleanDescription,
            'apply_url' => $applyUrl,
            'affiliate_apply_url' => buildAffiliateUrl($applyUrl, self::SOURCE),
            'source' => self::SOURCE,
            'source_id' => (string) $sourceId,
            // Non-negotiable: classification always goes through the shared
            // helpers.php function, never reimplemented per source.
            'role_type' => mapRoleType($cleanTitle),
            'location_type' => 'international_remote',
            'location_detail' => null,
            'africa_friendly' => 0,
            'salary_min' => $salary['salary_min'],
            'salary_max' => $salary['salary_max'],
            'salary_currency' => $salary['salary_currency'],
            'salary_period' => $salary['salary_period'],
            'experience_level' => null,
            'posted_at' => $postedAt,
            'closes_at' => null,
            'tags' => $tags,
        ];
    }

    /**
     * Validates and extracts required fields from a raw Remotive record.
     *
     * @param array<string, mixed> $raw
     * @return array{sourceId: int|string, title: string, company: string, applyUrl: string}
     * @throws InvalidArgumentException if any required field is missing or invalid
     */
    private function validateRequiredFields(array $raw): array
    {
        $sourceId = $raw['id'] ?? null;
        $title = $raw['title'] ?? null;
        $company = $raw['company_name'] ?? null;
        $applyUrl = $raw['url'] ?? null;

        if ($sourceId === null || $sourceId === '') {
            throw new InvalidArgumentException('Remotive record missing required field "id"');
        }

        if (!\is_string($title) || trim($title) === '') {
            throw new InvalidArgumentException("Remotive record {$sourceId}: missing/empty \"title\"");
        }

        if (!\is_string($company) || trim($company) === '') {
            throw new InvalidArgumentException("Remotive record {$sourceId}: missing/empty \"company_name\"");
        }

        if (!\is_string($applyUrl) || filter_var($applyUrl, FILTER_VALIDATE_URL) === false
            || (!str_starts_with($applyUrl, 'http://') && !str_starts_with($applyUrl, 'https://'))
        ) {
            throw new InvalidArgumentException("Remotive record {$sourceId}: missing/invalid \"url\"");
        }

        return ['sourceId' => $sourceId, 'title' => $title, 'company' => $company, 'applyUrl' => $applyUrl];
    }

    /**
     * Sanitizes title and company strings, then validates they are non-empty
     * after sanitization.
     *
     * @param int|string $sourceId Used in error messages only
     * @param string $title Raw title from source
     * @param string $company Raw company name from source
     * @return array{cleanTitle: string, cleanCompany: string}
     * @throws InvalidArgumentException if either string is empty after sanitization
     */
    private function validateAndSanitizeStrings(int|string $sourceId, string $title, string $company): array
    {
        $cleanTitle = sanitizeString($title);
        $cleanCompany = sanitizeString($company);

        if (trim($cleanTitle) === '') {
            throw new InvalidArgumentException("Remotive record {$sourceId}: title is empty after sanitization");
        }

        if (trim($cleanCompany) === '') {
            throw new InvalidArgumentException("Remotive record {$sourceId}: company is empty after sanitization");
        }

        return ['cleanTitle' => $cleanTitle, 'cleanCompany' => $cleanCompany];
    }

    /**
     * Validates a company logo URL string. Returns null if the value is not a
     * well-formed http/https URL.
     */
    private function normalizeCompanyLogoUrl(mixed $companyLogoUrl): ?string
    {
        if (!\is_string($companyLogoUrl) || filter_var($companyLogoUrl, FILTER_VALIDATE_URL) === false
            || (!str_starts_with($companyLogoUrl, 'http://') && !str_starts_with($companyLogoUrl, 'https://'))
        ) {
            return null;
        }

        return $companyLogoUrl;
    }

    /**
     * Parses a publication date string into 'Y-m-d H:i:s' format.
     * Returns null when the value is empty or unparseable.
     */
    private function normalizePostedAt(mixed $publicationDate): ?string
    {
        if (empty($publicationDate)) {
            return null;
        }

        $timestamp = strtotime((string) $publicationDate);
        if ($timestamp === false) {
            return null;
        }

        return date('Y-m-d H:i:s', $timestamp);
    }

    /**
     * Sanitizes a list of tags. Non-arrays are silently treated as empty.
     *
     * @return string[]
     */
    private function normalizeTags(mixed $tags): array
    {
        if (!\is_array($tags)) {
            return [];
        }

        return array_values(array_map(
            static fn (mixed $tag): string => sanitizeString((string) $tag),
            $tags,
        ));
    }
}
