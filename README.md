# Nairobi DevOps Community

A modern, responsive web application for the Nairobi DevOps Community. Built with React, TypeScript, Vite, and Tailwind CSS.

> **Backend status:** the previous PHP API (`backend/`) has been intentionally removed and is being rewritten in a different language. The frontend builds and runs independently; pages that consume the API (the jobs board) display a graceful "temporarily unavailable" state until the new backend is deployed.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Frontend](#frontend)
- [Backend Status](#backend-status)
- [Documentation](#documentation)
- [Development Setup](#development-setup)
- [Available Commands](#available-commands)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

This platform empowers developers, automation experts, and tech enthusiasts to learn, network, and advance DevOps practices in Kenya's technology ecosystem. It features event management, community resources, job board, and collaborative tools.

- **`frontend/`** — React + TypeScript SPA (Vite, Tailwind CSS, Radix UI, Wouter)
- **`backend/`** — reserved for the rewritten jobs API (not present yet)

---

## Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 4, Radix UI primitives
- **Routing**: Wouter (lightweight hash-based)
- **Data Fetching**: TanStack React Query
- **Animation**: Motion (Framer Motion)

Key directories:

| Directory                         | Purpose                           |
| --------------------------------- | --------------------------------- |
| `frontend/client/src/`            | Application source code           |
| `frontend/client/src/components/` | Reusable UI components            |
| `frontend/client/src/pages/`      | Page-level components             |
| `frontend/client/src/data/`       | Static data (testimonials, etc.)  |
| `frontend/client/src/hooks/`      | Custom React hooks                |
| `frontend/client/src/types/`      | TypeScript type definitions       |
| `frontend/client/src/utils/`      | Utility functions                 |
| `frontend/client/public/`         | Static assets                     |
| `frontend/shared/`                | Shared config (routes, constants) |
| `frontend/scripts/`               | Build/utility scripts             |
| `frontend/security-policy.json`   | Security headers policy           |

---

## Backend Status

The `backend/` directory has been removed and will be recreated when the rewritten API lands.

- **Jobs board**: reads from `VITE_API_URL`. When the API is unreachable, `useJobs` sets an error state and the jobs page renders a "Job listings temporarily unavailable" alert with a **Retry** button.
- **Production / staging**: `.env.production` and `.env.staging` point `VITE_API_URL` at the deployed jobs API.
- **Local development**: without `VITE_API_URL`, the frontend falls back to `http://localhost:8000`. Set the variable in `frontend/client/.env.local` once the new backend is running.
- **Cloudinary and Luma**: these use the PHP proxies in `frontend/client/public/api/`, which are part of the frontend deploy and are **not** affected by the `backend/` removal.
- **CI/CD**: the backend deploy workflows are kept for reference but have been deactivated (no automatic `push` trigger). Re-enable them when the rewritten backend is ready.

---

## Documentation

Most project documentation is located in the root-level [`docs/`](./docs/) directory.

| Document                                                                              | Description                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [Contributing Guide](./docs/CONTRIBUTING.md)                                          | Development workflow, branching, PR process      |
| [Security Headers](./docs/frontend/SECURITY-HEADERS.md)                               | Single-source-of-truth for HTTP security headers |
| [Deployment Guide](./docs/frontend/DEPLOYMENT-GUIDE.md)                               | cPanel deployment (staging/production)           |
| [Deployment (CI/CD)](./docs/frontend/deployment.md)                                   | GitHub Actions, atomic releases, rollback        |
| [Sitemap Guide](./docs/frontend/SITEMAP-GUIDE.md)                                     | Sitemap & robots.txt automation                  |
| [Cloudinary Integration](./docs/frontend/cloudinary-implementation.md)                | Image proxy architecture                         |
| [Security Overview](./docs/frontend/security/README.md)                               | Security architecture index                      |
| [Browser Security Headers](./docs/frontend/security/browser-security-headers.md)      | HTTP header details                              |
| [Content Security Policy](./docs/frontend/security/content-security-policy.md)        | CSP configuration                                |
| [Supply Chain Security](./docs/frontend/security/dependency-supply-chain-security.md) | Dependabot & deps                                |
| [Safe Redirection](./docs/frontend/security/safe-redirection.md)                      | Open redirect prevention                         |
| [Error Handling](./docs/frontend/security/error-handling.md)                          | Error boundaries & source maps                   |
| [Content Guide](./frontend/CONTENT_GUIDE.md)                                          | Data file conventions for frontend content       |

---

## Development Setup

### Prerequisites

- Node.js (`^22.22.2 || ^24.15.0 || >=26.0.0`) and npm

A backend runtime is not required to work on the frontend. Jobs-related pages will show their error state until the new API is available.

### Frontend Setup

```bash
cd frontend
npm ci
npm run dev
```

The frontend dev server runs at `http://localhost:5173`.

### Jobs API (optional, local)

Once the rewritten backend is running locally, point the frontend at it:

```bash
# frontend/client/.env.local
VITE_API_URL=http://localhost:8000
```

---

## Available Commands

### Frontend (`frontend/`)

| Command                     | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `npm run dev`               | Start Vite dev server                                |
| `npm run build`             | Production build (lint + typecheck + format + build) |
| `npm run build:staging`     | Staging build                                        |
| `npm run preview`           | Preview production build locally                     |
| `npm run lint`              | Run ESLint                                           |
| `npm run lint:fix`          | Run ESLint with auto-fix                             |
| `npm run format`            | Format all files with Prettier                       |
| `npm run format:check`      | Check formatting without modifying                   |
| `npm run typecheck`         | TypeScript type checking (`tsc --noEmit`)            |
| `npm run check`             | Run all checks (lint + typecheck + format)           |
| `npm run test`              | Run Vitest tests                                     |
| `npm run test:watch`        | Run tests in watch mode                              |
| `npm run test:coverage`     | Run tests with coverage report                       |
| `npm run test:ui`           | Run tests with Vitest UI                             |
| `npm run sitemap:generate`  | Generate `sitemap.xml`                               |
| `npm run sitemap:validate`  | Validate sitemap and robots.txt                      |
| `npm run security:generate` | Generate `.htaccess` from policy                     |

---

## Testing

Tests use **Vitest**. Run from the `frontend/` directory:

```bash
npm run test            # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
npm run test:ui         # Vitest UI dashboard
```

---

## Code Quality

- **ESLint** — configured in `frontend/eslint.config.js`
- **Prettier** — configured in `frontend/.prettierrc`
- **TypeScript** — strict mode in `frontend/tsconfig.json`

Run all checks together:

```bash
cd frontend && npm run check
```

---

## CI/CD

The project uses GitHub Actions for deployment. See the [Deployment Guide](./docs/frontend/DEPLOYMENT-GUIDE.md) and [deployment documentation](./docs/frontend/deployment.md) for workflow details.

**Deployment environments:**

- **Production**: `main` branch → cPanel (nairobidevops.org)
- **Staging**: feature/bugfix branches → cPanel subdomain

**Security features:**

- Atomic symlink-based releases with zero-downtime rollback
- Shared secret store outside web root (`~/config/secrets.env.php`)
- IP-based rate limiting and origin validation
- Auto-generated security headers from `security-policy.json`

> Backend deploy workflows (`deploy-backend-prod.yml`, `deploy-backend-staging.yml`) are retained but deactivated until the rewritten backend lands.

---

## Contributing

We welcome contributions! Please read our **[Contributing Guide](./docs/CONTRIBUTING.md)** before starting.

### Quick Links

- [Branching Strategy](./docs/CONTRIBUTING.md#branching-strategy)
- [Commit Message Convention](./docs/CONTRIBUTING.md#commit-message-convention)
- [Submitting a Pull Request](./docs/CONTRIBUTING.md#submitting-a-pull-request)

---

## License

This project is licensed under the MIT License.
