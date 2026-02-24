import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

// Match actual calls like console.log(...) but skip defensive checks like typeof console.warn
const CONSOLE_OR_DEBUGGER_RE = /\bconsole\.(?:log|warn|error|info|debug)\s*\(|\bdebugger\b/;

const listJsFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    // analytics bundles may be emitted as analytics.js or analytics.<hash>.js and can legitimately use console
    const isAnalytics =
      entry.name === "analytics.js" || /^analytics\.[a-zA-Z0-9-]+\.js$/i.test(entry.name);
    if (isAnalytics) {
      continue;
    }

    if (/\.(?:m|c)?js$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const distDir = path.join(repoRoot, "dist");

const distExists = existsSync(distDir) && statSync(distDir).isDirectory();

if (process.env.CI_ENFORCE_HARDENING && !distExists) {
  throw new Error(`Expected build artifacts at ${distDir}, but directory does not exist.`);
}

describe.skipIf(!distExists)("hardened build artifact checks", () => {
  it("has no console/debugger statements in dist JS bundles", () => {
    const jsFiles = listJsFiles(distDir);
    const violations: string[] = [];

    for (const filePath of jsFiles) {
      const contents = readFileSync(filePath, "utf8");
      if (CONSOLE_OR_DEBUGGER_RE.test(contents)) {
        violations.push(path.relative(repoRoot, filePath));
      }
    }

    expect(violations).toEqual([]);
  });
});
