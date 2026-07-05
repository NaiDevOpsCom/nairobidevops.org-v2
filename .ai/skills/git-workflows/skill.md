---
name: git-workflows
description: Guide for Git workflows and contribution processes. Covers branch strategy, commit conventions, PR protocol, release process, and code review expectations. Use when preparing commits, creating PRs, or managing releases.
tags:
  - git
  - github
  - workflow
  - contribution
  - branching
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# Git Workflows

## Branch Strategy

| Branch | Purpose | Deploys To |
|---|---|---|
| `main` | Production-ready code | `https://nairobidevops.org` |
| `pre-staging` | Staging/pre-production | `https://staging.nairobidevops.org` |
| `feat/*` | Feature branches (branch from pre-staging) | — |
| `fix/*` | Bug fix branches | — |
| `chore/*` | Maintenance, dependencies, tooling | — |

## Workflow

1. Branch from `pre-staging` for features/fixes
2. PR into `pre-staging` for staging deployment
3. After staging verification, PR `pre-staging` → `main` for production
4. Hotfixes: branch from `main`, PR directly to `main`, then back-merge to `pre-staging`

## Commit Conventions

Follow conventional commits:

```
type(scope): description

feat(frontend): add job search by company name
fix(backend): handle null salary in response
chore(deps): update tailwind to v4.2
docs(api): add endpoint documentation
ci(deploy): add health check step
```

Types: `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`, `test`, `style`, `perf`

## Pull Request Protocol

1. PR title follows conventional commits format
2. Description explains **what** and **why**, not how
3. Reference related issues
4. Add screenshots for UI changes
5. Ensure CI checks pass (lint, typecheck, test, security)
6. Request review from relevant team members
7. Squash-merge to target branch

## Release Process

Releases managed by `.github/workflows/release.yml`:
- Triggered by push to `main` or hotfix branches
- Automated semantic versioning
- CHANGELOG generation
- GitHub Release creation

## Pre-commit Checks

- Frontend: lint → typecheck → format
- Backend: PHP lint → PHP-CS-Fixer
- Auto-fix where possible: `npm run lint:fix`, `composer cs-fix`

## Best Practices

- Keep commits focused (one logical change per commit)
- Write descriptive commit messages (the body explains why)
- Rebase feature branches onto target before PR
- Delete branches after merge
- Never force-push to shared branches (main, pre-staging)
