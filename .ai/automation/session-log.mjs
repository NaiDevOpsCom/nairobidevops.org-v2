/**
 * session-log.mjs — Capture a session snapshot and append to .ai/memory/session-log/
 *
 * Captures: timestamp, git state, uncommitted files, recent commits, current phase.
 * Run: node .ai/automation/session-log.mjs [--message "Summary of work done"]
 * Or:  npm run session-log -- --message "Implemented feature X"
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const LOG_DIR = join(ROOT, '.ai', 'memory', 'session-log');
const ACTIVE_CTX = join(ROOT, '.ai', 'memory', 'active-context.md');
const MAX_SESSIONS = 30;

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch { return '(error running command)'; }
}

function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch { return '(no tags)'; }
}

function sanitise(s) {
  return s.replace(/["'`]/g, '').replace(/[<>|]/g, '-').slice(0, 120);
}

function capture() {
  const args = process.argv.slice(2);
  const msgIdx = args.indexOf('--message');
  const userMessage = msgIdx !== -1 && args[msgIdx + 1] ? args.slice(msgIdx + 1).join(' ') : '';

  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  const branch = run('git rev-parse --abbrev-ref HEAD');
  const recentCommits = run('git log --oneline -10');
  const uncommitted = run('git status --porcelain');
  const dirtyCount = uncommitted === '(error running command)' ? 0 : uncommitted.split('\n').filter(l => l).length;
  const diffStat = run('git diff --stat');
  const nodeVer = run('node --version');
  const lastTag = getLastTag();

  // Determine current phase from active-context.md
  let phase = 'Unknown';
  try {
    const ctx = readFileSync(ACTIVE_CTX, 'utf8');
    const phaseMatch = ctx.match(/Phases?\s*[1-7][^]*?(?=\n## |$)/);
    if (phaseMatch) phase = phaseMatch[0].split('\n')[0].replace('## ', '').trim();
  } catch {}

  return { ts, dateStr, timeStr, branch, recentCommits, uncommitted, dirtyCount, diffStat, nodeVer, lastTag, phase, userMessage };
}

function rotate() {
  const entries = readdirSync(LOG_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();

  if (entries.length > MAX_SESSIONS) {
    for (const old of entries.slice(MAX_SESSIONS)) {
      rmSync(join(LOG_DIR, old));
    }
    console.log(`  Rotated ${entries.length - MAX_SESSIONS} old sessions`);
  }
}

function writeLog(data) {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

  const header = data.userMessage
    ? `# Session: ${data.dateStr} ${data.timeStr} — ${sanitise(data.userMessage)}`
    : `# Session: ${data.dateStr} ${data.timeStr}`;

  const body = [
    '',
    `**Phase:** ${data.phase}`,
    `**Branch:** ${data.branch}`,
    `**Node:** ${data.nodeVer}`,
    `**Tag:** ${data.lastTag}`,
    '',
    '## Uncommitted Changes',
    data.dirtyCount > 0 ? `\`\`\`\n${data.uncommitted}\n\`\`\`` : '_(clean — nothing uncommitted)_',
    '',
    '## Diff Stats',
    data.diffStat || '_(no changes or not applicable)_',
    '',
    '## Recent Commits',
    `\`\`\`\n${data.recentCommits}\n\`\`\``,
    '',
    '---',
    '',
  ].join('\n');

  const filename = `${data.ts}.md`;
  const filepath = join(LOG_DIR, filename);
  writeFileSync(filepath, header + body);
  console.log(`  Wrote: ${filename}`);

  // Add to session index
  const indexPath = join(LOG_DIR, 'index.md');
  const dateLabel = `${data.dateStr} ${data.timeStr}`;
  const prefix = data.userMessage ? ` — ${sanitise(data.userMessage)}` : '';
  const entry = `| ${dateLabel} | ${data.branch} | ${data.phase}${prefix} |\n`;

  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, '# Session Log Index\n\n| Date | Branch | Phase / Notes |\n|------|--------|---------------|\n');
  }
  appendFileSync(indexPath, entry);
}

function main() {
  console.log('=== Session Log Capture ===\n');
  const data = capture();
  writeLog(data);
  rotate();
  console.log('\n✓ Done');
}

main();
