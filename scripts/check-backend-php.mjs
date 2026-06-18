import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const backendDir = "backend";
const ignoredDirs = new Set(["vendor"]);
const ignoredFiles = new Set(["config.local.php"]);

function collectPhpFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return ignoredDirs.has(entry) ? [] : collectPhpFiles(path);
    }

    if (!entry.endsWith(".php") || ignoredFiles.has(entry)) {
      return [];
    }

    return [path];
  });
}

const phpVersion = spawnSync("php", ["--version"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (phpVersion.error || phpVersion.status !== 0) {
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
  const result = spawnSync("php", ["-l", file], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  const label = relative(process.cwd(), file);
  if (result.status === 0) {
    console.log(`OK ${label}`);
  } else {
    failed = true;
    console.error(result.stdout.trim() || result.stderr.trim() || `PHP lint failed: ${label}`);
  }
}

process.exit(failed ? 1 : 0);
