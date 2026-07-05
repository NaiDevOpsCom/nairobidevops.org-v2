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
     * @param array<string, string> $headers
     * @return array{status: int, body: string, error: string, headers: array<string, string>}
     */
    public function get(string $url, array $headers, int $timeoutSeconds): array;
}
