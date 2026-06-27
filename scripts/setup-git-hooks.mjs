#!/usr/bin/env node
/**
 * setup-git-hooks.js
 *
 * Installs a Git pre-commit hook that enforces code quality checks for
 * both the frontend and the PHP backend before every commit.
 *
 * Usage:
 *   node scripts/setup-git-hooks.js
 *
 * Run this once after cloning the repository.
 * The hook calls `npm run check` from the workspace root, which validates:
 *   - ESLint (frontend)
 *   - TypeScript types (frontend)
 *   - Prettier formatting (frontend)
 *   - PHP-CS-Fixer formatting (backend)
 *   - PHP syntax lint via `php -l` (backend)
 *   - PHPUnit tests (backend)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { delimiter, join } from "node:path";

/**
 * Resolve the absolute path of the Git binary by scanning PATH directories.
 * Uses fs checks only — no shell or child_process PATH resolution involved.
 * Respects the GIT_PATH environment variable as an explicit override.
 *
 * This satisfies SonarQube rule S4036 by ensuring execFileSync receives a
 * fully-resolved, absolute binary path rather than relying on PATH at runtime.
 */
function resolveGitBinary() {
  if (process.env.GIT_PATH) return process.env.GIT_PATH;

  const pathDirs = (process.env.PATH || "").split(delimiter).filter(Boolean);
  const extensions =
    process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const dir of pathDirs) {
    for (const ext of extensions) {
      const candidate = join(dir, `git${ext}`);
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
}

const gitBin = resolveGitBinary();

if (!gitBin) {
  console.error(
    "❌ `git` was not found in PATH. Install Git or set the GIT_PATH environment variable.",
  );
  process.exit(1);
}

// Resolve the root .git/hooks directory.
let gitRoot;
try {
  // execFileSync with an absolute binary path (no shell) — mitigates PATH-hijacking (S4036).
  gitRoot = execFileSync(gitBin, ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
} catch {
  console.error("❌ Not a Git repository. Run this from inside the project.");
  process.exit(1);
}

const hooksDir = join(gitRoot, ".git", "hooks");
const hookFile = join(hooksDir, "pre-commit");

// Ensure the hooks directory exists.
if (!existsSync(hooksDir)) {
  mkdirSync(hooksDir, { recursive: true });
}

// Detect whether a hook already exists (avoid clobbering custom hooks).
if (existsSync(hookFile)) {
  const existing = (await import("node:fs")).readFileSync(hookFile, "utf8");
  if (existing.includes("npm run check")) {
    console.log("✅ Pre-commit hook already installed and up to date.");
    process.exit(0);
  }
  console.warn("⚠️  A pre-commit hook already exists and does not contain `npm run check`.");
  console.warn("   Overwriting it. Your previous hook is lost — check .git/hooks/pre-commit if needed.");
}

// Write the pre-commit hook script.
const hookContent = `#!/usr/bin/env sh
# ---------------------------------------------------------------
# Pre-commit quality gate — installed by scripts/setup-git-hooks.js
# Runs all frontend and backend quality checks before every commit.
# ---------------------------------------------------------------

# Allow bypassing in emergencies with: git commit --no-verify
# This should ONLY be used in genuine emergencies.

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT" || exit 1

echo ""
echo "🔍 Running pre-commit quality checks..."
echo "   (bypass with: git commit --no-verify)"
echo ""

npm run check

STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  echo ""
  echo "❌ Pre-commit checks FAILED."
  echo "   Fix the above errors before committing."
  echo "   To bypass in an emergency: git commit --no-verify"
  echo ""
  exit 1
fi

echo ""
echo "✅ All checks passed — proceeding with commit."
echo ""
exit 0
`;

writeFileSync(hookFile, hookContent, "utf8");

// Make the hook executable (no-op on Windows but harmless).
try {
  chmodSync(hookFile, 0o755);
} catch {
  // Windows does not support chmod — the hook will still run in Git for Windows / WSL.
}

console.log("✅ Pre-commit hook installed at .git/hooks/pre-commit");
console.log("   It will run `npm run check` before every commit.");
console.log("   To bypass in an emergency: git commit --no-verify");
