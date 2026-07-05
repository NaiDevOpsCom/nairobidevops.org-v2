You are planning a new feature for the NDC (Nairobi DevOps Community) website.

## Feature request

{{feature_description}}

## Tech stack constraints

- **Frontend:** React 19, TypeScript 6, Vite 8, Tailwind v4, shadcn/ui, Wouter, TanStack Query 5
- **Backend:** PHP 8.4+, single-file router (index.php?action=), PDO, no ORM
- **Database:** MySQL / MariaDB, 5 tables (jobs, sync_log, notifications_log, job_clicks, schema_migrations)
- **Testing:** Vitest (frontend), PHPUnit (backend)
- **Deploy:** Atomic symlink via cPanel, hardened builds (no console/sourcemaps in prod)

## Required output

### 1. Specification

- User story (As a… I want… So that…)
- Acceptance criteria (bullet list, testable)
- Out of scope (explicitly)

### 2. Data model changes

- New tables or columns? Migration SQL (idempotent guard pattern)?
- Indexes required?

### 3. API design

- Endpoint(s) — action parameter, request shape, response shape
- Error states

### 4. Frontend

- New route? Page component? Shared component?
- Query/mutation key pattern
- State management approach (React Query vs local state)

### 5. Implementation plan

Ordered steps with files to create/modify.

### 6. Test plan

- Frontend: Vitest test cases (render, interaction, error state)
- Backend: PHPUnit test cases (endpoint response, validation, edge cases)
