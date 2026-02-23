/**
 * validate-sitemap.ts — Post-build sitemap & robots.txt validation
 *
 * Checks:
 *  1. dist/sitemap.xml exists and is non-empty
 *  2. XML is well-formed with correct namespace
 *  3. All <loc> URLs are HTTPS and well-formed
 *  4. <lastmod> dates are valid ISO 8601
 *  5. dist/robots.txt contains a Sitemap: directive
 *
 * Exit code 0 = pass, 1 = fail. Suitable for CI gating.
 *
 * Usage: npx tsx scripts/validate-sitemap.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

let errors = 0;

function fail(msg: string): void {
  console.error(`  ❌ ${msg}`);
  errors++;
}

function pass(msg: string): void {
  console.log(`  ✅ ${msg}`);
}

// ---------------------------------------------------------------------------
// Sitemap validation
// ---------------------------------------------------------------------------

function validateSitemap(): void {
  console.log("\n🔍 Validating sitemap.xml...\n");

  const sitemapPath = path.join(DIST_DIR, "sitemap.xml");

  // 1. Existence check
  if (!fs.existsSync(sitemapPath)) {
    fail("sitemap.xml not found in dist/");
    return;
  }

  const content = fs.readFileSync(sitemapPath, "utf-8").trim();

  // 2. Non-empty check
  if (content.length === 0) {
    fail("sitemap.xml is empty");
    return;
  }
  pass(`sitemap.xml exists (${content.length} bytes)`);

  // 3. XML declaration
  if (!content.startsWith('<?xml version="1.0"')) {
    fail('Missing or malformed XML declaration (expected <?xml version="1.0"...?>)');
  } else {
    pass("Valid XML declaration present");
  }

  // 4. Namespace check
  const namespacePattern = /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/;
  if (!namespacePattern.test(content)) {
    fail(
      "Missing required sitemap namespace: xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"",
    );
  } else {
    pass("Correct sitemap namespace");
  }

  // 5. Extract and validate <url> entries
  const urlBlocks = content.match(/<url>[\s\S]*?<\/url>/g);
  if (!urlBlocks || urlBlocks.length === 0) {
    fail("No <url> entries found in sitemap");
    return;
  }
  pass(`Found ${urlBlocks.length} URL entries`);

  // 6. Validate each URL entry
  const locPattern = /<loc>(.*?)<\/loc>/;
  const lastmodPattern = /<lastmod>(.*?)<\/lastmod>/;
  const seenUrls = new Set<string>();

  for (const block of urlBlocks) {
    const locMatch = block.match(locPattern);
    const lastmodMatch = block.match(lastmodPattern);

    if (!locMatch) {
      fail("URL entry missing <loc> element");
      continue;
    }

    const loc = locMatch[1];

    // HTTPS check
    if (!loc.startsWith("https://")) {
      fail(`URL is not HTTPS: ${loc}`);
    }

    // Well-formed URL check
    try {
      new URL(loc);
    } catch {
      fail(`Malformed URL: ${loc}`);
    }

    // Duplicate check
    if (seenUrls.has(loc)) {
      fail(`Duplicate URL: ${loc}`);
    }
    seenUrls.add(loc);

    // Lastmod date validation
    if (lastmodMatch) {
      const dateStr = lastmodMatch[1];
      // ISO 8601 date-only (YYYY-MM-DD) or full datetime with optional timezone offset
      const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?$/;
      if (!isoDatePattern.test(dateStr)) {
        fail(`Invalid <lastmod> date format: ${dateStr} in ${loc}`);
      }
      // Validate actual date value
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        fail(`Unparseable <lastmod> date: ${dateStr} in ${loc}`);
      }
    }
  }

  pass("All URL entries validated");
}

// ---------------------------------------------------------------------------
// Robots.txt validation
// ---------------------------------------------------------------------------

function validateRobotsTxt(): void {
  console.log("\n🔍 Validating robots.txt...\n");

  const robotsPath = path.join(DIST_DIR, "robots.txt");

  if (!fs.existsSync(robotsPath)) {
    fail("robots.txt not found in dist/");
    return;
  }

  const content = fs.readFileSync(robotsPath, "utf-8");

  if (content.trim().length === 0) {
    fail("robots.txt is empty");
    return;
  }
  pass(`robots.txt exists (${content.length} bytes)`);

  // Check for Sitemap directive
  const sitemapDirective = /^Sitemap:\s*https?:\/\/.+\/sitemap\.xml$/m;
  if (!sitemapDirective.test(content)) {
    fail("robots.txt missing valid 'Sitemap:' directive");
  } else {
    pass("robots.txt contains Sitemap directive");
  }

  // Check Sitemap URL is HTTPS
  const sitemapUrlMatch = content.match(/^Sitemap:\s*(.+)$/m);
  if (sitemapUrlMatch) {
    const sitemapUrl = sitemapUrlMatch[1].trim();
    if (!sitemapUrl.startsWith("https://")) {
      fail(`Sitemap URL in robots.txt is not HTTPS: ${sitemapUrl}`);
    } else {
      pass("Sitemap URL uses HTTPS");
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

validateSitemap();
validateRobotsTxt();

console.log("\n" + "─".repeat(50));
if (errors > 0) {
  console.error(`\n💥 Validation FAILED with ${errors} error(s)\n`);
  process.exit(1);
} else {
  console.log("\n🎉 All validations passed!\n");
}
