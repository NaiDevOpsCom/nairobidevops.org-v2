<?php

declare(strict_types=1);

namespace App\Normalizer;

use DateTimeImmutable;
use DateTimeZone;
use Exception;
use InvalidArgumentException;

/**
 * Maps raw Remotive job dicts (as returned by RemotiveFetcher::fetch()) into
 * the unified internal jobs schema.
 *
 * Field mapping, per the PRD:
 *   id                  -> source_id (primary dedup anchor)
 *   title               -> title
 *   company_name        -> company
 *   company_logo        -> company_logo_url
 *   url                 -> apply_url, and the input to buildAffiliateUrl()
 *   tags                -> tags (JSON array)
 *   publication_date    -> posted_at
 *   salary              -> parsed via parseSalary() into salary_min/max/currency/period
 *   description         -> description (HTML stripped via cleanDescription())
 *
 * Role classification calls mapRoleType($title) — the job title, not
 * Remotive's own `category` field. Remotive's category taxonomy isn't the
 * same taxonomy isNonTechRole()/mapRoleType() encode, so using it directly
 * would be its own form of reimplementing classification per-source. This
 * class never reimplements or overrides that logic itself, even for
 * Remotive-specific title quirks. If a Remotive title pattern gets
 * misclassified, the fix belongs in helpers.php's isNonTechRole() block
 * list, not here.
 */
final class RemotiveNormalizer
{
    private const SOURCE = 'remotive';

    /**
     * @param array<int, array<string, mixed>> $rawJobs
     * @return array<int, array<string, mixed>>
     */
    public function normalizeAll(array $rawJobs): array
    {
        $normalized = [];

        foreach ($rawJobs as $rawJob) {
            try {
                $normalized[] = $this->normalize($rawJob);
            } catch (InvalidArgumentException $e) {
                $this->logDropped($rawJob, $e->getMessage());
            }
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $rawJob
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException on a required field missing, or
     *         title/company empty after sanitization — callers should
     *         catch this per-record (see normalizeAll()) rather than let
     *         one malformed job sink the whole sync run.
     */
    public function normalize(array $rawJob): array
    {
        $this->assertRequiredFields($rawJob);

        $title = sanitizeString((string) $rawJob['title']);
        $company = sanitizeString((string) $rawJob['company_name']);

        if ($title === '' || $company === '') {
            throw new InvalidArgumentException('remotive: title or company empty after sanitization');
        }

        $salary = parseSalary((string) ($rawJob['salary'] ?? ''));
        $applyUrl = sanitizeUrl($rawJob['url']);

        if ($applyUrl === null) {
            throw new InvalidArgumentException('remotive: invalid apply URL');
        }

        return [
            'source' => self::SOURCE,
            'source_id' => (string) $rawJob['id'],
            'title' => $title,
            'company' => $company,
            'company_logo_url' => $this->nullableSanitized($rawJob['company_logo'] ?? null),
            'description' => cleanDescription((string) ($rawJob['description'] ?? '')),
            'apply_url' => $applyUrl,
            'affiliate_apply_url' => buildAffiliateUrl($applyUrl, self::SOURCE),
            'role_type' => mapRoleType($title),
            'location_type' => 'international_remote',
            'location_detail' => $this->nullableSanitized($rawJob['candidate_required_location'] ?? null),
            'africa_friendly' => 0,
            'salary_min' => $salary['salary_min'],
            'salary_max' => $salary['salary_max'],
            'salary_currency' => $salary['salary_currency'],
            'salary_period' => $salary['salary_period'],
            'experience_level' => null,
            'tags' => $this->normalizeTags($rawJob['tags'] ?? []),
            'posted_at' => isset($rawJob['publication_date']) && $rawJob['publication_date'] !== ''
                ? $this->toMysqlDatetime((string) $rawJob['publication_date'])
                : null,
        ];
    }

    /**
     * @param array<string, mixed> $rawJob
     */
    private function assertRequiredFields(array $rawJob): void
    {
        foreach (['id', 'title', 'company_name', 'url'] as $field) {
            if (!isset($rawJob[$field]) || $rawJob[$field] === '') {
                throw new InvalidArgumentException("remotive: missing required field '{$field}'");
            }
            if ($field === 'id') {
                if (!\is_string($rawJob[$field]) && !\is_int($rawJob[$field])) {
                    throw new InvalidArgumentException("remotive: required field '{$field}' must be a string or integer");
                }
            } else {
                if (!\is_string($rawJob[$field])) {
                    throw new InvalidArgumentException("remotive: required field '{$field}' must be a string");
                }
            }
        }
    }

    /**
     * Sanitizes an optional string field, returning null for anything
     * absent/empty rather than an empty string — keeps optional DB columns
     * (company_logo_url, location_detail) genuinely NULL instead of ''.
     */
    private function nullableSanitized(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $sanitized = sanitizeString((string) $value);

        return $sanitized ?: null;
    }

    /**
     * @param mixed $tags
     * @return string[]
     */
    private function normalizeTags(mixed $tags): array
    {
        if (!\is_array($tags)) {
            return [];
        }

        $scalarTags = array_filter($tags, static fn (mixed $tag): bool => \is_scalar($tag));
        $sanitizedTags = array_map(
            static fn (mixed $tag): string => sanitizeString((string) $tag),
            $scalarTags
        );

        return array_values(array_filter(
            $sanitizedTags,
            static fn (string $tag): bool => $tag !== ''
        ));
    }

    private function toMysqlDatetime(string $raw): ?string
    {
        try {
            $date = new DateTimeImmutable($raw, new DateTimeZone('UTC'));
            $date = $date->setTimezone(new DateTimeZone('UTC'));
        } catch (Exception) {
            return null;
        }

        return $date->format('Y-m-d H:i:s');
    }


    /**
     * @param array<string, mixed> $rawJob
     */
    private function logDropped(array $rawJob, string $reason): void
    {
        $id = $rawJob['id'] ?? 'unknown';
        fwrite(STDERR, "[RemotiveNormalizer] Dropped record (id={$id}): {$reason}\n");
    }
}
