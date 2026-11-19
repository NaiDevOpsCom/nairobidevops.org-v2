#!/usr/bin/env node
/**
 * Adjudicates an `npm audit --json` report.
 *
 * Why this exists: `npm audit` reuses one exit code for two very different
 * outcomes - "vulnerabilities were found" and "the advisory endpoint could not
 * be reached". Treating those alike is what turned a registry hiccup into four
 * red Dependabot PRs with a bare "exit code 1" and no diagnostic. This module
 * answers exactly one question: given a report, does it pass the threshold?
 * The caller retries when the report is unusable and fails closed when retries
 * are exhausted.
 *
 * Both required checks (Hardened Build Verification and Quality Gates) run this
 * single implementation, so their verdicts cannot drift apart again.
 *
 * Exit codes: 0 = pass, 1 = findings at or above the level, 2 = unusable report.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const LEVELS = ["info", "low", "moderate", "high", "critical"];
export const DEFAULT_LEVEL = "moderate";

export const EXIT_CODES = { pass: 0, findings: 1, unusable: 2 };

export function isLevel(level) {
  return typeof level === "string" && LEVELS.includes(level);
}

/**
 * Returns `{ ok: true, counts }` for a real report, or `{ ok: false, reason }`
 * when the payload is an error body, truncated JSON, or otherwise not a report.
 * A missing report must never be read as "zero vulnerabilities".
 */
export function parseAuditReport(text) {
  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, reason: "npm audit produced no output" };
  }

  let report;
  try {
    report = JSON.parse(text);
  } catch {
    return {
      ok: false,
      reason: "npm audit output is not valid JSON (the run did not complete)",
    };
  }

  if (report === null || typeof report !== "object" || Array.isArray(report)) {
    return { ok: false, reason: "npm audit output is not a JSON object" };
  }

  // npm emits `{"error": {...}}` for network, auth and registry failures.
  const errorCode =
    report.error && (report.error.code ?? report.error.summary);
  if (errorCode) {
    return {
      ok: false,
      reason: `npm audit reported an error instead of a report (${errorCode})`,
    };
  }

  const counts = report.metadata?.vulnerabilities;
  if (counts === null || typeof counts !== "object" || Array.isArray(counts)) {
    return {
      ok: false,
      reason: "report has no metadata.vulnerabilities block",
    };
  }

  // Every severity must be present as a non-negative integer. Defaulting a
  // missing or malformed count to zero is how a malformed report passes a
  // security gate: the step reads "0" and reports success without having
  // audited anything. Fail closed instead.
  const normalized = {};
  for (const level of LEVELS) {
    const value = counts[level];
    if (!Number.isInteger(value) || value < 0) {
      return {
        ok: false,
        reason: `report is missing a valid "${level}" count`,
      };
    }
    normalized[level] = value;
  }

  return { ok: true, counts: normalized };
}

/**
 * Applies the threshold. `info` and above is everything, so a threshold of
 * "info" totals every severity; a threshold of "high" counts high + critical.
 */
export function evaluateAudit(text, level = DEFAULT_LEVEL) {
  if (!isLevel(level)) {
    throw new RangeError(
      `unknown audit level "${level}" (expected one of: ${LEVELS.join(", ")})`,
    );
  }

  const parsed = parseAuditReport(text);
  if (!parsed.ok) {
    return { outcome: "unusable", reason: parsed.reason, level };
  }

  const threshold = LEVELS.indexOf(level);
  const failing = LEVELS.slice(threshold).reduce(
    (total, current) => total + parsed.counts[current],
    0,
  );

  return {
    outcome: failing > 0 ? "fail" : "pass",
    level,
    counts: parsed.counts,
    failing,
  };
}

/** Human-readable summary used by the workflow log and the step summary. */
export function formatSummary(result) {
  if (result.outcome === "unusable") {
    return `⚠️ No usable audit report: ${result.reason}`;
  }

  const lines = ["📊 Vulnerability summary (all dependencies):"];
  for (const level of LEVELS.slice(1)) {
    lines.push(`   ${level.padEnd(9)} ${result.counts[level]}`);
  }
  return lines.join("\n");
}

function detailsFor(result) {
  if (result.outcome === "unusable") {
    return result.reason;
  }
  const { counts } = result;
  return `${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low`;
}

function parseArgs(argv) {
  const args = { level: DEFAULT_LEVEL, report: null, githubEnv: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--level") {
      args.level = argv[index + 1];
      index += 1;
    } else if (arg === "--report") {
      args.report = argv[index + 1];
      index += 1;
    } else if (arg === "--github-env") {
      args.githubEnv = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`unknown argument "${arg}"`);
    }
  }

  return args;
}

function readStdin() {
  // Without a piped report (an interactive shell) reading fd 0 would block.
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`::error::${error.message}`);
    return EXIT_CODES.unusable;
  }

  if (args.help) {
    console.log(
      "Usage: node scripts/audit-gate.mjs [--level <info|low|moderate|high|critical>] [--report <path>] [--github-env]",
    );
    return EXIT_CODES.pass;
  }

  if (!isLevel(args.level)) {
    console.error(
      `::error::Invalid --level "${args.level}" (expected: ${LEVELS.join("|")})`,
    );
    return EXIT_CODES.unusable;
  }

  let text;
  try {
    text = args.report ? readFileSync(args.report, "utf8") : readStdin();
  } catch (error) {
    console.error(`::warning::Could not read audit report: ${error.message}`);
    return EXIT_CODES.unusable;
  }

  const result = evaluateAudit(text, args.level);
  console.log(formatSummary(result));

  if (args.githubEnv && process.env.GITHUB_ENV) {
    const status = result.outcome === "fail" ? "failed" : "success";
    appendFileSync(
      process.env.GITHUB_ENV,
      `security-status=${status}\nsecurity-details=${detailsFor(result)}\n`,
    );
  }

  if (result.outcome === "unusable") {
    console.error(`::warning::${result.reason}`);
    return EXIT_CODES.unusable;
  }

  if (result.outcome === "fail") {
    console.error(
      `::error::${result.failing} vulnerability(ies) at or above "${args.level}" severity.`,
    );
    return EXIT_CODES.findings;
  }

  console.log(`✅ No vulnerabilities at or above "${args.level}" severity`);
  return EXIT_CODES.pass;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}
