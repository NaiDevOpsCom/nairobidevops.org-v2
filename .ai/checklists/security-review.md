# Security Review Checklist

## Backend
- [ ] All SQL queries use PDO prepared statements
- [ ] `PDO::ATTR_EMULATE_PREPARES => false` confirmed
- [ ] No string interpolation in SQL anywhere
- [ ] `sanitizeString()` applied to all user input
- [ ] URLs validated with `filter_var($url, FILTER_VALIDATE_URL)` and http/https scheme check
- [ ] `htmlspecialchars()` with `ENT_QUOTES` on user data rendered in PHP
- [ ] No `die()` or `exit()` outside of `respondJson()`
- [ ] No `eval()`, `assert()`, `extract()`, `create_function()`
- [ ] CRON endpoints verify `CRON_SECRET_KEY`
- [ ] CORS allowlist updated for any new origins

## Frontend
- [ ] No `dangerouslySetInnerHTML` without explicit review
- [ ] No user data rendered unsafely (React handles escaping by default)
- [ ] API tokens or secrets not exposed in client code
- [ ] Sensitive data not stored in localStorage/sessionStorage
- [ ] CSP headers in place and cover new external resources

## Build & deploy
- [ ] Production build strips `console.*` and `debugger` (esbuild + terser)
- [ ] Sourcemaps disabled in production build
- [ ] No `.env` files committed
- [ ] No secrets in git history

## Dependencies
- [ ] `npm audit` passes (no critical/high vulnerabilities)
- [ ] `composer audit` passes
- [ ] No new dependencies with known supply-chain risks
