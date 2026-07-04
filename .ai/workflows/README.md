# Workflows

Standard operating procedures for common development processes on the NDC project.

## Process overview

```
Feature request → Feature branch workflow → PR → Code review → Staging deploy → QA → Release → Production deploy
Bug report     → Hotfix workflow → PR → Emergency review → Hotfix deploy
```

## Workflows

| Workflow | When to use |
|---|---|
| `feature-branch` | Building a new feature or non-trivial change |
| `deploy` | Deploying to staging or production |
| `hotfix` | Fixing a critical bug in production |
| `release` | Cutting a new release version |

Each workflow references `.ai/checklists/` for quality gates and `.ai/prompts/` for AI-assisted steps.
