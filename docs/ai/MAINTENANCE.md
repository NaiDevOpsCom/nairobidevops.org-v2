# AI Workspace Maintenance

## Regular Tasks

### After Adding or Editing .ai/ Files

```bash
# Regenerate all tool-specific configs
npm run sync

# Validate cross-references
npm run check:workspace

# View the health report
npm run workspace:report
```

### Weekly

- Run `npm run check:workspace` to catch stale cross-references
- Check `npm run workspace:report` for warnings (stale files, empty dirs)
- Review session logs at `.ai/memory/session-log/` for useful patterns

### Monthly

- Update `.ai/memory/active-context.md` — refresh the "Last updated" date and current status
- Review ADRs for any decisions that need revisiting
- Check if the threat model (`.ai/security/threat-model.md`) needs updates

## Adding New Skills

1. Create a directory in `.ai/skills/` with a `SKILL.md` file
2. Follow the existing skill format (YAML frontmatter, progressive headings)
3. Run `npm run sync-skills` to distribute to `.claude/` and `.agents/`

## Adding New Coding Rules

1. Create a `.mdc` file in `.ai/coding-rules/`
2. Add YAML frontmatter with `description`, `globs`, and `alwaysApply`
3. Run `npm run sync-rules` to distribute to tool-specific directories

## Adding Templates

1. Create a `.md` file in `.ai/templates/`
2. Use `{{placeholder}}` syntax for variable substitution
3. Add usage instructions and link to relevant standards

## Updating the Knowledge Graph

```bash
# The graph auto-rebuilds on post-commit and post-checkout
# via Graphify git hooks.

# Manual rebuild:
graphify update .

# Query the graph:
graphify query "question about codebase"
graphify path "fileA" "fileB"
graphify explain "concept name"
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `check:workspace` reports broken refs | File renamed/moved without updating cross-refs | Fix the reference path in the source file |
| Sync scripts incomplete | New tool-specific directory added but not in sync target list | Add directory to the sync script's `TARGETS` array |
| Session logs not being captured | Pre-commit hook not installed or outdated | Run `node scripts/setup-git-hooks.mjs` |
| Graphify graph stale | Hook skipped during rebase/merge | Run `graphify update .` manually |
