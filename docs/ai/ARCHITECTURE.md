# AI Workspace Architecture

## Design Principles

1. **Single source of truth** — `.ai/` is the canonical location. Tool-specific copies (`.cursor/rules/`, `.claude/skills/`, `.github/instructions/`, `.windsurf/rules/`) are derived via sync scripts, never authored independently.

2. **Progressive disclosure** — `CONTEXT.md` is a 2-minute read with the essentials. Deeper files (`docs/`, `knowledge/`, `standards/`) expand on specific areas. AI tools can navigate deeper as needed.

3. **Portability** — Skills use the SKILL.md format (CLAUDE.md spec) which is readable by any markdown-capable AI tool. Coding rules use `.mdc` format (YAML frontmatter + markdown) compatible with Cursor, Windsurf, and Copilot.

4. **Automation** — Repetitive tasks (syncing, session logging, freshness checks) are automated via Node.js scripts in `.ai/automation/` and registered as npm scripts.

5. **Memory persistence** — Session logs, architecture decision records (ADRs), and active context tracking give AI tools continuity across sessions.

## Directory Structure

```
.ai/                          # Canonical AI workspace
├── README.md                 # Entry point with file counts
├── CONTEXT.md                # Master context (tech stack, structure, conventions)
├── docs/                     # Deep project docs (architecture, DB, API)
├── knowledge/                # Domain model + 36 business rules
├── skills/                   # 12 portable SKILL.md files
├── prompts/                  # 5 reusable prompt templates
├── workflows/                # 4 process workflows
├── checklists/               # 4 quality checklists
├── standards/                # 5 coding standards
├── coding-rules/             # 5 .mdc rule files
├── automation/               # 5 sync/check/report scripts
├── templates/                # 5 code generation templates
├── security/                 # Security overview + threat model
├── mcp/                      # MCP server documentation
└── memory/                   # Session logs, ADRs, active context
```

## Data Flow

```
.ai/ (canonical)
  │
  ├── sync-skills.mjs ──────────► .claude/skills/
  │                              └── .agents/skills/
  │
  ├── sync-rules.mjs ───────────► .cursor/rules/
  │                              ├── .github/instructions/
  │                              └── .windsurf/rules/
  │
  ├── session-log.mjs ──────────► .ai/memory/session-log/ (timestamped .md)
  │
  ├── check-freshness.mjs ──────► stdout (exit code for CI)
  │
  └── workspace-report.mjs ─────► stdout (health summary)
```

## Git Strategy

- `.ai/` is **committed** — it's the canonical source shared by the team
- `.ai/memory/session-log/*` is **gitignored** — session logs are local
- Tool-specific dirs (`.claude/`, `.cursor/`, `.agents/`, `.windsurf/`, `.github/instructions/`, `.mcp.json`) are **gitignored** — regenerated via `npm run sync`
- `graphify-out/` is **committed** (knowledge graph), but `cost.json` and `cache/` are ignored

## Tool Integration

| Tool | What it reads | How it stays current |
|---|---|---|
| Claude Code | `CLAUDE.md` (root), `.claude/skills/` | `npm run sync-skills` |
| Cursor | `.cursor/rules/*.mdc` | `npm run sync-rules` |
| Copilot | `.github/instructions/*.mdc` | `npm run sync-rules` |
| Windsurf | `.windsurf/rules/*.mdc` | `npm run sync-rules` |
| Any AI | `.ai/README.md` → `.ai/CONTEXT.md` → deeper | Direct read from `.ai/` |
