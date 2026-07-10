<?php

/**
 * Manual smoke test for WweRemoteFetcher — NOT a PHPUnit test.
 *
 * Purpose: PHPUnit's WweRemoteFetcherTest mocks HttpClientInterface entirely,
 * so it proves the fetcher's *logic* is correct but never proves We Work
 * Remotely's actual RSS feeds still match the shape the parser assumes
 * (guid/title/link/pubDate/description under channel->item). Run this by
 * hand — once, not on a schedule — whenever you touch WweRemoteFetcher or
 * suspect WWR changed their feed format.
 *
 * Usage (from backend/):
 *   php bin/smoke-test-wwr.php
 *
 * Does NOT hit the DB, does NOT write anything — read-only, safe to run
 * repeatedly, but don't loop it (respect WWR's servers).
 */

declare(strict_types=1);

require_once \dirname(__DIR__) . '/vendor/autoload.php';

use App\Fetcher\WweRemoteFetcher;
use App\Http\CurlHttpClient;

$fetcher = new WweRemoteFetcher(new CurlHttpClient());

echo "Fetching live We Work Remotely RSS feeds...\n\n";

try {
    $items = $fetcher->fetch();
} catch (\App\Exception\SourceUnavailableException $e) {
    fwrite(STDERR, "FAILED — all feeds unreachable: {$e->getMessage()}\n");
    exit(1);
}

if (empty($items)) {
    fwrite(STDERR, "WARNING — fetch() succeeded but returned zero items. Feeds may be empty, or the shape check is passing on something that no longer has real listings.\n");
    exit(1);
}

echo 'Total items fetched: ' . \count($items) . "\n\n";

$missingFields = [];
foreach (['guid', 'title', 'link', 'pubDate', 'description'] as $field) {
    $emptyCount = \count(array_filter($items, static fn (array $item): bool => trim((string) $item[$field]) === ''));
    if ($emptyCount > 0) {
        $missingFields[$field] = $emptyCount;
    }
}

if ($missingFields !== []) {
    echo "⚠ Some items have empty fields (expected occasionally, worth a glance if it's a lot):\n";
    foreach ($missingFields as $field => $count) {
        echo "  - {$field}: empty in {$count}/" . \count($items) . " items\n";
    }
    echo "\n";
}

echo "First 3 items, raw (this is what WweRemoteNormalizer will receive):\n";
echo str_repeat('-', 70) . "\n";
foreach (\array_slice($items, 0, 3) as $i => $item) {
    printf(
        "[%d] guid=%s\n    title=%s\n    link=%s\n    pubDate=%s\n\n",
        $i + 1,
        $item['guid'],
        $item['title'],
        $item['link'],
        $item['pubDate']
    );
}

echo "Sanity checks worth eyeballing manually:\n";
echo "  - Does 'title' still look like \"Company: Job Title at Location\"? (WweRemoteNormalizer will split on first ': ')\n";
echo "  - Are 'guid' values stable-looking (not random per-request)? That's the dedup key.\n";
echo "  - Does 'pubDate' parse as a real date? (RFC 2822 format expected, e.g. \"Mon, 16 Jun 2026 08:00:00 +0000\")\n";
