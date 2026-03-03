# Complete Deployment Guide

## Overview

This guide covers deploying the Nairobi DevOps website to both Vercel (staging) and cPanel (production) environments from a single codebase.

## Environment Architecture

### Staging (Vercel)

- **URL:** Pre-staging branch → Vercel deployment
- **Platform:** Serverless functions
- **API Routing:** Automatic via `vercel.json`
- **Build:** `npm run build:staging`

### Production (cPanel)

- **URL:** Main branch → nairobidevops.org
- **Platform:** Traditional Apache hosting
- **API Routing:** Manual `.htaccess` rewrite rules
- **Build:** `npm run build:prod`

## Prerequisites

### Development Environment

- Node.js 18+
- npm or yarn
- Git

### cPanel Requirements

- Apache web server
- PHP 7.4+ with cURL extension
- File manager access or SSH
- SSL certificate (HTTPS required)

### Vercel Requirements

- GitHub integration
- Vercel account
- Project connected to repository

## Build System Setup

### Build Scripts Overview

```json
{
  "build": "npm run security:generate && npm run check && vite build --mode production && node scripts/setup-cpanel.js",
  "build:staging": "npm run security:generate && vite build --mode staging && node scripts/setup-cpanel.js",
  "build:prod": "npm run security:generate && vite build --mode production && node scripts/setup-cpanel.js"
}
```

### Build Process Flow

1. **Security Headers Generation** (`npm run security:generate`)
   - Reads `security-policy.json`
   - Generates `.htaccess` for cPanel
   - Updates `vercel.json` headers

2. **Code Quality Checks** (`npm run check`)
   - ESLint linting
   - TypeScript type checking
   - Prettier formatting

3. **Vite Build** (`vite build --mode <environment>`)
   - Compiles React application
   - Minifies assets
   - Generates build output in `dist/`

4. **cPanel Structure Setup** (`node scripts/setup-cpanel.js`)
   - Copies API files to dist root
   - Ensures `.htaccess` is in correct location
   - Creates cPanel-compatible structure

## Environment-Specific Configurations

### Vercel Configuration

**File:** `vercel.json`

```json
{
  "buildCommand": "npm run build:staging",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://www.googletagmanager.com..."
        }
      ]
    }
  ],
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }]
}
```

### cPanel Configuration

**File:** `.htaccess` (auto-generated)

```apache
<IfModule mod_headers.c>
  # Security headers (auto-generated)
  Header always set Content-Security-Policy "..."
  Header always set X-Frame-Options "DENY"
  # ... other security headers
</IfModule>

Options -MultiViews

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # API Proxy routing
  RewriteRule ^api/luma/(.*)$ api/luma.php?path=$1 [QSA,L]

  # SPA fallback
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

#### Method 2: Automated Deployment (GitHub Actions)

**Workflow:** `.github/workflows/deploy.yml`

The project uses a hardened GitHub Actions workflow for atomic, symlink-based releases with secure, shared secret management.

**Key Security Features:**
- **Shared Secret Store**: Secrets are injected into `/home/user/config/secrets.env.php` (outside `public_html`).
- **Zero-Downtime Rotation**: Supports multiple valid tokens via JSON array in `PROXY_API_TOKEN`.
- **Atomic Releases**: Uses symlink switching (`ln -sfn` + `mv -Tf`) for zero downtime.
- **Permissions**: Directories are `700` and config files are `600`.

**Injection Logic (GHA):**
```bash
# Workflow creates ~/config/ if missing
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

# Secrets are escaped and written atomically to secrets.env.php
cat > "${ENV_FILE}.tmp" <<-EOF
<?php
define('CLD_CLOUD_NAME', '${SAFE_CLOUD_NAME}');
define('CLD_API_KEY',    '${SAFE_API_KEY}');
define('CLD_API_SECRET', '${SAFE_API_SECRET}');
define('PROXY_API_TOKEN', '${SAFE_PROXY_TOKEN}');
EOF
chmod 600 "${ENV_FILE}.tmp"
mv "${ENV_FILE}.tmp" "$ENV_FILE"
```

### API Implementation

### Hardened Proxy Architecture

Both `api/luma.php` and `api/imagesCloudinary.php` utilize a common security layer:

1. **config-loader.php**: Locates the shared `secrets.env.php` outside the web root.
2. **security-utils.php**: Provides centralized logic for:
   - **IP-based Rate Limiting**: Prevents abuse with file-based tracking in `~/cache/rate_limits/`.
   - **Origin/Referer Validation**: Strict whitelist checking against production domains.
   - **Token Validation**: Supports single string or rotated token arrays.
3. **Caching**: Response caching in `~/cache/api_responses/` with configurable TTL and atomic writes.

**Frontend API Calls:**
Proxied calls should include the `X-Proxy-Token` header for authentication when not from a trusted AJAX context.

## Security Configuration

### Content Security Policy

**Source:** `security-policy.json`

```json
{
  "contentSecurityPolicy": {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://www.youtube.com"
    ],
    "connect-src": ["'self'", "https://lu.ma", "https://api.luma.com"]
  },
  "headers": {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
  }
}
```

### Environment Variables

**For Production Configuration:**

```bash
# In cPanel Setup > Environment Variables
LUMA_CALENDAR_ID="cal-fFX28aaHRNQkThJ"
ANALYTICS_ID="GA_MEASUREMENT_ID"
```

## Monitoring & Troubleshooting

### Health Checks

**Frontend Health:**

```javascript
// src/utils/healthCheck.ts
export async function healthCheck() {
  const checks = await Promise.allSettled([
    fetch("/api/luma/ics/get?health=1"),
    fetch("/index.html"),
  ]);

  return {
    api: checks[0].status === "fulfilled",
    frontend: checks[1].status === "fulfilled",
  };
}
```

**API Health:**

```php
// api/luma.php - Add health check
if (isset($_GET['health']) && $_GET['health'] === '1') {
  echo json_encode(['status' => 'healthy', 'timestamp' => time()]);
  exit;
}
```

### Common Issues & Solutions

#### 404 Errors on cPanel

**Problem:** API endpoints return 404
**Solution:**

- Verify `api/luma.php` exists in web root
- Check `.htaccess` rewrite rules
- Ensure permissions are correct

#### CSP Violations

**Problem:** Browser console shows CSP errors
**Solution:**

- Update `security-policy.json`
- Run `npm run security:generate`
- Redeploy

#### Build Failures

**Problem:** npm build fails
**Solution:**

- Check Node.js version compatibility
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
- Verify all dependencies in package.json

#### SSL Certificate Issues

**Problem:** Mixed content warnings
**Solution:**

- Ensure all resources use HTTPS
- Update absolute URLs in code
- Verify SSL certificate is valid

## Performance Optimization

### Build Optimizations

**Vite Configuration:**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-button"],
          utils: ["date-fns", "clsx", "tailwind-merge"],
        },
      },
    },
    minify: "esbuild",
    sourcemap: false, // Disable in production for security
  },
});
```

### Caching Strategy

**Headers for Static Assets:**

```apache
# Add to .htaccess
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
</IfModule>
```

## Rollback Procedures

### Vercel Rollback

1. Go to Vercel dashboard
2. Select project
3. Click "Deployments" tab
4. Find previous successful deployment
5. Click "..." menu and select "Promote to Production"

### cPanel Rollback

```bash
# SSH into server
cd /home/username/public_html
mv dist dist_failed
mv dist_backup dist
# Verify restoration
curl -I https://nairobidevops.org/
```

## Maintenance

### Regular Tasks

**Weekly:**

- Check for dependency updates: `npm outdated`
- Review security headers
- Monitor error logs

**Monthly:**

- Update dependencies: `npm update`
- Review build performance
- Audit security policies

**Quarterly:**

- SSL certificate renewal (if not auto-renewed)
- Performance audit
- Security assessment

### Backup Strategy

**cPanel:**

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "backup_${DATE}.tar.gz" public_html/
aws s3 cp "backup_${DATE}.tar.gz" s3://backup-bucket/
```

**Vercel:**

- Automatic deployment history (last 25 deployments)
- Environment variables backed up
- Integration with GitHub provides code backup

## Contact & Support

### Emergency Contacts

- **cPanel Support:** hosting-provider.com/support
- **Vercel Support:** vercel.com/support
- **GitHub Issues:** github.com/NaiDevOpsCom/ndc-redesign-website/issues

### Documentation

- **Project Repository:** github.com/NaiDevOpsCom/ndc-redesign-website
- **Security Guide:** `docs/SECURITY-HEADERS.md`
- **API Documentation:** `docs/API.md`

---

This deployment guide ensures consistent, secure, and maintainable deployments across both Vercel and cPanel environments while maintaining a single source of truth for your codebase.
