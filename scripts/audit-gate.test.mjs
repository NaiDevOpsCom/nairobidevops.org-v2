import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXIT_CODES,
  LEVELS,
  evaluateAudit,
  formatSummary,
  parseAuditReport,
} from "./audit-gate.mjs";

const GATE = fileURLToPath(new URL("./audit-gate.mjs", import.meta.url));

function reportWith(counts) {
  return JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: 0,
        ...counts,
      },
    },
  });
}

test("passes a clean report at the default threshold", () => {
  const result = evaluateAudit(reportWith({}));
  assert.equal(result.outcome, "pass");
  assert.equal(result.level, "moderate");
  assert.equal(result.failing, 0);
});

test("fails when a moderate advisory is present at the moderate threshold", () => {
  // The whole point of the gate: a moderate finding must stop before merge.
  const result = evaluateAudit(reportWith({ moderate: 2 }), "moderate");
  assert.equal(result.outcome, "fail");
  assert.equal(result.failing, 2);
});

test("passes the same moderate advisory at a high threshold", () => {
  const result = evaluateAudit(reportWith({ moderate: 2 }), "high");
  assert.equal(result.outcome, "pass");
  assert.equal(result.failing, 0);
});

test("counts high and critical together above the threshold", () => {
  const result = evaluateAudit(reportWith({ high: 1, critical: 3 }), "high");
  assert.equal(result.outcome, "fail");
  assert.equal(result.failing, 4);
});

test("does not fail on severities below the threshold", () => {
  const result = evaluateAudit(reportWith({ low: 5, info: 9 }), "moderate");
  assert.equal(result.outcome, "pass");
  assert.deepEqual(result.counts, {
    info: 9,
    low: 5,
    moderate: 0,
    high: 0,
    critical: 0,
  });
});

test("an info threshold totals every severity including low", () => {
  const result = evaluateAudit(reportWith({ info: 1, low: 1 }), "info");
  assert.equal(result.outcome, "fail");
  assert.equal(result.failing, 2);
});

test("a critical threshold ignores high findings", () => {
  const result = evaluateAudit(reportWith({ high: 4 }), "critical");
  assert.equal(result.outcome, "pass");
});

test("treats every severity as failing when the threshold is critical and critical is present", () => {
  const result = evaluateAudit(reportWith({ critical: 1 }), "critical");
  assert.equal(result.outcome, "fail");
  assert.equal(result.failing, 1);
});

test("an npm error body is unusable, not a clean report", () => {
  // This is the exact regression that failed four Dependabot PRs: the old
  // `jq ... // 0` guard read an error body as "0 vulnerabilities".
  const parsed = parseAuditReport(
    JSON.stringify({ error: { code: "ENETWORK", summary: "network failure" } }),
  );
  assert.equal(parsed.ok, false);
  assert.match(parsed.reason, /ENETWORK/);

  const result = evaluateAudit(
    JSON.stringify({ error: { code: "ENETWORK" } }),
    "moderate",
  );
  assert.equal(result.outcome, "unusable");
});

test("an error body without a code is still unusable", () => {
  const parsed = parseAuditReport(
    JSON.stringify({ error: { summary: "something broke" } }),
  );
  assert.equal(parsed.ok, false);
  assert.match(parsed.reason, /something broke/);
});

test("truncated or non-JSON output is unusable", () => {
  assert.equal(parseAuditReport('{"metadata":{"vulner').ok, false);
  assert.equal(parseAuditReport("npm ERR! network timeout").ok, false);
  assert.equal(parseAuditReport("").ok, false);
  assert.equal(parseAuditReport("   ").ok, false);
  assert.equal(parseAuditReport(undefined).ok, false);
});

test("a payload that is not an object is unusable", () => {
  assert.equal(parseAuditReport("null").ok, false);
  assert.equal(parseAuditReport("[]").ok, false);
  assert.equal(parseAuditReport('"audit"').ok, false);
});

test("a report without metadata.vulnerabilities is unusable", () => {
  // npm 6 emitted `advisories` and no metadata block; failing closed is safer
  // than silently passing a report this gate cannot interpret.
  assert.equal(parseAuditReport(JSON.stringify({ advisories: {} })).ok, false);
  assert.equal(
    parseAuditReport(JSON.stringify({ metadata: {} })).ok,
    false,
  );
  assert.equal(
    parseAuditReport(JSON.stringify({ metadata: { vulnerabilities: null } }))
      .ok,
    false,
  );
});

test("a non-numeric or negative count is unusable rather than treated as zero", () => {
  assert.equal(
    parseAuditReport(reportWith({ high: "3" })).ok,
    false,
  );
  assert.equal(parseAuditReport(reportWith({ moderate: -1 })).ok, false);
  assert.equal(parseAuditReport(reportWith({ low: 1.5 })).ok, false);
});

test("a report missing a severity count is unusable, never assumed clean", () => {
  // Defaulting an absent count to zero is exactly how a malformed report lets
  // a security gate report success without having audited anything.
  const parsed = parseAuditReport(
    JSON.stringify({ metadata: { vulnerabilities: { total: 0 } } }),
  );
  assert.equal(parsed.ok, false);
  assert.match(parsed.reason, /"info"/);

  const partial = parseAuditReport(
    JSON.stringify({
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 0,
          critical: 0,
        },
      },
    }),
  );
  assert.equal(partial.ok, true);
  for (const level of LEVELS) {
    assert.equal(partial.counts[level], 0);
  }
});

test("rejects an unknown threshold instead of guessing", () => {
  assert.throws(() => evaluateAudit(reportWith({}), "severe"), RangeError);
  assert.throws(() => evaluateAudit(reportWith({}), ""), RangeError);
});

test("formatSummary lists every severity and explains an unusable report", () => {
  const summary = formatSummary(evaluateAudit(reportWith({ high: 1 })));
  for (const level of LEVELS.slice(1)) {
    assert.match(summary, new RegExp(level));
  }
  assert.match(
    formatSummary(evaluateAudit("not json")),
    /No usable audit report/,
  );
});

test("the real frontend lockfile report shape is accepted", () => {
  // Captured shape of `npm audit --json` for a clean tree, so a future npm
  // output change shows up here rather than as a red required check.
  const result = evaluateAudit(
    JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities: {},
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 0,
          critical: 0,
          total: 0,
        },
        dependencies: { prod: 41, dev: 512, total: 553 },
      },
    }),
    "moderate",
  );
  assert.equal(result.outcome, "pass");
});

test("CLI exit codes: 0 pass, 1 findings, 2 unusable", () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-gate-"));
  const clean = join(dir, "clean.json");
  const bad = join(dir, "moderate.json");
  const broken = join(dir, "broken.json");
  writeFileSync(clean, reportWith({}));
  writeFileSync(bad, reportWith({ moderate: 1 }));
  writeFileSync(broken, '{"error":{"code":"ENETWORK"}}');

  const run = (args) => spawnSync(process.execPath, [GATE, ...args], {
    encoding: "utf8",
  });

  assert.equal(run(["--report", clean]).status, EXIT_CODES.pass);
  const failing = run(["--report", bad]);
  assert.equal(failing.status, EXIT_CODES.findings);
  assert.match(failing.stderr, /at or above "moderate" severity/);
  assert.equal(run(["--report", broken]).status, EXIT_CODES.unusable);
  assert.equal(
    run(["--level", "high", "--report", bad]).status,
    EXIT_CODES.pass,
  );
  assert.equal(run(["--level", "bogus", "--report", clean]).status, 2);
  assert.equal(run(["--report", join(dir, "missing.json")]).status, 2);
  assert.equal(run(["--nope"]).status, 2);
});

test("CLI --github-env reports the verdict to the summary step", () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-gate-env-"));
  const report = join(dir, "moderate.json");
  const envFile = join(dir, "github_env");
  writeFileSync(report, reportWith({ moderate: 1 }));
  writeFileSync(envFile, "");

  const run = spawnSync(
    process.execPath,
    [GATE, "--level", "moderate", "--report", report, "--github-env"],
    { encoding: "utf8", env: { ...process.env, GITHUB_ENV: envFile } },
  );

  assert.equal(run.status, EXIT_CODES.findings);
  const written = readFileSync(envFile, "utf8");
  assert.match(written, /^security-status=failed$/m);
  assert.match(written, /^security-details=0 critical, 0 high, 1 moderate/m);
});
