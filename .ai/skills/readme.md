# Skills

Portable SKILL.md files following the [Agent Skills specification](https://agentskills.io/specification). Compatible with Claude Code, Codex, OpenCode, Cursor, Kilo Code, Gemini CLI, and any framework supporting the spec.

## Available Skills

| Skill | Description | Invoke |
|---|---|---|
| `frontend-development` | React 19, TypeScript 6, Tailwind v4, shadcn/ui patterns | `/frontend-development` |
| `backend-development` | PHP 8.4, PSR-12, PDO patterns, endpoints structure | `/backend-development` |
| `database` | MySQL schema, migrations, query optimization | `/database` |
| `api-design` | Adding/modifying endpoints, validation, CORS | `/api-design` |
| `testing` | Vitest, PHPUnit, test patterns, CI integration | `/testing` |
| `code-review` | PR review criteria, security checks, project conventions | `/code-review` |
| `deployment` | cPanel, GitHub Actions, atomic symlinks, rollback | `/deployment` |
| `security` | CSP, hardened builds, XSS/SQLi prevention, secrets | `/security` |
| `git-workflows` | Branch strategy, commit conventions, PR protocol | `/git-workflows` |
| `bug-fixing` | Systematic bug investigation and resolution | `/bug-fixing` |
| `feature-implementation` | End-to-end feature delivery workflow | `/feature-implementation` |
| `project-planning` | Task breakdown, estimation, dependency mapping | `/project-planning` |

## How Skills Work

Each skill is a directory containing a `SKILL.md` file with YAML frontmatter and markdown instructions. Your AI assistant auto-discovers them and can invoke them when relevant context is detected, or you can explicitly invoke with `/skill-name`.

## Installation

Skills are auto-discovered from:

- `.claude/skills/` — Claude Code
- `.agents/skills/` — Cross-platform (npx skills, any spec-compliant agent)
- `~/.claude/skills/` — User-global

The canonical source is `.ai/skills/`. Tool-specific copies in `.claude/skills/` and `.agents/skills/` are generated via `.ai/automation/sync-skills.js`.
