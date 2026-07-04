You are reviewing a changeset for the NDC (Nairobi DevOps Community) website project.

## Context

- **Branch:** {{branch}}
- **Target:** {{target_branch}}
- **Files changed:** {{file_count}}
- **Description:** {{pr_description}}

## Standards to enforce

Read these files and apply their rules strictly:
- `.ai/standards/typescript-standards.md`
- `.ai/standards/react-standards.md`
- `.ai/standards/php-standards.md`
- `.ai/standards/testing-standards.md`
- `.ai/standards/css-standards.md`
- `.ai/coding-rules/frontend.mdc`
- `.ai/coding-rules/backend.mdc`
- `.ai/coding-rules/typescript.mdc`
- `.ai/coding-rules/php.mdc`
- `.ai/coding-rules/database.mdc`
- `.ai/knowledge/business-rules.md`

## Review checklist

1. **Security** — Any PDO queries using prepared statements? No SQL interpolation? Input sanitized? CORS safe?
2. **TypeScript** — Strict mode respected? No `any` types? No `// @ts-ignore`?
3. **PHP** — `declare(strict_types=1)` present? PSR-12 formatting? No die/exit outside respondJson?
4. **React** — Components in correct directory? Hooks rules followed? No prop drilling where context/query would serve?
5. **Testing** — New logic has corresponding tests? Vitest for frontend, PHPUnit for backend?
6. **Database** — Migrations idempotent? Prepared statements? No ENUM additions?

## Output format

- **Summary:** 1–2 sentence verdict (Approve / Changes requested / Blocked)
- **Issues:** For each issue: severity (critical|major|minor), file:line, description, suggested fix
- **Praise:** 1–2 things done well
