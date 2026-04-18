Audit `$ARGUMENTS` (a file or directory, default: the whole `src/` tree) against the per-layer testing mandate in `CLAUDE.md`, report missing or weak tests, and scaffold failing test stubs for the gaps.

## Why this command exists

`CLAUDE.md` requires automated tests for every change, with per-layer coverage expectations:

| Layer | Required coverage |
|---|---|
| `src/lib/` | 100% — pure functions, no excuse |
| `src/hooks/` | All public return values + state transitions |
| `src/components/` | Render, interaction, empty/error states |
| `src/app/` | Golden-path E2E only |

Without an enforcer, the mandate slips. This command turns it into a repeatable audit.

## Process

1. **Resolve scope:** If `$ARGUMENTS` is empty, audit `src/`. Otherwise audit the given path.
2. **Check test tooling exists.** If `package.json` has no `vitest` dep or `test` script, stop and tell the user to install the tooling block from `CLAUDE.md` first. Do **not** scaffold tests into a repo that can't run them.
3. **Classify every source file** by layer (`types/`, `lib/`, `hooks/`, `components/`, `app/`). Skip `.test.ts(x)`, `.d.ts`, and generated files.
4. **For each source file, locate its test** (`foo.ts` → `foo.test.ts` co-located). Record: has-test / no-test.
5. **For files that have tests, audit quality:**
   - `lib/`: does the test cover the exported functions' edge cases (empty input, special characters, large input)? Check for obvious gaps by reading the source exports vs. the test's `describe`/`it` blocks.
   - `hooks/`: does the test exercise every returned callback and every `useMemo`-derived value? Flag hooks whose tests only read `result.current` without dispatching state changes.
   - `components/`: are there assertions for the empty state and at least one user interaction (`userEvent.click` / `type`)?
   - Flag any test using snapshot-only assertions for logic (banned by `CLAUDE.md`).
   - Flag any `.skip`, `.only`, or `xit` — skipped tests are lies per `CLAUDE.md`.
6. **Run `npm run test:cov`** if available and parse coverage. Files in `src/lib/` below 100% or `src/hooks/` below 80% are gaps.
7. **Report** in this format:
   ```
   Test Gap Audit — <scope>

   Missing tests (N files):
     src/lib/format.ts
     src/hooks/useExpenses.ts
     ...

   Weak tests (M files):
     src/components/ExpenseList.tsx — no empty-state assertion
     src/lib/csv.ts — missing newline-in-description case
     ...

   Banned patterns:
     src/components/Charts.test.tsx — uses .skip on 2 tests

   Coverage floor violations:
     src/lib/categorize.ts — 62% (floor: 100%)
   ```
8. **Offer to scaffold failing stubs** for every missing-test file. A stub is a file that imports the source and has one `it.todo()` per exported symbol, plus `it('renders on empty input')` for components. These must **fail or be marked `todo`** — never write stubs that pass without asserting anything.
9. **Do not** fix the gaps — this command only reports and scaffolds. Gap-filling is a separate, reviewed change.

## Guardrails

- Do not write test logic; only stubs. A stub that fakes passing defeats the mandate.
- Do not modify source files. If a source file is untestable (e.g. side effects at import time), flag it — don't refactor in this command.
- Never delete a `.skip` to "fix" it. Report it and let the author decide: fix today or delete today (per `CLAUDE.md`).
