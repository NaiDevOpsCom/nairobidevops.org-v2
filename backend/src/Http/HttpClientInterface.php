<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Minimal HTTP transport abstraction so fetchers are testable without
 * mocking global curl_*() functions or hitting the real network.
 */
interface HttpClientInterface
{
    /**
     * Implementations report ordinary transport failures (timeout, DNS,
     * non-200, empty body) via the returned array's 'error'/'status' keys —
     * callers should check those first. An implementation MAY additionally
     * throw a SourceUnavailableException for a rarer, unrecoverable-per-call
     * condition (e.g. the underlying HTTP client itself failed to initialize
     * or accept its own options) rather than encoding that into the array.
     * Callers using this interface (see RemotiveFetcher::fetchCategory())
     * already catch SourceUnavailableException around every call for this
     * reason, so either reporting style is handled correctly.
     *
     * @param array<string, string> $headers
     * @return array{status: int, body: string, error: string}
     */
    public function get(string $url, array $headers, int $timeoutSeconds): array;
}
