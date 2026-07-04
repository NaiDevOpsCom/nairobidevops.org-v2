<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * A fetcher's only responsibility: talk HTTP to one external job source and
 * return raw, unvalidated response data as an array of per-job records.
 *
 * No parsing into the internal schema here (that's JobNormalizerInterface's
 * job) and no DB access here (that's the repository/persistence layer's job). This
 * separation is what lets "Remotive is down" degrade independently of
 * "We Work Remotely succeeded" — each fetcher fails or succeeds on its own.
 */
interface JobFetcherInterface
{
    /**
     * @return array<int, array<string, mixed>> Raw per-job records, exactly
     *         as returned by the source (before any normalization/validation)
     *
     * @throws \App\Exception\SourceUnavailableException on network failure,
     *         timeout, rate-limit, or non-2xx response after retries are
     *         exhausted. Never returns a partial/corrupt result silently.
     */
    public function fetch(): array;

    /** Source slug matching the jobs.source ENUM value, e.g. 'remotive' */
    public function sourceName(): string;
}
