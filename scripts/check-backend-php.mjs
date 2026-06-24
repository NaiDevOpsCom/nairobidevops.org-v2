import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, realpathSync, statSync } from "node:fs";
import { delimiter, join, relative } from "node:path";

const backendDir = "backend";
const ignoredDirs = new Set(["vendor"]);
const ignoredFiles = new Set(["config.local.php"]);

/**
 * Resolve the absolute path of the PHP binary by scanning PATH directories.
 * Uses fs checks only — no shell or child_process PATH resolution involved.
 * Respects the PHP_PATH environment variable as an explicit override.
 */
function resolvePhpBinary() {
  if (process.env.PHP_PATH) return process.env.PHP_PATH;

  const pathDirs = (process.env.PATH || "").split(delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const dir of pathDirs) {
    for (const ext of extensions) {
      const candidate = join(dir, `php${ext}`);
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
}

const phpBin = resolvePhpBinary();

if (!phpBin) {
  console.error("PHP is required for backend checks, but `php` was not found in PATH.");
  console.error("Install PHP locally or set the PHP_PATH environment variable.");
  process.exit(1);
}

function collectPhpFiles(dir, visited = new Set()) {
  if (!existsSync(dir)) return [];

  // Resolve real path to detect symlink loops
  let realDir;
  try {
    realDir = realpathSync(dir);
  } catch (err) {
    console.warn(`Warning: could not resolve real path for "${dir}": ${err.message}`);
    return [];
  }
  if (visited.has(realDir)) return [];
  visited.add(realDir);

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      return [];
    }

    if (stat.isSymbolicLink()) {
      // Resolve symlink target; skip broken or looping links
      let targetStat;
      try {
        targetStat = statSync(path);
      } catch {
        return [];
      }
      if (targetStat.isDirectory()) {
        return ignoredDirs.has(entry) ? [] : collectPhpFiles(path, visited);
      }
      if (!targetStat.isFile() || !entry.endsWith(".php") || ignoredFiles.has(entry)) {
        return [];
      }
      return [path];
    }

    if (stat.isDirectory()) {
      return ignoredDirs.has(entry) ? [] : collectPhpFiles(path, visited);
    }

    if (!stat.isFile() || !entry.endsWith(".php") || ignoredFiles.has(entry)) {
      return [];
    }

    return [path];
  });
}

const phpVersion = spawnSync(phpBin, ["--version"], {
  encoding: "utf8",
  timeout: 10_000,
});

if (phpVersion.error?.code === "ETIMEDOUT") {
  console.error("PHP is required for backend checks, but `php --version` timed out (10s).");
  process.exit(1);
} else if (phpVersion.error || phpVersion.status !== 0) {
  console.error("PHP is required for backend checks, but `php --version` failed.");
  console.error("Install PHP locally or ensure the CI runner sets it up before `npm run check`.");
  process.exit(1);
}

const phpFiles = collectPhpFiles(backendDir);

if (phpFiles.length === 0) {
  console.log("No backend PHP files found to lint.");
  process.exit(0);
}

let failed = false;

for (const file of phpFiles) {
  const result = spawnSync(phpBin, ["-l", file], {
    encoding: "utf8",
    timeout: 30_000,
  });

  const label = relative(process.cwd(), file);
  if (result.error && result.error.code === "ETIMEDOUT") {
    failed = true;
    console.error(`Timeout: PHP lint exceeded 30s for ${label}`);
  } else if (result.status === 0) {
    console.log(`OK ${label}`);
  } else {
    failed = true;
    console.error(result.stdout.trim() || result.stderr.trim() || `PHP lint failed: ${label}`);
  }
}

process.exit(failed ? 1 : 0);
