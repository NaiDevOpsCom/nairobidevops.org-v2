# Security Headers Implementation Guide

## Overview

This project uses a **Single Source of Truth** approach for HTTP security headers. Instead of manually maintaining the Apache/cPanel (`.htaccess`) configuration directly, we define the policy once in `security-policy.json` and auto-generate the configuration.

## Architecture

1.  **Policy Definition**: `security-policy.json` (Root of repository)
2.  **Generator Script**: `scripts/generate-security-headers.js`
3.  **Build Integration**: `package.json` scripts

![Flow](https://mermaid.ink/img/pako:eNpVkFtqwzAQRfdC_x0W_OolpQullBZIyQ8t5IGxPBqsGI2k7IQ0uXvH8aO0fRjq3jMzR9JoCmswEr72dhf8wWjD2_NqR-AP-t1o8yfZvJ_N9uX5_fl9v9tH8yv5o2gMBrxXn0Kj8Wj0KTTqj8agP4VGE_Z8wNfQdD9G09EfaDafza_RHI3vza_R_GgeovnXfI7mX_M1mn_Nt9B0P0bT0R9oNp_Nr9Ecje_Nr9H8aJ6i-dF8iebXeIvmT_M1mn_Nt9B0P0fT0R9oNp_Nr9Ecje_Nr9H8aJ6i-dF8iebX-Ijmn2j-tFCA9c46qL0Dq_cWSgveOquh9g6s3lsoLXjrPIfaO7B6b6G04K3zEmrvwOq9hdKCt85rqL0Dq_cWSgveOm-h9g6s3lsoLXjrvIfaO7B6b6G04K3zEWrvwOq9hdKCt85HqL0Dq_cWSgveOh-h9g6s3lsoLXjrfITaO7B6b6G04K3zEWrvwOq9hdKCt85HqL0Dq_cWSgveOh-h9g6s3lsoLXjrHIbaO7B6b6G04K1zGGrvwOq9hdKCt85hqL0Dq_cWSgveOo-h9g6s3lsoLXjrPIbaO7B6b6G04K3zGGrvwOq9hdKCt84TqL0Dq_cWSgveOk-h9g6s3lsoLXjrPIXaO7B6b6G04K3zFGrvwOq9hdKC99F5CrV3YPXeQmnB--g8hdo7sHpvobTg7eQp1N6B1XsLpQVvJ0-h9g6s3lsoLXg7eQq1d2D13kJpwdvJU6i9A6v3FkoL3k6eQu0dWL23UFrwdvIUau_A6r2F0oK3k6dQewdW7y2UFrydPIXaO7B6b6G04O3kKdTegdV7C6UFbydPoVbvLJQWPJ08hVq9s1Ba8HTyFGr1zkJpwdPJU6jVOwulBU8nT6FW7yyUFjydPIVavbNQWvB08hRq9c5CacHTyVOo1TsLpQVvJ0-hVu8slBa8nTyFWr2zUFrwdvIUavXOQmnB28lTqNU7C6UFbydPoVbvLJSlVv8B2X8zWA)

## How to Modify Security Policies

**DO NOT** edit `client/public/.htaccess` manually. Your changes will be overwritten.

1.  Open `security-policy.json` in the root directory.
2.  Modify the directives as needed.
    - **CSP**: Edit the `contentSecurityPolicy` object. Directives are arrays of strings.
    - **Headers**: Edit the `headers` object for key-value pairs like `X-Frame-Options`.
3.  Apply your changes:
    run `npm run security:generate`
    - _Note: This also runs automatically before `npm run build`._

## Configuration Reference

### Content Security Policy (CSP)

The CSP is defined as a JSON object where keys are standard CSP directives (e.g., `script-src`) and values are arrays of allowed sources.

Example:

```json
"script-src": [
  "'self'",
  "https://www.googletagmanager.com"
]
```

**Common Directives:**

- `default-src`: Fallback for all other directives.
- `script-src`: Allowed sources for JavaScript.
- `style-src`: Allowed sources for CSS (often requires `'unsafe-inline'` for JS libraries).
- `img-src`: Allowed sources for images.
- `connect-src`: Allowed origins for API calls (`fetch`, `XHR`).

### Other Security Headers

- **X-Frame-Options**: `DENY` prevents the site from being framed (clickjacking protection).
- **X-Content-Type-Options**: `nosniff` prevents MIME-type sniffing.
- **Referrer-Policy**: Controls how much referrer information is sent.
- **Strict-Transport-Security (HSTS)**: Forces HTTPS for all users for 1 year (`max-age=31536000`).

## Deployment Guide

### cPanel / Apache

The script generates `.htaccess` in `client/public/`.

- During Vite build, assets in `client/public/` are copied to `dist/`.
- Deploy the contents of the `dist/` folder to your cPanel `public_html`.
- Apache will automatically read the `.htaccess` file and apply the headers.

## Troubleshooting

**Problem**: My new analytics tool isn't working.
**Solution**: Check the browser console -> Network tab. Look for CSP violation reports. Add the blocked domain to the relevant section (e.g., `script-src` or `connect-src`) in `security-policy.json` and regenerate.

**Problem**: The build failed with "Policy file not found".
**Solution**: Ensure `security-policy.json` exists in the project root.
