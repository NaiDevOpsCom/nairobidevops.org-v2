# Conventional Commit Template

```
<type>(<scope>): <short summary>
  │       │         │
  │       │         └─ Short present-tense description (lowercase, no period)
  │       │
  │       └─ Optional scope: component, module, or area
  │
  └─ Type: feat, fix, refactor, test, docs, chore, style, perf, security
```

## Types

| Type | When to use |
|---|---|
| `feat` | New feature or enhancement |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Build, CI, or tooling changes |
| `style` | Formatting, linting (no logic change) |
| `perf` | Performance improvement |
| `security` | Security vulnerability fix |

## Examples

```
feat(events): add RSVP endpoint and frontend form
fix(jobs): correct timezone offset in posted date
refactor: extract event card into shared component
test(api): add RSVP endpoint unit tests
docs: update deployment guide with new env vars
chore(deps): upgrade vite to 8.1.0
security: sanitize user input in job submission
```

## Footer (optional)

For breaking changes or issue references:

```
BREAKING CHANGE: drop support for legacy job format

Closes #123, #456
```
