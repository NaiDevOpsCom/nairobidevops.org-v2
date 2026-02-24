/**
 * generate-sitemap.ts — Build-time sitemap.xml generator
 *
 * Reads static routes from the route map and dynamic routes from blogData.ts,
 * then writes a valid sitemap.xml into the dist/ directory.
 *
 * Usage:  npx tsx scripts/generate-sitemap.ts
 * Also invoked automatically by the Vite closeBundle hook.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { routes } from "../shared/routes";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SITE_URL = "https://nairobidevops.org";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

/** ISO 8601 date-only string for <lastmod> (deterministic via SOURCE_DATE_EPOCH when provided) */
const today = (() => {
  const rawEpoch = process.env.SOURCE_DATE_EPOCH;
  if (rawEpoch) {
    const epoch = Number(rawEpoch);
    if (!isNaN(epoch) && isFinite(epoch)) {
      const d = new Date(epoch * 1000);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
    }
  }
  return new Date().toISOString().split("T")[0];
})();

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

interface SitemapEntry {
  loc: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
  lastmod: string;
}

const staticRoutes: SitemapEntry[] = routes
  .filter((route) => !route.dynamic)
  .map((route) => ({
    loc: route.path,
    ...route.sitemap,
    lastmod: today,
  }));

// ---------------------------------------------------------------------------
// Dynamic routes — blog posts
// ---------------------------------------------------------------------------

async function getBlogSlugs(): Promise<string[]> {
  // Dynamic import so this script can run from project root
  const blogDataPath = path.join(
    ROOT_DIR,
    "client",
    "src",
    "data",
    "blogData.ts",
  );

  if (!fs.existsSync(blogDataPath)) {
    console.warn("⚠  blogData.ts not found — skipping dynamic blog routes");
    return [];
  }

  try {
    const { blogPosts } = (await import(
      pathToFileURL(blogDataPath).href
    )) as {
      blogPosts: Array<{ slug: string }>;
    };
    return blogPosts.map((p) => p.slug);
  } catch (error) {
    console.error("⚠  Failed to import blogData.ts:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// XML generation
// ---------------------------------------------------------------------------

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const fullUrl = `${SITE_URL}${entry.loc}`;

      if (!validateUrl(fullUrl)) {
        throw new Error(`Invalid URL generated: ${fullUrl}`);
      }

      return [
        "  <url>",
        `    <loc>${escapeXml(fullUrl)}</loc>`,
        `    <lastmod>${entry.lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "", // trailing newline
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function generateSitemap(): Promise<void> {
  console.log("🗺️  Generating sitemap.xml...");

  // Collect blog slugs for dynamic routes
  const slugs = await getBlogSlugs();
  const blogEntries: SitemapEntry[] = slugs
    .filter((slug) => typeof slug === "string" && slug.trim().length > 0)
    .map((slug) => ({
      loc: `/blogs/${encodeURIComponent(slug)}`,
      changefreq: "weekly" as const,
      priority: 0.6,
      lastmod: today,
    }));

  const allEntries = [...staticRoutes, ...blogEntries];

  // Check for duplicate URLs (single pass)
  const seen = new Set<string>();
  const uniqueEntries: SitemapEntry[] = [];

  for (const entry of allEntries) {
    if (seen.has(entry.loc)) {
      console.warn(`⚠  Duplicate route skipped: ${entry.loc}`);
      continue;
    }
    seen.add(entry.loc);
    uniqueEntries.push(entry);
  }

  const xml = buildSitemapXml(uniqueEntries);

  // Ensure dist exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const outputPath = path.join(DIST_DIR, "sitemap.xml");
  fs.writeFileSync(outputPath, xml, "utf-8");

  // Copy robots.txt from public if it exists (ensures validation passes without full build)
  const robotsSrc = path.join(ROOT_DIR, "client", "public", "robots.txt");
  const robotsDest = path.join(DIST_DIR, "robots.txt");
  if (fs.existsSync(robotsSrc)) {
    fs.copyFileSync(robotsSrc, robotsDest);
  }

  console.log(`✅ sitemap.xml written to ${outputPath}`);
  console.log(`   ${staticRoutes.length} static + ${blogEntries.length} dynamic → ${uniqueEntries.length} URLs`);
  if (allEntries.length > uniqueEntries.length) {
    console.log(
      `   (Removed ${allEntries.length - uniqueEntries.length} duplicate(s))`,
    );
  }
}

// Run directly when invoked via CLI (ESM check)
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").toString()) {
  generateSitemap().catch((err) => {
    console.error("❌ Sitemap generation failed:", err);
    process.exit(1);
  });
}
