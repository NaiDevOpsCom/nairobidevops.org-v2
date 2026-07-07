<?php

declare(strict_types=1);

namespace App\Http;

use App\Exception\SourceUnavailableException;

/**
 * Production HttpClientInterface implementation using PHP's cURL extension.
 *
 * SSL certificate verification is environment-driven via forEnvironment()
 * rather than hardcoded:
 *   - 'local', 'development', 'test' → verification relaxed (Windows PHP
 *     builds commonly ship without a CA bundle).
 *   - anything else (production, staging, undefined APP_ENV, a typo'd
 *     value) → ALWAYS verify. This ensures a stray env var or config typo
 *     can never silently weaken verification against a real deployment target.
 *
 * Redirects are restricted to HTTPS only (CURLOPT_REDIR_PROTOCOLS) so a
 * malicious or misconfigured redirect can't silently downgrade a request
 * to plain HTTP mid-flight.
 */
final class CurlHttpClient implements HttpClientInterface
{
    private const DEV_ENVIRONMENTS = ['local', 'development', 'test'];

    public function __construct(private readonly bool $verifySsl = true)
    {
    }

    /**
     * @param string|null $appEnv The current APP_ENV constant's value, or
     *   null if it isn't defined at all (e.g. config.php hasn't loaded yet).
     */
    public static function forEnvironment(?string $appEnv): self
    {
        $normalizedEnv = $appEnv !== null ? strtolower(trim($appEnv)) : null;
        $isDevEnvironment = \in_array($normalizedEnv, self::DEV_ENVIRONMENTS, true);

        return new self(!$isDevEnvironment);
    }

    /**
     * Exposed so tests (and cron output, if you want a visible sanity check)
     * can confirm which mode an instance is running in without making a
     * real request.
     */
    public function verifiesSsl(): bool
    {
        return $this->verifySsl;
    }

    /**
     * @throws SourceUnavailableException if cURL itself fails to initialize
     *   or accept its options — an unrecoverable-per-call condition distinct
     *   from a normal transport failure (timeout, DNS, non-200), which is
     *   reported via the returned array's 'error' key instead. Callers that
     *   already catch SourceUnavailableException around this call (see
     *   RemotiveFetcher::fetchCategory()'s retry loop) handle both paths.
     */
    public function get(string $url, array $headers, int $timeoutSeconds): array
    {
        $headerLines = [];
        foreach ($headers as $name => $value) {
            $headerLines[] = "{$name}: {$value}";
        }

        $ch = curl_init($url);
        if ($ch === false) {
            throw new SourceUnavailableException("cURL failed to initialize for {$url}");
        }

        $ok = curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER  => true,
            CURLOPT_TIMEOUT         => $timeoutSeconds,
            CURLOPT_FOLLOWLOCATION  => true,
            CURLOPT_MAXREDIRS       => 3,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_HTTPHEADER      => $headerLines,
            CURLOPT_SSL_VERIFYPEER  => $this->verifySsl,
            CURLOPT_SSL_VERIFYHOST  => $this->verifySsl ? 2 : 0,
        ]);

        if ($ok === false) {
            throw new SourceUnavailableException("cURL failed to set options for {$url}");
        }

        $response = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);

        // No curl_close($ch) here deliberately — it's been a no-op since
        // PHP 8.0 (CurlHandle is a plain refcounted object, freed once it
        // goes out of scope) and PHP 8.5 now emits a deprecation notice for
        // calling it at all.
        return [
            'status' => (int) $status,
            'body'   => $response === false ? '' : (string) $response,
            'error'  => $error,
        ];
    }
}
