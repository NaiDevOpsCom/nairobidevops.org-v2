# Active Context

> Last updated: 2026-07-04

## Current Status

All 7 phases of the AI workspace buildout are complete.

## Completed Phases

### Phase 1 — Foundation
- `.ai/README.md` — AI workspace entry point
- `.ai/CONTEXT.md` — master context (tech stack, structure, environments, key files)
- `.gitignore` — ephemeral AI data ignored; canonical `.ai/` committed
- `.ai/memory/session-log/` — session log directory

### Phase 2 — AI Context
- `.ai/docs/ARCHITECTURE.md` — C4 + Mermaid architecture diagrams
- `.ai/docs/DATABASE.md` — full schema, indexes, query patterns
- `.ai/docs/API.md` — 3 endpoints, 14 SPA routes, dev proxy
- `.ai/knowledge/domain-model.md` — business domain with class diagram
- `.ai/knowledge/business-rules.md` — 36 documented business rules
- `.ai/memory/decisions.md` — 6 ADRs (architectural decisions)
- `.ai/memory/active-context.md` — living session context
- Graphify knowledge graph: 881 nodes, 1359 edges, 90 communities
- Git hooks installed for post-commit/post-checkout graph rebuild

### Phase 3 — Skills
- 12 project-specific SKILL.md files in `.ai/skills/`
- `.ai/automation/sync-skills.mjs` — copies skills to `.claude/skills/` and `.agents/skills/`
- `npm run sync-skills` registered in root `package.json`

### Phase 4 — Rules & Standards
- 5 standards files: TypeScript, React, PHP, Testing, CSS
- 5 machine-readable `.mdc` coding rule files: frontend, backend, typescript, php, database
- `.ai/automation/sync-rules.mjs` — copies `.mdc` files to `.cursor/rules/`, `.github/instructions/`, `.windsurf/rules/`
- `npm run sync-rules` and `npm run sync` registered in root `package.json`

### Phase 5 — Prompts, Workflows & Checklists
- 5 prompt templates: code-review, feature-planning, bug-analysis, deployment-check, security-review
- 4 workflow definitions: feature-branch, deploy, hotfix, release
- 4 quality checklists: pre-deploy, pr-review, security-review, accessibility

### Phase 6 — Memory & Automation
- `.ai/automation/session-log.mjs` — captures git state, branch, recent commits, uncommitted files, phase, and user message into timestamped session logs; auto-rotates to keep last 30
- `.ai/automation/check-freshness.mjs` — validates all required directories exist, cross-references resolve, active-context.md is current; exits non-zero for CI
- `.ai/automation/workspace-report.mjs` — generates health summary (file counts by category, size, newest file, session log stats, recommendations)
- `npm run session-log` — capture a session snapshot
- `npm run check:workspace` — freshness + cross-reference validation
- `npm run workspace:report` — full health report
- Pre-commit hook updated: auto-captures session log on every commit (non-blocking)
- ADR-006: Automated Session Logging & Workspace Health Checks (Accepted)
- All 33 cross-references validated — zero broken
- Session log index maintained at `.ai/memory/session-log/index.md`

### Automation scripts registered
- `npm run sync` — sync-skills + sync-rules
- `npm run session-log` — capture session snapshot
- `npm run check:workspace` — validate workspace consistency
- `npm run workspace:report` — full health report

### Phase 7 — Advanced MCP & Security
- `.ai/mcp/` — MCP server documentation: README, manifest.json, per-server docs (jetro, filesystem), security guide
- `.ai/templates/` — 5 code generation templates: react-component, php-endpoint, sql-migration, pr-description, commit-message
- `.ai/security/` — Security architecture overview (5 layers), STRIDE threat model with 6 threat categories and 4 mitigation gaps, incident response procedure
- ADR-007: MCP Documentation, Code Templates & Security Architecture (Accepted)
- Existing `.mcp.json` files (root, frontend, .cursor) remain gitignored local configs — `.ai/mcp/` is canonical documentation

## Next Steps

All 7 phases complete. Future work:
- Rate limiting on API (identified in threat model)
- CAPTCHA on job submission form
- Template auto-generation script in `.ai/automation/`
- Periodic threat model review process

## Known Issues

- `.gitignore` ignores several AI tool directories (`.agents/`, `.claude/`, `.cursor/`, `.jetro/`, `.windsurf/rules/`, `.github/instructions/`). These are generated copies — the canonical `.ai/` directory is the single source of truth.

## Active Decisions

- `.ai/` is the single source of truth for AI context. Tool-specific files are derived, never authored independently.
- Skills are copied (not symlinked) on Windows for `.claude/skills/` and `.agents/skills/` distribution.
- `.mdc` format (YAML frontmatter + markdown) chosen for coding rules to maximize tool compatibility (Cursor, Windsurf, Copilot).
- Prompt templates use `{{placeholder}}` syntax for AI-tool-agnostic variable substitution.
- Session logs are auto-captured on pre-commit (non-blocking — runs regardless of check result for audit trail).
- Freshness check regex uses longest-match-first alternation (`mdc|mjs|md`) to avoid partial match on `.mdc` files.
- MCP server configs remain local-only and gitignored — `.ai/mcp/` is the canonical documentation source.
- Security architecture documented at 5 layers with a STRIDE threat model; detailed references point to `docs/frontend/security/`.
