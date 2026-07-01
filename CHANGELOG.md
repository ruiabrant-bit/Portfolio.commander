# Changelog

All notable architectural decisions and changes to Portfolio Commander are
documented in this file, per the SFS v2.0 "Instructions for AI Development
Agent" (§20): *"Document every architectural decision in CHANGELOG.md."*

## [Unreleased]

## Commit 001 — Project Bootstrap + Commander Core

**Scope:** Appendix A, Commit 001. First commit of the project.

### Added

- Project scaffold: Vite + React 19 + TypeScript (strict), TailwindCSS v4
  (via `@tailwindcss/vite`), React Router, Zustand, TanStack Query,
  Recharts, React Hook Form, Zod, Axios, Vitest + Testing Library.
- Folder structure per ADR-002: `components/ pages/ layouts/ services/
  store/ hooks/ models/ utils/ types/ tests/`.
- **Domain Model** (`src/types/domain.ts`): `Portfolio`, `Asset`,
  `Position`, `Trade`, `Dividend`, `CashMovement`, `Watchlist`,
  `WatchlistItem`, `JournalEntry`, `MarketQuote`, matching the ADR &
  Data Model Specification v1.0 field-for-field.
- **Commander Core** (`src/services/engines/`), all pure functions with no
  React/store dependency (ADR-004):
  - `portfolioEngine.ts` — position reconstruction from trade history,
    cash balance, portfolio value, invested capital, weight, realized
    profit (per-asset and per-trade).
  - `performanceEngine.ts` — Today's P/L, Total Return, CAGR, Annualized
    Return, Dividend Yield, YTD/Monthly Return.
  - `riskEngine.ts` — Max Position Weight, sector/country concentration,
    annualized volatility, max drawdown, Sharpe, Sortino.
  - `allocationEngine.ts` — grouping of market value by sector, country,
    currency, asset type.
  - `statisticsEngine.ts` — trade win/loss statistics, position size
    statistics.
  - `dividendEngine.ts` — dividend aggregation by asset/year, trailing
    12-month income.
  - `signalEngine.ts` — SMA/EMA foundational building blocks. **Full
    technical indicator suite (RSI, MACD, ATR, VWAP, Bollinger Bands,
    Support/Resistance, Fibonacci) is intentionally deferred to Commit
    008** per Appendix A, so this commit does not overreach into V2
    scope. The module boundary is established now so later commits
    extend rather than redesign it.
- **Validation Rules** (`src/utils/validation.ts`): all PRD v1.2 §7 rules
  (mandatory ticker, positive quantity/price, non-negative
  fees/tax, no future-dated trades, supported currency), plus the
  negative-quantity guard from §2 used by the Portfolio Engine when
  replaying a Sell.
- **Store** (`src/store/portfolioStore.ts`, ADR-003): Zustand store
  holding only raw domain entities (trades, dividends, cash movements,
  assets, quotes). Deliberately holds **no derived values** — positions,
  portfolio value, and all metrics are always computed on demand via
  Commander Core, per ADR-004/ADR-005. Includes import-hash based
  de-duplication, anticipating the Trade Republic CSV import wizard
  (Commit 004).
- **Hook** (`src/hooks/usePortfolioSnapshot.ts`): the single point where
  React reads derived portfolio state, memoized against store changes.
- Bootstrap UI (`src/App.tsx`): minimal dark-theme status screen
  confirming the 7 Commander Core engines and store are wired correctly
  end to end. This is **not** the product UI — Layout + Navigation
  (sidebar, top bar, routed pages) is Commit 002 per Appendix A.
- Vitest test suite: 45 tests covering every business rule explicitly
  named in PRD v1.2 (average price behaviour on Buy/Sell, cash balance
  formula, market value/weight/unrealized profit formulas, validation
  rules, negative-quantity guard) plus each engine's public functions.
- `npm run test` / `npm run test:run` scripts; `npm run build` runs
  `tsc -b && vite build` so the build is also a type-check gate.

### Architecture Decisions Reaffirmed

- ADR-004 is enforced structurally: nothing under `src/services/engines`
  imports from `react` or `zustand`. Components/hooks call engines;
  engines never call back into the store.
- ADR-005 is enforced structurally: `Position` is never constructed or
  mutated directly — `buildPositions`/`rebuildPortfolio` are the only
  way to obtain one, and both derive strictly from `Trade[]`.

### Verification

- `npm run build` — compiles cleanly (TypeScript strict + Vite build).
- `npm run test:run` — 45/45 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

### Deferred (explicitly out of scope for this commit)

- Layout + Navigation (Commit 002).
- Trade Republic CSV import wizard implementation (Commit 004) — types
  and de-dup groundwork only.
- Full technical indicator suite beyond SMA/EMA (Commit 008).
- Persistence/local storage layer — not yet decided; store is in-memory
  only as of this commit.
