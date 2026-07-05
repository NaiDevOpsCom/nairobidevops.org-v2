<?php

declare(strict_types=1);

namespace App\Normalizer;

use InvalidArgumentException;

/**
 * Maps raw We Work Remotely RSS <item> dicts (as returned by
 * WweRemoteFetcher::fetch()) into the unified internal jobs schema.
 *
 * Field mapping, per the PRD:
 *   <guid>                        -> source_id (primary dedup anchor)
 *   <title>, split on first ': ' -> company, title
 *   <link>                        -> apply_url
 *   <pubDate>                     -> posted_at
 *   <description>                 -> description (HTML stripped)
 *   mapRoleType($title)           -> role_type
 *
 * Role classification is delegated entirely to mapRoleType()/isNonTechRole()
 * in helpers.php — this class never reimplements or overrides that logic,
 * even for WWR-specific title quirks. If a WWR title pattern gets
 * misclassified, the fix belongs in helpers.php's isNonTechRole() block
 * list, not here.
 *
 * WWR's RSS feed has no structured salary field (unlike Remotive), so
 * salary_min/max/period are left null rather than guessed at from
 * free-text description.
 *
 * Live feed data (checked manually against production WWR feeds, Jul
 * 2026) mostly does NOT include the " at Location" suffix the original
 * PRD spec assumed titles would have — most titles are plain
 * "Company: Job Title". extractLocationSuffix() only acts when that
 * pattern is actually present, and leaves location_detail null otherwise
 * rather than guessing.
 */
final class WweRemoteNormalizer
{
    private const SOURCE = 'weworkremotely';

    /**
     * @param array<int, array<string, mixed>> $rawItems
     * @return array<int, array<string, mixed>>
     */
    public function normalizeAll(array $rawItems): array
    {
        $normalized = [];

        foreach ($rawItems as $rawItem) {
            try {
                $normalized[] = $this->normalize($rawItem);
            } catch (InvalidArgumentException $e) {
                $this->logDropped($rawItem, $e->getMessage());
            }
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $rawItem
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException on a required field missing, or a
     *         title with no "Company: Title" separator — callers should
     *         catch this per-record (see normalizeAll()) rather than let
     *         one malformed item sink the whole sync run.
     */
    public function normalize(array $rawItem): array
    {
        $this->assertRequiredFields($rawItem);

        [$rawCompany, $rawTitle] = $this->splitCompanyAndTitle((string) $rawItem['title']);

        $company = sanitizeString($rawCompany);
        $title = sanitizeString($rawTitle);

        if ($company === '' || $title === '') {
            throw new InvalidArgumentException('weworkremotely: company or title empty after sanitization');
        }

        $applyUrl = $this->sanitizeUrl($rawItem['link']);
        if ($applyUrl === null) {
            throw new InvalidArgumentException('weworkremotely: invalid apply URL');
        }

        [$title, $locationDetail] = $this->extractLocationSuffix($title);

        return [
            'source' => self::SOURCE,
            'source_id' => (string) $rawItem['guid'],
            'title' => $title,
            'company' => $company,
            'company_logo_url' => null,
            'description' => cleanDescription((string) ($rawItem['description'] ?? '')),
            'apply_url' => $applyUrl,
            'affiliate_apply_url' => null,
            'role_type' => mapRoleType($title),
            'location_type' => 'international_remote',
            'location_detail' => $locationDetail,
            'africa_friendly' => 0,
            'salary_min' => null,
            'salary_max' => null,
            'salary_currency' => 'USD',
            'salary_period' => null,
            'experience_level' => null,
            'tags' => [],
            'posted_at' => isset($rawItem['pubDate']) && $rawItem['pubDate'] !== ''
                ? $this->toMysqlDatetime((string) $rawItem['pubDate'])
                : null,
        ];
    }

    /**
     * @param array<string, mixed> $rawItem
     */
    private function assertRequiredFields(array $rawItem): void
    {
        foreach (['guid', 'title', 'link'] as $field) {
            if (!isset($rawItem[$field]) || $rawItem[$field] === '') {
                throw new InvalidArgumentException("weworkremotely: missing required field '{$field}'");
            }
        }
    }

    /**
     * WWR titles arrive as "Company: Job Title". Split on the *first*
     * ': ' only — job titles themselves sometimes contain a colon (e.g.
     * "Acme: Senior Engineer: Platform Team"), and only the first one is
     * the actual company/title boundary.
     *
     * @return array{0: string, 1: string} [company, title]
     *
     * @throws InvalidArgumentException if no ': ' separator is found —
     *         without it there's no reliable way to recover the company
     *         name, so the record is dropped rather than stored with a
     *         guessed or empty company.
     */
    private function splitCompanyAndTitle(string $rawTitle): array
    {
        $parts = explode(': ', $rawTitle, 2);

        if (\count($parts) !== 2) {
            throw new InvalidArgumentException(
                "weworkremotely: title has no 'Company: Title' separator: '{$rawTitle}'"
            );
        }

        return [$parts[0], $parts[1]];
    }

    /**
     * Some WWR listings append " at <Location>" to the job title. This
     * only fires when that exact pattern is present in the (already
     * company-stripped) title — it does not force a location_detail
     * guess when the suffix is absent, which live data shows is now the
     * common case.
     *
     * @return array{0: string, 1: string|null} [title without suffix, location or null]
     */
    private function extractLocationSuffix(string $title): array
    {
        if (preg_match('/^(.+)\s+at\s+(.+)$/i', $title, $matches) === 1) {
            return [trim($matches[1]), sanitizeString($matches[2])];
        }

        return [$title, null];
    }

    private function toMysqlDatetime(string $raw): ?string
    {
        $timestamp = strtotime($raw);

        if ($timestamp === false) {
            return null;
        }

        return gmdate('Y-m-d H:i:s', $timestamp);
    }

    private function sanitizeUrl(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $result = null;
        $sanitized = sanitizeString((string) $value);
        if ($sanitized !== '') {
            $normalized = filter_var($sanitized, \FILTER_VALIDATE_URL);
            if ($normalized !== false) {
                $scheme = strtolower((string) parse_url($normalized, \PHP_URL_SCHEME));
                if (\in_array($scheme, ['http', 'https'], true)) {
                    $result = $normalized;
                }
            }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $rawItem
     */
    private function logDropped(array $rawItem, string $reason): void
    {
        $guid = $rawItem['guid'] ?? 'unknown';
        fwrite(STDERR, "[WweRemoteNormalizer] Dropped record (guid={$guid}): {$reason}\n");
    }
}
