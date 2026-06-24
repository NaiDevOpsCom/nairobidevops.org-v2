# Nairobi DevOps Community

A modern, responsive web application for the Nairobi DevOps Community. Built with React, TypeScript, Vite, and Tailwind CSS.

---

## Table of Contents

- [Nairobi DevOps Community](#nairobi-devops-community)
  - [Table of Contents](#table-of-contents)
  - [About](#about)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Data Folder](#data-folder)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Scripts](#scripts)
  - [Contributing](#contributing)
  - [License](#license)

---

## About

This platform empowers developers, automation experts, and tech enthusiasts to learn, network, and advance DevOps practices in Kenya's vibrant technology ecosystem. It features event management, community resources, and collaborative tools.

---

## Features

- Modern, responsive UI with dark mode
- Event and gallery management (static/demo only)
- Community and partner sections
- Modular, scalable codebase

---

## Tech Stack

- React (with hooks)
- TypeScript
- Vite
- Tailwind CSS
- Radix UI, Lucide Icons, Framer Motion, Wouter, React Query

---

## Project Structure

```
NairobiDevOps-1/
  frontend/        # React frontend app, configs, docs, scripts, and package files
    client/        # Vite client app (src/, components/, pages/, contexts/, hooks/, etc.)
    client/src/data/ # Static data files (testimonials, gallery images, partners, etc.)
    package.json   # Frontend dependencies and scripts
  backend/         # Backend service placeholder
```

---

## Data Folder

The `frontend/client/src/data/` directory contains static data used throughout the application. This includes:

- **testimonialsData.ts**: Member testimonials displayed on the site
- **galleryData.ts**: Image URLs and metadata for the gallery section
- **partnersData.ts**: Information about community partners and sponsors
- **whatWeDoData.ts**: Details about the community's activities and offerings

---

## Getting Started

### Prerequisites

- Node.js (v20+ recommended) and npm
- PHP (v8.1+ recommended)
- MySQL / MariaDB (e.g., via WampServer, XAMPP, or standalone)

### Frontend Setup

1. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   Use `npm ci` for a consistent installation that matches the CI environment.
   ```bash
   npm ci
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   - The app will be available at `http://localhost:5173`.

### Backend Setup

1. **Configure local environment**:
   * Navigate to the `backend/` directory.
   * Copy `config.example.php` to create `config.local.php`:
     ```bash
     cp config.example.php config.local.php
     ```
   * Open `config.local.php` and update the database settings (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`) to match your local MySQL configuration.

2. **Initialize Database and Schema**:
   * Create a local MySQL database named `nairobidevops_jobs_local`.
   * Import the tables from `schema.sql`:
     ```bash
     mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nairobidevops_jobs_local;"
     mysql -u root -p nairobidevops_jobs_local < schema.sql
     ```

3. **Verify Database Connection**:
   * Run the database checker script from the `backend/` directory:
     ```bash
     php check_db.php
     ```
   * You should see: `OK: connected to 'nairobidevops_jobs_local' on localhost:3306`.

4. **Start the Backend Server**:
   * Run the built-in PHP development server inside the `backend/` directory:
     ```bash
     php -S localhost:8000
     ```

5. **Test Backend Endpoints**:
   * Query the jobs action endpoint in your browser or API client:
     `http://localhost:8000/?action=jobs`

---

## Scripts

- `npm run dev` — Start the app in development mode.
- `npm run build` — Build the client for production.
- `npm run test` — Run tests using Vitest.
- `npm run lint` — Check for code quality issues with ESLint.
- `npm run format` — Format all files with Prettier.
- `npm run preview` — Preview the production build locally.

---

## Code Style

This project uses **Prettier** for code formatting and **ESLint** for code quality rules. Both are enforced by our CI pipeline. **Mandatory Check**: Please run `npm run format`, `npm run lint`, and `npm run build` from `frontend/` before pushing your changes to ensure code integrity and build success.

---

## Documentation

The `frontend/docs/` directory contains detailed documentation about the project's architecture and security workflows:

- **[SECURITY-HEADERS.md](frontend/docs/SECURITY-HEADERS.md)**: Explains the "Single Source of Truth" architecture for HTTP security headers.
- **[CONTRIBUTING.md](frontend/docs/CONTRIBUTING.md)**: Our main contribution guide.

---

## Contributing

We welcome contributions from the community! Whether you're fixing a bug, adding a new feature, or improving documentation, your help is valuable.

To ensure a smooth collaboration, please read our **[Contribution Guide](frontend/docs/CONTRIBUTING.md)** before you start. It contains detailed information on our development workflow, coding standards, and pull request process.

### Quick Links

- [Branching Strategy](frontend/docs/CONTRIBUTING.md#branching-strategy)
- [Commit Message Convention](frontend/docs/CONTRIBUTING.md#commit-message-convention)
- [Submitting a Pull Request](frontend/docs/CONTRIBUTING.md#submitting-a-pull-request)

---

## License

This project is licensed under the MIT License.
