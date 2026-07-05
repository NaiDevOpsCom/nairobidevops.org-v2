# Templates

Reusable templates for consistent code generation across the NDC project.

## Available Templates

| Template | Use Case | Language |
|---|---|---|
| `react-component` | New shadcn/ui page or feature component | TypeScript + TSX |
| `php-endpoint` | New API endpoint | PHP 8.4+ |
| `sql-migration` | Database schema migration with idempotent guard | SQL |
| `pr-description` | GitHub PR description | Markdown |
| `commit-message` | Conventional commit message | Text |

## Usage

Copy the template content and fill `{{placeholders}}`. Templates follow the conventions documented in `.ai/standards/` and `.ai/coding-rules/`.

## Customization

If you need a template variant, copy it locally rather than modifying the canonical version. Propose additions via PR.
