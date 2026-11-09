# Dependency Updates Triage & Upgrade Plan (2026-11-07)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 14 open Dependabot branches (10 listed + 4 extras), land a safe in-range npm refresh, upgrade Vitest to 5.1.0 and jsdom to 31.0.0, pin all GitHub Actions to current SHAs, and harden `.github/dependabot.yml` on `main` so Dependabot stops producing stale/superseded PRs.

**Architecture:** Four separate PR tracks off the existing branch topology: (1) branch hygiene (no code), (2) npm refresh + Vitest 5 + jsdom 31 on `pre-staging` in dependency order, (3) GitHub Actions SHA pins on `pre-staging`, (4) Dependabot config on `main` (the ecosystem's authoritative config). Each track is independently revertable. No majors beyond the explicitly listed targets.

**Tech Stack:** npm (lockfile v3), Vitest 5.1.0, jsdom 31.0.0, Vite 8, GitHub Actions (SHA-pinned), Dependabot.

**Spec:** The triage verdict table in this document is the spec — it was produced by verifying every Dependabot branch against `origin/pre-staging` (diffs, installed versions, npm registry latest, peer ranges, engines) on 2026-11-07.

## Global Constraints

- Work in an isolated worktree (`superpowers:using-git-worktrees`). `frontend/client/src/App.tsx` and `frontend/client/src/components/Navbar.tsx` have uncommitted edits on the main checkout — never touch those files in any task.
- npm tasks branch off `pre-staging` (all Dependabot npm PRs already target it via `target-branch`).
- The Dependabot config task branches off `main` — `main`'s `.github/dependabot.yml` is what Dependabot actually reads.
- Baseline gate before every npm commit: from `frontend/`, `npm ci && npm run check && npm test && npm run test:coverage && npm run build:ci` must all pass.
- Deferred majors — do NOT bump in this plan: `eslint` 10.x, `@eslint/js` 10.x, `typescript` 7.x, `motion` 14.x, `@hookform/resolvers` 7.x, `react-intersection-observer` 11.x, `actions/labeler` v7, `dawidd6/action-send-mail` v24.
- Never run `npm install`/`npm update` at the repo root (root manifest is legacy drift; only Task 8 touches it, explicitly).

## Review Focus

1. **Node engine matrix** — after Vitest 5 + jsdom 31, `engines.node` must be a subset of every dependency's range. Expected end state: `^22.22.2 || ^24.15.0 || >=26.0.0`. Verify with the registry check in Task 3/4 (CI runs Node `22`; local Node is `24.21.0`; both fine).
2. **Major leakage in `npm update --save`** — the refresh must produce zero major-version jumps. Review the `package.json` diff against the expected list in Task 2 before committing.
3. **Stale Dependabot resurrection** — branches must be closed *before* the replacement PRs open, or Dependabot will rebase/confuse them. Task 1 is order-critical.
4. **SHA replacement precision** — action pins share file locations with lookalike SHAs (e.g. checkout `9c091bb…` vs deploy-backend untagged `0c366fd…`). Each replacement step ends with a grep that must return empty.
5. **Prettier/ESLint minor bumps reformatting files** — if `npm run check` fails on `format:check` after the refresh, run `npm run format` and include the reformat in the same commit rather than pinning prettier back.

---

## Triage Verdict (the spec)

### The 10 listed updates

| # | Branch / PR | What it contains | Verdict | Why (evidence) |
|---|---|---|---|---|
| 1 | `dependabot/npm_and_yarn/frontend/pre-staging/types/node-26.6.4` | `@types/node ^26.1.1 → ^26.6.4` | **Close — superseded** | Installed/locked is already `26.6.6`; npm latest is `26.6.6`. Covered by Task 2. |
| 2 | `…/vite-b53666f74c` | `vite ^8.1.3 → ^8.1.4` | **Close — superseded** | Installed/locked `8.3.6` = npm latest. Covered by Task 2. |
| 3 | `…/vite-plugins-a4bb6fe61e` | plugin-react `→ ^6.0.4`, tailwindcss plugins `→ ^4.3.3`, postcss `→ ^8.5.22`, autoprefixer `→ ^10.5.4` | **Close — superseded** | Installed: plugin-react `6.2.1`, tailwindcss `4.3.5`, postcss `8.5.32`, autoprefixer `10.6.2` — all newer. Covered by Task 2. |
| 4 | `github/codeql-action/init-4.37.0` | init only, `v4.36.2 → v4.37.0` | **Close — superseded + incomplete** | `pre-staging` already has init **and** analyze at `4.37.0`; npm-latest equivalent is `v4.39.3`. Task 5 pins both refs to `v4.39.3`. |
| 5 | `actions/cache-6.1.0` | one file: `hardened-build-check.yml` v5.0.5 → v6.1.0 | **Close — superseded + incomplete** | `hardened-build-check.yml:83` already has v6.1.0; four other cache uses are still v4.2.2 and the composite has v5.0.5. Task 5 covers all 5 sites. |
| 6 | `…/frontend-dependencies-b735a4ce7f` | group bump: tanstack `^5.102.8`, lucide `^1.45.0`, zod `^4.6.4`, hookform `^5.9.1`, input-otp `^1.5.0` … but keeps `vite ^8.1.3`, `@types/node ^26.1.1`, `vitest ^4.1.10` | **Close — superseded** | Everything it bumps is older than installed (tanstack `5.107.1`, lucide `1.70.0`, zod `4.6.7`); what it leaves stale is fixed by Task 2. |
| 7 | `…/tooling-524a21b10d` | eslint `^10.11.0`, `@eslint/js ^10.0.1`, typescript `^7.0.2`, coverage/ui `^5.0.2` while `vitest` stays `^4.1.10` | **Close — blocked + inconsistent** | ESLint 10 blocked by plugin peers (see Deferred ledger); TS 7 blocked by `@typescript-eslint@8.72.1` peer `typescript <6.1.0`; even its own diff is broken (vitest 4.1.10 with coverage-v8 5.0.2 violates the exact-match peer). Task 3 does vitest 5 properly. |
| 8 | `actions/setup-node-7.0.0` | 5 of 7 setup-node sites → v7.0.0 | **Close — incomplete** | Misses `cache-vite-npm/action.yml:11` and `staging-checks.yml:401`; npm-latest equivalent is v7.1.0. Task 5 covers all 7 sites at v7.1.0. |
| 9 | `actions/labeler-6.2.0` | `pr-auto-label.yml` v6.1.0 → v6.2.0 | **Close — recreate manually** | Correct target (v6.2.0 = latest 6.x; v7 changes config schema — deferred). Branch targets `main` and is stale; Task 5 applies the pin on the `pre-staging` track. |
| 10 | `…/vitest-5.0.3` | `vitest ^4.1.10 → ^5.0.3` only | **Close — broken as-is** | Leaves `@vitest/coverage-v8`/`@vitest/ui` at `4.1.10` → exact-match peer conflict with vitest 5. Also stale (vitest 5.1.0 is latest). Task 3 replaces it correctly. |

### 4 extra branches (same cleanup sweep)

| Branch | Verdict | Why |
|---|---|---|
| `…/jsdom-30.1.2` | **Close — recreate at 31.0.0** | jsdom latest is `31.0.0`; 30.1.2 is stale. Task 4. |
| `…/globals-17.13.0` | **Delete (0 unique commits)** | Already merged into `pre-staging` (PR #423). Installed `17.14.0`. |
| `…/react-day-picker-10.0.2` | **Delete (0 unique commits)** | Already merged into `pre-staging` (PR #420). Lockfile has `10.0.2`; local `node_modules` is stale-invalid — `npm ci` in Task 2 fixes it. |
| `dawidd6/action-send-mail-18` | **Close — already applied** | `deploy.yml:345,380` and `staging-deploy.yml:459,494` already on v18 `94de994a…`. Task 5 extends v18 to the two backend deploy workflows. |

---

## Global Constraints (version targets, copied for executors)

- Vitest 5.1.0 engines: `^22.12.0 || ^24.0.0 || >=26.0.0`; peer requires `@vitest/coverage-v8@5.1.0` and `@vitest/ui@5.1.0` **exactly**; peer jsdom `*`.
- jsdom 31.0.0 engines: `^22.22.2 || ^24.15.0 || >=26.0.0`.
- End-state `engines.node` in `frontend/package.json`: `^22.22.2 || ^24.15.0 || >=26.0.0`.
- Action pin targets (verify SHA at execution with `git ls-remote --tags <repo> 'refs/tags/<tag>*'`; use the `^{}`-peeled commit for annotated tags):

| Action | Tag | Pinned SHA |
|---|---|---|
| `actions/checkout` | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| `actions/cache` | v6.1.0 | `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` |
| `actions/download-artifact` | v8.0.2 | `9000827ccba6bdab643e8b6fd33ac0654aef8333` |
| `github/codeql-action/init` + `/analyze` | v4.39.3 | `33d7b85da1a04171e211befe2c739303b9a4c066` |
| `actions/labeler` | v6.2.0 | `b8dd2d9be0f68b860e7dae5dae7d772984eacd6d` |
| `dawidd6/action-send-mail` | v18 | `94de994a9f6fffee200243214e17002e2920bb59` |

---

### Task 1: Close stale Dependabot branches and PRs

**Files:** none (remote branch/PR hygiene only)

**Interfaces:** Produces: a clean Dependabot slate so Tasks 2–5 replacements don't collide with rebasing Dependabot branches.

- [ ] **Step 1: Close the 12 "close" branches with a short verdict comment**

`gh` is unavailable locally — use it after `gh auth login`, or the GitHub UI (PR → comment → "Close pull request" → "Delete branch").

```bash
# run once after authenticating; each PR gets the same closing comment
COMMENT="Closing: target version is superseded or blocked; replacement handled manually per docs/superpowers/plans/2026-11-07-dependency-updates.md."
for BRANCH in \
  "dependabot/npm_and_yarn/frontend/pre-staging/types/node-26.6.4" \
  "dependabot/npm_and_yarn/frontend/pre-staging/vite-b53666f74c" \
  "dependabot/npm_and_yarn/frontend/pre-staging/vite-plugins-a4bb6fe61e" \
  "dependabot/github_actions/github/codeql-action/init-4.37.0" \
  "dependabot/github_actions/actions/cache-6.1.0" \
  "dependabot/npm_and_yarn/frontend/pre-staging/frontend-dependencies-b735a4ce7f" \
  "dependabot/npm_and_yarn/frontend/pre-staging/tooling-524a21b10d" \
  "dependabot/github_actions/actions/setup-node-7.0.0" \
  "dependabot/github_actions/actions/labeler-6.2.0" \
  "dependabot/npm_and_yarn/frontend/pre-staging/vitest-5.0.3" \
  "dependabot/npm_and_yarn/frontend/pre-staging/jsdom-30.1.2" \
  "dependabot/github_actions/dawidd6/action-send-mail-18"; do
  PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')
  gh pr comment "$PR" --body "$COMMENT"
  gh pr close "$PR" --delete-branch
done
```

- [ ] **Step 2: Delete the 2 already-merged branches (PRs #420, #423 are merged — just delete)**

```bash
gh api -X DELETE repos/{owner}/{repo}/git/refs/heads/dependabot/npm_and_yarn/frontend/pre-staging/globals-17.13.0
gh api -X DELETE repos/{owner}/{repo}/git/refs/heads/dependabot/npm_and_yarn/frontend/pre-staging/react-day-picker-10.0.2
```

If `gh` is not authenticated, close/delete all 14 via the GitHub UI (PRs → close with the comment; branches tab for the two merged ones).

- [ ] **Step 3: Verify**

```bash
git ls-remote origin 'refs/heads/dependabot/*'
```
Expected: empty output (no dependabot heads remain).

---

### Task 2: Safe in-range npm refresh (`pre-staging`)

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

**Interfaces:**
- Produces: manifest ranges equal to installed latest-within-major; clean `node_modules` (fixes the invalid local `react-day-picker@10.0.1`). Later tasks build on this state.
- Consumes: nothing.

- [ ] **Step 1: Branch and baseline**

```bash
git worktree add ../nbd-deps -b chore/deps-refresh-2026-11-07 origin/pre-staging
cd ../nbd-deps/frontend
npm ci
npm run check && npm test && npm run test:coverage && npm run build:ci
```
Expected: all green (this is the recorded baseline).

- [ ] **Step 2: Run the refresh**

```bash
npm update --save
```
This lifts every range to the latest version inside the current major and rewrites `package.json` accordingly.

- [ ] **Step 3: Review the diff for major leakage (Review Focus #2)**

`git diff ../frontend/package.json` — expected changes (versions verified 2026-11-07 against the registry):

- deps: `@tanstack/react-query ^5.101.2→^5.107.1`, `lucide-react ^1.24.0→^1.70.0`, `zod ^4.4.3→^4.6.7`, `@hookform/resolvers ^5.4.0→latest 5.x (5.9.2)`, `input-otp ^1.4.2→^1.5.0`, `tailwind-merge ^3.6.0→^3.7.0`, `wouter ^3.10.0→^3.13.0`, `motion ^12.42.2→latest 12.x (12.43.0)`, `react`/`react-dom ^19.2.7→^19.3.1`, `react-hook-form ^7.81.0→^7.91.0`, `recharts ^3.9.2→^3.10.1`, `react-day-picker` stays `^10.0.2`
- devDeps: `@types/react`/`@types/react-dom →^19.3.0`, `@vitejs/plugin-react ^6.0.3→^6.2.1`, `vite ^8.1.3→^8.3.6`, `@tailwindcss/* ^4.3.2→^4.3.5`, `tailwindcss ^4.2.1→^4.3.5`, `postcss ^8.5.16→^8.5.32`, `autoprefixer ^10.5.2→^10.6.2`, `esbuild ^0.28.1→^0.28.2`, `terser ^5.48.0→^5.51.2`, `eslint ^9.39.3→^9.39.5`, `@eslint/js ^9.39.3→^9.39.5`, `globals ^17.13.0→^17.14.0`, `@vitest/eslint-plugin ^1.6.21→^1.6.28`, `eslint-plugin-security ^4.0.1→^4.2.1`, `prettier ^3.9.4→latest 3.x (3.9.10)`, `tsx ^4.23.0→^4.23.15`
- MUST NOT change (majors): `eslint` stays 9.x, `typescript` stays `^6.0.3`, `vitest`/`@vitest/coverage-v8`/`@vitest/ui` stay `^4.1.12`, `jsdom` stays `^29.1.1`, `@vitest/mocker` stays `^5.1.0` (removed in Task 3). Same-major movement is fine, e.g. `@types/node ^26.1.1→^26.6.6` is expected.
- Any hunk moving a package to a new major → revert that single entry (`npm pkg set`) and note it in the deferred ledger instead.

- [ ] **Step 4: Run the gate (Review Focus #5)**

```bash
npm run check && npm test && npm run test:coverage && npm run build:ci
```
If `format:check` fails: `npm run format`, re-run the gate, include the reformat in this commit.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): refresh npm ranges to latest within current majors"
git push -u origin chore/deps-refresh-2026-11-07   # PR base: pre-staging
```

---

### Task 3: Vitest 5.1.0 upgrade (`pre-staging`)

**Files:**
- Modify: `frontend/package.json` (vitest trio + remove `@vitest/mocker` + `engines.node`)
- Modify: `frontend/package-lock.json`
- Test: existing `frontend/client/src/utils/__tests__/hardenedBuildCheck.test.ts`, `safeNavigate.test.ts` (no new tests — the gate *is* the test)

**Interfaces:**
- Consumes: Task 2 state (ranges refreshed).
- Produces: vitest/coverage/ui all `5.1.0`; `@vitest/mocker` gone from prod deps; `engines.node = "^22.12.0 || ^24.0.0 || >=26.0.0"`.

- [ ] **Step 1: Branch off the merged Task 2 state**

```bash
git worktree add ../nbd-vitest5 -b chore/vitest-5 origin/pre-staging   # after Task 2's PR merges; until then branch off chore/deps-refresh-2026-11-07
cd ../nbd-vitest5/frontend && npm ci
```

- [ ] **Step 2: Upgrade the exact trio, remove the unused mocker**

```bash
npm install -D vitest@5.1.0 @vitest/coverage-v8@5.1.0 @vitest/ui@5.1.0
npm uninstall @vitest/mocker
```
`@vitest/mocker` sits in `dependencies` (not dev) at `^5.1.0` and is imported nowhere (verified by grep) — the only copy needed is vitest's nested one.

- [ ] **Step 3: Raise `engines.node` to the Vitest 5 floor**

```bash
npm pkg set 'engines.node=^22.12.0 || ^24.0.0 || >=26.0.0'
```

- [ ] **Step 4: Run the gate**

```bash
npm run check && npm test && npm run test:coverage && npm run build:ci
```
Expected: PASS. `vitest.config.ts` needs no edits (`root`, `include`, `environment: "jsdom"`, `coverage.provider: "v8"` all valid in v5).
Rollback criterion: if vitest 5 hard-fails for reasons not fixable in ≤30 min, `git restore` this task and leave vitest 4; do NOT keep a half-upgraded trio.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): upgrade vitest to 5.1.0 and drop unused @vitest/mocker"
git push -u origin chore/vitest-5    # PR base: pre-staging
```

---

### Task 4: jsdom 31.0.0 upgrade (`pre-staging`)

**Files:**
- Modify: `frontend/package.json` (`jsdom` + `engines.node` narrowing)
- Modify: `frontend/package-lock.json`
- Test: same existing test files

**Interfaces:**
- Consumes: Task 3 (vitest 5.1.0 — its jsdom peer is `*`).
- Produces: jsdom `^31.0.0`; final `engines.node = "^22.22.2 || ^24.15.0 || >=26.0.0"`.

- [ ] **Step 1: Branch off the merged Task 3 state and upgrade**

```bash
git worktree add ../nbd-jsdom31 -b chore/jsdom-31 origin/pre-staging
cd ../nbd-jsdom31/frontend && npm ci
npm install -D jsdom@31.0.0
```

- [ ] **Step 2: Narrow engines to the jsdom 31 floor (final engine state)**

```bash
npm pkg set 'engines.node=^22.22.2 || ^24.15.0 || >=26.0.0'
```
Sanity: this is a subset of vitest 5.1.0's range, vite 8.3.6's `^20.19.0 || >=22.12.0`, and eslint 9's range. CI runs Node `22` (≥22.22.2) and local Node is `24.21.0` (≥24.15.0).

- [ ] **Step 3: Run the gate**

```bash
npm run check && npm test && npm run test:coverage && npm run build:ci
```
Expected: PASS.
Rollback ladder: if jsdom 31 breaks tests → try `npm install -D jsdom@30.1.2` (same engines) → if still broken → `npm install -D jsdom@29.1.1`, set engines back to `^22.12.0 || ^24.0.0 || >=26.0.0`, and record jsdom in the deferred ledger. Never commit a failing gate.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): upgrade jsdom to 31.0.0 and narrow engines.node"
git push -u origin chore/jsdom-31    # PR base: pre-staging
```

---

### Task 5: Pin GitHub Actions to current SHAs (`pre-staging`)

**Files (all under `.github/`):**
- Modify: `actions/cache-vite-npm/action.yml:11,19`
- Modify: `workflows/node-engine-update.yml:32`, `release.yml:48`, `validate-security-policy.yml:27`, `security-pipeline.yml:41`, `security-validation.yml:45`, `staging-checks.yml:401`
- Modify: `workflows/staging-checks.yml:391`, `project-checks.yml:79`, `deploy-backend-prod.yml:45`, `deploy-backend-staging.yml:43` (cache v4.2.2)
- Modify: all `actions/checkout` uses (`v7.0.0` → `v7.0.1`) + untagged `0c366fd6…` in `deploy-backend-prod.yml:35,71` and `deploy-backend-staging.yml:33,69`
- Modify: `deploy.yml:96`, `staging-deploy.yml:102` (download-artifact v8.0.1), `project-checks.yml:111,136,161,186` (v4.3.0)
- Modify: `codeql.yml:67,96` (v4.37.0 → v4.39.3)
- Modify: `pr-auto-label.yml:17` (labeler v6.1.0 → v6.2.0)
- Modify: `deploy-backend-prod.yml:249`, `deploy-backend-staging.yml:324` (send-mail v17 → v18)

**Interfaces:**
- Consumes: SHA table in Global Constraints.
- Produces: zero workflow refs older than the table. CI's `actionlint` workflow validates on PR.

- [ ] **Step 1: Branch**

```bash
git worktree add ../nbd-actions -b chore/pin-actions-2026-11-07 origin/pre-staging
```

- [ ] **Step 2: setup-node → v7.1.0 in all 7 sites**

Replace every occurrence of `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0` with `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0`.
Verify:
```bash
grep -rn "setup-node@" .github | grep -v "949feb2413d6458794dcd2491c4babbbce0c15c1"
```
Expected: empty. Commit: `ci: pin actions/setup-node to v7.1.0 across all workflows`.

- [ ] **Step 3: cache → v6.1.0 in all 5 sites**

Replace `actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.2` (4 sites) and `actions/cache@27d5ce7f107fe9357f9df03efb73ab90386fccae # v5.0.5` (composite) with `actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0`.
Verify:
```bash
grep -rn "actions/cache@" .github | grep -v "55cc8345863c7cc4c66a329aec7e433d2d1c52a9"
```
Expected: empty (hardened-build-check already at target). Commit: `ci: pin actions/cache to v6.1.0 across all workflows`.

- [ ] **Step 4: checkout → v7.0.1 + download-artifact → v8.0.2**

Replace `actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0` everywhere, and the untagged `actions/checkout@0c366fd6a839edf440554fa01a7085ccba70ac98` (4 sites in the two backend deploy workflows) with `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`.
Replace `actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1` (2 sites) and `actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0` (4 sites) with `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2`. Inputs are only `name:`/`path:` everywhere — v4→v8 compatible.
Verify:
```bash
grep -rn "actions/checkout@\|download-artifact@" .github | grep -vE "3d3c42e5aac5ba805825da76410c181273ba90b1|9000827ccba6bdab643e8b6fd33ac0654aef8333"
```
Expected: empty. Commit: `ci: pin checkout to v7.0.1 and download-artifact to v8.0.2`.

- [ ] **Step 5: codeql, labeler, send-mail**

- `codeql.yml:67` init and `:96` analyze: → `github/codeql-action/<x>@33d7b85da1a04171e211befe2c739303b9a4c066 # v4.39.3` (both refs must move together).
- `pr-auto-label.yml:17`: → `actions/labeler@b8dd2d9be0f68b860e7dae5dae7d772984eacd6d # v6.2.0` (`.github/labeler.yml` uses v6 `changed-files` schema — unchanged).
- `deploy-backend-prod.yml:249` and `deploy-backend-staging.yml:324`: → `dawidd6/action-send-mail@94de994a9f6fffee200243214e17002e2920bb59 # v18` (the other 4 send-mail uses already have this SHA).

Verify:
```bash
grep -rn "codeql-action/\|actions/labeler@\|action-send-mail@" .github | grep -vE "33d7b85da1a04171e211befe2c739303b9a4c066|b8dd2d9be0f68b860e7dae5dae7d772984eacd6d|94de994a9f6fffee200243214e17002e2920bb59"
```
Expected: empty. Commit: `ci: pin codeql-action v4.39.3, labeler v6.2.0, send-mail v18`.

- [ ] **Step 6: Push, let CI `actionlint` run, merge**

```bash
git push -u origin chore/pin-actions-2026-11-07    # PR base: pre-staging
```
The GitHub Actions Lint workflow runs on any PR touching `.github/workflows/**` or `.github/actions/**` — it is the gate for this task.

---

### Task 6: Harden `.github/dependabot.yml` on `main`

**Files:**
- Modify: `.github/dependabot.yml` (on a branch off `origin/main`)

**Interfaces:**
- Consumes: the npm block already correct on `pre-staging` (ignore list + `tooling` group) — copy from there.
- Produces: Dependabot config that stops opening the PR classes closed in Task 1.

- [ ] **Step 1: Branch off main**

```bash
git worktree add ../nbd-depconf -b chore/dependabot-config origin/main
```

- [ ] **Step 2: Sync the npm block from pre-staging**

Copy the `ignore:` entries for `eslint`, `@eslint/*`, `typescript` and the `update-types: ["minor", "patch"]` line on the `tooling` group from `origin/pre-staging:.github/dependabot.yml`.

- [ ] **Step 3: Fold stragglers into groups**

- Add `globals` and `jsdom` to the `tooling` group patterns (they opened standalone PRs).
- Keep `react-day-picker` in `exclude-patterns` (intentionally standalone).

- [ ] **Step 4: Fix the `github-actions` ecosystem block**

- Add `target-branch: "pre-staging"` (today its PRs target `main`, 148 commits behind — the reason Task 1's action branches were all stale).
- Add a group so minor/patch action bumps land as one PR:
  ```yaml
    groups:
      actions-minor-patch:
        update-types: ["minor", "patch"]
  ```
- Add ignores for the deferred majors:
  ```yaml
    ignore:
      - dependency-name: "actions/labeler"
        update-types: ["version-update:semver-major"]
      - dependency-name: "dawidd6/action-send-mail"
        update-types: ["version-update:semver-major"]
  ```

- [ ] **Step 5: Copy the composer block from pre-staging**

`main` has no `composer` entry; `pre-staging`'s does. Copy it verbatim so backend dependency PRs resume against `pre-staging`.

- [ ] **Step 6: Validate and push**

```bash
npx --yes yaml-lint .github/dependabot.yml
git add .github/dependabot.yml
git commit -m "chore(deps): harden dependabot config (sync ignores, group actions, target pre-staging)"
git push -u origin chore/dependabot-config    # PR base: main
```
Note: after this merges to `main`, re-run `npm update --save`-style verification once — Dependabot should reopen nothing from the Deferred ledger.

---

### Task 7 (optional): Fix `scripts/check-node-engine.js` detection bug

**Files:**
- Modify: `scripts/check-node-engine.js:70-77,162-204`
- Create: `scripts/check-node-engine.test.mjs`
- Test: `scripts/check-node-engine.test.mjs` (run with `node --test`)

**Interfaces:**
- Produces: exported pure function `evaluateEngines(currentRange, dependencyRanges)` → `{ status: "ok" | "bump" | "manual", candidate?: string, incompatible: string[] }`.
- Bug: line 183 runs `semver.satisfies(requiredMinimum, currentRange)` — "is the deps' minimum inside our range" — which returns true (`"No update needed"`) even when our range still *allows* unsupported Nodes (e.g. `^20.19.0 || >=22.12.0` vs jsdom's `^22.22.2 || …`). The correct question is the reverse: is our range a *subset* of each dependency's range (`semver.subset`).

- [ ] **Step 1: Write the failing tests** (TDD)

```js
// scripts/check-node-engine.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateEngines } from "./check-node-engine.js";

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
  const r = evaluateEngines("^20.19.0 || >=22.12.0", ["^22.22.2 || ^24.15.0 || >=26.0.0"]);
  assert.equal(r.status, "manual");
  assert.ok(r.incompatible.length === 1);
});
```

Run: `node --test scripts/check-node-engine.test.mjs` → Expected: FAIL (`evaluateEngines is not exported`).

- [ ] **Step 2: Implement `evaluateEngines` + rewire `run()`**

- `status: "ok"` when `semver.subset(currentRange, depRange)` is true for every range.
- Else candidate `>=${maxVersion(depRanges.map(semver.minVersion))}`; `status: "bump"` when that candidate is a subset of every dep range.
- Else `status: "manual"` with the offending ranges listed in `incompatible`.
- `run()`: `ok` → log no-update; `bump` → write engines (existing behavior); `manual` → `console.error` the incompatible ranges with a pointer to hand-editing `engines.node`, `process.exit(1)` (no silent wrong write; `node-engine-update.yml`'s `git diff` step then simply never sees a diff on failure).

Run: `node --test scripts/check-node-engine.test.mjs` → Expected: 3 PASS.

- [ ] **Step 3: Smoke-check against the real tree**

```bash
cd frontend && node ../scripts/check-node-engine.js
```
Expected after Tasks 3+4 land: exit 0 ("No update needed") because `^22.22.2 || ^24.15.0 || >=26.0.0` is a subset of every dep range. Before they land: exit 1 listing jsdom/vitest — the bug being fixed, working as designed.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-node-engine.js scripts/check-node-engine.test.mjs
git commit -m "fix(scripts): node-engine check detects unsupported-Node ranges via subset test"
```
PR base: `pre-staging`.

---

### Task 8 (optional, needs owner decision): Root `package.json` drift

**Files:**
- Modify: `package.json` (root)
- Delete: `package-lock.json` (root), `node_modules/` (root)

**Context:** The root manifest duplicates the frontend dependency set (older ranges), references `.ai/automation/*.mjs` scripts that don't exist on this branch, and no workflow runs root `npm ci` or references the root lockfile (verified: every `npm ci`/`cache-dependency-path` in `.github/` points at `frontend/`). The only root script with an npm import is `scripts/check-node-engine.js` → `semver`.

**Recommendation:** prune to what the root scripts actually use, and add a Dependabot guard so it can't rot again.

- [ ] **Step 1: Prune root manifest** — `dependencies: {}` deleted; `devDependencies` reduced to `semver`; keep `scripts`, `engines`, `overrides` only if referenced (drop `js-yaml` override — nothing at root uses it).
- [ ] **Step 2: Regenerate** — `rm -rf node_modules package-lock.json && npm install --package-lock-only` then `npm ci`; run `node scripts/check-backend-php.mjs` and `node scripts/check-node-engine.js` to confirm the two live root scripts still work.
- [ ] **Step 3: Add a Dependabot npm entry** for `directory: "/"` with the same weekly schedule so the root manifest is watched instead of silently drifting.
- [ ] **Step 4: Commit** `chore: prune root package.json to actually-used scripts` — PR base: `pre-staging`.

Do not execute Task 8 without explicit owner sign-off (it deletes a tree someone may use locally).

---

## Deferred majors ledger (do not open PRs for these)

| Package | Latest | Blocker (verified peers) | Revisit when |
|---|---|---|---|
| `eslint` 10.14.0 / `@eslint/js` 10.0.1 | 10.x | `eslint-plugin-import@2.32.0` peer caps at `^9`; `eslint-plugin-react@7.37.5` caps at `^9.7`; `eslint-plugin-jsx-a11y@6.10.2` caps at `^9` | Those three publish ESLint 10 peers |
| `typescript` 7.0.2 | 7.x | `@typescript-eslint/*@8.72.1` peer `typescript >=4.8.4 <6.1.0` | typescript-eslint publishes TS 7 support |
| `motion` 14.10.1 | 14.x | major API changes; ignore rule already in config | manual migration pass |
| `@hookform/resolvers` 7.0.3 | 7.x | major; installed 5.x line still supported | manual migration pass |
| `react-intersection-observer` 11.0.1 | 11.x | major | manual migration pass |
| `actions/labeler` v7.0.0 | 7.x | requires `.github/labeler.yml` schema migration (v6 `changed-files` in use) | schema migration PR |
| `dawidd6/action-send-mail` v24 | 24.x | major; defer after landing v18 | after v18 soaks in deploys |
| `jsdom` 31 fallback | — | only if Task 4's gate fails on 31/30 | then ignore until test fixes land |
