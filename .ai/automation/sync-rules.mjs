/**
 * sync-rules.mjs — Copies .ai/coding-rules/*.mdc to tool-specific directories.
 *
 * Targets:
 *   - .cursor/rules/
 *   - .github/instructions/
 *   - .windsurf/rules/
 *
 * Run: node .ai/automation/sync-rules.mjs
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SOURCE_DIR = join(ROOT, '.ai', 'coding-rules');
const TARGETS = [
  join(ROOT, '.cursor', 'rules'),
  join(ROOT, '.github', 'instructions'),
  join(ROOT, '.windsurf', 'rules'),
];

function sync() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(SOURCE_DIR).filter(f => f.endsWith('.mdc'));
  let copied = 0;
  let errors = 0;

  for (const target of TARGETS) {
    if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
      console.log(`  Created directory: ${target}`);
    }

    for (const file of files) {
      const src = join(SOURCE_DIR, file);
      const dst = join(target, file);
      try {
        copyFileSync(src, dst);
        copied++;
      } catch (err) {
        console.error(`  ERROR copying ${file} -> ${target}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n✓ ${copied} files synced to ${TARGETS.length} targets`);
  if (errors) console.error(`  ${errors} errors`);
  console.log(`\nTargets:\n${TARGETS.map(t => '  - ' + t).join('\n')}`);
}

sync();
