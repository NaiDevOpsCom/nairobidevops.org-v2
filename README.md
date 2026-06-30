# Nairobi DevOps Community

A modern, responsive web application for the Nairobi DevOps Community. Built with React, TypeScript, Vite, and Tailwind CSS (frontend) and PHP (backend API).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Frontend](#frontend)
- [Backend](#backend)
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

The project consists of two main parts:

- **`frontend/`** — React + TypeScript SPA (Vite, Tailwind CSS, Radix UI, Wouter)
- **`backend/`** — PHP API with job aggregation from Remotive & We Work Remotely

---

## Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 4, Radix UI primitives
- **Routing**: Wouter (lightweight hash-based)
- **Data Fetching**: TanStack React Query
- **Animation**: Motion (Framer Motion)

Key directories:

| Directory                                              | Purpose                            |
| ------------------------------------------------------ | ---------------------------------- |
| `frontend/client/src/`                                 | Application source code            |
| `frontend/client/src/components/`                      | Reusable UI components             |
| `frontend/client/src/pages/`                           | Page-level components              |
| `frontend/client/src/data/`                            | Static data (testimonials, etc.)   |
| `frontend/client/src/hooks/`                           | Custom React hooks                 |
| `frontend/client/src/types/`                           | TypeScript type definitions        |
| `frontend/client/src/utils/`                           | Utility functions                  |
| `frontend/client/public/`                              | Static assets                      |
| `frontend/shared/`                                     | Shared config (routes, constants)  |
| `frontend/scripts/`                                    | Build/utility scripts              |
| `frontend/security-policy.json`                        | Security headers policy            |

---

## Backend

- **Runtime**: PHP >= 8.2
- **Database**: MySQL / MariaDB
- **Purpose**: Job board API — aggregates listings from Remotive and We Work Remotely
- **CLI Tools**: Composer for dependencies and scripts

Key directories:

| Directory                  | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `backend/endpoints/`       | API endpoint handlers (get_jobs, submit, track) |
| `backend/cron/works/`      | Job sync scripts (Remotive, WWR, expire, clean) |
| `backend/cron/notification`| Notification dispatchers (digest, weekly)       |
| `backend/tests/`           | PHPUnit tests                                   |
| `backend/vendor/`          | Composer dependencies                           |

---

## Documentation

All project documentation is located in the root-level [`docs/`](./docs/) directory.

| Document                                                 | Description                                           |
| -------------------------------------------------------- | ----------------------------------------------------- |
| [Contributing Guide](./docs/CONTRIBUTING.md)             | Development workflow, branching, PR process           |
| [Security Headers](./docs/frontend/SECURITY-HEADERS.md)  | Single-source-of-truth for HTTP security headers      |
| [Deployment Guide](./docs/frontend/DEPLOYMENT-GUIDE.md)  | cPanel deployment (staging/production)               |
| [Deployment (CI/CD)](./docs/frontend/deployment.md)      | GitHub Actions, atomic releases, rollback             |
| [Sitemap Guide](./docs/frontend/SITEMAP-GUIDE.md)        | Sitemap & robots.txt automation                       |
| [Cloudinary Integration](./docs/frontend/cloudinary-implementation.md) | Image proxy architecture               |
| [Security Overview](./docs/frontend/security/README.md)  | Security architecture index                           |
| [Browser Security Headers](./docs/frontend/security/browser-security-headers.md) | HTTP header details       |
| [Content Security Policy](./docs/frontend/security/content-security-policy.md) | CSP configuration           |
| [Supply Chain Security](./docs/frontend/security/dependency-supply-chain-security.md) | Dependabot & deps |
| [Safe Redirection](./docs/frontend/security/safe-redirection.md) | Open redirect prevention               |
| [Error Handling](./docs/frontend/security/error-handling.md) | Error boundaries & source maps         |
| [Content Guide](./frontend/CONTENT_GUIDE.md)             | Data file conventions for frontend content             |

---

## Development Setup

### Prerequisites

- Node.js (v20+ recommended) and npm
- PHP (v8.2+ recommended)
- MySQL / MariaDB (e.g., via WampServer, XAMPP, or standalone)
- Composer (PHP dependency manager)

### Frontend Setup

```bash
cd frontend
npm ci
npm run dev
```

The frontend dev server runs at `http://localhost:5173`.

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   composer install
   ```

2. **Configure environment:**
   ```bash
   cp config.example.php config.local.php
   ```
   Edit `config.local.php` and update `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` for your local MySQL setup.

3. **Create database and import schema:**
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nairobidevops_jobs_local;"
   mysql -u root -p nairobidevops_jobs_local < schema.sql
   ```

4. **Verify database connection:**
   ```bash
   php check_db.php
   ```

5. **Start the development server:**
   ```bash
   php -S localhost:8000
   ```

6. **Test the API:**
   ```
   http://localhost:8000/?action=jobs
   ```

---

## Available Commands

### Frontend (`frontend/`)

| Command                        | Description                              |
| ------------------------------ | ---------------------------------------- |
| `npm run dev`                  | Start Vite dev server                    |
| `npm run build`                | Production build (lint + typecheck + format + build) |
| `npm run build:staging`        | Staging build                           |
| `npm run preview`              | Preview production build locally         |
| `npm run lint`                 | Run ESLint                               |
| `npm run lint:fix`             | Run ESLint with auto-fix                 |
| `npm run format`               | Format all files with Prettier           |
| `npm run format:check`         | Check formatting without modifying       |
| `npm run typecheck`            | TypeScript type checking (`tsc --noEmit`)|
| `npm run check`                | Run all checks (lint + typecheck + format)|
| `npm run test`                 | Run Vitest tests                         |
| `npm run test:watch`           | Run tests in watch mode                  |
| `npm run test:coverage`        | Run tests with coverage report           |
| `npm run test:ui`              | Run tests with Vitest UI                 |
| `npm run sitemap:generate`     | Generate `sitemap.xml`                   |
| `npm run sitemap:validate`     | Validate sitemap and robots.txt          |
| `npm run security:generate`    | Generate `.htaccess` from policy         |

### Backend (`backend/`)

| Command                       | Description                              |
| ----------------------------- | ---------------------------------------- |
| `composer install`            | Install PHP dependencies                 |
| `composer update`             | Update PHP dependencies                  |
| `composer test`               | Run PHPUnit tests                        |
| `composer test:coverage`      | Run tests with HTML coverage report      |
| `composer format`             | Fix code style with PHP-CS-Fixer         |
| `composer format:check`       | Check code style (dry run, no changes)   |
| `composer audit`              | Audit Composer dependencies for vulnerabilities |
| `php -S localhost:8000`       | Start PHP built-in server                |
| `php check_db.php`            | Verify database connection               |

---

## Testing

### Frontend

Tests use **Vitest**. Run from the `frontend/` directory:

```bash
npm run test            # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
npm run test:ui         # Vitest UI dashboard
```

### Backend

Tests use **PHPUnit**. Run from the `backend/` directory:

```bash
composer test                     # Run all tests
composer test:coverage            # With HTML coverage (generated in coverage/)
```

The test suite uses a dedicated database (`nairobidevops_jobs_test` — configured in `phpunit.xml`) and sets `APP_ENV=test` to isolate test execution.

---

## Code Quality

### Frontend

- **ESLint** — configured in `frontend/eslint.config.js`
- **Prettier** — configured in `frontend/.prettierrc`
- **TypeScript** — strict mode in `frontend/tsconfig.json`

Run all checks together:
```bash
cd frontend && npm run check
```

### Backend

- **PHP-CS-Fixer** — PSR-12 rules with additional conventions (configured in `backend/.php-cs-fixer.php`)

```bash
cd backend
composer format:check   # Check style without modifying
composer format         # Auto-fix style issues
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
