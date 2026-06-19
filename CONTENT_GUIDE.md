# Content Contribution Guide

Thank you for contributing content to the Nairobi DevOps Community website! This guide documents the field formatting, patterns, and conventions used for files under [`client/src/data/`](./client/src/data).

## Data Guidelines

All data files in `client/src/data/` are typed TypeScript files. When adding or modifying entries, please ensure you adhere to the following rules:

### 1. General Formatting

- Run `npm run format` before submitting a PR to ensure files are consistently styled.
- Never use placeholder data (e.g. Unsplash placeholders or dummy descriptions) for production releases.

### 2. Images & Media

- All image links must use full **Cloudinary URLs** (e.g. `https://res.cloudinary.com/...`).
- Avoid relative paths or local images within the data objects unless explicitly configured.

### 3. Unique Identifiers (IDs)

- Ensure all IDs are unique across lists.
- For speaker IDs (if added), use unique formats that match the pattern `"<year>-s<index>"` (e.g., `"2026-s9"`) or `"<year>-<index>"` (e.g., `"2025-18"`).
- Other IDs (e.g., team members or events) should be lowercased, slugified strings (e.g., `"maamun-bwanakombo"`, `"community-members"`).

### 4. Social Media Handles

- Social media handles must use the format `@handle` or `in/handle` instead of complete URLs where specified by the types/comments.
- Ensure URLs match the expected protocol (typically `https://`).

### 5. FAQs

- If you add or remove FAQ entries, verify that any referenced positions or category index mappings in `faqData.ts` remain accurate.

### 6. Environment Variables

- If your content changes introduce new third-party services or APIs requiring credentials, update `.env.example` accordingly.
