Add a new `ExpenseCategory` named `$ARGUMENTS` to VanderExpense consistently across every place the category taxonomy is defined, then add tests.

## Why this command exists

`src/types/expense.ts` holds the category taxonomy as **three parallel maps** keyed by the `ExpenseCategory` union:
- `CATEGORIES` (array)
- `CATEGORY_COLORS` (Record)
- `CATEGORY_ICONS` (Record)

Forgetting any one of these breaks the Open/Closed rule in `CLAUDE.md` and produces runtime gaps (missing color, missing icon, missing filter option). This command enforces the invariant: **adding a category is additive, not invasive.**

## Process

1. **Read** `src/types/expense.ts` to confirm the current shape of the taxonomy.
2. **Validate the argument** — reject empty input, duplicates, or names that collide case-insensitively with an existing category. Ask the user for a color (hex) and an emoji icon if not supplied in `$ARGUMENTS`.
3. **Extend the three maps** in `src/types/expense.ts`:
   - Add the literal to the `ExpenseCategory` union.
   - Append to `CATEGORIES`.
   - Add entries to `CATEGORY_COLORS` and `CATEGORY_ICONS`.
4. **Audit for exhaustive switches / `Record<ExpenseCategory, …>` shapes** elsewhere in the codebase using Grep. Any code that must handle every category (e.g., charts, filters, insights, future export templates) needs updating. Flag each hit and fix it — don't leave a partial update.
5. **Add a test** in `src/types/expense.test.ts` that asserts:
   - `CATEGORIES.length === Object.keys(CATEGORY_COLORS).length === Object.keys(CATEGORY_ICONS).length`
   - Every entry in `CATEGORIES` has a color and icon.
   This parity test is the guardrail — it will fail in the future if someone adds a category to only one map.
6. **Run** `npm run lint` and `npm run build` to confirm the TypeScript strictness catches any missed exhaustiveness.
7. **Report** the full list of files changed and any spots where the exhaustive audit flagged calling code.

## Guardrails

- Do **not** introduce a switch statement to handle the new category — extend the data, not the control flow.
- Do **not** hard-code the new category name in components; import from `CATEGORIES`.
- If the taxonomy grows beyond ~10 entries, recommend promoting it to a registry object keyed by id with `{label, color, icon}` — don't silently do the refactor.
