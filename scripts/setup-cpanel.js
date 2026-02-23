import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const DIST_DIR = path.join(ROOT_DIR, "dist");
const CLIENT_PUBLIC_DIR = path.join(ROOT_DIR, "client", "public");

function setupCPanelStructure() {
  console.log("Setting up cPanel deployment structure...");

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error("Error: dist directory not found. Run build first.");
    process.exit(1);
  }

  // Copy API directory to dist root
  const apiSource = path.join(CLIENT_PUBLIC_DIR, "api");
  const apiDest = path.join(DIST_DIR, "api");

  if (fs.existsSync(apiSource)) {
    if (fs.existsSync(apiDest)) {
      // Remove existing API directory
      fs.rmSync(apiDest, { recursive: true, force: true });
    }
    // Copy API directory
    fs.cpSync(apiSource, apiDest, { recursive: true });
    console.log("✓ Copied API directory to dist root");
  }

  // Copy .htaccess to dist root
  const htaccessSource = path.join(CLIENT_PUBLIC_DIR, ".htaccess");
  const htaccessDest = path.join(DIST_DIR, ".htaccess");

  if (fs.existsSync(htaccessSource)) {
    fs.copyFileSync(htaccessSource, htaccessDest);
    console.log("✓ Copied .htaccess to dist root");
  }

  // Verify sitemap.xml exists in dist
  const sitemapPath = path.join(DIST_DIR, "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    console.log("✓ sitemap.xml present in dist");
  } else {
    console.warn("⚠ sitemap.xml not found in dist — run sitemap:generate if needed");
  }

  // Verify robots.txt exists in dist
  const robotsPath = path.join(DIST_DIR, "robots.txt");
  if (fs.existsSync(robotsPath)) {
    console.log("✓ robots.txt present in dist");
  } else {
    console.warn("⚠ robots.txt not found in dist — ensure client/public/robots.txt exists");
  }

  console.log("cPanel structure setup complete!");
  console.log("Files are ready for deployment to cPanel web root.");
}

setupCPanelStructure();
