import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const sitemapPath = path.join(ROOT_DIR, "dist", "sitemap.xml");
const backupPath = path.join(ROOT_DIR, "dist", "sitemap.xml.bak");

if (!fs.existsSync(sitemapPath)) {
  console.error("❌ dist/sitemap.xml not found - cannot run tests");
  process.exit(1);
}

let failures = 0;

// Backup
fs.copyFileSync(sitemapPath, backupPath);

try {
  console.log("--- Testing Invalid Date ---");
  const invalidContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nairobidevops.org/</loc>
    <lastmod>2024-02-30</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  fs.writeFileSync(sitemapPath, invalidContent);
  
  try {
    execSync("npx tsx scripts/validate-sitemap.ts", { stdio: "inherit" });
    console.log("FAIL: Script should have failed on invalid date");
    failures++;
  } catch {
    console.log("SUCCESS: Script correctly failed on invalid date");
  }

  console.log("\n--- Testing Valid Date ---");
  const validContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nairobidevops.org/</loc>
    <lastmod>2024-02-28</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  fs.writeFileSync(sitemapPath, validContent);
  
  try {
    execSync("npx tsx scripts/validate-sitemap.ts", { stdio: "inherit" });
    console.log("SUCCESS: Script passed on valid date");
  } catch {
    console.log("FAIL: Script should have passed on valid date");
    failures++;
  }

} finally {
  // Restore
  fs.copyFileSync(backupPath, sitemapPath);
  fs.unlinkSync(backupPath);
}

if (failures > 0) {
  console.error(`\n💥 Tests failed with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed!");
}
