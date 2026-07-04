# Architecture Decision Records

## ADR Template

```markdown
## ADR-XXX: Title

**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:** What is the issue motivating this decision?

**Decision:** What is the change being made?

**Consequences:** What becomes easier or harder?
```

---

## ADR-001: Raw PDO over ORM

**Status:** Accepted

**Context:** The backend needs to interact with a MySQL database with only 4 tables. No complex relationships beyond foreign keys.

**Decision:** Use raw PDO with prepared statements rather than an ORM (Doctrine, Eloquent).

**Consequences:**
- + No ORM overhead, faster queries
- + Explicit SQL — full control over query optimization
- + Fewer dependencies in composer.json
- - Manual schema migration management
- - No query builder for complex dynamic queries

---

## ADR-002: Single-file API Router

**Status:** Accepted

**Context:** The API has only 3 endpoints (jobs list, job submission, click tracking).

**Decision:** Use `backend/index.php` as a single entry point dispatching via `?action=` parameter. Each endpoint is a separate PHP file loaded via `require_once`.

**Consequences:**
- + Simple, predictable routing
- + No framework dependency
- + Each endpoint file is self-contained
- - Doesn't scale well beyond ~10 endpoints
- - No middleware pipeline

---

## ADR-003: Atomic Symlink Deployments

**Status:** Accepted

**Context:** Production hosting on cPanel. Need zero-downtime deployments with rollback capability.

**Decision:** Each deploy creates a timestamped release directory. A `current` symlink atomically points to the active release. Previous release retained for rollback.

**Consequences:**
- + Zero-downtime deploys
- + Instant rollback (just re-point symlink)
- + Clean separation of releases
- - Requires SSH access to cPanel
- - Storage for multiple release copies

---

## ADR-004: Hash-based Routing with Wouter

**Status:** Accepted

**Context:** Static SPA hosted via Apache. No server-side routing configuration.

**Decision:** Use Wouter with hash-based routing. Apache serves index.html for SPA, `.htaccess` rewrites API paths to bypass the SPA.

**Consequences:**
- + No server-side URL rewriting needed for SPA routes
- + Lightweight (1.6KB) compared to React Router
- + Simple API — hook-based, no `<Router>` nesting
- - Hash in URLs (`#/about`)
- - Less ecosystem support than React Router

---

## ADR-005: Dual-Level Console Stripping

**Status:** Accepted

**Context:** Production builds must strip all console/debugger statements to prevent information leakage and improve performance.

**Decision:** Strip console/debugger at both the esbuild transpilation phase AND the terser minification phase.

**Consequences:**
- + Defense in depth — redundant stripping
- + Catches console statements added by dependencies (terser catches what esbuild might miss)
- + Hardened build check in CI verifies no console/debugger remain
- - Slightly longer build time (terser is slower than esbuild)

---

## ADR-006: Automated Session Logging & Workspace Health Checks

**Status:** Accepted

**Context:** The AI workspace has persistent memory (`.ai/memory/`) but no automated mechanism to capture session context, track workspace health, or detect stale cross-references. Manual context updates are unreliable. Session logs accumulate without rotation.

**Decision:** Implement three automation scripts in `.ai/automation/`:

1. **`session-log.mjs`** — Captures git state (branch, uncommitted files, recent commits, diff stats), Node version, current phase, and a user-supplied message. Appends a timestamped `.md` file to `.ai/memory/session-log/` and updates an index. Rotates to keep the most recent 30 sessions.

2. **`check-freshness.mjs`** — Validates internal workspace consistency: all required directories and files exist, cross-references resolve, `active-context.md` is less than 30 days old. Exits non-zero on errors for CI integration.

3. **`workspace-report.mjs`** — Generates a health summary of the `.ai/` workspace: file counts by category, total size, newest file, session log stats, and actionable recommendations.

All three are registered as npm scripts:
- `npm run session-log` — capture a session snapshot
- `npm run check:workspace` — freshness + cross-reference validation
- `npm run workspace:report` — full health report

The session log script is also wired into the pre-commit git hook so each commit auto-captures a session checkpoint.

**Consequences:**
- + Session logs become an automatic audit trail
- + Freshness checks prevent stale context from misleading AI tools
- + Health report provides quick orientation for any contributor
- + Automated rotation prevents log bloat
- + CI can gate on freshness check
- - Session logs grow by ~1KB per commit — negligible with 30-session rotation
- - pre-commit hook adds ~200ms to each commit for the session log capture

---

## ADR-007: MCP Documentation, Code Templates & Security Architecture

**Status:** Accepted

**Context:** The AI workspace reached Phase 7 of the buildout. Three areas remained unaddressed: (1) MCP server configurations existed only as scattered local `.mcp.json` files with no documentation, (2) developers lacked reusable code generation templates that encode project conventions, and (3) the project had extensive security infrastructure (CORS allow-list, CSP auto-generation, hardened builds, CodeQL, dependency auditing) but no unified AI-friendly view of the security posture.

**Decision:** Create three canonical directories in `.ai/`:

1. **`.ai/mcp/`** — Documents all MCP servers (jetro active, filesystem optional), their tools, environment variables, and security considerations. Includes a machine-readable `manifest.json` and per-server docs.

2. **`.ai/templates/`** — Five code generation templates covering the most common development tasks: React shadcn/ui components, PHP API endpoints, idempotent SQL migrations, PR descriptions, and conventional commit messages. Each template includes inline usage instructions and references to `.ai/standards/` and `.ai/coding-rules/`.

3. **`.ai/security/`** — A 5-layer security architecture overview (network, API, application, build/deploy, CI/CD), a STRIDE threat model identifying 6 threat categories with mitigations and gap analysis, and an incident response procedure. References detailed docs in `docs/frontend/security/` and `.ai/checklists/security-review.md`.

The project's existing 3 `.mcp.json` files remain gitignored local configs — `.ai/mcp/` is the canonical documentation source.

**Consequences:**
- + All 7 planned workspace directories now populated — phase buildout complete
- + Developers have copy-paste templates encoding project conventions
- + Security posture is visible in one place with links to detailed docs
- + Threat model identifies 4 mitigation gaps for future work
- + MCP server documentation survives local config loss
- - Templates must be maintained alongside code convention changes
- - Threat model is a snapshot — needs periodic review
