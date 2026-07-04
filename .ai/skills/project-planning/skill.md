---
name: project-planning
description: Guide for planning and scoping work on the NDC project. Covers task breakdown, estimation, dependency mapping, and prioritization. Use when planning sprints, breaking down features, or estimating effort.
tags:
  - planning
  - estimation
  - project-management
  - scoping
user-invocable: false
model: claude-sonnet-4-6
allowed-tools: Read Bash Glob Grep
---

# Project Planning

## Task Breakdown Template

When breaking down a feature or bug fix, consider all layers:

```
[ ] Database — schema changes, migrations, indexing
[ ] Backend — new/modified endpoints, business logic, tests
[ ] Frontend — new/modified pages, components, hooks, tests
[ ] Config — environment variables, Vite proxy, CORS
[ ] Documentation — .ai/ docs, API docs, README
[ ] CI/CD — workflow changes, deployment considerations
[ ] Security — CSP headers, input validation, secret management
```

## Estimation Guidelines

| Complexity | Effort | Examples |
|---|---|---|
| Trivial | < 1 hour | Typo fix, CSS tweak, config change |
| Small | 2-4 hours | New component, simple endpoint, migration |
| Medium | 1-2 days | New page, new API feature, data model change |
| Large | 3-5 days | New integration, major refactor, new feature set |
| Unknown | Spike needed | No clear path — research first |

## Dependency Mapping

When planning, identify dependencies between layers:

```
Database migration → Backend endpoint → Frontend feature
External API change → Backend sync update → Frontend display
Config change → Deploy pipeline update
```

## Prioritization

| Priority | Criteria |
|---|---|
| Critical | Blocks other work, security issue, production outage |
| High | Direct user impact, core feature broken |
| Medium | Improvement, enhancement, technical debt |
| Low | Nice-to-have, cosmetic, future optimization |

## Sprint Checklist

- [ ] Tasks broken down into < 1 day pieces
- [ ] Dependencies identified and sequenced
- [ ] Tests identified for each change
- [ ] Documentation updates identified
- [ ] Deployment order planned (backend first? frontend first?)
- [ ] Rollout strategy considered (feature flag? gradual?)
- [ ] Rollback plan documented for risky changes
