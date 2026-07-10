# AI Workspace Documentation

This directory documents the AI-powered development workspace integrated into this project.

## Overview

The NDC website has a full AI development workspace rooted at `.ai/` — a canonical, version-controlled directory that serves as the single source of truth for AI coding assistants across multiple tools (Claude Code, Cursor, Copilot, Windsurf, etc.).

The workspace was built in 7 phases:

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

- **`.ai/` is canonical** — All tool-specific configs (`.cursor/`, `.claude/`, `.windsurf/`, etc.) are generated copies. Edit `.ai/` only.
- **Progressive disclosure** — Start with `.ai/CONTEXT.md` for a project TL;DR, drill into deeper files as needed.
- **Sync scripts** — `npm run sync` regenerates all tool-specific copies from `.ai/`.
- **Session logs** — `npm run session-log` captures git state; auto-runs on every commit via pre-commit hook.
- **Workspace health** — `npm run check:workspace` validates cross-references and freshness; `npm run workspace:report` gives the full picture.

## Pages

- [Architecture & Decisions](ARCHITECTURE.md) — how the AI workspace is structured and key design decisions
- [Usage Guide](USAGE.md) — how to use the AI workspace day-to-day
- [Maintenance](MAINTENANCE.md) — how to keep it current
