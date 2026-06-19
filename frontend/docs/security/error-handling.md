# Error Handling & Information Disclosure Prevention

## Overview

This document describes the error handling security measures implemented in the Nairobi DevOps Community website to prevent internal error details from leaking to end users in production while preserving developer debugging capabilities in development.

## Security Risks Addressed

### 1. Information Disclosure via Error Messages

**Risk**: Unhandled JavaScript errors can expose:

- Internal file paths and directory structure
- Component names and application architecture
- Library versions and dependencies
- Variable names and business logic

**Impact**: Attackers can use this information to:

- Map the application structure for targeted attacks
- Identify vulnerable dependencies
- Craft more effective phishing or social engineering attacks

### 2. Source Map Exposure

**Risk**: Source maps (`.map` files) in production allow anyone to:

- View the original, unminified source code
- Understand business logic and security implementations
- Identify hardcoded secrets or API keys
- Find vulnerabilities in the code

**Impact**: Complete source code transparency to malicious actors.

---

## Implementation

### Global Error Boundary

**File**: [`client/src/components/ErrorBoundary.tsx`](../../client/src/components/ErrorBoundary.tsx)

A React Error Boundary wraps the entire application to catch unhandled JavaScript errors in any component.

#### Behavior by Environment

| Feature             | Development         | Production       |
| ------------------- | ------------------- | ---------------- |
| Error details in UI | ✅ Full stack trace | ❌ Hidden        |
| Component stack     | ✅ Visible          | ❌ Hidden        |
| Console logging     | ✅ Detailed         | ❌ Disabled      |
| Fallback UI         | 🔧 Debug-friendly   | 👤 User-friendly |

#### Usage

The Error Boundary is automatically active. No additional configuration is needed.

```tsx
// main.tsx - Already configured
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```

#### Custom Fallback UI

For specific sections requiring custom error handling:

```tsx
import ErrorBoundary from "@/components/ErrorBoundary";

<ErrorBoundary fallback={<CustomErrorComponent />}>
  <RiskyComponent />
</ErrorBoundary>;
```

---

### Source Map Configuration

**File**: [`vite.config.ts`](../../vite.config.ts)

Source maps are conditionally disabled based on environment:

```typescript
build: {
  // Disabled for production/staging, enabled for development
  sourcemap: !isHardened,
}
```

| Build Mode              | Source Maps |
| ----------------------- | ----------- |
| `npm run dev`           | ✅ Enabled  |
| `npm run build`         | ✅ Enabled  |
| `npm run build:staging` | ❌ Disabled |
| `npm run build:prod`    | ❌ Disabled |

---

## Verification

### Test Error Boundary

1. **Development Mode Test**:

   ```tsx
   // Add temporarily to any component
   throw new Error("Test Error Boundary");
   ```

   - Run `npm run dev`
   - Trigger the error
   - **Expected**: Full error details visible in fallback UI

2. **Production Mode Test**:

   ```bash
   npm run build:prod
   npm run preview
   ```

   - Trigger the same error
   - **Expected**: User-friendly message only, no technical details

### Verify Source Maps

```powershell
# Build production bundle
npm run build:prod

# Check for .map files (should find none)
Get-ChildItem -Path dist/assets -Filter *.map -Recurse

# Build development bundle
npm run build

# Check for .map files (should find them)
Get-ChildItem -Path dist/assets -Filter *.map -Recurse
```

---

## Security Scanner Compliance

### DeepSource

- ✅ Console statements have ESLint disable comments with justification
- ✅ Console logging only in development paths
- ✅ No production console output

### Dependabot

- ✅ No new dependencies introduced
- ✅ Uses React built-in Error Boundary pattern

---

## Best Practices

1. **Never expose raw errors to users** - Always sanitize error messages in user-facing components
2. **Log errors server-side** - In production, consider sending errors to a monitoring service (Sentry, Datadog)
3. **Use component-level boundaries** - For critical features, add nested Error Boundaries
4. **Test error paths** - Include error scenarios in your testing strategy

---

## Related Documentation

- [Security Overview](./overview.md)
- [Content Security Policy](./content-security-policy.md)
- [Safe Redirection](./safe-redirection.md)

---

_Last updated: January 04, 2026_
