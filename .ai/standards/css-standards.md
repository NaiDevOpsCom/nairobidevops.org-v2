# CSS / Tailwind Standards

## Tech Stack

- Tailwind CSS v4 with PostCSS (`@tailwindcss/postcss`)
- Vite plugin: `@tailwindcss/vite`
- Additional plugin: `@tailwindcss/typography` (for blog content)
- CSS variables for theming defined in `tailwind.config.ts`

## Theme Configuration

```typescript
// tailwind.config.ts — CSS variable-driven colors
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        muted: 'hsl(var(--muted))',
        // ... 20+ semantic color tokens
      },
    },
  },
};
```

Custom NDC brand colors:
- `darkblue`: #023047
- `primary-light`: (defined in CSS)
- `midnight`: #001E2B

## Dark Mode

- Strategy: `class`-based. Toggle via `ThemeContext`.
- Tailwind classes: `dark:bg-muted dark:text-muted-foreground`
- All components should support dark mode
- CSS variables automatically switch via `:root` / `.dark` selectors

## Class Conventions

- Use Tailwind utility classes exclusively — no inline styles
- Order: layout → positioning → sizing → spacing → typography → colors → borders → effects
- Complex components use `cn()` utility from `@/lib/utils` for conditional classes
- Avoid `@apply` directives — they defeat Tailwind's tree-shaking

```tsx
// Good
<button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">

// With cn() for conditional styles
<div className={cn(
  "flex items-center gap-4 rounded-lg border p-4",
  isActive && "border-primary bg-primary/5",
)}>
```

## Responsive Design

- Mobile-first breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Use container queries where appropriate
- Test at mobile, tablet, desktop breakpoints

## Animations

- Use `motion` library (formerly Framer Motion) for complex animations
- Define simple keyframe animations in `tailwind.config.ts` (e.g., accordion)
- Avoid CSS transitions for layout-affecting properties (use transform instead)

## What Not to Do

- No inline `style={{}}` props — use Tailwind classes
- No `!important` — refactor specificity instead
- No `@apply` in component files — keep Tailwind in JSX, not CSS
- No manual media queries for breakpoints covered by Tailwind
- No runtime CSS-in-JS (styled-components, emotion)
