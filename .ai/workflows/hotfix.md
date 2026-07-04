# Hotfix Workflow

Emergency process for critical bugs affecting production.

## Step 1: Triage

Determine if it qualifies as a hotfix:
- [ ] Production is broken (site down, core flow blocked)
- [ ] Security vulnerability (active or reported)
- [ ] Data loss or corruption

If not critical, use the normal feature branch → PR → deploy cycle.

## Step 2: Branch from main

```bash
git checkout main
git pull origin main
git checkout -b hotfix/{{description}}
```

## Step 3: Fix

- Minimal change — only the lines needed to resolve the issue
- No refactoring, no unrelated changes
- Add regression test

## Step 4: Review

- Skip the full feature-planning prompt
- Use the bug-analysis prompt: `.ai/prompts/bug-analysis.prompt.md`
- At least one other person must approve

## Step 5: Deploy

```bash
# Build
npm run build:prod
# Deploy (same as deploy workflow but faster)
rsync -avz --delete dist/ {{deploy_user}}@{{host}}:{{release_dir}}/{{build_id}}/
ssh {{deploy_user}}@{{host}} "ln -sfn {{release_dir}}/{{build_id}} {{webroot}}"
```

## Step 6: Backport

Merge `hotfix/{{description}}` into `main`, then merge `main` into `pre-staging`:
```bash
git checkout main
git merge hotfix/{{description}}
git push origin main
git checkout pre-staging
git merge main
git push origin pre-staging
```

## Step 7: Post-mortem

Within 48 hours, document:
- Root cause
- Why it reached production
- What CI check or code review rule would have caught it
