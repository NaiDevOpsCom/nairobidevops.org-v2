<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Model\NormalizedJob;

/**
 * Maps one source's raw record shape into the internal NormalizedJob model.
 *
 * Implementations MUST validate that required fields are present and of the
 * expected type before trusting them — never assume an external API's shape
 * is stable. Implementations MUST call mapRoleType() from helpers.php for
 * role classification — never reimplement keyword matching here or in any
 * sync file. All string output must be sanitized (see sanitizeString() /
 * cleanDescription() in helpers.php) since external API data is untrusted
 * input that will later be rendered to end users.
 */
interface JobNormalizerInterface
{
    /**
     * @param array<string, mixed> $raw One raw record from the fetcher
     *
     * @throws \App\Exception\InvalidJobRecordException if required fields
     *         are missing or malformed. The sync runner catches this per
     *         record so one bad listing never aborts the whole batch.
     */
    public function normalize(array $raw): NormalizedJob;
}
