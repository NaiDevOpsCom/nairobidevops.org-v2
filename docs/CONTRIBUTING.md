# Contributing to Nairobi DevOps Community

Thank you for your interest in contributing to our platform! This guide provides everything you need to know to contribute effectively.

## Table of Contents

- [Access & Workflow](#access--workflow)
- [Project Setup](#project-setup)
- [Development Workflow](#development-workflow)
- [Code Quality and Standards](#code-quality-and-standards)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Important Scripts](#important-scripts)

---

## Access & Workflow

This is an internal project. Contributors are typically invited team members, but we welcome requests from the community to join the effort.

### Forking vs Branching

**Internal Contributors**

- Create branches directly from the main repository.

**External Contributors**

1.  Before starting work, **open an issue** or comment on an existing issue describing your proposed contribution.
2.  Tag or mention the maintainers to request approval or guidance.
3.  Once approved and added as a contributor, **clone the repository**.
4.  Work on your local clone following this guide.
5.  Open Pull Requests (PRs) back to the main repository.

---

## Project Setup

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or later recommended) and **npm**
- **PHP** (v8.2 or later recommended)
- **MySQL / MariaDB** (e.g., via WampServer, XAMPP, or standalone)
- **Composer** (PHP dependency manager)

### Frontend Setup

1.  **Install frontend dependencies:**

    ```bash
    cd frontend
    npm ci
    ```

2.  **Start the frontend dev server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173`.

### Backend Setup

1.  **Install backend dependencies:**

    ```bash
    cd backend
    composer install
    ```

2.  **Configure local environment:**

    ```bash
    cp config.example.php config.local.php
    ```

    Edit `config.local.php` to set your local MySQL credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`).

3.  **Create database and import schema:**

    ```bash
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nairobidevops_jobs_local;"
    mysql -u root -p nairobidevops_jobs_local < schema.sql
    ```

4.  **Verify connection:**

    ```bash
    php check_db.php
    ```

5.  **Start the backend server:**

    ```bash
    php -S localhost:8000
    ```

    Test it at `http://localhost:8000/?action=jobs`.

---

## Development Workflow

### Branching Strategy

We use a branching model based on `main` and `pre-dev` (staging) branches:

| Branch               | Role        | Description                                                                                                       |
| :------------------- | :---------- | :---------------------------------------------------------------------------------------------------------------- |
| **`main`**           | Production  | The stable, live version of the application. Direct pushes are disabled. All changes come from `pre-dev`.         |
| **`pre-dev`**        | Staging     | The primary integration branch. All new features, bug fixes, and chores are merged here first for testing and QA. |
| **Feature Branches** | Development | Short-lived branches (e.g., `feature/`, `bugfix/`) created from `pre-dev` for all development work.               |

### Contribution Steps

1.  **Sync with `pre-dev`**: Before starting, make sure your local `pre-dev` branch is up-to-date.

    ```bash
    git checkout pre-dev
    git pull origin pre-dev
    ```

2.  **Create a New Branch**: Create a descriptive branch name from `pre-dev` using our naming convention.

    **Format**: `<type>/<short-description>`

    **Allowed Types**:
    - `feature` – New functionality
    - `bugfix` – Non-urgent bug fixes
    - `hotfix` – Urgent production fixes
    - `docs` – Documentation only
    - `chore` – Tooling, dependencies, configuration

    **Examples**:

    ```bash
    # Feature
    git checkout -b feature/user-profile-card

    # Bugfix
    git checkout -b bugfix/navbar-mobile-overflow

    # Hotfix
    git checkout -b hotfix/login-crash-prod

    # Documentation
    git checkout -b docs/contributing-guide

    # Chore
    git checkout -b chore/update-eslint-config
    ```

3.  **Make Your Changes**: Write your code, following the project's existing style and conventions.

4.  **Run Local Checks**: Before committing, ensure your changes pass all local quality checks.

    ```bash
    npm run format # Format code with Prettier
    npm run lint   # Check for code quality issues with ESLint
    npm run test   # Run automated tests with Vitest
    npm run build  # Ensure a complete and successful build
    ```

5.  **Commit Your Changes**: We follow the **Conventional Commits** specification. See [Commit Message Convention](#commit-message-convention) for details.

    ```bash
    # Example commit
    git commit -m "feat(auth): add password reset functionality"
    ```

6.  **Push Your Branch**: Once all checks pass locally (especially the `build` script), push your branch.

    ```bash
    git push origin feature/user-profile-card
    ```

7.  **Open a Pull Request**: Go to the repository on GitHub and open a Pull Request from your branch to the `pre-dev` branch.

---

## Code Quality and Standards

### Frontend

- **Prettier**: Used for consistent code formatting. Run `npm run format` from `frontend/` to format automatically.
- **ESLint**: Used to catch potential bugs, security issues, and enforce best practices. Run `npm run lint` from `frontend/`.
- **TypeScript**: Strict type checking via `npm run typecheck`.

**Key Linting Rules:**

- **Security**: Plugins like `eslint-plugin-security` help prevent vulnerabilities (e.g., object injection, `no-eval`).
- **React Hooks**: We strictly enforce `rules-of-hooks` and `exhaustive-deps` to prevent bugs in component lifecycles.
- **Imports**: `eslint-plugin-unused-imports` ensures a clean codebase by stripping unused imports.
- **Best Practices**: Stricter rules are in place. Address warnings (e.g., regarding impure functions) rather than suppressing them.

**Run all frontend checks together:**
```bash
cd frontend && npm run check
```

### Backend

- **PHP-CS-Fixer**: Used for PHP code style. Configured in `backend/.php-cs-fixer.php` with PSR-12 rules.

Run from the `backend/` directory:

```bash
composer format:check   # Check style without modifying
composer format         # Auto-fix style issues
```

### Testing

- **Frontend (Vitest)**: Run `npm run test` from `frontend/` for unit and integration tests.
- **Backend (PHPUnit)**: Run `composer test` from `backend/` for PHP tests.

### Commit Message Convention

This repository follows the **Conventional Commits** specification to support readable history and automated tooling.

**Format**

```
<type>(optional-scope): short description
```

**Allowed Types**

- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation
- `chore` – Maintenance or tooling
- `refactor` – Code changes without behavior change
- `test` – Test-only changes

**Examples**

```
feat(auth): add remember-me option
fix(navbar): resolve mobile overflow
chore(deps): bump react-query version
```

---

## Submitting a Pull Request

### The PR Process

1.  **Target the `pre-dev` Branch**: Ensure your Pull Request (PR) is targeting the `pre-dev` branch.
2.  **Provide a Clear Description**: Fill out the PR template with a clear title and a detailed description of the changes.
3.  **Pass CI Checks**: All local checks (lint, test, build) **must** pass before pushing, and automated checks (Dependency Review, Build Verification) must pass before merging.

### Required CI Checks

- **Dependency Review**: Scans for vulnerable dependencies.
- **Hardened Build Verification**: Ensures production readiness (no source maps, no console logs).
- **Lint/Test/Build**: Verifies code integrity.

### Code Review

- Maintainers will review your PR.
- Address any feedback and resolve conversations.
- Once approved, your PR will be merged into `pre-dev`.

---

## Important Scripts

### Frontend (`frontend/`)

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start Vite dev server                    |
| `npm run build`      | Production build                         |
| `npm run preview`    | Preview production build                 |
| `npm run test`       | Run Vitest tests                         |
| `npm run test:watch` | Run tests in watch mode                  |
| `npm run lint`       | Run ESLint checks                        |
| `npm run lint:fix`   | Run ESLint with auto-fix                 |
| `npm run format`     | Format all files with Prettier           |
| `npm run format:check` | Check formatting without modifying     |
| `npm run typecheck`  | TypeScript type checking                 |
| `npm run check`      | Run all checks (lint + typecheck + format)|

### Backend (`backend/`)

| Command                   | Description                              |
| ------------------------- | ---------------------------------------- |
| `composer install`        | Install PHP dependencies                 |
| `composer test`           | Run PHPUnit tests                        |
| `composer test:coverage`  | Run tests with coverage report           |
| `composer format`         | Fix code style with PHP-CS-Fixer         |
| `composer format:check`   | Check code style (dry run)               |
| `composer audit`          | Audit dependencies for vulnerabilities   |
