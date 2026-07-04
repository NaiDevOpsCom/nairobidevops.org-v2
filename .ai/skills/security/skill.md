---
name: security
description: Guide for security patterns in the NDC project. Covers CSP headers, hardened builds, input sanitization, SQL injection prevention, XSS prevention, and dependency auditing. Use when implementing security features, reviewing security posture, or fixing vulnerabilities.
tags:
  - security
  - csp
  - xss
  - sql-injection
  - hardening
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# Security

## Frontend Security

### Hardened Builds

Production builds strip all console and debugger statements at two levels:
1. **esbuild** — during transpilation (`drop: ["console", "debugger"]`)
2. **terser** — during minification (`drop_console: true, drop_debugger: true`)

Sourcemaps are completely omitted in production builds.

Verified by CI: `.github/workflows/hardened-build-check.yml` checks for console/debugger remnants and sourcemap files.

### CSP Headers

Content Security Policy configured via `.htaccess` and documented in `docs/frontend/security/content-security-policy.md`. When adding new external resources (scripts, styles, images), update the CSP.

### XSS Prevention

- All user-facing output rendered through React (auto-escaped)
- `dangerouslySetInnerHTML` should be avoided — use Cloudinary's safe HTML if needed
- URL validation via `safeNavigate.ts` — blocks `javascript:`, `data:`, `vbscript:` protocols

### Environment Variables

- All API keys and tokens stored in `.env*` files (gitignored)
- Only `VITE_`-prefixed variables exposed to client bundle
- Production API tokens configured as GitHub Actions secrets

## Backend Security

### SQL Injection Prevention

- **All** database queries use PDO prepared statements with positional (`?`) or named (`:name`) parameters
- No string interpolation in SQL
- `PDO::ATTR_EMULATE_PREPARES => false` ensures real prepared statements

### Input Sanitization

- `sanitizeString()`: HTML entity decode → strip tags → trim
- Employer submissions: `strip_tags` + `htmlspecialchars` with ENT_QUOTES
- URL validation: only http/https schemes accepted via `filter_var`
- `FILTER_VALIDATE_URL` on all external URLs

### CORS

Restricted allowlist in `backend/index.php`:
- Production: `https://nairobidevops.org`
- Staging: `https://staging.nairobidevops.org`
- Local dev: `http://localhost:5173`, `http://localhost:4000`

### Configuration Security

- `config.php` symlinked at deploy time, stored outside webroot
- Sensitive keys: DB credentials, Telegram bot token, Discord webhook, Remotive affiliate ID, cron secret
- Backend .htaccess blocks direct access to sensitive files

## Supply Chain Security

- Dependabot configured for weekly npm + Composer + GitHub Actions updates
- `composer audit` runs in CI (backend)
- Lockfiles committed (`package-lock.json`, `composer.lock`)
- Dependency review action on PRs

## Secrets

**Never:**
- Commit `.env` or `config.local.php`
- Log tokens, passwords, or API keys
- Store secrets in client-side code (use proxy endpoints)
- Share secrets in issues, PRs, or chat
