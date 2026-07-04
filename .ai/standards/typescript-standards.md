# TypeScript Standards

## Configuration

Config in `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "lib": ["esnext", "dom", "dom.iterable"],
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    },
    "types": ["node", "vite/client", "vitest/globals"]
  }
}
```

## Strict Mode Rules

- **`strict: true`** — enabled. No implicit any, strict null checks, no unchecked indexed access.
- **`noImplicitAny`** — on. Every variable, parameter, and return type must be typed.
- **`strictNullChecks`** — on. `null` and `undefined` must be handled explicitly.
- **No `any` type** — use `unknown` and type guards instead. If absolutely necessary, document why.

## Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Interfaces | PascalCase, no `I` prefix | `RouteDefinition`, `Job` |
| Types | PascalCase | `RoutePath` |
| Enums | PascalCase | — |
| Functions | camelCase | `getJobs`, `useJobs` |
| React components | PascalCase | `Navbar`, `JobCard` |
| Custom hooks | camelCase, prefixed `use` | `useJobs`, `useToast` |
| Files (components) | PascalCase | `Navbar.tsx`, `JobCard.tsx` |
| Files (utilities) | camelCase | `utils.ts`, `queryClient.ts` |
| Files (contexts) | PascalCase | `ThemeContext.tsx` |
| Constants | UPPER_SNAKE_CASE or camelCase | per file convention |

## Import Order

Enforced by ESLint. Order: builtin → external → internal → parent → sibling → index.

```typescript
// Builtin
import { readFile } from 'node:fs';

// External
import { useQuery } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';

// Internal (alias)
import { Button } from '@/components/ui/button';

// Parent
import { routes } from '../../shared/routes';

// Sibling
import { utils } from './utils';

// Index
import type { ComponentType } from 'react';
```

## Path Aliases

- `@/` → `frontend/client/src/` (components, pages, hooks, lib)
- `@shared/` → `frontend/shared/` (routes, shared types)
- `@assets/` → `frontend/attached_assets/` (static assets)

Always use path aliases over relative imports for project code. Use relative imports only within the same directory.

## Type Patterns

```typescript
// Prefer interfaces for public API shapes
export interface Job {
  id: number;
  title: string;
  company: string;
}

// Prefer type aliases for unions, intersections, and computed types
export type SortMode = 'newest' | 'closing_soon' | 'salary_desc';
export type RoutePath = RouteDefinition['path'];

// Use generics over casts
function getData<T>(key: string): T | null { ... }

// Use discriminated unions for complex states
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

## What Not to Do

- No `any` — use `unknown` + type guards
- No `// @ts-ignore` or `// @ts-expect-error` without an explanation
- No `as` casts for types that could be validated at runtime
- No `namespace` or `module` declarations (use ES modules)
- No non-null assertions (`!`) unless proven safe with a comment
