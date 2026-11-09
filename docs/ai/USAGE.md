# AI Workspace Usage Guide

## Quick Start

```bash
# 1. Sync all AI configs to tool-specific directories
npm run sync

# 2. Check workspace health
npm run check:workspace

# 3. See the full report
npm run workspace:report
```

## Daily Workflow

### Starting a Session

```bash
# Option A: capture a session log manually
npm run session-log -- --message "Starting work on feature X"

# Option B: just start working — the pre-commit hook auto-captures
# on your first commit
```

### During Development

Use the prompt templates for AI-assisted tasks:

| Task | Prompt |
|---|---|
| Review your changes | Copy `.ai/prompts/code-review.prompt.md` into your AI chat |
| Plan a feature | Copy `.ai/prompts/feature-planning.prompt.md` |
| Debug an issue | Copy `.ai/prompts/bug-analysis.prompt.md` |
| Check deploy readiness | Copy `.ai/prompts/deployment-check.prompt.md` |
| Security audit | Copy `.ai/prompts/security-review.prompt.md` |

### Before Committing

The pre-commit hook automatically:
1. Runs `npm run check` (lint, typecheck, format, backend checks, tests)
2. Captures a session log (git state, uncommitted files, recent commits)

To bypass in emergencies: `git commit --no-verify`

### Before Deploying

1. Run `npm run check:workspace` to validate AI context consistency
2. Run the deployment-check prompt: `.ai/prompts/deployment-check.prompt.md`
3. Follow the deploy workflow: `.ai/workflows/deploy.md`
4. Run the pre-deploy checklist: `.ai/checklists/pre-deploy.md`

## Using Skills

Skills are portable instruction sets for common tasks:

```bash
# Skills are auto-synced to .claude/skills/ and .agents/skills/
# In Claude Code, reference them as:
#   /code-review
#   /feature-implementation
#   /bug-fixing
#   /database
#   /deployment
#   /security
#   /testing
#   etc.
```

## Using Templates

Templates provide code generation with built-in conventions:

| Template | File | What it generates |
|---|---|---|
| React component | `.ai/templates/react-component.md` | shadcn/ui component with TanStack Query |
| PHP endpoint | `.ai/templates/php-endpoint.md` | PSR-12 API endpoint with PDO |
| SQL migration | `.ai/templates/sql-migration.md` | Idempotent migration with guard pattern |
| PR description | `.ai/templates/pr-description.md` | GitHub PR with checklist |
| Commit message | `.ai/templates/commit-message.md` | Conventional commit template |

## Reviewing Code

1. Run through `.ai/checklists/pr-review.md` for your own changes
2. Use `.ai/prompts/code-review.prompt.md` for AI-assisted review
3. For security-sensitive changes: `.ai/checklists/security-review.md`
