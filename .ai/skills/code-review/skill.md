---
name: code-review
description: Guide for reviewing code changes in the NDC project. Covers review criteria, common issues, security checks, and project-specific conventions. Use when reviewing pull requests or evaluating code quality.
tags:
  - code-review
  - quality
  - pr
  - best-practices
model: claude-sonnet-4-6
allowed-tools: Read Bash Glob Grep
---

# Code Review

## Frontend Checklist

- [ ] TypeScript strict mode — no `any`, no unchecked casts
- [ ] Imports follow the convention: builtin → external → internal → parent → sibling → index
- [ ] No unused imports (ruled by `eslint-plugin-unused-imports`)
- [ ] Component follows existing patterns (page vs component vs UI primitive)
- [ ] Tailwind classes used instead of inline styles
- [ ] Dark mode considered via ThemeContext
- [ ] Responsive design — test at mobile, tablet, desktop
- [ ] No `console.log`/`debugger` (will fail hardened build check)
- [ ] Path alias `@/` used instead of relative imports
- [ ] shadcn/ui primitives used rather than custom implementations

## Backend Checklist

- [ ] PSR-12 coding style (run `composer cs-fix`)
- [ ] `declare(strict_types=1)` in new files
- [ ] Prepared statements for all queries — no string interpolation
- [ ] Input sanitized via `sanitizeString()` or `strip_tags` + `htmlspecialchars`
- [ ] URLs validated for http/https scheme
- [ ] `respondJson()` used for all responses
- [ ] Appropriate HTTP status codes (200, 201, 400, 404, 405, 500)
- [ ] CORS allowlist updated if new origins needed
- [ ] No sensitive data exposed in error messages

## Database Checklist

- [ ] Schema changes have a corresponding migration file
- [ ] Migration is idempotent (IF NOT EXISTS / information_schema guard)
- [ ] New sources/channels use VARCHAR, not ENUM
- [ ] Indexes added for new query patterns
- [ ] `EXPLAIN SELECT` verified for new queries

## Security Checklist

- [ ] All user input sanitized before storage or reflection
- [ ] No secrets/tokens exposed in client-side code
- [ ] CSP headers compatible with new integrations
- [ ] Cross-origin requests respect CORS allowlist
- [ ] No eval, no dynamic require/import
- [ ] Dependencies checked for known vulnerabilities (`composer audit`, `npm audit`)
- [ ] Lockfile updated (`package-lock.json`, `composer.lock`)

## Testing Checklist

- [ ] New features include tests
- [ ] Bug fixes include a regression test
- [ ] Tests pass locally before push
- [ ] Coverage for edge cases (empty states, error states, boundary values)

## PR Standards

- [ ] PR title follows conventional commits: `type(scope): description`
- [ ] Description explains what and why (not how)
- [ ] Screenshots included for UI changes
- [ ] PR targets correct branch (main for prod, pre-staging for staging)
- [ ] No unrelated changes mixed into the PR
