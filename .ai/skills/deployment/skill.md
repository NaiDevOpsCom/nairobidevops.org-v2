---
name: deployment
description: Guide for deploying the NDC website. Covers the cPanel deployment pipeline via GitHub Actions, atomic symlink switching, environment configuration, rollback, and staging workflow. Use when deploying to production or staging, or debugging deployment issues.
tags:
  - deployment
  - cicd
  - cpanel
  - github-actions
  - devops
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# Deployment

## Environments

| Environment | Branch | URL | Deploy Trigger |
|---|---|---|---|
| Production | `main` | `https://nairobidevops.org` | Push to main with frontend/ or backend/ changes |
| Staging | `pre-staging` | `https://staging.nairobidevops.org` | Push to pre-staging |

## Deploy Architecture

Atomic symlink switching via GitHub Actions. Each deploy creates a timestamped release directory. The `current` symlink atomically points to the active release.

```
/home/
├── releases/
│   ├── 20260704-1000/    # New release
│   ├── 20260703-1200/    # Previous release (rollback target)
│   └── 20260702-0800/    # Older releases (cleaned after 5)
└── current -> releases/20260704-1000/   # Symlink
```

## Frontend Deployment

Workflow: `.github/workflows/deploy.yml`

Steps:
1. Build hardened frontend (`npm run build:prod`)
2. Copy to release directory via SSH
3. Switch `current` symlink atomically
4. Health check
5. Email notification on failure

## Backend Deployment

Workflow: `.github/workflows/deploy-backend-prod.yml`

Steps:
1. PHP quality gates (PHP lint, PHP-CS-Fixer, PHPUnit)
2. `composer install --no-dev --optimize-autoloader`
3. Tar + scp to release directory via SSH
4. Symlink switch
5. Cleanup (keep last 5 releases)

## Secrets Management

- Secrets stored as GitHub Actions secrets
- `config.php` symlinked by deploy script, stored outside webroot
- Environment-specific configs: `config.local.php` (local), `config.staging.php` (staging)

## Staging Deploy

Workflow: `.github/workflows/staging-deploy.yml`

- Same pipeline as production but deploys to staging subdomain
- Full cleanup of old releases after successful deploy
- Re-links backend jobs-api on staging

## Rollback

- Keep previous release directory intact
- Rollback: re-point `current` symlink to previous release
- No rebuild needed

## CI Checks (PR Gate)

PRs to `main` or `pre-staging` run `.github/workflows/project-checks.yml`:

- Frontend: lint → typecheck → format check → tests
- Backend: PHP lint → PHP-CS-Fixer format check → PHPUnit tests → Composer audit
- All must pass before merge

## Security Checks

- `.github/workflows/hardened-build-check.yml` — verifies no sourcemaps/console/build warnings
- `.github/workflows/security-pipeline.yml` — dependency review + lockfile integrity
- `.github/workflows/codeql.yml` — CodeQL analysis on push and weekly
