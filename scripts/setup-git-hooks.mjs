#!/usr/bin/env node
/**
 * setup-git-hooks.js
 *
 * Installs a Git pre-commit hook that enforces code quality checks for
 * the frontend before every commit.
 *
 * Usage:
 *   node scripts/setup-git-hooks.js
 *
 * Run this once after cloning the repository.
 * The hook calls `npm run check` from the workspace root, which validates:
 *   - ESLint (frontend)
 *   - TypeScript types (frontend)
 *   - Prettier formatting (frontend)
 *
 * Note: backend checks are not run. The previous PHP backend has been removed
 * and is being rewritten; add its checks back to the hook when it lands.
 */

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
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

// Resolve Git's configured hooks directory. Using `git rev-parse --git-path`
// honours `core.hooksPath` and resolves the correct per-worktree path in
// linked worktrees, so the hook we install is actually the one Git runs.
let hooksDir;
try {
  // execFileSync with an absolute binary path (no shell) — mitigates PATH-hijacking (S4036).
  hooksDir = execFileSync(
    gitBin,
    ["rev-parse", "--path-format=absolute", "--git-path", "hooks"],
    { encoding: "utf8" },
  ).trim();
} catch {
  console.error("❌ Not a Git repository. Run this from inside the project.");
  process.exit(1);
}

const hookFile = join(hooksDir, "pre-commit");
const chainedHookName = "pre-commit.pre-setup";
const hookMarker = "installed by scripts/setup-git-hooks.mjs";

// Ensure the hooks directory exists.
if (!existsSync(hooksDir)) {
  mkdirSync(hooksDir, { recursive: true });
}

// Write the pre-commit hook script.
const hookContent = `#!/usr/bin/env sh
# ---------------------------------------------------------------
# Pre-commit quality gate — installed by scripts/setup-git-hooks.mjs
# Runs quality checks and captures a session log before every commit.
# ---------------------------------------------------------------

# Strict mode: catch unset variables and pipe failures.
# set -e is intentionally omitted — npm run check exit code is captured
# explicitly so the session log can always run for audit trail.
set -u
set -o pipefail

# Allow bypassing in emergencies with: git commit --no-verify
# This should ONLY be used in genuine emergencies.

REPO_ROOT="$(git rev-parse --show-toplevel)" || exit 1
cd "$REPO_ROOT" || exit 1
HOOK_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

# Chain any custom pre-commit hook that was preserved during installation.
CHAINED_HOOK="$HOOK_DIR/${chainedHookName}"
if [ -x "$CHAINED_HOOK" ]; then
  "$CHAINED_HOOK" "$@"
  CHAINED_STATUS=$?
  if [ "$CHAINED_STATUS" -ne 0 ]; then
    echo ""
    echo "❌ Preserved pre-commit hook failed: $CHAINED_HOOK"
    echo "   Fix the above before committing."
    exit "$CHAINED_STATUS"
  fi
fi

echo ""
echo "🔍 Running pre-commit quality checks..."
echo "   (bypass with: git commit --no-verify)"
echo ""

npm run check
CHECK_STATUS=$?

# Capture a session log when the optional local AI workspace is provisioned.
# .ai/ is not committed, so a fresh clone has no session-log helper to call.
if [ -f "$REPO_ROOT/.ai/automation/session-log.mjs" ]; then
  npm run session-log --silent -- --message "auto: pre-commit snapshot" 2>/dev/null || true
fi

STATUS=$CHECK_STATUS

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

// Detect whether a hook already exists and avoid destroying custom hooks.
if (existsSync(hookFile)) {
  const existing = readFileSync(hookFile, "utf8");
  if (existing === hookContent) {
    console.log("✅ Pre-commit hook already installed and up to date.");
    process.exit(0);
  }

  if (existing.includes(hookMarker)) {
    console.log("♻️  Updating the existing quality-gate pre-commit hook...");
  } else {
    const preferredBackup = join(hooksDir, chainedHookName);
    const backupFile = existsSync(preferredBackup)
      ? join(hooksDir, `${chainedHookName}.${Date.now()}`)
      : preferredBackup;

    renameSync(hookFile, backupFile);
    try {
      chmodSync(backupFile, 0o755);
    } catch {
      // Windows does not support chmod — the hook still runs under Git for Windows / WSL.
    }

    console.warn(`⚠️  Preserved the existing pre-commit hook at ${backupFile}`);
    console.warn("   The new hook chains to it before running quality checks.");
  }
}

writeFileSync(hookFile, hookContent, "utf8");

// Make the hook executable (no-op on Windows but harmless).
try {
  chmodSync(hookFile, 0o755);
} catch {
  // Windows does not support chmod — the hook will still run in Git for Windows / WSL.
}

console.log(`✅ Pre-commit hook installed at ${hookFile}`);
console.log("   It will run `npm run check` before every commit.");
console.log("   SonarQube analysis runs in CI (not locally).");
console.log("   To bypass in an emergency: git commit --no-verify");
