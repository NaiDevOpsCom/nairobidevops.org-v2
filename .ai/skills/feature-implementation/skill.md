---
name: feature-implementation
description: End-to-end workflow for implementing new features. Covers planning, implementation, testing, and review phases. Use when adding new functionality to the NDC project.
tags:
  - feature
  - implementation
  - workflow
  - planning
model: claude-sonnet-4-6
allowed-tools: Read Edit Write Bash Glob Grep
---

# Feature Implementation

## Workflow

### Phase 1: Understand

1. Read `.ai/CONTEXT.md` for project overview
2. Check `.ai/knowledge/domain-model.md` for domain understanding
3. Check `.ai/knowledge/business-rules.md` for relevant rules
4. Check `.ai/memory/decisions.md` for previous decisions that might affect the approach
5. Check Graphify for existing code relationships:
   ```
   graphify query "what handles job listings?"
   graphify path "SubmitJob" "Database"
   ```

### Phase 2: Plan

1. Define the change scope:
   - Which layers are affected? (frontend, backend, database, config)
   - What files need to change?
   - What new files need to be created?
2. Check for existing patterns to follow
3. Consider backwards compatibility
4. Plan the implementation order (database → backend → frontend → deploy)

### Phase 3: Implement Database Changes (if needed)

```bash
# 1. Create migration
touch backend/migrations/NNN_description.sql

# 2. Test migration
php backend/cron/migrate.php

# 3. Update schema.sql (canonical source)
```

### Phase 4: Implement Backend Changes (if needed)

```bash
# 1. Create endpoint or modify existing
# 2. Add tests
# 3. Run tests
cd backend && composer test
```

### Phase 5: Implement Frontend Changes

```bash
# 1. Create/modify component/page
# 2. Create/modify hook for data fetching
# 3. Add test
# 4. Run checks
cd frontend && npm run check
```

### Phase 6: Verify

```bash
# Full check
cd frontend && npm run check
cd backend && composer test

# Build
cd frontend && npm run build

# Security
cd backend && composer audit
```

### Phase 7: Commit

```
type(scope): short description

- What was changed
- Why it was changed
- Breaking changes (if any)
```

## Patterns to Follow

- **New page:** Follow existing page pattern (import in App.tsx, add route in routes.ts, create page component)
- **New component:** Follow existing component pattern (export named function, use Tailwind, support dark mode)
- **New hook:** Place in `frontend/client/src/hooks/`, use TanStack Query for data fetching
- **New endpoint:** Add to router match, create endpoint file, use respondJson, add CORS if needed
- **New migration:** Idempotent, zero-padded filename, update schema.sql

## Patterns to Avoid

- Importing from react-router-dom (use wouter)
- Using any (use proper types)
- Inline styles (use Tailwind classes)
- Direct DOM manipulation (use React)
- String interpolation in SQL (use prepared statements)
