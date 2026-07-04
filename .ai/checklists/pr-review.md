# PR Review Checklist

## Structure
- [ ] Branch name follows convention: `feat/`, `fix/`, `refactor/`, `hotfix/`, `chore/`
- [ ] PR description explains what and why (not just how)
- [ ] Single concern per PR (no scope creep)
- [ ] Rebase on latest target branch before requesting review

## Code quality
- [ ] TypeScript strict mode respected — no `any`, no `@ts-ignore`
- [ ] No dead code, commented-out blocks, or console.log
- [ ] Functions do one thing; components are focused
- [ ] No duplicated logic — extracted to shared utility/hook if reused
- [ ] Error states handled (loading, empty, error, success)

## PHP backend
- [ ] `declare(strict_types=1)` in new files
- [ ] Prepared statements for all database queries
- [ ] Input sanitized via `sanitizeString()` or Zod schema
- [ ] Responses use `respondJson()` — no raw `echo` or `exit` outside it
- [ ] PSR-12 formatting (run `composer cs-fix`)

## React frontend
- [ ] Component in correct directory (pages vs components vs ui)
- [ ] shadcn/ui conventions followed (cn(), Slot, composition)
- [ ] No prop drilling beyond 2 levels — use context or React Query
- [ ] Hooks rules respected (no conditional hooks, hooks at top level)
- [ ] Key props on mapped elements

## Tests
- [ ] New logic has tests
- [ ] Tests are meaningful (assert behavior, not implementation)
- [ ] Edge cases covered (empty state, error, boundary values)
- [ ] Tests pass locally before pushing

## Accessibility
- [ ] Interactive elements have visible focus states
- [ ] Images have `alt` text
- [ ] Forms have associated `<label>` elements
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works (Tab, Enter, Escape)

## SonarQube
- [ ] SonarQube scan passes with zero new warnings (blocker, critical, major)
- [ ] No duplicated code introduced
- [ ] Code coverage not decreased (existing threshold maintained)
- [ ] Security hotspots reviewed and resolved or acknowledged
