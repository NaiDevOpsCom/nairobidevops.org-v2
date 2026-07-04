/**
 * sync-skills.js
 *
 * Syncs SKILL.md files from .ai/skills/ (canonical source)
 * to .claude/skills/ and .agents/skills/ (tool-specific locations).
 *
 * Run: node .ai/automation/sync-skills.js
 * Or:  npm run sync-skills
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const SOURCE = join(ROOT, ".ai/skills");
const TARGETS = [".claude/skills", ".agents/skills"];

if (!existsSync(SOURCE)) {
  console.error("Source .ai/skills/ not found");
  process.exit(1);
}

const skills = readdirSync(SOURCE, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const target of TARGETS) {
  const targetDir = join(ROOT, target);
  mkdirSync(targetDir, { recursive: true });

  let count = 0;
  for (const skill of skills) {
    const srcFile = join(SOURCE, skill.name, "SKILL.md");
    if (!existsSync(srcFile)) continue;

    const destDir = join(targetDir, skill.name);
    mkdirSync(destDir, { recursive: true });
    cpSync(srcFile, join(destDir, "SKILL.md"), { force: true });
    count++;
  }
  console.log(`Synced ${count} skills to ${target}`);
}

console.log("Done");
