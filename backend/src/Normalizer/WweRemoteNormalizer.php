<?php

declare(strict_types=1);

namespace App\Normalizer;

use InvalidArgumentException;

// helpers.php is global, non-namespaced, shared by every source's normalizer.
require_once \dirname(__DIR__, 2) . '/helpers.php';

/**
 * Maps raw We Work Remotely RSS items (from WweRemoteFetcher::fetch()) into
 * the unified internal `jobs` schema consumed by JobRepository::upsert().
 *
 * WWR title format is "Company: Job Title", optionally with a trailing
 * " at Location" (e.g. "Andela: Senior DevOps Engineer at Anywhere in the
 * World"). This normalizer splits on the first ": " to get company/title,
 * then strips a trailing " at <location>" if present.
 *
 * role_type is ALWAYS derived via mapRoleType($title) — never reimplemented
 * here, same non-negotiable rule as RemotiveNormalizer. location_type
 * defaults to 'international_remote' and africa_friendly always defaults to
 * 0, per PRD §6 — neither is ever inferred from source data.
 *
 * Salary is deliberately left null for every WWR job. WWR's RSS feed has no
 * discrete salary field (see PRD §7, Source 2 field mapping — salary isn't
 * listed), so there is nothing reliable to parse. Scanning the free-text
 * description for numbers that look like a salary is NOT done here: a
 * number pulled from arbitrary body text presented as a real salary is
 * actively misleading, worse than showing "Salary not disclosed" honestly.
 *
 * A malformed individual record (missing guid, unparseable "Company: Title"
 * format, or invalid apply URL) is dropped and reported via normalizeAll()'s
 * `dropped` list — it never throws, matching RemotiveNormalizer's contract.
 */
final class WweRemoteNormalizer
{
    private const SOURCE = 'weworkremotely';

    /**
     * @param array<int, array<string, mixed>> $rawItems Raw dicts from WweRemoteFetcher::fetch()
     * @return array{
     *     normalized: array<int, array<string, mixed>>,
     *     dropped: array<int, array{reason: string, raw: array<string, mixed>}>
     * }
     */
    public function normalizeAll(array $rawItems): array
    {
        $normalized = [];
        $dropped = [];

        foreach ($rawItems as $raw) {
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
        $guid = $raw['guid'] ?? null;
        $rawTitle = $raw['title'] ?? null;
        $applyUrl = $raw['link'] ?? null;

        if (!\is_string($guid) || trim($guid) === '') {
            throw new InvalidArgumentException('WWR item missing required field "guid"');
        }

        if (!\is_string($applyUrl) || filter_var($applyUrl, FILTER_VALIDATE_URL) === false) {
            throw new InvalidArgumentException("WWR item {$guid}: missing/invalid \"link\"");
        }

        if (!\is_string($rawTitle) || trim($rawTitle) === '') {
            throw new InvalidArgumentException("WWR item {$guid}: missing/empty \"title\"");
        }

        [$company, $title, $locationDetail] = $this->splitTitle($rawTitle);

        if ($company === null) {
            throw new InvalidArgumentException(
                "WWR item {$guid}: title \"{$rawTitle}\" doesn't match the expected \"Company: Title\" format"
            );
        }

        if (trim($company) === '') {
            throw new InvalidArgumentException(
                "WWR item {$guid}: title \"{$rawTitle}\" has an empty company segment"
            );
        }

        if (trim($title) === '') {
            throw new InvalidArgumentException(
                "WWR item {$guid}: title \"{$rawTitle}\" has an empty job title segment"
            );
        }

        // Not a malformed record — a valid job that's out of scope for this
        // board. Routed through the same dropped/logged path (never a
        // silent skip) so sync_wwremote.php's error log shows exactly how
        // many jobs were excluded and why, same as any other drop reason.
        if (isLocationExcludedForAfrica($locationDetail)) {
            throw new InvalidArgumentException(
                "WWR item {$guid}: excluded — location \"{$locationDetail}\" restricts this role to a specific non-Africa location"
            );
        }

        $cleanTitle = sanitizeString($title);
        $cleanCompany = sanitizeString($company);
        $cleanDescription = cleanDescription((string) ($raw['description'] ?? ''));

        $postedAt = null;
        if (!empty($raw['pubDate'])) {
            $timestamp = strtotime((string) $raw['pubDate']);
            if ($timestamp !== false) {
                $postedAt = date('Y-m-d H:i:s', $timestamp);
            }
        }

        return [
            'title' => $cleanTitle,
            'company' => $cleanCompany,
            'company_logo_url' => null,
            'description' => $cleanDescription,
            'apply_url' => $applyUrl,
            'affiliate_apply_url' => buildAffiliateUrl($applyUrl, self::SOURCE),
            'source' => self::SOURCE,
            'source_id' => $guid,
            // Non-negotiable: classification always goes through the shared
            // helpers.php function, never reimplemented per source.
            'role_type' => mapRoleType($cleanTitle),
            'location_type' => 'international_remote',
            'location_detail' => $locationDetail !== null ? sanitizeString($locationDetail) : null,
            'africa_friendly' => 0,
            // Deliberately null — see class docblock. WWR's RSS has no
            // discrete salary field; scanning free text is not done here.
            'salary_min' => null,
            'salary_max' => null,
            'salary_currency' => 'USD',
            'salary_period' => null,
            'experience_level' => null,
            'posted_at' => $postedAt,
            'closes_at' => null,
            'tags' => $this->extractTags($cleanTitle),
        ];
    }

    /**
     * Recognized tech-stack keywords extracted from a job title for display
     * as tag pills on the frontend. Purely cosmetic/informational — this
     * list has no bearing on role_type classification (mapRoleType() alone
     * decides that) or on whether a job is stored at all. Ordered roughly
     * specific-to-generic so a longer, more specific match isn't shadowed
     * by checking a shorter generic one first (not that order matters here
     * since every match is kept, but it reads more sensibly this way).
     *
     * @var string[]
     */
    private const TAG_KEYWORDS = [
        'kubernetes', 'k8s', 'terraform', 'ansible', 'helm', 'docker',
        'jenkins', 'gitlab', 'github actions', 'ci/cd', 'cicd', 'argocd',
        'prometheus', 'grafana', 'datadog', 'elasticsearch',
        'aws', 'gcp', 'azure', 'cloudflare',
        'linux', 'nginx', 'kafka', 'postgres', 'postgresql', 'mysql',
        'mongodb', 'redis',
        'python', 'golang', 'rust', 'java', 'kotlin', 'scala',
        'ruby', 'rails', 'php', 'laravel', 'node.js', 'nodejs',
        'typescript', 'javascript', 'react', 'vue', 'angular',
        'graphql', 'grpc', 'microservices', 'serverless',
        'devsecops', 'appsec',
    ];

    /**
     * @return string[] Deduplicated, in first-seen order
     */
    private function extractTags(string $title): array
    {
        $lower = strtolower($title);
        $found = [];

        foreach (self::TAG_KEYWORDS as $keyword) {
            if (str_contains($lower, $keyword)) {
                $found[] = $keyword;
            }
        }

        return array_values(array_unique($found));
    }

    /**
     * Splits WWR's "Company: Job Title" (optionally "... at Location") format.
     *
     * @return array{0: string|null, 1: string, 2: string|null} [company, title, locationDetail]
     *   company is null if the raw title doesn't contain the expected ": " separator.
     */
    private function splitTitle(string $rawTitle): array
    {
        $separatorPos = strpos($rawTitle, ': ');

        if ($separatorPos === false) {
            return [null, $rawTitle, null];
        }

        $company = substr($rawTitle, 0, $separatorPos);
        $rest = substr($rawTitle, $separatorPos + 2);

        $locationDetail = null;

        if (preg_match('/^(.*)\s+at\s+([^:]+)$/i', $rest, $matches) === 1) {
            $rest = trim($matches[1]);
            $locationDetail = trim($matches[2]);
        }

        return [$company, $rest, $locationDetail];
    }
}
