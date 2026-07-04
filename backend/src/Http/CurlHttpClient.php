<?php

declare(strict_types=1);

namespace App\Http;

use App\Exception\SourceUnavailableException;

/**
 * Production HttpClientInterface implementation using PHP's cURL extension.
 */
final class CurlHttpClient implements HttpClientInterface
{
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
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeoutSeconds,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_HTTPHEADER     => $headerLines,
        ]);
        if ($ok === false) {
            throw new SourceUnavailableException("cURL failed to set options for {$url}");
        }

        $response = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        return [
            'status' => (int) $status,
            'body'   => $response === false ? '' : (string) $response,
            'error'  => $error,
        ];
    }
}
