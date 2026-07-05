You are performing a security review on a changeset for the NDC (Nairobi DevOps Community) website.

## Changeset

{{changeset_description}}

## Security checklist

1. **SQL Injection** — All PDO queries use prepared statements? No string interpolation in SQL? `EMULATE_PREPARES => false`?
2. **XSS** — User output escaped via `htmlspecialchars` with `ENT_QUOTES`? React handles this by default — bypassed via `dangerouslySetInnerHTML`?
3. **CSRF** — API endpoints validate origin/referer? CORS allowlist in `index.php`?
4. **Input validation** — All inputs sanitized via `sanitizeString()`? URLs validated with `filter_var`? Zod schemas on frontend?
5. **Authentication** — CRON endpoints guarded by `CRON_SECRET_KEY`? Any new authenticated endpoints?
6. **Secrets** — Any keys, tokens, or credentials in the diff? Any in client-side code?
7. **Dependencies** — Any new npm or Composer packages? Known vulnerabilities? (`npm audit`, `composer audit`)
8. **Build** — Production build strips console and debugger? Sourcemaps disabled?
9. **File uploads** — Any new file upload? Type validation? Size limits? Storage path outside webroot?

## Output

- **Risk level:** Critical / High / Medium / Low / None
- **Findings:** For each: severity, file, description, CVSS-like score (1-10), remediation
- **Passed checks:** List of checks that passed cleanly
