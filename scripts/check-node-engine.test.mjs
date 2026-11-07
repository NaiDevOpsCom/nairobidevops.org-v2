import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateEngines, enginesNodeFromNpmView } from "./check-node-engine.js";

test("ok when current range is a subset of every dep range", () => {
  const r = evaluateEngines(">=18", [">=16", ">=14"]);
  assert.equal(r.status, "ok");
});

test("bump when >=maxMin is a safe candidate", () => {
  const r = evaluateEngines("^16.0.0", [">=18.0.0", ">=16.0.0"]);
  assert.equal(r.status, "bump");
  assert.equal(r.candidate, ">=18.0.0");
});

test("manual when OR-ranges cannot be auto-reduced", () => {
  const r = evaluateEngines("^20.19.0 || >=22.12.0", [
    "^22.22.2 || ^24.15.0 || >=26.0.0",
  ]);
  assert.equal(r.status, "manual");
  assert.ok(r.incompatible.length === 1);
});

test("manual when the >=floor candidate would widen the current range", () => {
  // Node 23/25 are deliberately excluded by this curated OR range; a flat
  // `>=` floor would re-admit them, so the automation must not write it.
  // (Multi-line OR ranges are never auto-rewritten — only simple floors.)
  const r = evaluateEngines("^22.12.0 || ^24.0.0 || >=26.0.0", [">=22.22.2"]);
  assert.equal(r.status, "manual");
});

test("extracts node range from every npm view response shape", () => {
  assert.equal(enginesNodeFromNpmView(">=18"), ">=18");
  assert.equal(enginesNodeFromNpmView({ node: ">=20" }), ">=20");
  assert.equal(enginesNodeFromNpmView([{ node: ">=0.10.0" }]), ">=0.10.0");
  assert.equal(enginesNodeFromNpmView([{}]), null);
  assert.equal(enginesNodeFromNpmView(undefined), null);
});
