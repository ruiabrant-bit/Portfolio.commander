# Changelog

All notable architectural decisions and changes to Portfolio Commander are
documented in this file, per the SFS v2.0 "Instructions for AI Development
Agent" (§20): *"Document every architectural decision in CHANGELOG.md."*

## [Unreleased]

## Commit 003 — Portfolio Module

**Scope:** Appendix A, Commit 003 — Portfolio, Position Detail, plus the
adjacent Watchlists and Journal modules (PRD v1.1), grouped here since
they share the same underlying data (positions, assets, journal entries)
and none were named as their own Appendix A commit.

### Added

- **Data model extension**: `WatchlistItem` gained `id`, `order`, `tags`,
  `isFavorite` — the v1.0 ADR shape had only `watchlistId`/`assetId` and
  couldn't represent the "custom tags, manual ordering, favourites"
  requirement from PRD v1.1 §Watchlists. Additive change, documented
  here per the "no silent architecture changes" instruction — not a
  redesign, just filling in fields the requirement always implied.
- **Store**: `watchlists`, `watchlistItems`, `journalEntries` state plus
  CRUD actions (`addWatchlist`, `addWatchlistItem`,
  `reorderWatchlistItem`, `toggleWatchlistItemFavorite`,
  `setWatchlistItemTags`, `addJournalEntry`, `updateJournalEntry`, …) and
  `upsertAsset` for on-the-fly asset creation. These are user-authored
  records, not derived values, so they live in the store directly
  (unlike positions/metrics, which stay computed-on-demand).
- **`hooks/usePositionRows.ts`**: joins `Position[]` with `Asset`
  metadata and per-position Commander Core metrics (market value,
  unrealized profit, weight) for table/detail views.
- **Portfolio page** (real implementation): sortable/filterable holdings
  table with the exact PRD v1.1 columns, search by ticker/name, grouping
  by Sector/Country/Asset Type/Currency, CSV export
  (`utils/csv.ts`), row click → Position Detail.
- **Position Detail page** (real implementation): header (ticker,
  price, return vs avg cost) + the 8 PRD v1.1 tabs (Overview,
  Chart, Transactions, Dividends, Notes, Technical Analysis,
  Fundamental Analysis, AI Summary). Overview/Transactions/Dividends/
  Notes are fully functional against real store data; Chart/Technical/
  Fundamental/AI Summary show an inline placeholder naming the commit
  that implements them (008/008/007), since their data sources
  (market history, indicators, AI layer) don't exist yet. Tabs are
  local component state so switching preserves the rest of the page.
- **`components/position/NotesTab.tsx`**: investment thesis / personal
  notes editor, backed by `JournalEntry`.
- **Watchlists page** (real implementation): multiple watchlists,
  add/remove tickers, custom tags, up/down manual ordering, favorites.
  Price alerts remain explicitly future scope per the PRD.
- **Journal page** (real implementation): global, cross-asset view of
  the same `JournalEntry` records editable from the Notes tab.
  Screenshots and review-date reminders are not yet implemented (no
  file storage / notification layer exists yet).
- **`services/import/demoData.ts`**: temporary sample dataset (4 assets,
  6 trades, 2 dividends, 2 cash movements) so Portfolio/Position Detail
  are verifiable before the CSV import wizard exists. Plain data through
  the same `Trade`/`Dividend`/etc. shapes any import would produce —
  nothing downstream treats it specially. The "Load Demo Data" entry
  point on the empty Portfolio state should be removed once Commit 004
  ships.
- Vitest coverage for the new store logic: import de-dup, watchlist
  reorder boundaries, favorite toggle, cascade-delete on watchlist
  removal, journal entry create/update. 52 tests total (up from 45).

### Deferred (explicitly out of scope for this commit)

- CSV import wizard (real data source) — Commit 004.
- Chart, Technical Analysis, Fundamental Analysis, AI Summary tab
  content — Commits 008/008/007 respectively.
- Watchlist price alerts — explicitly future scope per PRD v1.1.
- Journal screenshots and review-date reminders.

### Verification

- `npm run build` — compiles cleanly.
- `npm run test:run` — 52/52 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

## Commit 002 — Layout + Navigation

**Scope:** Appendix A, Commit 002.

### Added

- **Design tokens** (`src/index.css`): dark terminal theme (SFS §13 —
  TradingView/Bloomberg direction) defined as Tailwind v4 `@theme`
  tokens (`bg`, `surface`, `border`, `text`, `accent`, `positive`,
  `negative`, plus `font-sans`/`font-data`). Signature choice: all
  numeric/financial data renders in a monospace face with tabular
  figures (`.font-data`), so price/return columns stay aligned across
  every module — this is the one consistent visual thread carried
  through the whole app.
- **Layout shell** (`src/layouts/AppLayout.tsx`): Top bar + persistent
  Sidebar + Status bar, matching the PRD v1.3 wireframe. Routed pages
  render inside via `<Outlet />`.
- **`components/layout/TopBar.tsx`**: search, market status pill,
  "Ask AI" quick-launch, notifications, profile — per PRD v1.3.
- **`components/layout/Sidebar.tsx`**: persistent on desktop, slide-over
  with backdrop on mobile/tablet (hamburger-driven, per PRD v1.3
  responsive rule). Active route marked with a left accent bar. Every
  core module is one click away, satisfying the "max 2 clicks to any
  core feature" navigation rule (Position Detail is the one screen that
  needs a second click, via Portfolio).
- **`components/layout/StatusBar.tsx`**: local-first/version indicator.
- **Routing** (`src/router/AppRoutes.tsx`): routes for all 10 modules
  (Dashboard, Portfolio, Position Detail, Transactions, Watchlists,
  Screener, News, Journal, Reports, AI Commander, Settings). Added a
  `router/` folder alongside the ADR-002 structure to hold route
  configuration — an additive, non-breaking extension, not a
  redesign.
- **`components/PlaceholderPage.tsx`**: explicit "coming in Commit N"
  placeholder used by every module not yet implemented. Chosen
  deliberately over a blank/broken screen: navigation and routing are
  real and working now, only the module content is pending, and each
  placeholder states exactly which commit it lands in.
- `src/pages/DashboardPage.tsx` carries forward the Commander Core
  wiring verification from Commit 001 (App.tsx is now just the router
  mount point).

### Deferred (explicitly out of scope for this commit)

- Real Dashboard widgets (KPI row, allocation, watchlist, calendar,
  news) — Commit 005.
- Portfolio table, Position Detail, Watchlists, Journal content —
  Commit 003.
- Transactions/CSV import wizard — Commit 004.
- Screener — Commit 008. News — Commit 009. Reports — Commit 006.
  AI Commander — Commit 007. Settings — Commit 010.

### Verification

- `npm run build` — compiles cleanly.
- `npm run test:run` — 45/45 tests still passing (no engine changes).
- `npm run lint` — 0 warnings, 0 errors.

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
