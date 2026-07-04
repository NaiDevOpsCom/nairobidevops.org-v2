# Deploy Workflow

Applies to both staging (`pre-staging` → staging server) and production (`main` → live).

## Prerequisites

- [ ] PR merged to target branch
- [ ] All CI checks green
- [ ] Pre-deploy checklist completed: `.ai/checklists/pre-deploy.md`

## Steps

### 1. Checkout and pull

```bash
git checkout {{target_branch}}     # pre-staging or main
git pull origin {{target_branch}}
```

### 2. Verify database migrations

```bash
cd backend
php composer.phar run migrate      # apply any pending migrations
cd ..
```

Check `schema_migrations` table for expected state.

### 3. Build

```bash
npm run build:{{mode}}             # staging or prod
```

Verify:
- `dist/` contains only production assets (no `.map` files in prod mode)
- No console.log in bundled JS (check with `grep -r 'console\.log' dist/`)

### 4. Deploy

For cPanel atomic deploy (see `.github/workflows/deploy.yml`):
```bash
# Sync to remote
rsync -avz --delete dist/ {{deploy_user}}@{{host}}:{{release_dir}}/{{build_id}}/
# Atomic symlink swap
ssh {{deploy_user}}@{{host}} "ln -sfn {{release_dir}}/{{build_id}} {{webroot}}"
# Cleanup old releases (keep last 3)
```

### 5. Verify

- [ ] Visit `https://{{url}}` — page loads, no console errors
- [ ] Test 3 core flows (jobs browse, event listing, blog)
- [ ] Check `/health` or equivalent endpoint
- [ ] Verify CSP headers with browser devtools

### 6. Rollback (if needed)

```bash
ssh {{deploy_user}}@{{host}} "ln -sfn {{release_dir}}/{{previous_build_id}} {{webroot}}"
```

Keep the failed release for post-mortem.
