# Safe Redirection

## Overview

**Safe redirection** is a security pattern that validates and sanitizes all navigation targets before allowing the application to redirect users. This prevents **open redirect vulnerabilities**, where attackers craft malicious URLs that redirect users to phishing sites or exploit pages.

### Common Risks

| Risk                    | Example                             | Impact                         |
| ----------------------- | ----------------------------------- | ------------------------------ |
| **Phishing**            | `yoursite.com?redirect=evil.com`    | Users trust the initial domain |
| **Credential theft**    | Redirect to fake login page         | Stolen passwords               |
| **XSS via javascript:** | `javascript:alert(document.cookie)` | Session hijacking              |
| **Data exfiltration**   | `data:text/html,...`                | Arbitrary content execution    |

---

## Why This Was Implemented

### Security Risks Addressed

1. **Open Redirect Prevention** - Attackers cannot use our domain to redirect users to malicious sites
2. **XSS Mitigation** - Blocks `javascript:`, `data:`, and other dangerous URL protocols
3. **Encoded URL Bypass Prevention** - Decodes URLs before validation to catch obfuscated attacks
4. **Protocol-Relative URL Blocking** - Prevents `//evil.com` attacks

### Compliance & Best Practices

- OWASP Unvalidated Redirects and Forwards Cheat Sheet
- CWE-601: URL Redirection to Untrusted Site
- Defense-in-depth security architecture

---

## Implementation Details

### How Redirects Are Validated

```text
┌─────────────────┐
│   Input URL     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Multi-layer    │  ← Catches %2F%2F → //
│  URL Decoding   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Protocol       │  ← Blocks javascript:, data:, vbscript:, file:, blob:
│  Blocklist      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  External URL   │  ← Blocks //, http://, https://, ftp://
│  Detection      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Path           │  ← Resolves /../ sequences
│  Normalization  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Safe Route     │
│  Returned       │
└─────────────────┘
```

### Protocol Blocklist

| Protocol      | Status       | Reason                      |
| ------------- | ------------ | --------------------------- |
| `javascript:` | ❌ Blocked   | XSS attack vector           |
| `data:`       | ❌ Blocked   | Arbitrary content execution |
| `vbscript:`   | ❌ Blocked   | Legacy IE attack vector     |
| `file:`       | ❌ Blocked   | Local file access           |
| `blob:`       | ❌ Blocked   | Arbitrary blob content      |
| `http://`     | ❌ Blocked\* | External redirect           |
| `https://`    | ❌ Blocked\* | External redirect           |
| `//`          | ❌ Blocked   | Protocol-relative external  |

\*Allowed only when explicitly opening external URLs with `safeOpenExternal()`

### External vs Internal URL Handling

| URL Type                 | Handler              | Behavior                                    |
| ------------------------ | -------------------- | ------------------------------------------- |
| Internal (`/about`)      | `getSafeRoute()`     | Sanitized and navigated                     |
| External (`https://...`) | `safeOpenExternal()` | Opens in new tab with `noopener,noreferrer` |
| Invalid/Malicious        | Fallback             | Returns `/` (home)                          |

### Fallback Behavior

When an invalid redirect is detected, the system:

1. Logs a warning to the console (development mode)
2. Returns the fallback route (default: `/`)
3. Never exposes the invalid URL to the user

---

## Code Location

### Primary Utility

```text
client/src/utils/safeNavigate.ts
```

### Functions Exported

| Function                               | Purpose                                   |
| -------------------------------------- | ----------------------------------------- |
| `validateInternalRoute(url, fallback)` | Validates and returns `ValidationResult`  |
| `getSafeRoute(url, fallback)`          | Returns safe route string or fallback     |
| `validateExternalUrl(url)`             | Validates external URLs (http/https only) |
| `safeOpenExternal(url)`                | Opens external URL securely               |
| `isExternalUrl(url)`                   | Detects if URL is external                |

### Unit Tests

```text
client/src/utils/__tests__/safeNavigate.test.ts
```

### Naming Conventions

- Prefix `safe` for security-critical functions
- Prefix `validate` for functions returning validation results
- Prefix `is` for boolean checks

---

## Usage Examples

### Safe Internal Navigation

```typescript
import { getSafeRoute } from "@/utils/safeNavigate";
import { useLocation } from "wouter";

function MyComponent() {
  const [, navigate] = useLocation();

  const handleClick = (destination: string) => {
    // Always sanitize before navigating
    navigate(getSafeRoute(destination));
  };
}
```

### Safe External URL Opening

```typescript
import { isExternalUrl, safeOpenExternal } from "@/utils/safeNavigate";

function handleLink(url: string) {
  if (isExternalUrl(url)) {
    safeOpenExternal(url); // Opens with noopener,noreferrer
  } else {
    navigate(getSafeRoute(url));
  }
}
```

### With Custom Fallback

```typescript
// Redirect to /dashboard if invalid
navigate(getSafeRoute(userInput, "/dashboard"));
```

### Blocked Redirect Example

```typescript
// All of these return "/" (fallback)
getSafeRoute("javascript:alert(1)"); // → "/"
getSafeRoute("//evil.com"); // → "/"
getSafeRoute("%2F%2Fevil.com"); // → "/" (decoded to //evil.com)
getSafeRoute("data:text/html,<script>"); // → "/"
```

---

## Edge Cases Handled

| Edge Case            | Input                               | Behavior                          |
| -------------------- | ----------------------------------- | --------------------------------- |
| Empty string         | `""`                                | Returns fallback                  |
| Whitespace only      | `"   "`                             | Normalizes to `/`                 |
| Null/undefined       | `null`                              | Returns fallback                  |
| URL-encoded protocol | `%6A%61%76%61%73%63%72%69%70%74%3A` | Decoded → `javascript:` → Blocked |
| Double-encoded       | `%252F%252F`                        | Decoded → `//` → Blocked          |
| Path traversal       | `/../../../etc`                     | Normalized to `/etc`              |
| Mixed slashes        | `/\evil.com`                        | Blocked as external               |
| Case variations      | `JAVASCRIPT:`                       | Lowercase comparison → Blocked    |

---

## Security Notes

### How This Prevents Open Redirects

1. **No user input reaches `navigate()` directly** - All input passes through `getSafeRoute()`
2. **Protocol validation** - Only relative paths allowed for internal navigation
3. **URL decoding** - Catches obfuscation attempts
4. **External URL isolation** - External links open in new tabs, never replace current page
5. **Centralized logic** - Single point of enforcement, easy to audit

### Limitations & Assumptions

- **Client-side only** - Server should also validate redirects if applicable
- **Relies on consistent usage** - Developers must use the utility (enforced via code review)
- **Does not validate route existence** - Only validates URL safety, not whether the route is defined

### Defense-in-Depth

This implementation is one layer. Additional protections include:

- CSP `frame-ancestors 'none'` (prevents embedding)
- `X-Frame-Options: DENY`
- HTTPS enforcement via HSTS

---

## Maintenance Notes

### Updating Allowed Destinations

The current implementation allows **all relative paths**. To add strict route whitelisting:

1. Open `client/src/utils/safeNavigate.ts`
2. Uncomment the `ALLOWED_ROUTE_PREFIXES` validation block
3. Add new routes to the `ALLOWED_ROUTE_PREFIXES` array

### Adding New Blocked Protocols

1. Open `client/src/utils/safeNavigate.ts`
2. Add the protocol to the `DANGEROUS_PROTOCOLS` array
3. Add a test case in `safeNavigate.test.ts`

### When Modifying Routing Logic

Review checklist:

- [ ] Ensure all new navigation uses `getSafeRoute()` or `safeOpenExternal()`
- [ ] Add unit tests for any new navigation patterns
- [ ] Check for any `window.location.href` assignments (should use utilities)
- [ ] Verify no `navigate()` calls receive unsanitized user input

---

## Related Files

| File                                                                                                                    | Purpose       |
| ----------------------------------------------------------------------------------------------------------------------- | ------------- |
| [`client/src/utils/safeNavigate.ts`](../client/src/utils/safeNavigate.ts)                                               | Core utility  |
| [`client/src/utils/__tests__/safeNavigate.test.ts`](../client/src/utils/__tests__/safeNavigate.test.ts)                 | Unit tests    |
| [`client/src/components/landing/herosection/HeroSlide.tsx`](../client/src/components/landing/herosection/HeroSlide.tsx) | Example usage |

---

## References

- [OWASP Unvalidated Redirects and Forwards](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/04-Testing_for_Client-side_URL_Redirect)
- [CWE-601: URL Redirection to Untrusted Site](https://cwe.mitre.org/data/definitions/601.html)
