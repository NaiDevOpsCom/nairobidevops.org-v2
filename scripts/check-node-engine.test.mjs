import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateEngines,
  enginesNodeFromNpmView,
} from "./check-node-engine.js";

test("ok when current range is a subset of every dep range", () => {
  const r = evaluateEngines(">=18", [">=16", ">=14"]);
  assert.equal(r.status, "ok");
});

test("bump when >=maxMin is a safe candidate", () => {
  const r = evaluateEngines("^16.0.0", [">=18.0.0", ">=16.0.0"]);
  assert.equal(r.status, "bump");
  assert.equal(r.candidate, ">=18.0.0");
});

test("narrows an explicit bounded AND range without re-admitting the bound", () => {
  // `>=20 <23` is one comparator set; the fix must keep the `<23` bound
  // instead of flattening it to `>=22` and re-admitting the Node 23+ line.
  const r = evaluateEngines(">=20 <23", [">=22"]);
  assert.equal(r.status, "bump");
  assert.equal(r.candidate, "^22.0.0");
});

test("unset current range reports every dependency range as incompatible", () => {
  const r = evaluateEngines(null, [">=18", ">=20"]);
  assert.deepEqual(r.incompatible, [">=18", ">=20"]);
});

test("composes the intersection of OR ranges instead of bailing out", () => {
  const r = evaluateEngines("^20.19.0 || >=22.12.0", [
    "^22.22.2 || ^24.15.0 || >=26.0.0",
  ]);
  assert.equal(r.status, "bump");
  assert.equal(r.candidate, "^22.22.2 || ^24.15.0 || >=26.0.0");
  assert.ok(r.incompatible.length === 1);
});

test("keeps curated exclusions when narrowing an OR range", () => {
  // Node 23/25 are deliberately excluded by this curated OR range; the
  // composed candidate must keep excluding them (no widening to a floor).
  const r = evaluateEngines("^22.12.0 || ^24.0.0 || >=26.0.0", [">=22.22.2"]);
  assert.equal(r.status, "bump");
  assert.equal(r.candidate, "^22.22.2 || ^24.0.0 || >=26.0.0");
});

test("resolves the real frontend dependency intersection and is idempotent", () => {
  const deps = [
    "^20.19.0 || ^22.13.0 || >=24.0.0",
    "^20.0.0 || ^22.0.0 || >=24.0.0",
  ];
  const r = evaluateEngines("^20.19.0 || >=22.12.0", deps);
  assert.equal(r.status, "bump");
  assert.equal(r.candidate, "^20.19.0 || ^22.13.0 || >=24.0.0");
  assert.equal(evaluateEngines(r.candidate, deps).status, "ok");
});

test("manual when no Node version satisfies every constraint", () => {
  // Disjoint current/dependency ranges leave nothing to intersect, and the
  // current range is not a simple floor, so widening it needs a human.
  const r = evaluateEngines("^18.0.0 || >=20 <21", [">=22"]);
  assert.equal(r.status, "manual");
});

test("ignores universal dependency ranges when the current range is unset", () => {
  // Semver normalises `*`, `>=0`, and `>=0.0.0` to the universal range; none
  // of them should be listed as an incompatibility.
  const r = evaluateEngines(null, ["*", ">=0", ">=18"]);
  assert.deepEqual(r.incompatible, [">=18"]);
  assert.equal(r.status, "bump");
  assert.equal(r.candidate, ">=18.0.0");
});

test("does not format a major-zero upper bound as a caret range", () => {
  // `^0.1.0` means `>=0.1.0 <0.2.0-0`, so rewriting this pair as a caret
  // range would silently drop the `<1.0.0` bound and admit every 1.x release.
  const r = evaluateEngines(">=0.1.0", [">=0.1.0 <1.0.0-0"]);
  assert.equal(r.status, "bump");
  assert.equal(r.candidate, ">=0.1.0 <1.0.0-0");
});

test("extracts node range from every npm view response shape", () => {
  assert.equal(enginesNodeFromNpmView(">=18"), ">=18");
  assert.equal(enginesNodeFromNpmView({ node: ">=20" }), ">=20");
  assert.equal(enginesNodeFromNpmView([{ node: ">=0.10.0" }]), ">=0.10.0");
  assert.equal(enginesNodeFromNpmView([{}]), null);
  assert.equal(enginesNodeFromNpmView(undefined), null);
});
