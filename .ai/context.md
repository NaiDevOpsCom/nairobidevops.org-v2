# Project Context

## What is this?

The **NDC (Nairobi DevOps Community) Website** is a community hub for DevOps practitioners in Africa. It includes a job board, event listings, blog, and community resources.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19.2.7 |
| Language | TypeScript 6.0.3 (strict mode) |
| Build tool | Vite 8.1.3 |
| Styling | Tailwind CSS 4.2.1 + shadcn/ui (New York style) |
| Routing | Wouter 3.10.0 (lightweight hash-based) |
| Data fetching | TanStack React Query 5.101.2 |
| Forms | React Hook Form 7.80.0 + Zod 4.4.3 |
| Animations | Motion 12.42.2 (formerly Framer Motion) |
| Backend runtime | PHP 8.4+ (PSR-12) |
| Database | MySQL/MariaDB (raw PDO, no ORM) |
| Package manager (frontend) | npm |
| Package manager (backend) | Composer |

## Project Structure

```
/ndc-redesign-website/
├── frontend/             # React SPA
│   ├── client/src/       # Application source
│   │   ├── components/   # UI components (51 shadcn/ui + custom)
│   │   ├── pages/        # Page components (12 pages)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── contexts/     # React contexts (ThemeContext)
│   │   ├── lib/          # Utilities (cloudinary, youtube, constants)
│   │   ├── data/         # Static data files (blog, events, FAQ, etc.)
│   │   └── types/        # TypeScript type definitions
│   ├── shared/           # Shared between client and scripts
│   └── scripts/          # Build/utility scripts
├── backend/              # PHP API
│   ├── endpoints/        # API endpoints (get_jobs, submit_job, track_click)
│   ├── src/              # PHP classes (Contracts, Fetcher, Http, Migration, Model)
│   ├── cron/             # Cron jobs (sync, expire, migrate, notify)
│   ├── migrations/       # SQL migrations
│   └── tests/            # PHPUnit tests
├── .github/              # GitHub Actions (16 workflows), templates
└── docs/                 # Documentation
```

## Key Conventions

- **Frontend:** TSX components in `client/src/components/`, pages in `client/src/pages/`, path alias `@/` → `client/src/`
- **Backend:** PSR-12 coding style, single-file API router (`index.php?action=`), raw PDO queries
- **Testing:** Vitest (frontend), PHPUnit (backend)
- **CI/CD:** 16 GitHub Actions workflows; builds, linting, security scanning, deployment to cPanel
- **Security:** Hardened builds (no sourcemaps, no console in prod), CSP headers, CodeQL, Dependabot
- **Database:** 4 tables (jobs, sync_log, notifications_log, job_clicks) + schema_migrations

## Environments

| Environment | Branch | URL |
|---|---|---|
| Production | `main` | `https://nairobidevops.org` |
| Staging | `pre-staging` | `https://staging.nairobidevops.org` |
| Local dev | any | `http://localhost:5173` (Vite) + `http://localhost:8000` (PHP) |

## Key Files to Know

| File | Purpose |
|---|---|
| `frontend/client/src/App.tsx` | Application root, route definitions |
| `frontend/vite.config.ts` | Build configuration, dev proxy, hardened mode |
| `frontend/package.json` | Frontend dependencies and scripts |
| `backend/index.php` | API router (single entry point) |
| `backend/schema.sql` | Database schema |
| `backend/config.example.php` | Configuration template |
| `.github/workflows/` | CI/CD pipeline definitions |
