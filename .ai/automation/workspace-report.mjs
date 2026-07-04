/**
 * workspace-report.mjs — Generate a health report for the .ai/ workspace.
 *
 * Reports: file counts by category, last-updated dates, size summary,
 * cross-reference health, session log stats.
 *
 * Run: node .ai/automation/workspace-report.mjs
 * Or:  npm run workspace:report
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const AI_DIR = join(ROOT, '.ai');

function collectFiles(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...collectFiles(full));
      } else if (entry.isFile() && !entry.name.startsWith('.git')) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function main() {
  console.log('=== .ai/ Workspace Health Report ===\n');
  console.log(`Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`);

  const files = collectFiles(AI_DIR);
  const dirs = new Set(files.map(f => join(f, '..')));

  // Group by directory
  const categories = {};
  let totalSize = 0;
  let newest = 0;
  let newestFile = '';

  for (const file of files) {
    const rel = file.replace(ROOT, '').replace(/^[/\\]/, '');
    const cat = rel.split(/[/\\]/)[1] || 'root';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(rel);

    const stat = statSync(file);
    totalSize += stat.size;
    if (stat.mtimeMs > newest) {
      newest = stat.mtimeMs;
      newestFile = rel;
    }
  }

  console.log(`\n--- Overview ---`);
  console.log(`  Total files:      ${files.length}`);
  console.log(`  Total directories: ${dirs.size}`);
  console.log(`  Total size:        ${fmtSize(totalSize)}`);
  console.log(`  Newest file:       ${newestFile} (${fmtDate(newest)})`);

  console.log(`\n--- By Category ---`);
  for (const [cat, catFiles] of Object.entries(categories).sort()) {
    const catSize = catFiles.reduce((s, f) => s + statSync(join(ROOT, f)).size, 0);
    const extCounts = {};
    for (const f of catFiles) {
      const ext = f.split('.').pop();
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }
    const extSummary = Object.entries(extCounts).map(([e, c]) => `${c} .${e}`).join(', ');
    console.log(`  ${cat}/`);
    console.log(`    Files: ${catFiles.length}  |  Size: ${fmtSize(catSize)}  |  ${extSummary}`);
  }

  // Session log summary
  const logDir = join(AI_DIR, 'memory', 'session-log');
  if (existsSync(logDir)) {
    const logs = readdirSync(logDir).filter(f => f.match(/^\d{4}-\d{2}-\d{2}T/));
    const indexFile = join(logDir, 'index.md');
    const hasIndex = existsSync(indexFile);

    console.log(`\n--- Session Logs ---`);
    console.log(`  Total sessions: ${logs.length}`);
    console.log(`  Index file: ${hasIndex ? '✓ present' : '✖ missing'}`);
    if (logs.length > 0) {
      const firstLog = logs.sort()[0];
      const lastLog = logs.sort().reverse()[0];
      console.log(`  Earliest: ${firstLog?.slice(0, 10) || 'N/A'}`);
      console.log(`  Latest:   ${lastLog?.slice(0, 10) || 'N/A'}`);
    }
  }

  // Freshness check summary
  const ctxFile = join(AI_DIR, 'memory', 'active-context.md');
  if (existsSync(ctxFile)) {
    const ctxContent = readFileSync(ctxFile, 'utf8');
    const dMatch = ctxContent.match(/> Last updated:\s*(\d{4}-\d{2}-\d{2})/);
    if (dMatch) {
      const daysAgo = Math.floor((Date.now() - new Date(dMatch[1]).getTime()) / 86400000);
      console.log(`\n--- Status ---`);
      console.log(`  Active context: last updated ${daysAgo} days ago (${dMatch[1]})`);
    }
  }

  console.log(`\n--- Recommendations ---`);
  const staleThreshold = 30;
  const daysSinceNewest = Math.floor((Date.now() - newest) / 86400000);
  if (daysSinceNewest > 90) console.log(`  ⚠ Workspace files untouched for ${daysSinceNewest} days — consider review`);

  const logCount = existsSync(logDir) ? readdirSync(logDir).filter(f => f.match(/^\d{4}-\d{2}-\d{2}T/)).length : 0;
  if (logCount === 0) console.log(`  ⚠ No session logs recorded — run \`npm run session-log\` to start tracking`);
  if (logCount > 0 && logCount < 3) console.log(`  ℹ Only ${logCount} session logs — regular logging provides better traceability`);

  console.log();
}

main();
