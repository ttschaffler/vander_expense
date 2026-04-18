# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

VanderExpense — a client-side expense tracker built with Next.js 14 (App Router), React 18, TypeScript, Tailwind, and Recharts. All data is persisted to `localStorage`; there is **no backend**. The app is deployed to GitHub Pages as a fully static bundle.

## Commands

- `npm run dev` — local development at `http://localhost:3000`
- `npm run build` — produces the static export in `./out/`
- `npm run lint` — ESLint via `next lint`
- No test command is configured yet. Adding one is expected (see Testing below).

## Architecture

- `src/app/` — App Router entry. `layout.tsx`, `page.tsx` (the only route), `globals.css`.
- `src/components/` — presentational + container components (Dashboard, Insights, Expenses, Charts, Forms, Modal, Toast).
- `src/hooks/` — `useExpenses` (CRUD + derived selectors) and `useLocalStorage` (persistence).
- `src/lib/` — framework-agnostic helpers (`format`, `csv`, `categorize`).
- `src/types/` — shared TypeScript types (`expense.ts`).

State flows top-down from `useExpenses` in `page.tsx`. Derived data (totals, monthly trend, category breakdown) is computed with `useMemo` inside the hook so components receive ready-to-render values.

## Static-Export Constraints (learned the hard way)

This app is deployed via `.github/workflows/deploy.yml`, which runs `npm run build` and uploads `./out/`. `./out/` is only generated when `next.config.mjs` declares `output: 'export'`. Therefore:

- **Do not add server-only features** — API routes (`src/app/api/**`), server actions, middleware, `next/image` optimization, ISR, `cookies()`/`headers()` in RSC, or dynamic server rendering will break the deploy.
- `basePath: '/vander_expense'` and `assetPrefix: '/vander_expense/'` are required for GitHub Pages. Use Next.js `<Link>` and relative asset paths — never hard-code absolute URLs that ignore the base path.
- If a feature genuinely needs a server, raise it before implementing. Options are: call a third-party API from the client, or change the hosting target (which is a much bigger decision).

## Coding Principles

Follow SOLID, adapted for a small React app:

- **Single Responsibility** — one component, one job. Keep presentational components free of persistence and derivation; keep hooks free of JSX. If a component grows past ~150 lines or mixes concerns, split it.
- **Open/Closed** — extend via props and composition, not by editing shared components for a single caller's needs. Prefer adding a new variant/prop over branching on call-site identity.
- **Liskov Substitution** — props types should describe true contracts. Don't narrow a child's behavior so it silently violates its declared type (e.g. an "optional" callback the parent actually requires).
- **Interface Segregation** — keep prop surfaces minimal. Don't pass the entire `useExpenses()` bag into a leaf component when it only needs three fields.
- **Dependency Inversion** — components depend on typed props and hooks, not on concrete storage or fetch implementations. Keep `useLocalStorage`-style infrastructure behind a hook so it can be swapped in tests.

Other standing rules:

- No dead code, no half-finished implementations, no speculative abstractions. Three similar lines beats a premature helper.
- No comments that restate what the code says. Comments exist only for non-obvious *why*.
- Validate at boundaries only (user input, external data). Internal code trusts its types.

## Automated Testing — Required

Every change that touches behavior must ship with automated tests. This is non-negotiable; there is no "I manually clicked through it" exception.

- **Unit tests** (Vitest or Jest + React Testing Library) for:
  - Everything in `src/hooks/` (selectors, reducers, localStorage round-trips).
  - Everything in `src/lib/` (`formatCurrency`, `formatDate`, CSV export, category inference).
  - Pure logic inside components (e.g. `MonthlyInsights` budget-streak and top-3 computations).
- **Component tests** for user-visible behavior: tab switching, add/edit/delete flows, empty states, filter interactions.
- **Date-sensitive tests** must freeze time (e.g. `vi.setSystemTime`) — do not rely on the wall clock.
- When fixing a bug, add a failing test first, then make it pass.
- If no test framework is yet installed, the first change that needs tests adds it and wires a `npm test` script. Do not skip tests because "setup isn't there yet."

The deploy workflow should run `npm run lint` and `npm test` before `npm run build`; add those steps when tests land.

## Pull Requests

- Default base branch for PRs is `claude/nextjs-expense-tracker-CQO6n` (the repo's default branch). There is no `main`.
- Keep PRs focused — one feature or one fix. The build must be green (lint + tests + `npm run build` producing `./out/`).
- Never push directly to the default branch; work on a feature branch and open a PR.

## Things That Have Burned Us

- Removing `output: 'export'` from `next.config.mjs` to add API routes silently broke the GH Pages deploy (the job succeeded but had no `./out/` to upload). Keep static export in mind for every change.
- Adding heavy server-only dependencies (`lib-fints`) to a statically-exported app. If the dep can't run in the browser, it doesn't belong here.
