# Content Security Policy (CSP)

## Overview

A **Content Security Policy (CSP)** is a modern security layer that helps detect and mitigate certain types of attacks, including Cross-Site Scripting (XSS) and data injection attacks.

It works by defining an "allowlist" of trusted sources for content like scripts, styles, images, and fonts. Any resource not matching the policy is automatically blocked by the browser.

## Why This Matters

### The Threat Model

1. **Malicious Script Injection (XSS)**: If an attacker manages to find a way to inject a `<script>` tag into our site, a strict CSP will block it because the script is not from a trusted source.
2. **Data Exfiltration**: CSP can restrict where the browser is allowed to send data (via `connect-src`), preventing malicious scripts from "phoning home" with stolen cookies or user data.
3. **Malicious Embeds**: Prevents the loading of malicious iframes or plugins that could compromise the user's session.

If CSP was NOT implemented, a single XSS vulnerability in a React component or an external library could allow an attacker to take full control of the user's browser session.

## Implementation Details

Our CSP is implemented via the `Content-Security-Policy` HTTP header.

### Key Configuration Decisions

- **Strict `default-src 'self'`**: We start by blocking everything and then explicitly allow only what is necessary.
- **Removal of `'unsafe-inline'` for Scripts**: To achieve high security, we have refactored inline scripts (like Google Analytics) into external files (`/analytics.js`). This allows us to block all unauthorized inline scripts.
- **External Script Trust**: We explicitly trust only known, required third parties such as `googletagmanager.com` and `youtube.com`.
- **Image & Data Security**: We allow images from our own origin, `data:` URIs (for small icons), and trusted CDNs like `ik.imagekit.io` and `res.cloudinary.com`.

### Current Directive Breakdown

| Directive     | Allowed Sources                                   | Reason                                       |
| :------------ | :------------------------------------------------ | :------------------------------------------- |
| `script-src`  | `'self'`, GTM, YouTube                            | Core application logic and essential embeds. |
| `style-src`   | `'self'`, `'unsafe-inline'`, Google Fonts         | Required for Tailwind CSS and typography.    |
| `img-src`     | `'self'`, ImageKit, Cloudinary, Unsplash, YouTube | Our primary image hosting and CDNs.          |
| `connect-src` | `'self'`, Google Analytics, Lu.ma, MyPayd         | API endpoints and analytics reporting.       |
| `frame-src`   | YouTube                                           | For embedded video content.                  |
| `object-src`  | `'none'`                                          | Disables legacy plugins like Flash and Java. |

## Code & Configuration Location

The CSP is defined centrally in the security policy file:
**[`security-policy.json`](../../security-policy.json)**

During the build process, the generator script compiles this policy into the Apache configuration file:
**`frontend/client/public/.htaccess`**

The entire policy is contained within the `Content-Security-Policy` directive in the `.htaccess` file.

## Security Benefits

- **XSS Kill-Switch**: Even if an XSS vulnerability exists in the code, the browser will refuse to execute the attacker's script if it doesn't match our policy.
- **Protocol Control**: Forces the browser to load resources over secure connections.
- **Malicious Plugin Prevention**: By setting `object-src 'none'`, we eliminate an entire category of legacy browser exploits.

## Limitations & Trade-offs

- **Development Overhead**: Adding a new third-party service (like a new chat widget or analytics tool) requires a configuration change to the CSP or it will be blocked.
- **`'unsafe-inline'` for Styles**: Currently, we allow inline styles as they are required by many modern CSS-in-JS and utility-first CSS frameworks (like Tailwind). While less risky than inline scripts, it is a known trade-off.

## Maintenance & Future Improvements

- **CSP Violations Monitoring**: In the future, we should implement a `report-uri` or `report-to` directive to receive automated alerts whenever a browser blocks a resource due to a CSP violation.
- **Moving to Nonces**: For even higher security, we could move from source-based allowlists to **Nonces** (a unique number used once) for scripts, although this requires server-side logic that is more complex for a static frontend.
- **Regular Audit**: Every time a new external service is added to the project, the CSP **must** be reviewed and updated.
