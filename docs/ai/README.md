# AI Workspace Documentation

This directory documents the optional AI-powered development workspace for this project.

## Overview

The NDC website can use an AI development workspace rooted at `.ai/` — an **optional, local-only** directory that serves as the single source of truth for the AI coding assistants you run on your machine (Claude Code, Cursor, Copilot, Windsurf, etc.). The `.ai/` directory is **not committed to this repository**; provision it locally before relying on any of the workflows below.

### Provisioning the workspace

Because `.ai/` is gitignored, a fresh clone does not contain it. Restore the last tracked snapshot from Git history:

```bash
# The commit that removed .ai/ is still in history; its parent holds the snapshot.
AI_COMMIT="$(git log -1 --format=%H -- .ai)"
test -n "$AI_COMMIT" || { echo "No archived .ai snapshot found in history"; exit 1; }
git archive "${AI_COMMIT}^" .ai | tar -x
npm run check:workspace
```

The archived snapshot predates recent repository changes, so `check:workspace` may report stale cross-references (for example case-mismatched `.ai/README.md` / `.ai/CONTEXT.md` paths and a missing `sonar-project.properties`). Reconcile those against the current tree before relying on the workspace, or keep a local copy you already maintain.

When present, the workspace is typically built in 7 phases:

| Phase | What |
|---|---|
| **Foundation** | Entry point, master context, `.gitignore` for AI ephemera |
| **AI Context** | Architecture/docs, domain knowledge, business rules, memory/ADRs, Graphify knowledge graph |
| **Skills** | 12 portable SKILL.md files for common development tasks |
| **Rules & Standards** | 5 coding standards + 5 machine-readable `.mdc` rule files synced to 3 tool formats |
| **Prompts, Workflows & Checklists** | 5 prompt templates, 4 process workflows, 4 quality checklists |
| **Memory & Automation** | Session logging, freshness checks, workspace health reports, pre-commit integration |
| **MCP & Security** | MCP server documentation, code templates, security architecture, threat model |

## Key Concepts

- **`.ai/` is canonical locally** — When you provision the workspace, all tool-specific configs (`.cursor/`, `.claude/`, `.windsurf/`, etc.) are generated copies. Edit `.ai/` only.
- **Progressive disclosure** — Start with `.ai/CONTEXT.md` for a project TL;DR, drill into deeper files as needed.
- **Local-only automation** — The `sync`, `session-log`, `check:workspace`, and `workspace:report` npm scripts invoke helpers under `.ai/automation/`. Those helpers exist only after you create the workspace locally, so the scripts fail in a fresh clone that has no `.ai/` directory.
- **Session logs** — `npm run session-log` captures git state; the pre-commit hook runs it when the local helper is present.
- **Workspace health** — `npm run check:workspace` validates cross-references and freshness; `npm run workspace:report` gives the full picture. Both require the local `.ai/automation/` scripts.

## Pages

- [Architecture & Decisions](ARCHITECTURE.md) — how the AI workspace is structured and key design decisions
- [Usage Guide](USAGE.md) — how to use the AI workspace day-to-day
- [Maintenance](MAINTENANCE.md) — how to keep it current
