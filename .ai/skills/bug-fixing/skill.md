---
name: bug-fixing
description: Systematic approach for investigating and fixing bugs in the NDC project. Covers reproduction, root cause analysis, fix patterns, and regression testing. Use when investigating reported bugs or unexpected behavior.
tags:
  - debugging
  - bug-fix
  - troubleshooting
  - quality
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# Bug Fixing

## Investigation Process

### 1. Reproduce

```bash
# Frontend: check browser console, network tab
# Backend: check PHP error logs
# Check the specific environment (local vs staging vs production)
```

Identify:
- Exact steps to reproduce
- Environment (browser, device, screen size)
- Whether it's consistent or intermittent
- When it started (check git log for recent changes)

### 2. Isolate the Layer

Determine which layer the bug is in:

- **Frontend:** React component, data fetching (TanStack Query), routing (Wouter), styling (Tailwind)
- **Backend:** API endpoint, database query, input validation, cron job
- **Data:** Schema issue, migration gap, data integrity
- **Infrastructure:** Deployment, proxy config, CSP headers, .htaccess

### 3. Read the Code

```bash
# Find relevant code
# Use Graphify for cross-module questions
graphify query "what handles job submission?"
graphify path "SubmitJob" "NormalizedJob"
```

### 4. Fix Patterns

| Bug Type | Pattern |
|---|---|
| Null/undefined error | Check for null coalescing, optional chaining |
| Wrong data | Check API response shape, type definitions |
| State not updating | Check React Query cache invalidation, staleTime |
| Build error | Check TypeScript strict mode, Vite config |
| Backend 500 | Check PDO exception handling, config loading |
| CORS error | Check allowedOrigins in index.php |
| SPA 404 on reload | Check .htaccess rewrite rules |
| Console in production | Check hardened build config, CI check |

### 5. Verify the Fix

```bash
# Frontend
cd frontend && npm run check

# Backend
cd backend && composer test

# Hardened build check
cd frontend && npm run build:ci
```

### 6. Regression Test

- Write a test that covers the fixed scenario
- Ensure existing tests still pass
- Check edge cases (empty state, error state, boundary conditions)

## Common Bug Sources

- **Null/undefined** — API fields that can be null (salary_min, closes_at, tags)
- **Type mismatches** — PHP returns strings for INT columns via PDO
- **CORS** — new local dev ports not in allowlist
- **Proxy** — Vite proxy changes when adding new API paths
- **Migration order** — migrations run out of sequence
- **Deploy order** — frontend deployed without matching backend changes
