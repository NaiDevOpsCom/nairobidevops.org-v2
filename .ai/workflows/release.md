# Release Workflow

Cutting a new version for production deploy.

## When to release

- A feature milestone is complete
- Enough fixes have accumulated (no strict schedule — release when ready)
- Security fix needs to go live

## Steps

### 1. Freeze `pre-staging`

Announce in team channel: no merges to `pre-staging` until release completes.

### 2. QA pass

- Run full test suite: `npm test && cd backend && php composer.phar run test`
- Manual smoke test of all core flows on staging:
  - Job board (browse, filter, submit)
  - Events (calendar view, detail page)
  - Blog (listing, article view)
  - About / contact pages
- Check console for errors

### 3. Version bump

```bash
# Update version in root package.json
npm version {{major.minor.patch}} --no-git-tag-version
```

### 4. Create release PR

PR from `pre-staging` → `main` with:
- Title: `release: v{{version}}`
- Body: changelog summary (auto-generated from conventional commits since last release)

### 5. Merge and tag

```bash
git checkout main
git merge pre-staging
git tag v{{version}}
git push origin main --tags
```

### 6. Deploy

Follow `.ai/workflows/deploy.md` with `mode=prod`, `target_branch=main`.

### 7. Post-release

- Create GitHub Release from tag (auto-triggers deploy workflow)
- Announce in community channels
- Unfreeze `pre-staging` for new work
