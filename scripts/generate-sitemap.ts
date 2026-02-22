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
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SITE_URL = "https://nairobidevops.org";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

/** ISO 8601 date-only string for <lastmod> */
const today = new Date().toISOString().split("T")[0]; // e.g. "2026-02-22"

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

interface SitemapEntry {
  loc: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  priority: string; // "0.0" – "1.0"
  lastmod: string;
}

/** Static routes with SEO metadata (from App.tsx) */
const staticRoutes: SitemapEntry[] = [
  { loc: "/", changefreq: "weekly", priority: "1.0", lastmod: today },
  { loc: "/about", changefreq: "monthly", priority: "0.8", lastmod: today },
  { loc: "/events", changefreq: "weekly", priority: "0.8", lastmod: today },
  { loc: "/faqpage", changefreq: "monthly", priority: "0.6", lastmod: today },
  { loc: "/community", changefreq: "weekly", priority: "0.8", lastmod: today },
  { loc: "/partners", changefreq: "monthly", priority: "0.7", lastmod: today },
  { loc: "/blogs", changefreq: "daily", priority: "0.9", lastmod: today },
  { loc: "/donate", changefreq: "monthly", priority: "0.7", lastmod: today },
  {
    loc: "/code-of-conduct",
    changefreq: "yearly",
    priority: "0.4",
    lastmod: today,
  },
  { loc: "/terms", changefreq: "yearly", priority: "0.3", lastmod: today },
  { loc: "/privacy", changefreq: "yearly", priority: "0.3", lastmod: today },
];

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
    // tsx handles TypeScript imports natively
    const { blogPosts } = (await import(
      `file://${blogDataPath.replace(/\\/g, "/")}`
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
  const blogEntries: SitemapEntry[] = slugs.map((slug) => ({
    loc: `/blogs/${slug}`,
    changefreq: "weekly" as const,
    priority: "0.6",
    lastmod: today,
  }));

  const allEntries = [...staticRoutes, ...blogEntries];

  // Check for duplicate URLs
  const seen = new Set<string>();
  for (const entry of allEntries) {
    if (seen.has(entry.loc)) {
      console.warn(`⚠  Duplicate route skipped: ${entry.loc}`);
      continue;
    }
    seen.add(entry.loc);
  }

  const uniqueEntries = allEntries.filter((entry) => {
    if (seen.has(entry.loc)) {
      seen.delete(entry.loc); // keep first occurrence
      return true;
    }
    return false;
  });

  const xml = buildSitemapXml(
    uniqueEntries.length > 0 ? uniqueEntries : allEntries,
  );

  // Ensure dist exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const outputPath = path.join(DIST_DIR, "sitemap.xml");
  fs.writeFileSync(outputPath, xml, "utf-8");

  console.log(`✅ sitemap.xml written to ${outputPath}`);
  console.log(
    `   ${staticRoutes.length} static + ${blogEntries.length} dynamic = ${allEntries.length} URLs`,
  );
}

// Run directly when invoked via CLI
generateSitemap().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});
