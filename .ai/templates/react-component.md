---
description: React component template for NDC shadcn/ui pages
---

```tsx
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'

interface {{ComponentName}}Props {
  className?: string
}

export function {{ComponentName}}({ className }: {{ComponentName}}Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['{{resource}}'],
    queryFn: () => fetch('/endpoints?action={{action}}').then(r => r.json()),
  })

  if (isLoading) return <Skeleton className={cn('h-48', className)} />
  if (error) return <ErrorState message={error.message} />
  if (!data?.length) return <EmptyState message="No {{resource}} found" />

  return (
    <div className={cn('space-y-4', className)}>
      {/* {{TODO: render data}} */}
    </div>
  )
}
```

## Usage

1. Replace `{{ComponentName}}` with PascalCase name (e.g., `EventList`)
2. Replace `{{resource}}` with the data resource name (e.g., `events`)
3. Replace `{{action}}` with the API action parameter (e.g., `get_events`)
4. Delete unused loading/error/empty states if not needed
5. Add the component to the page at `client/src/pages/`
6. Register route in `App.tsx`

## Standards

- Import path alias `@/` for `client/src/`
- shadcn/ui primitives from `@/components/ui/`
- Custom components in `@/components/`
- Hooks in `@/hooks/`
