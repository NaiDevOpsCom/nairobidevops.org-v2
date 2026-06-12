# Browser Security Headers

## Overview

**Browser Security Headers** are a set of HTTP response headers that provide an extra layer of security by instructing the browser on how to behave when handling our application's content. They are a powerful, low-overhead way to mitigate entire classes of common web vulnerabilities.

## Why This Matters

Without correctly configured security headers, browsers often default to "permissive" modes that favor backward compatibility over security. This leaves the application vulnerable to:

1. **Clickjacking**: An attacker embeds our site in an invisible `<iframe>` on their malicious site to trick users into performing actions.
2. **MIME Sniffing Attacks**: Browsers may try to guess the content type of a file (e.g., executing a `.txt` file as a script), allowing for unexpected code execution.
3. **Cross-Protocol Leaks**: Information like full URLs (containing potentially sensitive tokens) can be leaked to external sites via the `Referer` header.
4. **Stripping SSL (Man-in-the-Middle)**: Attackers may try to downgrade a user's connection from `https` to `http`.

## Implementation Details

We implement these headers at the infrastructure level using our deployment configuration.

### Key Configuration Decisions

| Header                      | Value                                     | Purpose                                                                                                                 |
| :-------------------------- | :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `X-Frame-Options`           | `DENY`                                    | Completely prevents the application from being embedded in an `<iframe>`, neutralizing Clickjacking.                    |
| `X-Content-Type-Options`    | `nosniff`                                 | Forces the browser to strictly follow the `Content-Type` header provided by the server, preventing MIME sniffing.       |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`         | Sends the full URL when staying on our site, but only the origin (domain) when navigating to external sites over HTTPS. |
| `Strict-Transport-Security` | `max-age=...; includeSubDomains; preload` | Tells the browser to only ever communicate with our domain over HTTPS for the next year.                                |
| `Permissions-Policy`        | `camera=(), geolocation=(), ...`          | Disables access to sensitive browser APIs (camera, microphone, geolocation) by default to protect user privacy.         |

## Code & Configuration Location

Security headers are defined centrally in the security policy file:
**[`security-policy.json`](../../security-policy.json)**

During the build process, the generator script compiles this policy into an Apache configuration file:
**`client/public/.htaccess`**

### Relevant Sections Explained

The headers are defined within the `"headers"` object in `security-policy.json` and compiled into `.htaccess` header directives.

```apache
<IfModule mod_headers.c>
  Header always set X-Frame-Options "DENY"
</IfModule>
```

_This snippet shows how Apache forces the browser to block framing._

## Security Benefits

- **Instant Protection**: Once deployed, these headers protect every user immediately without requiring changes to the React application code.
- **Low Risk of Regressions**: These headers target browser-level behavior and rarely impact application logic or functionality.
- **Improved Security Score**: Correct headers are a primary factor in security auditing tools like Mozilla Observatory or SecurityHeaders.com.

## Limitations & Trade-offs

- **HSTS Preload Persistence**: Once the `preload` directive is used and submitted to browser vendors, it is difficult to "undo." It is a long-term commitment to maintaining SSL/TLS.
- **Permissions-Policy Restrictions**: If we eventually need to use an API like Geolocation, we must explicitly update this header or the feature will be blocked by the browser.

## Maintenance & Future Improvements

- **Subdomain Review**: When adding new subdomains, ensure they also support HTTPS to remain compliant with the `includeSubDomains` HSTS directive.
- **Periodic Audits**: Use tools like [securityheaders.com](https://securityheaders.com) after every major infrastructure change to verify that headers are still being served correctly.
