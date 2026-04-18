# CLAUDE.md — VanderExpense

Guidance for Claude Code when working in this repository. Read this before editing.

## Project Overview

**VanderExpense** is a client-side personal expense tracker built with Next.js 14, React 18, and TypeScript. All data persists to the browser's `localStorage` — there is no backend. The app is deployed as a static export to GitHub Pages.

Primary domains:
- **Expense CRUD** — add, edit, delete, filter, sort, search
- **Dashboard** — summary cards, monthly trend chart, category breakdown
- **Insights** — monthly spending analysis (`src/components/MonthlyInsights.tsx`)
- **Export** — CSV export today; `code-analysis.md` documents three explored approaches (simple CSV, multi-format wizard, cloud share hub)
- **Bank integration** — MLP Bank via FinTS protocol (see history)

## Coding Journey & Intent

The commit history reflects incremental, feature-driven growth:

1. `eac9276` — initial NextJS expense tracking app
2. `8e0a6b3` — GitHub Pages deployment via static export
3. `f5337bc` — MLP Bank FinTS integration
4. `bcb4c62` — systematic cross-branch export analysis
5. `c299cf9` — `/code-review` slash command
6. `959ca8d` — Monthly Insights dashboard

Three export implementations (`claude/nextjs-expense-tracker-CQO6n`, `feature-data-export-v2`, `feature-data-export-v3`) were explored in parallel and compared in `code-analysis.md`. The recommended path there is a hybrid: V2's engine/UI separation + V3's templates + V1's one-click shortcut. Honour that direction when expanding export features.

## Architectural Principles (SOLID)

Every change — new feature, refactor, or bug fix — must respect SOLID. These are not aspirational; they are review criteria.

- **S — Single Responsibility.** One module, one reason to change. The layered structure (`types/` → `hooks/` → `lib/` → `components/` → `app/`) exists to enforce this. Do not stuff formatting logic into components, or React state into `lib/`. `exportToCSV` is pure data → file; the page handles UX side-effects (toasts, tab context) separately. Keep it that way.
- **O — Open/Closed.** New export formats, new categories, new insight panels should extend, not rewrite. See `src/types/expense.ts` — adding a category means adding one entry to three parallel maps. If you find yourself editing a switch statement in multiple files to add a case, stop and introduce a registry.
- **L — Liskov Substitution.** Components accepting `Expense[]` must work for any valid `Expense[]`, including empty arrays. Every list/chart/summary must render sensibly on `[]` (see `averageExpense` guard in `useExpenses.ts:157`). Don't introduce subtypes that break parent contracts.
- **I — Interface Segregation.** Prefer narrow props. `ExpenseListComponent` takes only what it needs (`expenses`, `onEdit`, `onDelete`) — it doesn't receive the whole `useExpenses` return value. Hooks expose focused APIs; don't leak implementation detail.
- **D — Dependency Inversion.** UI depends on abstractions, not storage. `useExpenses` depends on `useLocalStorage<T>`, which is generic and swappable. When you add persistence (IndexedDB, a sync API, a backend), replace the hook's innards — do not spread `localStorage` calls across components.

### Concrete expectations
- Pure functions live in `src/lib/` and must not import from `react` or `next`.
- Data shapes live in `src/types/`. Components and hooks import from there, never define domain types inline.
- Side effects (storage, DOM download triggers, navigation) are isolated in hooks or the page layer.
- If a component exceeds ~300 LOC or holds more than ~6 pieces of state, decompose it. `ShareHub` in the V3 branch (674 LOC, 13 state pieces) is a cautionary tale — the analysis flagged it.

## Automated Testing Is Mandatory

**Every change must include automated tests.** No exceptions for "small fixes" or "UI tweaks." If you are editing production code, you are also writing or updating tests. If tests don't exist yet for the area you're touching, add them as part of the change.

### Tooling (set up if missing)

The repo currently has no test runner configured. Before adding feature tests, add:

- **Vitest** as the unit/integration runner (fast, Vite-powered, Next.js-friendly).
- **React Testing Library** + **@testing-library/jest-dom** for component tests.
- **@testing-library/user-event** for interaction tests.
- **Playwright** for end-to-end tests covering the three tabs (Dashboard / Insights / Expenses) and the critical CRUD + export paths.

Add scripts to `package.json`:
```
"test":      "vitest run",
"test:watch":"vitest",
"test:e2e":  "playwright test",
"test:cov":  "vitest run --coverage"
```

Place tests alongside sources using `*.test.ts` / `*.test.tsx`. Co-location matters more than a `__tests__` folder — it keeps tests discoverable when you move files.

### What to test, by layer

| Layer | Test type | Required coverage |
|---|---|---|
| `src/types/` | Type-level (tsc) | Compile-time only; no runtime tests needed |
| `src/lib/` | Unit (Vitest) | 100% — these are pure; no excuse |
| `src/hooks/` | Integration (RTL `renderHook`) | All public return values + all state transitions |
| `src/components/` | Component (RTL) | Render, user interaction, empty/error states |
| `src/app/` | E2E (Playwright) | Golden-path flows only; don't duplicate component tests |

### Rules
- **Test behaviour, not implementation.** Query by role/label/text, not by class name or test-id unless there's no alternative.
- **Every bug fix starts with a failing test** that reproduces the bug. Commit the test first when practical.
- **No snapshot tests for logic.** Snapshots are acceptable for stable presentational output only.
- **Mock at the boundary.** Mock `localStorage` and `Date` in hook tests; don't mock the hook itself when testing components — use a real provider.
- **Coverage floor: 80%** for `lib/` and `hooks/`. Coverage is a floor, not a goal; meaningful assertions matter more than the number.
- **Flaky tests get fixed or deleted the same day.** A skipped test is a lie.

### Specific known gaps to address
From `code-analysis.md` — open items that must land with tests:
1. CSV newline sanitization in descriptions (currently broken in all three export versions).
2. Try/catch with user-visible error messages around PDF generation.
3. File-size estimation before large exports.
4. XSS sanitization on decoded share-link params (V3 path).

## Tech Stack Reference

- **Framework:** Next.js 14.2 (App Router, static export, `basePath: /vander_expense`)
- **Language:** TypeScript 5, `strict: true` — keep it that way
- **UI:** React 18, TailwindCSS 3.4
- **Charts:** recharts 3.8
- **Dates:** date-fns 4 (prefer over `Date` math — see `useExpenses.ts`)
- **IDs:** uuid v13 (`uuidv4()`)
- **Linting:** `eslint-config-next` — run `npm run lint` before committing

## Layout

```
src/
  app/          Next.js App Router pages + layout
  components/   Presentational + small interactive components
  hooks/        State + side-effect containers
  lib/          Pure helpers (csv, format, categorize)
  types/        Domain types and constants
public/         Static assets
```

## Commands

```
npm run dev      Start dev server
npm run build    Static production build (outputs to out/)
npm run start    Serve the built app
npm run lint     ESLint
npm test         Unit tests (after test tooling is added — see above)
```

## Conventions

- Use the `@/*` path alias (maps to `src/*`) instead of relative `../../` imports.
- Client-only modules must start with `'use client';`. Don't add it to pure `lib/` files.
- Prefer `useCallback` / `useMemo` for values passed into children or dependency arrays — the existing hooks follow this pattern.
- Toast all user-facing outcomes of mutations (success and error). Don't leave silent failures.
- Never log sensitive data (amounts, descriptions) at error level in production paths.

## Definition of Done

A change is not done until all of these are true:

1. Code respects SOLID; no new cross-layer leaks.
2. Automated tests added or updated; all tests pass locally.
3. `npm run lint` is clean.
4. `npm run build` succeeds (static export must not break).
5. Types are strict — no new `any`, no `@ts-ignore` without a comment explaining why.
6. Empty-state, error-state, and large-dataset behaviour verified.
7. Commit message explains the *why*, not just the *what*.
