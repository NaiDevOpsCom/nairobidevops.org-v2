<!--
  Thanks for contributing to the Africa DevOps Summit website! 🌍
  Fill in this template before requesting review — incomplete PRs will be sent back.
  Delete any sections that genuinely don't apply to your change.
-->

## What does this PR do?

<!--
  One clear sentence describing the change.
  Start with a verb: "Adds...", "Fixes...", "Updates...", "Refactors...", "Removes..."
-->

## Linked issue

<!--
  Every PR should be linked to an issue or discussion.
  Use one of these keywords so GitHub auto-closes the issue on merge:
-->

Closes #<!-- issue number -->

<!-- If there's no issue yet, explain why: -->
<!-- No issue — this is a [trivial fix / urgent hotfix / documentation correction] -->

## Type of change

- [ ] `feat` — new feature or component
- [ ] `fix` — bug fix
- [ ] `style` — UI / visual change (no logic change)
- [ ] `content` — data file update (speakers, FAQs, sponsors, etc.)
- [ ] `refactor` — code restructuring (no behaviour change)
- [ ] `docs` — documentation only
- [ ] `chore` — dependency update, config change, build tweak

## What changed?

<!--
  Bullet-point summary of the meaningful changes in this PR.
  Focus on the "what" and "why", not the "how" (the diff shows the how).

  Examples:
  - Added `SpeakerCard` component with hover animation
  - Updated `speakers[2026]` to add 3 new confirmed speakers
  - Fixed mobile navbar z-index conflict with hero section
  - Moved `PastSummit` interface from `summitData.ts` to `src/types/index.ts`
-->

-
-
-

## Screenshots

<!--
  Required for any change that affects the visual output of the site.
  Show both BEFORE and AFTER screenshots.
  Check all breakpoints you tested — drag and drop images directly into this PR.

  If this is a code-only change with no visual output, delete this section and say why below.
-->

### Before

<!-- Screenshot or "N/A — no visual change" -->

### After

<!-- Screenshot or "N/A — no visual change" -->

### Breakpoints tested

- [ ] Mobile — 375px
- [ ] Tablet — 768px
- [ ] Desktop — 1280px
- [ ] Wide — 1536px+

## How was this tested?

<!--
  Describe how you verified this change works correctly.
  "Tested locally" is not enough — be specific about what you checked.

  Examples:
  - Navigated to /past-summits, toggled between 2024 and 2025 tabs — both years load correctly
  - Verified speaker card renders with null imageUrl (shows placeholder avatar)
  - Ran npm run build — no TypeScript or build errors
  - Checked keyboard navigation on the new accordion component
-->

## Pre-submission checklist

<!-- Work through this before requesting review. PRs that fail these checks will not be merged. -->

### Required for all PRs

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no new warnings
- [ ] `npm run typecheck` passes with no TypeScript errors
- [ ] No `console.log`, commented-out code, or debug artifacts left in
- [ ] Branch is up to date with `main`
- [ ] PR title follows Conventional Commits format (e.g. `feat: add speaker search filter`)

### Required for UI changes

- [ ] Tested at mobile (375px), tablet (768px), and desktop (1280px)
- [ ] No hardcoded color values — Tailwind semantic tokens used throughout (`text-foreground`, `bg-primary`, etc.)
- [ ] Before/after screenshots included above
- [ ] `prefers-reduced-motion` not broken (Framer Motion animations still respect this)

### Required for content changes (`src/data/`)

- [ ] All new entries follow the field format documented in [CONTENT_GUIDE.md](../CONTENT_GUIDE.md)
- [ ] Speaker IDs are unique and follow the correct format (`"2026-s9"`, `"2025-18"`, etc.)
- [ ] Image URLs are full Cloudinary URLs (not relative paths, not Unsplash placeholders for real speakers)
- [ ] Social handles use `"@handle"` / `"in/handle"` format, not full URLs
- [ ] If FAQs were added/removed, `homepageFaqs` index positions in `faqs.ts` are still correct
- [ ] `.env.example` updated if new environment variables were added

### Required for new components

- [ ] Component lives in the correct folder (`components/ui/` for primitives, `components/shared/` for custom, `components/landing/` for homepage sections)
- [ ] Props are typed with a named interface (not inline, not `any`)
- [ ] Uses plain function declaration, not `React.FC`
- [ ] shadcn/ui components added via CLI (`npx shadcn@latest add`), not manually created in `components/ui/`

### Required for dependency changes

- [ ] `npm audit` run — no new high/critical vulnerabilities introduced
- [ ] Change documented in PR description with reason for the update

## Notes for reviewers

<!--
  Anything the reviewer should pay special attention to, known trade-offs,
  follow-up work that isn't in this PR, or decisions you want a second opinion on.
  Delete this section if there's nothing to flag.
-->

---

<!--
  By opening this PR you confirm that your contribution follows the project's
  Code of Conduct (https://devopssummit.africa/code-of-conduct) and
  Contributing Guide (CONTRIBUTING.md).
-->
