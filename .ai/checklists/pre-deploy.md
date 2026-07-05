# Pre-deploy Checklist

## Code
- [ ] PR merged to target branch
- [ ] All CI checks pass (lint, typecheck, format, test)
- [ ] No console.log or debugger statements in staged code
- [ ] No TODO or FIXME comments in changed files
- [ ] No secrets, tokens, or credentials committed

## Build
- [ ] `npm run build:{{mode}}` succeeds
- [ ] Production build: no `.map` files in `dist/` (hardened mode)
- [ ] Production build: console/debugger stripped (verify with `grep -r 'console\.log\|debugger' dist/`)

## Database
- [ ] All migrations applied to target environment
- [ ] Migrations are idempotent (can run twice safely)
- [ ] Schema changes backward-compatible (no breaking column drops)

## Backend
- [ ] PHP syntax check passes: `php -l backend/index.php`
- [ ] No PDO injection risks in new/changed queries
- [ ] CORS allowlist includes new origins if added
- [ ] CRON endpoints guarded by `CRON_SECRET_KEY`

## Frontend
- [ ] No broken links or routes
- [ ] Responsive: tested on mobile (375px) and desktop (1440px)
- [ ] Dark mode: new UI elements render correctly in both themes
- [ ] No unused imports (ESLint rule passes)

## Tests
- [ ] `npm test` passes
- [ ] Backend tests pass
- [ ] New features have test coverage
- [ ] Modified code still covered

## Config
- [ ] Production `.env` or `config.php` has correct values
- [ ] CSP headers match any new external resources (fonts, scripts, images)
