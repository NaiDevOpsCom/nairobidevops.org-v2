# NDC Website Threat Model

> A lightweight STRIDE threat model for the Nairobi DevOps Community website.

## Assets

| Asset | Sensitivity | Location |
|---|---|---|
| Job listings | Public | Database + API |
| Employer contact info | Limited (email, company) | Database + notifications |
| Community events | Public | Lu.ma API (external) |
| Blog content | Public | Static data files |
| Click tracking | Analytics | Database (aggregate only) |
| CRON secret key | Confidential | `config.php` |
| Deploy credentials | Confidential | CI secrets (GitHub) |

## Threats (STRIDE)

### Spoofing
- **Threat:** Attacker calls a CRON endpoint directly
- **Mitigation:** `CRON_SECRET_KEY` guard on all CRON endpoints
- **Residual:** Low — key is config file, not code

### Tampering
- **Threat:** SQL injection via job submission form
- **Mitigation:** PDO prepared statements (never interpolate), input sanitization, Zod frontend validation
- **Residual:** Very low — dual validation layers

### Repudiation
- **Threat:** Malicious job submission with no audit trail
- **Mitigation:** All submissions logged with IP and timestamp; `sync_log` table for background jobs
- **Residual:** Low — no user auth system to tie submissions to identities

### Information Disclosure
- **Threat:** CSP bypass or XSS exfiltrates data
- **Mitigation:** CSP headers (tight script-src), React auto-escaping, no `dangerouslySetInnerHTML`
- **Residual:** Low — CSP allows GTM/GA which are potential XSS vectors if compromised

### Denial of Service
- **Threat:** Repeated API calls exhaust PHP-FPM workers
- **Mitigation:** No rate limiting currently — see improvements below
- **Residual:** Medium — hosting provider level DDoS protection assumed

### Elevation of Privilege
- **Threat:** Deploy credentials exposed or misused
- **Mitigation:** Atomic symlink deploy (limited blast radius), CI secrets scoped per environment
- **Residual:** Low — no user roles or auth system to escalate

## Mitigation Gaps

| Gap | Severity | Proposed Fix |
|---|---|---|
| No rate limiting on API | Medium | Add IP-based rate limiting in `.htaccess` or `index.php` |
| No auth on job submission | Low | CAPTCHA or honeypot field (no user accounts) |
| No input size limits on API | Low | Add max-length validation in `index.php` |
| No audit log for admin actions | Low | No admin panel exists yet |

## Security Contacts

Report vulnerabilities via GitHub Issues (private) or contact the NDC team directly.
