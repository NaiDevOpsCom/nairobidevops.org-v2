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
  client/         # React frontend (src/, components/, pages/, contexts/, hooks/, etc.)
  client/src/data/ # Static data files (testimonials, gallery images, partners, etc.)
  components.json # UI config
  tailwind.config.ts # Tailwind CSS config
  tsconfig.json   # TypeScript config
  vite.config.ts  # Vite config
  package.json    # Project dependencies and scripts
```

---

## Data Folder

The `client/src/data/` directory contains static data used throughout the application. This includes:

- **testimonialsData.ts**: Member testimonials displayed on the site
- **galleryData.ts**: Image URLs and metadata for the gallery section
- **partnersData.ts**: Information about community partners and sponsors
- **whatWeDoData.ts**: Details about the community's activities and offerings

---

## Getting Started

### Prerequisites

- Node.js (^20.19.0 or >=22.13.0 recommended)
- npm or yarn

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repo-url>
   cd ndc-redesign-website
   ```

2. **Install dependencies:**
   Use `npm ci` for a consistent installation that matches our CI environment.

   ```bash
   npm ci
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   - The app will be available at `http://localhost:5173`.

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

This project uses **Prettier** for code formatting and **ESLint** for code quality rules. Both are enforced by our CI pipeline. **Mandatory Check**: Please run `npm run format`, `npm run lint`, and `npm run build` before pushing your changes to ensure code integrity and build success.

---

## Documentation

The `docs/` directory contains detailed documentation about the project's architecture and security workflows:

- **[SECURITY-HEADERS.md](docs/SECURITY-HEADERS.md)**: Explains the "Single Source of Truth" architecture for HTTP security headers.
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)**: Our main contribution guide.

---

## Contributing

We welcome contributions from the community! Whether you're fixing a bug, adding a new feature, or improving documentation, your help is valuable.

To ensure a smooth collaboration, please read our **[Contribution Guide](docs/CONTRIBUTING.md)** before you start. It contains detailed information on our development workflow, coding standards, and pull request process.

### Quick Links

- [Branching Strategy](docs/CONTRIBUTING.md#branching-strategy)
- [Commit Message Convention](docs/CONTRIBUTING.md#commit-message-convention)
- [Submitting a Pull Request](docs/CONTRIBUTING.md#submitting-a-pull-request)

---

## License

This project is licensed under the MIT License.
