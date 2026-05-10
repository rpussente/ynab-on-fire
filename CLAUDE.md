# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
make check        # format + lint + type-check (required before every commit)
npm run dev       # dev server (or: make dev  — opens browser automatically)
npm run test:unit # run all unit tests with Vitest
npm run test:unit -- --reporter=verbose src/components/__tests__/RetirementDashboard.spec.ts  # single test file
npm run build     # type-check + production build
```

## Branching & PRs

- **Always create a feature branch** before making any changes. Never commit directly to `main`.
- **Always open a PR** for every set of changes (no direct merges to `main`).
- All PRs must be created in **draft mode**: `gh pr create --draft`.
- **Never create PRs without explicit user permission** — create the branch and make the changes, then ask.
- Use real newlines in PR descriptions (no `\n` literals).

## Code formatting

- **Always run `npm run format` (or `make check`) before committing.** `make check` runs format + lint + type-check in one step and must pass before every commit.

## Architecture

This is a Vue 3 / Vite / TypeScript SPA that connects to the YNAB API and calculates a user's FIRE (Financial Independence, Retire Early) status.

### Auth flow

`App.vue` captures the OAuth `access_token` from the URL hash on redirect from YNAB, calls `ynab.markAuthorised(token)`, then pushes to `/`. The token is persisted in `sessionStorage` via `useSessionStorage` so it survives page refreshes within the session.

### Main user flow (`HomeView.vue`)

The home view is a state machine driven entirely by `useYnabStore`:

1. Not authorised → landing page with "Authorise with YNAB" link
2. Authorised, no budget selected → `<BudgetList>` (budget picker)
3. Budget selected, not confirmed → `<AccountList>` (multi-select account picker)
4. Budget selected + confirmed → `<RetirementDashboard>` (FIRE calculator)

### Central store (`src/stores/ynab.ts`)

Single Pinia store (`useYnabStore`) owns all YNAB API state:
- `budgets` / `selectedBudget` — budget list and selection
- `accounts` / `selectedAccountIds` — account list and multi-selection for portfolio
- `months` — monthly summaries used by the FIRE calculator

All monetary values from the YNAB API are in **milliunits** (1/1000 of the currency unit). Divide by 1000 before any calculation or display.

### FIRE calculator (`src/components/RetirementDashboard.vue`)

Computes FIRE metrics from store data:
- **Portfolio value**: sum of selected account balances
- **Average monthly income**: mean of `month.income` over the last 12 completed months
- **Retirement target**: annual income / withdrawal rate (3.5–5%, default 4%)
- **FIRE progress**: portfolio / target, capped at 100%

Loads monthly data via `ynab.loadMonths()` on `onMounted`.

### Currency formatting (`src/composables/useFormatCurrency.ts`)

`useFormatCurrency()` reads `selectedBudget.currency_format.iso_code` and formats with `Intl.NumberFormat`. Always use this composable for displaying monetary values — never hardcode a currency.

### Styling

Tailwind CSS v4 (via `@tailwindcss/vite`). The design system uses a dark slate palette (`slate-800/900/950`) with indigo/purple accents. Do not modify global styles in `App.vue` or `HomeView.vue` unless explicitly instructed.

### Config

`src/ynab.config.json` holds the OAuth `clientId` and `redirectUri`. The redirect URI points to the GitHub Pages deployment (`https://rpussente.github.io/ynab-on-fire/`).
