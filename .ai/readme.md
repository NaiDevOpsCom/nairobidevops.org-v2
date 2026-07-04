# .ai/ — AI Workspace

This directory is the canonical source of truth for AI coding assistants working on the NDC Redesign Website project.

## How to use this workspace

1. **Start here** — read `.ai/CONTEXT.md` first for the project TL;DR.
2. **Architecture & security** — `.ai/docs/` for architecture/DB/API, `.ai/security/` for threat model and security posture.
3. **Skills** — `.ai/skills/` contains portable SKILL.md files. Install via `/skill-name` in Claude Code, or your tool's equivalent.
4. **Coding rules** — `.ai/coding-rules/` has `.mdc` files for Cursor and tool-specific rule formats.
5. **Memory** — `.ai/memory/` tracks current context, decisions, and session logs. Run `npm run session-log` after each session.
6. **Templates** — `.ai/templates/` has reusable code generation templates for components, endpoints, migrations, and PRs.
7. **MCP** — `.ai/mcp/` documents available MCP servers, their tools, and security considerations.

## Structure

```
.ai/
├── README.md            # This file — entry point
├── CONTEXT.md           # Master context (short, always-on)
├── docs/                # Deep documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── API.md
├── skills/              # 12 portable SKILL.md files
├── prompts/             # 5 reusable prompt templates
├── memory/              # Persistent memory (context, decisions, logs)
├── workflows/           # 4 process workflows (feature, deploy, hotfix, release)
├── knowledge/           # Domain model + 36 business rules
├── standards/           # 5 coding standards (TS, React, PHP, Test, CSS)
├── coding-rules/        # 5 tool-agnostic .mdc rule files
├── checklists/          # 4 quality checklists
├── security/            # Security overview, threat model, incident response
├── automation/          # 5 automation scripts (sync, session-log, check, report)
├── templates/           # 5 code generation templates (component, endpoint, migration, PR, commit)
└── mcp/                 # MCP server docs, manifest, security (jetro, filesystem)
```

## Tool integration

| Tool | Reads |
|---|---|
| Any AI tool | `.ai/README.md` → `.ai/CONTEXT.md` → deeper files as needed |
| Claude Code | Also reads `CLAUDE.md` (brief pointer here) |
| Cursor | `.cursor/rules/` (generated from `.ai/coding-rules/`) |
| Copilot | `.github/copilot-instructions.md` + `.github/instructions/` |
| Windsurf | `.windsurf/rules/` (generated from `.ai/coding-rules/`) |

## Principles

- **Single source of truth** — `.ai/` is canonical. Tool-specific copies are derived.
- **Progressive disclosure** — CONTEXT.md is short; deeper files have details.
- **Keep it current** — stale context is worse than no context. Update `memory/active-context.md` each session.
- **Cross-reference** — use relative links between files so AI tools can follow them.
