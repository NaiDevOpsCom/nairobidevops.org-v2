# Security Architecture

Overview of the NDC project security posture. References detailed documentation in `docs/` and `.ai/`.

## Security Layers

```
Layer 1: Network & Transport
  ├── HTTPS enforced (HSTS preload)
  ├── CSP headers (auto-generated from security-policy.json)
  ├── X-Frame-Options: DENY
  └── Permissions-Policy (camera, mic, geolocation, payment disabled)

Layer 2: API Security
  ├── CORS allow-list (4 trusted origins, no wildcard)
  ├── All input sanitized via sanitizeString()
  ├── All SQL via PDO prepared statements (EMULATE_PREPARES = false)
  ├── CRON endpoints guarded by CRON_SECRET_KEY
  └── Method validation per endpoint

Layer 3: Application Security
  ├── React JSX auto-escaping (no XSS by default)
  ├── PHP htmlspecialchars with ENT_QUOTES on user output
  ├── Zod schemas for frontend form validation
  └── No eval(), assert(), extract() in codebase

Layer 4: Build & Deploy
  ├── Dual-level console/debugger stripping (esbuild + terser)
  ├── No sourcemaps in production
  ├── Atomic symlink deploys with instant rollback
  └── npm audit + composer audit in CI

Layer 5: CI/CD Security
  ├── CodeQL static analysis (weekly + on PR)
  ├── Dependency review via lockfile-lint
  ├── Hardened build verification
  ├── Security policy validation
  ├── Dependabot with grouped updates
  └── PR title lint + auto-labeling
```

## Key Files

| File | Purpose |
|---|---|
| `frontend/security-policy.json` | Single source of truth for CSP + headers |
| `frontend/scripts/generate-security-headers.js` | Generates `.htaccess` from policy |
| `frontend/client/public/.htaccess` | Auto-generated Apache security config |
| `backend/index.php` | CORS allow-list, API router |
| `backend/config.example.php` | Secret configuration template |
| `docs/frontend/security/` | Detailed security documentation |
| `.github/workflows/codeql.yml` | CodeQL analysis |
| `.github/workflows/hardened-build-check.yml` | Build hardening verification |
| `.github/workflows/security-pipeline.yml` | Dependency security review |

## Security Review Process

For every changeset, use:
- `.ai/checklists/security-review.md` — comprehensive 9-point checklist
- `.ai/prompts/security-review.prompt.md` — AI-assisted security audit prompt
- `.ai/prompts/code-review.prompt.md` — general code review with security checks

## Incident Response

1. Identify affected scope (data, users, systems)
2. Contain — rollback deploy if recent; revoke tokens if compromised
3. Document — create incident report in `.ai/memory/session-log/`
4. Fix — deploy hotfix following `.ai/workflows/hotfix.md`
5. Post-mortem — root cause analysis within 48 hours

See `docs/frontend/security/overview.md` for detailed incident response procedures.
