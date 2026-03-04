<?php
/**
 * Security Utilities for API Proxies
 */

class SecurityUtils {
    /**
     * Get real IP, resistant to spoofing if we know we are behind a trusted proxy.
     * In a standard cPanel environment, REMOTE_ADDR is usually the most reliable
     * unless a specific proxy (like Cloudflare) is used and configured.
     */
    public static function getRealIp() {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Validate Origin and Referer against a whitelist.
     */
    public static function validateOrigin($allowedOrigins) {
        $headers = function_exists('getallheaders') ? getallheaders() : (function_exists('apache_request_headers') ? apache_request_headers() : []);
        $headersLower = array_change_key_case($headers, CASE_LOWER);
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? ($headersLower['origin'] ?? '');
        $referer = $_SERVER['HTTP_REFERER'] ?? ($headersLower['referer'] ?? '');

        // 1. Precise Origin check
        if (!empty($origin)) {
            $originTrimmed = rtrim($origin, '/');
            foreach ($allowedOrigins as $allowed) {
                if ($originTrimmed === rtrim($allowed, '/')) {
                    return $allowed;
                }
            }
        }
        
        // 2. Fallback to Referer check
        if (!empty($referer)) {
            $refererParts = parse_url($referer);
            if ($refererParts && isset($refererParts['scheme'], $refererParts['host'])) {
                $refererOrigin = $refererParts['scheme'] . '://' . $refererParts['host'];
                if (isset($refererParts['port'])) {
                    $refererOrigin .= ':' . $refererParts['port'];
                }

                foreach ($allowedOrigins as $allowed) {
                    if (rtrim($refererOrigin, '/') === rtrim($allowed, '/')) {
                        return $allowed;
                    }
                }
            }
        }

        return null;
    }

    /**
     * File-based rate limiting using flock for concurrency safety.
     */
    public static function checkRateLimit($cacheDir, $limit = 60, $period = 60) {
        $ip = self::getRealIp();
        $hash = md5($ip);
        $file = $cacheDir . '/rate_limit_' . $hash . '.json';

        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0700, true);
        }

        $fp = fopen($file, 'c+');
        if (!$fp) {
            error_log("Rate limiter: Failed to open $file for writing. Failing closed.");
            return false;
        }

        flock($fp, LOCK_EX);
        
        $data = json_decode(stream_get_contents($fp), true);
        $now = time();

        if (!$data || ($now - $data['start']) > $period) {
            $data = ['start' => $now, 'count' => 1];
        } else {
            $data['count']++;
        }

        $isLimited = $data['count'] > $limit;

        if (!$isLimited) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($data));
        }

        flock($fp, LOCK_UN);
        fclose($fp);

        return !$isLimited;
    }

    /**
     * Check if a token is valid, supporting single string or JSON array (for rotation).
     */
    public static function validateToken($inputToken, $expectedToken) {
        if (empty($inputToken) || empty($expectedToken)) return false;

        // Try decoding as JSON array
        $decoded = json_decode($expectedToken, true);
        if (is_array($decoded)) {
            foreach ($decoded as $t) {
                if (hash_equals($t, $inputToken)) return true;
            }
            return false;
        }

        // Fallback to single string
        return hash_equals($expectedToken, $inputToken);
    }
}
