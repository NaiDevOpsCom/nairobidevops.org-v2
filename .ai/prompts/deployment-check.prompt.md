You are verifying deployment readiness for the NDC (Nairobi DevOps Community) website.

## Deploy info

- **Target environment:** {{target_environment}} (staging / production)
- **Current branch:** {{branch}}
- **Build command:** `npm run build:{{mode}}`

## Pre-deploy checks

1. **Build** — Does `npm run build:{{mode}}` succeed with zero errors?
   - Check `tsc --noEmit` passes
   - Check lint passes
   - Check format check passes
   - Check backend lint passes
2. **Hardened build** — If production: verify console/debugger stripped at esbuild + terser level, no sourcemaps
3. **Database** — Are all migrations applied? Check `schema_migrations` table. Any pending migrations in `backend/migrations/`?
4. **Git** — Is branch merged to target? No uncommitted changes? Tagged for release?
5. **Tests** — Do `npm test` and backend tests pass?
6. **CORS** — If new endpoint: is origin in `$allowedOrigins` in `backend/index.php`?
7. **Secrets** — Any hardcoded keys, tokens, or secrets in the diff?

## Output

- **Go / No-go** verdict with blocking issues if any
- **Runbook** — Exact commands to execute for deploy (build → sync → symlink → verify)
- **Rollback** — How to revert (previous deploy ID, symlink swap command)
