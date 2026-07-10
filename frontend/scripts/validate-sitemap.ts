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

let fail = (msg: string): void => {
  console.error(`  ❌ ${msg}`);
  errors++;
};

function pass(msg: string): void {
  console.log(`  ✅ ${msg}`);
}

// ---------------------------------------------------------------------------
// Sitemap validation helpers
// ---------------------------------------------------------------------------

function validateSitemapFileStructure(): string | null {
  const sitemapPath = path.join(DIST_DIR, "sitemap.xml");
  // 1. Existence check
  if (!fs.existsSync(sitemapPath)) {
    fail("sitemap.xml not found in dist/");
    return null;
  }

  const content = fs.readFileSync(sitemapPath, "utf-8").trim();
  const byteSize = Buffer.byteLength(content, "utf8");

  // 2. Non-empty check
  if (byteSize === 0) {
    fail("sitemap.xml is empty");
    return null;
  }
  pass(`sitemap.xml exists (${byteSize} bytes)`);

  // 3. XML declaration
  if (content.startsWith('<?xml version="1.0"')) {
    pass("Valid XML declaration present");
  } else {
    fail('Missing or malformed XML declaration (expected <?xml version="1.0"...?>)');
  }

  // 4. Namespace check
  const namespacePattern = /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/;
  if (namespacePattern.test(content)) {
    pass("Correct sitemap namespace");
  } else {
    fail(
      'Missing required sitemap namespace: xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
    );
  }

  return content;
}

function isValidIsoDate(dateStr: string): boolean {
  if (dateStr.includes("T")) {
    // Split into date, time, and optional timezone parts
    const parts = dateStr.split("T");
    if (parts.length !== 2) return false;

    // Validate date portion
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) return false;

    // Separate time from optional timezone suffix
    const tzMatch = /^(.+?)(Z|[+-]\d{2}:\d{2})?$/.exec(parts[1]);
    if (!tzMatch) return false;

    const timePart = tzMatch[1];

    // Validate time portion: HH:MM, optionally HH:MM:SS or HH:MM:SS.sss
    if (!/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(timePart)) return false;

    return true;
  }
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  return dateOnlyPattern.test(dateStr);
}

function validateLastmod(dateStr: string, loc: string): void {
  // ISO 8601 date-only (YYYY-MM-DD) or full datetime with optional timezone offset
  if (isValidIsoDate(dateStr)) {
    // Validate actual date value
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      fail(`Unparseable <lastmod> date: ${dateStr} in ${loc}`);
      return;
    }

    // Strict calendar check: ensure the date part represents a valid calendar day
    // (prevents normalization e.g. 2024-02-30 -> 2024-03-01)
    const datePart = dateStr.split("T")[0];
    const dateParts = datePart.split("-").map(Number);
    const testDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));

    if (
      testDate.getUTCFullYear() !== dateParts[0] ||
      testDate.getUTCMonth() + 1 !== dateParts[1] ||
      testDate.getUTCDate() !== dateParts[2]
    ) {
      fail(`Invalid calendar date: ${dateStr} in ${loc}`);
    }
  } else {
    fail(`Invalid <lastmod> date format: ${dateStr} in ${loc}`);
  }
}

function validateUrlBlock(block: string, seenUrls: Set<string>): void {
  const locPattern = /<loc>(.*?)<\/loc>/;
  const lastmodPattern = /<lastmod>(.*?)<\/lastmod>/;

  const locMatch = locPattern.exec(block);
  const lastmodMatch = lastmodPattern.exec(block);

  if (!locMatch) {
    fail("URL entry missing <loc> element");
    return;
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
    validateLastmod(lastmodMatch[1], loc);
  }
}

function validateSitemapUrls(content: string): void {
  // 5. Extract and validate <url> entries
  const urlBlocks = content.match(/<url>[\s\S]*?<\/url>/g);
  if (!urlBlocks || urlBlocks.length === 0) {
    fail("No <url> entries found in sitemap");
    return;
  }
  pass(`Found ${urlBlocks.length} URL entries`);

  const seenUrls = new Set<string>();
  for (const block of urlBlocks) {
    validateUrlBlock(block, seenUrls);
  }
}

// ---------------------------------------------------------------------------
// Main Sitemap validation entrypoint
// ---------------------------------------------------------------------------

function validateSitemap(): void {
  console.log("\n🔍 Validating sitemap.xml...\n");

  let urlErrorCount = 0;
  const originalFail = fail;
  // wrap fail to track URL specific errors
  fail = (msg: string) => {
    urlErrorCount++;
    originalFail(msg);
  };

  try {
    const content = validateSitemapFileStructure();
    if (content !== null) {
      validateSitemapUrls(content);
      if (urlErrorCount === 0) {
        pass("All URL entries validated");
      }
    }
  } finally {
    // Restore global fail
    fail = originalFail;
  }
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
  const byteSize = Buffer.byteLength(content, "utf8");
  pass(`robots.txt exists (${byteSize} bytes)`);

  // Check for Sitemap directive (case-insensitive)
  const sitemapLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith("sitemap:"));

  if (sitemapLine) {
    const sitemapUrl = sitemapLine.slice(8).trim();

    if (sitemapUrl.toLowerCase().endsWith("/sitemap.xml")) {
      pass("robots.txt contains Sitemap directive");
    } else {
      fail("robots.txt missing valid 'Sitemap:' directive");
    }

    if (sitemapUrl.startsWith("https://")) {
      pass("Sitemap URL uses HTTPS");
    } else {
      fail(`Sitemap URL in robots.txt is not HTTPS: ${sitemapUrl}`);
    }
  } else {
    fail("robots.txt missing valid 'Sitemap:' directive");
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
