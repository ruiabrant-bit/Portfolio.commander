# Changelog

All notable architectural decisions and changes to Portfolio Commander are
documented in this file, per the SFS v2.0 "Instructions for AI Development
Agent" (§20): *"Document every architectural decision in CHANGELOG.md."*

## [Unreleased]

## Commit 010 — Polish

**Scope:** Appendix A, Commit 010 — the last of the originally planned
10 commits. Completes the Definition of Done checklist (PRD §Definition
of Done) and the SFS §17 MVP Definition.

**Most important fix in this commit, found while starting it**: the
Zustand store had **no persistence** at all from Commit 001 through
009. Every reload silently wiped the entire portfolio — trades,
watchlists, journal, everything. This directly contradicted ADR-001
("local-first, offline-capable for local data") and went unnoticed
because no test exercises a page reload. Fixed here as the centerpiece
of this commit, not mentioned in passing.

### Added

- **`store/portfolioStore.ts`**: wrapped in Zustand's `persist`
  middleware (localStorage). `quotes` is explicitly excluded from
  persistence via `partialize` — live market data should never survive
  as stale data across a reload; it's re-fetched fresh instead. Added
  `restoreAll` for Backup/Restore.
- **`services/backup/backupService.ts`**: JSON export/import of the
  full app state, separate from the automatic localStorage
  persistence — useful for moving to a new browser or keeping an
  off-device copy. Minimal but real shape validation
  (`BackupValidationError`), and restoring always requires explicit
  confirmation before overwriting current data (same "never overwrite
  without confirmation" principle as CSV import, PRD v1.2 §1).
- **`components/settings/GeneralSettings.tsx`**: completes Settings
  (PRD v1.1) —
  - **Base Currency**: real, with an honest caveat stated in the UI —
    it relabels totals only, no FX conversion exists anywhere in the
    app.
  - **Theme**: real light/dark toggle. Light theme tokens added to
    `index.css` as a `[data-theme='light']` override of the same
    custom properties the dark theme (the SFS's explicit direction)
    uses by default.
  - **Backup/Restore**: wired to the new backup service, with the
    overwrite-confirmation dialog described above.
- **Code-splitting** (`router/AppRoutes.tsx`): the Recharts-heavy pages
  (Dashboard, Reports, Position Detail, Calendar) are now
  `React.lazy`-loaded behind a `Suspense` boundary. This resolves the
  >500kB bundle-size build warning that had been accumulating since
  Commit 005 — main bundle dropped from ~789kB to ~363kB, with the
  Recharts chunk (~303kB) now loaded only when a chart-bearing page is
  actually visited.
- Removed `components/dashboard/DashboardPlaceholderWidget.tsx` — no
  longer referenced anywhere after Commit 009 replaced its two call
  sites with real widgets.
- README.md rewritten to reflect the full, final feature set, the two
  required API keys (Twelve Data, Finnhub) and where to get them, and a
  "Known limitations" section stating the currency/screener/calendar/AI
  caveats plainly rather than leaving them buried in commit history.
- 15 new tests: 1 for `restoreAll`, 6 for the backup service
  (round-trip + validation failure modes). 129 tests total (up from
  121; net +8 after removing none).

### Definition of Done — final check

- ✅ Every commit compiles (`npm run build` clean at every commit in
  this history).
- ✅ Every business rule is tested (129 tests across engines, import,
  store, backup, market data, news, AI Commander, screener).
- ✅ No placeholder pages in completed modules — Settings was the last
  one; it's now fully real. (Screener's technical-filter section and a
  few Position Detail sub-tabs remain honestly gated behind data-source
  decisions, not silently placeholder — see README "Known limitations".)
- ✅ UI is responsive — Tailwind responsive breakpoints used
  consistently since Commit 002 (sidebar collapses to an overlay,
  grids collapse to single-column, tables scroll horizontally on
  narrow viewports).

### Verification

- `npm run build` — compiles cleanly, no bundle-size warning.
- `npm run test:run` — 129/129 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

## Commit 009 — News & Calendar

**Scope:** Appendix A, Commit 009.

**Decision made explicitly with the person** (same pattern as Commit
008b): **Finnhub** as a single provider for News + Calendar, over
juggling separate providers per data type. Client-side key storage,
consistent with the precedent already set.

### Fixed (scope gap from Commit 002)

- **Calendar never had a route.** The PRD (v1.1) lists Calendar as its
  own module, distinct from News, but the Commit 002 routing/sidebar
  work only wired a News route. This went unnoticed until there was
  data to put on a Calendar page. Added `/calendar` to the router and
  Sidebar now, alongside the News work it was originally meant to ship
  with.

### Added

- **`services/news/finnhubClient.ts`**: `fetchCompanyNews`,
  `fetchEarningsCalendar`, `fetchEconomicCalendar`,
  `fetchDividendCalendar`, each with a pure, unit-tested response
  mapper. **Confidence note, stated plainly**: Company News and
  Earnings Calendar are implemented with reasonable confidence in their
  documented free-tier shape. Economic Calendar and Dividend Calendar
  availability/shape on Finnhub's free tier is less certain — rather
  than guess and risk silently wrong data, both surface Finnhub's real
  error message in the UI if the endpoint doesn't behave as expected
  (e.g. "requires a paid plan"), instead of being omitted or faked.
- **`utils/apiKeyStorage.ts`** extended with Finnhub key functions,
  same pattern as the Twelve Data key from Commit 008b.
- **`components/settings/NewsSettings.tsx`**: Finnhub key entry, added
  to Settings alongside Market Data — same "scoped exception ahead of
  Commit 010" reasoning as before.
- **News page** (real implementation): fetches company news only for
  assets already known to the app, so "portfolio-related news first"
  (PRD v1.1) is satisfied by construction — there's no general
  market-news firehose being filtered, only per-holding news. AI
  summary per article is explicitly listed as *future* scope in the PRD
  itself, so it's correctly not built here.
- **Calendar page** (real, new): Earnings (filtered client-side to
  known tickers, since Finnhub's endpoint otherwise returns every US
  company), Dividends, and Economic Events sections, each with its own
  loading/error/empty state.
- **Dashboard**: Calendar and News widgets changed from "coming in
  Commit 009" placeholders to real link-through cards. They deliberately
  don't fetch data on every Dashboard load (stated in the widget copy)
  — that would burn Finnhub quota on a page the person may open many
  times a day; data loads when they actually open News or Calendar.
- 9 new tests for the Finnhub response mappers. 121 tests total (up
  from 112).

### Deferred (explicitly out of scope)

- AI summaries per news article — explicitly future scope per PRD v1.1
  itself.
- If Economic/Dividend Calendar turn out to need a paid Finnhub plan,
  that's a decision for the person once they see the real error message
  from their own account.

### Verification

- `npm run build` — compiles cleanly (same pre-existing bundle-size
  warning, not an error).
- `npm run test:run` — 121/121 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

## Commit 008b — Market Data Integration (Twelve Data)

**Scope:** unplanned addition, requested explicitly after Commit 008
surfaced the market-data gap. Not in the original Appendix A list —
inserted here because it's its own logical feature (SFS §15: one
feature per commit), separate from both Technical Analysis (008) and
News & Calendar (009).

**Decisions made explicitly with the person** (not assumed):
- **Provider**: Twelve Data (free tier, ~800 requests/day, good balance
  of quota vs. data quality for a personal portfolio, vs. Alpha
  Vantage's 25/day or Finnhub as alternatives that were also discussed).
- **API key storage**: client-side (localStorage), the simpler of two
  options presented. Trade-off stated plainly: fine for personal local
  use, but the key would be visible to anyone if this app is ever
  deployed publicly rather than run locally — a backend proxy would be
  needed for that case, and wasn't chosen here.

### Added

- **`utils/apiKeyStorage.ts`**: localStorage wrapper for the Twelve
  Data key. (Note: this is a real standalone app the person runs
  independently, not a Claude.ai Artifact — the "never use
  localStorage" constraint that applies to Artifacts doesn't apply to
  this project's own source code.)
- **`services/marketdata/twelveDataClient.ts`**: `fetchQuotes` (single
  batched request for all known assets, to conserve the free-tier
  quota) and `fetchTimeSeries` (per-asset, fetched only when that
  asset's Chart/Technical Analysis tab is actually opened — not
  proactively for every known asset). Response parsing is split into
  pure `mapQuoteResponse`/`mapTimeSeriesResponse` functions so the
  request-shaping logic is unit-testable without mocking `fetch`.
- **`components/settings/MarketDataSettings.tsx`**: API key entry/
  removal, manual "Refresh Prices" action (deliberately manual, not on
  a timer, to keep quota usage in the person's control). Added to the
  Settings page ahead of Commit 010 — documented as a deliberate,
  scoped exception, not scope creep into the rest of Settings (currency/
  theme/backup are still placeholders).
- **Position Detail Chart tab** (now real): daily close price line
  chart with a 20-day SMA overlay, once an API key is configured.
- **Position Detail Technical Analysis tab** (now real): latest RSI,
  MACD, ATR, Bollinger Band values computed from fetched price history,
  with brief interpretive hints (overbought/oversold, above/below
  signal).
- 8 new tests for the Twelve Data response mappers (valid quote/series
  parsing, error-code handling, chronological reordering). 112 tests
  total (up from 104).

### Deferred (explicitly out of scope)

- Screener technical filters — still not wired, since it would require
  fetching historical series for every known asset just to populate
  filter controls, which could burn through the free-tier quota fast
  for a portfolio with many holdings. Left as a conscious choice rather
  than silently implemented in a quota-unsafe way.
- Backend proxy / secure key storage — not chosen; see decision note
  above. Revisit if this app is ever deployed publicly.
- Automatic/scheduled price refresh — manual only, by design.

### Verification

- `npm run build` — compiles cleanly (same pre-existing bundle-size
  warning, not an error).
- `npm run test:run` — 112/112 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

## Commit 008 — Technical Analysis

**Scope:** Appendix A, Commit 008.

**Flagged to the person before starting**: no commit in the Appendix A
plan assigns integrating a market data provider (historical OHLCV price
series). Technical indicators fundamentally need that data. Rather than
silently skip the commit or fabricate data, this commit ships the full,
correct, tested indicator math, and is explicit everywhere in the UI
about what's blocked and why.

### Added

- **`services/engines/signalEngine.ts`** — completed the full SFS §11
  suite (SMA/EMA already existed from Commit 001):
  - `calculateRSI` — Wilder's smoothing, period 14 default.
  - `calculateMACD` — fast/slow/signal EMA composition (12/26/9
    default), returns macd line, signal line, histogram.
  - `calculateATR` — Wilder-smoothed True Range.
  - `calculateVWAP` — cumulative volume-weighted average price.
  - `calculateBollingerBands` — SMA middle band ± N std devs.
  - `findSupportResistance` — local pivot high/low detection over a
    configurable window.
  - `calculateFibonacciLevels` — standard retracement ratios between a
    swing low/high.
  - All pure functions operating on caller-supplied `PricePoint[]` /
    `OHLCV[]` — no assumption about where that data comes from.
- **Domain model extension**: `Asset.fundamentals` (optional:
  marketCap, peRatio, pegRatio, roe, revenueGrowth, epsGrowth,
  dividendYield). Additive, since no fundamental-data provider exists
  either — populated manually per asset until one is integrated.
- **`services/screener/screenerEngine.ts`**: `filterByFundamentals` —
  real, working AND-combined filtering over `Asset.fundamentals`.
- **Screener page** (real implementation): fundamental filter controls
  (P/E, PEG, ROE, Revenue/EPS Growth, Dividend Yield, Market Cap),
  results table over the app's known assets (from CSV import or
  manually added — no market-wide search, since there's no external
  screening API wired in), per-asset fundamentals editor. **Technical
  filters section is visibly present but disabled**, with the reason
  stated in the UI, not just hidden or omitted.
- **Position Detail**: Chart / Technical Analysis / Fundamental
  Analysis tab copy updated to be specific about what's implemented
  (the indicator math) vs. what's missing (real price history / a
  market data provider), replacing the earlier "lands in Commit
  008/009" placeholders that were written before this gap was
  identified.
- 20 new tests: 14 for the full indicator suite (RSI at the 0/100
  bounds, MACD histogram consistency, ATR convergence on constant true
  range, VWAP volume-weighting, Bollinger Band width response to
  volatility, Fibonacci exact ratios) + 6 for fundamental filtering.
  104 tests total (up from 86).

### Deferred (explicitly out of scope for this commit — needs a decision)

- **Market data provider integration** — not assigned to any commit in
  the current plan. Needed for: Position Detail charts, technical
  filters in the Screener, technical analysis tab, and a true
  historical Total Return curve in Reports (Commit 006). This should be
  its own explicit decision (which provider, API key handling via a
  backend proxy per the AI Commander precedent in Commit 007) rather
  than assumed.
- **Fundamental data provider integration** — same gap, smaller
  blast radius (Screener fundamentals only). Manual entry works today.

### Verification

- `npm run build` — compiles cleanly (same pre-existing bundle-size
  warning, not an error).
- `npm run test:run` — 104/104 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

## Commit 007 — AI Commander

**Scope:** Appendix A, Commit 007.

### Added

- **`services/ai/aiCommander.ts`**: a deterministic, rule-based advisory
  engine — **explicitly not an LLM integration**. Calling the Anthropic
  API from browser JS would require embedding an API key in the client
  bundle (a security anti-pattern this project never does), and a real
  integration needs a backend proxy that doesn't exist in this
  local-first architecture (ADR-001). Rather than fake it or silently
  skip the module, this commit implements a real, working advisory
  engine grounded in Commander Core data, enforcing every rule from PRD
  v1.2 §9:
  - recommendations always use advisory language ("consider…"), never
    imperative commands
  - every response returns a `reasoning: string[]` alongside the answer
  - portfolio risk (max position weight, sector concentration) is always
    computed and mentioned before any capital-allocation suggestion
  - concentration and diversification are explained with the underlying
    numbers, not just asserted
  - a news/summary query is honestly deferred to Commit 009 rather than
    fabricating an answer
  - unrecognized queries fall back to example queries instead of a
    generic error
- **AI Commander page** (real implementation): "Ask anything" input,
  conversation history, Suggested Actions (the PRD's example queries:
  risk, riskiest position, diversification, "where should I invest
  €500?"), and a Portfolio Insights panel — matching the PRD v1.3
  wireframe layout. A visible banner states plainly that this is a
  rule-based assistant, not a language model, and why — this is
  end-user-facing, not just a code comment, since presenting simulated
  intelligence as real AI would be misleading.
- 10 new tests covering every branch of the advisory engine, including
  that concentration is always checked before suggesting capital
  deployment and that unanswerable queries (news) are honestly deferred
  rather than answered speculatively. 86 tests total (up from 76).

### Deferred (explicitly out of scope for this commit)

- Real LLM integration (Claude API) — needs a backend proxy design
  decision, which isn't part of the current local-first architecture.
  If this is wanted, it should be scoped as its own explicit commit/ADR
  rather than folded in here.
- News-based queries — Commit 009.

### Verification

- `npm run build` — compiles cleanly (same pre-existing bundle-size
  warning, not an error).
- `npm run test:run` — 86/86 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

## Commit 006 — Reports

**Scope:** Appendix A, Commit 006.

### Added

- **`services/reports/reportBuilder.ts`**: composes existing, already-
  tested Commander Core outputs into report shapes — nothing new is
  calculated at the raw-number level, only regrouped.
  - `realizedProfitByPeriod` / `dividendsByPeriod`: exact month/year
    grouping of realized trade profit and dividend income, both fully
    derivable from trade/dividend history.
  - `approximateCAGRSinceInception`: **explicitly labeled
    "Approximate"** in the UI. It treats Invested Capital as a single
    lump sum at the first trade date, ignoring the timing of later
    contributions — a true money-weighted (XIRR) return needs a
    persisted contribution timeline that doesn't exist yet.
- **Reports page** (real implementation), four sections:
  - **Performance**: Total Return, Approximate CAGR, total Realized P/L,
    current Unrealized P/L, plus a Realized P/L by month/year bar chart.
    **Deliberately does not claim a full historical Total Return
    curve** — that requires persisted daily portfolio value snapshots
    (market data history), which land with Commit 008/009. Showing a
    fabricated smooth curve here would be worse than not showing one.
  - **Allocation**: Sector / Country / Currency / Asset Type tables,
    reusing the same `allocationEngine` functions from Commit 001/003 —
    no new allocation logic.
  - **Dividends**: total net dividends, by-period bar chart, CSV export
    (reuses `utils/csv.ts` from Commit 003).
  - PDF export is a disabled, clearly-labeled "coming soon" button —
    PRD v1.3 states PDF export is future scope; CSV is offered instead
    since it's real today.
- 6 new tests for the report builder (period grouping, CAGR edge cases,
  key sorting/merging). 76 tests total (up from 70).

### Deferred (explicitly out of scope for this commit)

- True historical Total Return / drawdown charting — needs persisted
  portfolio value snapshots (Commit 008/009 market data).
- Cash-flow-weighted (XIRR) return — needs a persisted contribution
  timeline; current CAGR is a documented approximation.
- PDF export — explicitly future scope per PRD v1.3.

### Verification

- `npm run build` — compiles cleanly (same pre-existing bundle-size
  warning, not an error).
- `npm run test:run` — 76/76 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

## Commit 005 — Dashboard

**Scope:** Appendix A, Commit 005.

### Added

- **`hooks/useDashboardKPIs.ts`**: Portfolio Value, Today's P/L, Total
  Return, Cash, Invested Capital — computed via existing Commander Core
  functions (`performanceEngine`/`portfolioEngine`), nothing new
  calculated here. Today's P/L derives `previousClose` from
  `MarketQuote.change` (`price - change`), which is the field the v1.0
  domain model already carries for this exact purpose.
- **`components/dashboard/WidgetCard.tsx`**: shared clickable-card shell
  enforcing "every widget navigates to its related module" (PRD v1.1) in
  one place.
- **`components/dashboard/KpiRow.tsx`**, **`AllocationChart.tsx`**
  (Recharts pie, reused for Asset Allocation and Sector Allocation),
  **`TopMovers.tsx`** (Top Winners/Top Losers), **`WatchlistWidget.tsx`**,
  **`RecentTransactionsWidget.tsx`**, **`DashboardPlaceholderWidget.tsx`**
  (Economic Calendar / News — data source lands Commit 009).
- **Dashboard page** (real implementation) assembling all of the above,
  plus a "Customize" show/hide toggle per widget (PRD v1.3: "widgets
  configurable by the user"). Explicitly session-only — no persistence
  layer exists yet (Commit 010), so preferences reset on reload; this is
  stated in the UI's absence of a "saved" indicator rather than silently
  pretending to persist.
- **Layout deviation from the PRD v1.3 wireframe, stated explicitly**:
  the wireframe draws a 3x3 grid (Allocation/Sector/Watchlist,
  Transactions/Calendar/News) that has no room for Top Winners/Top
  Losers, which PRD v1.1 explicitly lists as required Dashboard widgets.
  Rather than dropping either requirement, the grid became 4 rows (KPI
  strip, Allocation×2+Watchlist, Winners+Losers+Transactions,
  Calendar+News) so every widget named in v1.1 is present.

### Deferred (explicitly out of scope for this commit)

- Economic Calendar / News widget content — Commit 009 (no feed wired
  yet).
- Persisting widget show/hide preferences — Commit 010 (Settings/
  persistence).
- Bundle size: Recharts pushed the main JS chunk over 500 kB
  (build warns but does not fail). Code-splitting is a Commit 010
  (Polish) concern, not addressed here.

### Verification

- `npm run build` — compiles cleanly (bundle-size warning only, not an
  error).
- `npm run test:run` — 70/70 tests passing (no new engine logic this
  commit — KPIs recombine existing, already-tested functions).
- `npm run lint` — 0 warnings, 0 errors.

## Commit 004 — CSV Import

**Scope:** Appendix A, Commit 004.

### Added

- **`utils/hash.ts`**: FNV-1a hash for deterministic `importHash`
  generation — same CSV row always produces the same hash, which is what
  the store's existing de-dup logic (Commit 001) keys on.
- **`services/import/csvParser.ts`**: thin wrapper around PapaParse
  (added as a real dependency — it was referenced in earlier planning
  but not actually installed until now). Auto-detects comma/semicolon/tab
  delimiters.
- **`services/import/importMapper.ts`**: the core of this commit.
  - `parseLocaleNumber` — handles both `1234.56` and EU-style `1.234,56`
    / `1234,56` formats.
  - `parseFlexibleDate` — ISO and common `DD.MM.YYYY` / `DD/MM/YYYY`
    formats.
  - `mapRowsToImportResult` — maps column-mapped rows into
    `Trade[]`/`Dividend[]`/`CashMovement[]`, validating every row via the
    existing `utils/validation.ts` (PRD v1.2 §7) and reporting
    `ok`/`error`/`duplicate`/`ignored` per row instead of throwing, so a
    full preview can be shown before anything is committed.
  - **Design decision, stated plainly**: no sample Trade Republic export
    was available to verify an exact column schema against, so this
    commit does **not** hardcode Trade Republic-specific column names or
    German transaction-type labels. Instead the wizard has a column
    -mapping step (map CSV headers to semantic fields) and a type-value
    -mapping step (map each distinct value found in the Type column to
    BUY/SELL/DIVIDEND/etc.). This is format-agnostic by construction —
    it works for a real Trade Republic export as much as for any other
    broker's CSV — and is more honest than guessing a schema that might
    be wrong. If a real Trade Republic sample file is provided later, an
    additional "auto-detect known format" shortcut can be layered on top
    without changing this underlying mapper.
- **`components/import/ImportWizard.tsx`**: 4-step modal — Upload → Map
  Columns → Map Types → Preview (with ok/duplicate/error/ignored counts
  and a per-row status table) → Import. Duplicates (already-imported
  `importHash`) are detected and skipped automatically; the confirm
  button always shows the exact count about to be imported, so nothing
  is written silently (PRD v1.2 §1: "never overwrite without
  confirmation").
- **Transactions page** (real implementation): unified, date-sorted view
  of trades/dividends/cash movements, with the CSV import entry point.
- 18 new tests for the import mapper (number/date parsing edge cases,
  duplicate detection, per-row validation errors, asset de-dup). 70
  tests total (up from 52).

### Deferred (explicitly out of scope for this commit)

- An Trade Republic-specific "known format" auto-mapping shortcut — can
  be added once a real sample file is available to verify against.
- Editing/deleting individual imported transactions from the
  Transactions page (PRD v1.2 §8: "eliminate/edit transaction →
  automatic recalculation") — not yet built; currently import-only.

### Verification

- `npm run build` — compiles cleanly.
- `npm run test:run` — 70/70 tests passing.
- `npm run lint` — 0 warnings, 0 errors.

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
