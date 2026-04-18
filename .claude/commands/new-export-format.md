Scaffold a new export format (`$ARGUMENTS`, e.g. `csv`, `json`, `pdf`, `xlsx`) for VanderExpense, following the hybrid architecture recommended in `code-analysis.md`.

## Why this command exists

Three export implementations were explored in parallel branches; the chosen direction (see `CLAUDE.md` and `code-analysis.md`) is V2's engine/UI separation + V3's templates + V1's one-click shortcut. New formats must slot into that engine — not sprawl into components or page-level handlers.

## Process

1. **Read first:**
   - `code-analysis.md` — understand the recommended hybrid.
   - `src/lib/csv.ts` — baseline pattern for a pure generator.
   - `src/types/expense.ts` — the `Expense` shape you will serialize.
   - `src/app/page.tsx` (`handleExport`) — the one-click entry point pattern.
2. **Validate `$ARGUMENTS`** — must be one of `csv | json | pdf | xlsx`. If the format already exists as a generator in `src/lib/`, stop and tell the user.
3. **Create the generator** in `src/lib/<format>.ts` as a **pure function**:
   - Signature: `export function exportTo<Format>(expenses: Expense[], filename?: string): void`
   - Must not import from `react` or `next`.
   - Must handle the empty array gracefully (no-op or explicit guard — caller decides via the page layer).
   - Must escape every field correctly for the format (quotes, newlines, commas, control chars for CSV; Unicode for JSON; structural escaping for PDF/XLSX).
   - Heavy dependencies (jspdf, xlsx, etc.) must be loaded via dynamic `import()` so they stay out of the initial bundle.
4. **Register the format** in a shared `ExportFormat` union. If no such union exists yet, create `src/types/export.ts` with:
   ```ts
   export type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx';
   ```
   and wire `handleExport` in `src/app/page.tsx` to dispatch by format. Do **not** add a switch inside a component body that grows with each format — dispatch through a registry object `{ [format]: generator }`.
5. **Write unit tests** in `src/lib/<format>.test.ts` (Vitest + `@testing-library/jest-dom` not required here — this is pure). Required cases:
   - Empty array → no crash, expected output.
   - Single expense → correctly serialized.
   - Quote in description → properly escaped.
   - **Newline in description → not broken** (known gap from `code-analysis.md`).
   - Unicode characters preserved.
   - Very small and large datasets (100+ rows).
   Mock the DOM (`URL.createObjectURL`, `document.createElement`) via Vitest's `vi.stubGlobal` — do not touch the real browser APIs in tests.
6. **Update `package.json`** with any new runtime dep (only if actually used) and add the dev dep types.
7. **Verify:**
   - `npm run lint` — clean.
   - `npm test` — new tests pass; coverage of `src/lib/<format>.ts` is 100% (per `CLAUDE.md`).
   - `npm run build` — static export still works; dynamic import didn't break the bundle.
8. **Report** files added, dependencies added, and any UI wiring left for the user to complete (e.g., format picker in a future `ExportDrawer`).

## Guardrails

- Do **not** put format logic in a React component. The generator is `lib/`; the trigger is the page.
- Do **not** skip the newline-in-description test — it's the #1 known gap.
- Do **not** ship a format without a visible error toast on failure (wrap the `handleExport` dispatch in try/catch at the page layer).
- If `$ARGUMENTS` is `pdf` or `xlsx`, confirm with the user before installing heavy deps.
