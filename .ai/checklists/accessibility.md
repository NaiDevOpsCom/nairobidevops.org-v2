# Accessibility Checklist

Applies to any frontend UI change. Target: WCAG 2.1 Level AA.

## Semantic HTML
- [ ] Use semantic elements (`<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`)
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skips)
- [ ] Landmarks used correctly (one `<main>`, one `<nav>` per page)

## Keyboard
- [ ] All interactive elements reachable via Tab
- [ ] Focus order follows visual order
- [ ] No keyboard traps (focusable element that can't be Tab+Shift-ed away from)
- [ ] Custom components have proper `role` and `aria-*` attributes

## Screen readers
- [ ] Images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] Icons have `aria-hidden="true"` + accessible label if informative
- [ ] Dynamic content changes announced via `aria-live` regions
- [ ] Form inputs have associated `<label>` elements (not placeholder-only)

## Visual
- [ ] Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- [ ] Information not conveyed by color alone (add icons or text labels)
- [ ] Focus indicators visible (not just browser default outline)
- [ ] Touch targets ≥ 44×44px on mobile

## Motion
- [ ] `prefers-reduced-motion` respected (disable animations)
- [ ] No flashing content (3+ flashes per second)
- [ ] Animations are subtle and non-distracting
