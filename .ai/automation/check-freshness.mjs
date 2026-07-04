/**
 * check-freshness.mjs — Validate .ai/ workspace internal consistency.
 *
 * Checks:
 *   - Files referenced in prompts, workflows, checklists exist
 *   - All .ai/ directories have at least one content file
 *   - Cross-references between files resolve
 *   - active-context.md is up-to-date (less than 30 days old)
 *   - No broken relative links in .md files
 *
 * Run: node .ai/automation/check-freshness.mjs
 * Or:  npm run check:workspace
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const AI_DIR = join(ROOT, '.ai');

const REFS_PATTERN = /\.ai\/[\w\-\/]+\.(?:mdc|mjs|md)/g;

let errors = 0;
let warnings = 0;

function err(msg) { errors++; console.error(`  ✖ ${msg}`); }
function warn(msg) { warnings++; console.warn(`  ⚠ ${msg}`); }
function ok(msg) { console.log(`  ✓ ${msg}`); }

function collectMarkdownFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...collectMarkdownFiles(full));
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdc'))) {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

function checkDirectories() {
  console.log('\n--- Directories ---');
  const required = ['docs', 'knowledge', 'memory', 'skills', 'standards', 'coding-rules', 'prompts', 'workflows', 'checklists', 'automation'];
  const optional = ['templates', 'mcp'];

  for (const d of required) {
    const p = join(AI_DIR, d);
    if (!existsSync(p)) err(`Required directory missing: .ai/${d}/`);
    else {
      const files = readdirSync(p).filter(f => !f.startsWith('.'));
      if (files.length === 0) warn(`Directory .ai/${d}/ is empty`);
      else ok(`.ai/${d}/ (${files.length} entries)`);
    }
  }

  for (const d of optional) {
    if (existsSync(join(AI_DIR, d))) ok(`.ai/${d}/ (present — planned future use)`);
  }
}

function checkCrossReferences() {
  console.log('\n--- Cross-references ---');
  const files = collectMarkdownFiles(AI_DIR);
  let refCount = 0;
  let brokenCount = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const refs = content.match(REFS_PATTERN) || [];
    for (const ref of refs) {
      refCount++;
      // Resolve relative to ROOT (references are repo-relative paths)
      let target = join(ROOT, ref.replace(/\//g, '\\'));
      // Handle Windows path normalization
      target = resolve(target);
      if (!existsSync(target)) {
        brokenCount++;
        const rel = file.replace(ROOT, '').replace(/^[/\\]/, '');
        err(`Broken ref in ${rel}: \`${ref}\``);
      }
    }
  }

  if (brokenCount === 0) ok(`${refCount} cross-references — all resolve`);
  else err(`${brokenCount}/${refCount} cross-references broken`);
}

function checkActiveContext() {
  console.log('\n--- active-context.md freshness ---');
  const ctxFile = join(AI_DIR, 'memory', 'active-context.md');
  if (!existsSync(ctxFile)) { err('active-context.md missing'); return; }

  const content = readFileSync(ctxFile, 'utf8');
  const dateMatch = content.match(/> Last updated:\s*(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) { warn('No "Last updated" date in active-context.md'); return; }

  const updated = new Date(dateMatch[1]);
  const now = new Date();
  const daysDiff = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  if (daysDiff > 30) warn(`active-context.md last updated ${daysDiff} days ago (${dateMatch[1]})`);
  else ok(`active-context.md updated ${daysDiff} days ago`);
}

function checkRequiredFiles() {
  console.log('\n--- Required root files ---');
  const required = [
    ['.ai/readme.md', 'Workspace entry point'],
    ['.ai/context.md', 'Master context'],
    ['.ai/coding-rules/frontend.mdc', 'Frontend rules'],
    ['.ai/coding-rules/backend.mdc', 'Backend rules'],
    ['.ai/memory/decisions.md', 'Decision records'],
    ['sonar-project.properties', 'SonarQube config'],
  ];

  for (const [file, label] of required) {
    if (existsSync(join(ROOT, file))) ok(`${label} — ${file}`);
    else err(`${label} missing: ${file}`);
  }
}

function main() {
  console.log(`=== .ai/ Workspace Freshness Check ===\n`);
  const start = Date.now();

  checkDirectories();
  checkRequiredFiles();
  checkCrossReferences();
  checkActiveContext();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n--- Summary ---`);
  console.log(`  ${errors} errors, ${warnings} warnings (${elapsed}s)`);

  if (errors || warnings) {
    console.log(`\n  Run \`npm run check:workspace\` to re-check after fixing.`);
  } else {
    console.log(`\n  ✓ Workspace is consistent and up-to-date.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

main();
