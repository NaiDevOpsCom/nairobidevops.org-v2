# Feature Branch Workflow

Used for all non-trivial changes — features, refactors, improvements.

## Steps

### 1. Branch

```bash
git checkout pre-staging
git pull origin pre-staging
git checkout -b feat/{{description}}  # e.g., feat/add-event-rsvp
```

### 2. Plan

Run the `feature-planning` prompt: `.ai/prompts/feature-planning.prompt.md`

Commit the spec as `docs/{{feature-name}}-spec.md` (lightweight; removed before release).

### 3. Implement

- Follow standards in `.ai/standards/`
- Respect coding rules in `.ai/coding-rules/`
- Add tests alongside code
- Commit frequently with conventional commits:
  ```
  feat: add RSVP endpoint and frontend form
  fix: correct timezone offset in event listing
  refactor: extract event card component
  test: add RSVP endpoint unit tests
  ```

### 4. Self-review

Run the `code-review` prompt on your own diff:
```bash
git diff pre-staging --name-only
```

### 5. Push and PR

```bash
git push -u origin feat/{{description}}
```

Create PR against `pre-staging` with:
- Description referencing the spec
- Checklist from `.ai/checklists/pr-review.md`

### 6. Address feedback

Iterate with fixup commits (squash before merge):
```bash
git commit --fixup {{sha}}
```

### 7. Merge

Squash-merge into `pre-staging`. Delete the feature branch.
