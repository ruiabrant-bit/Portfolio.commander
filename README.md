# Portfolio Commander

Professional, local-first investment management platform for a single
private investor. Trade Republic CSV import, portfolio/performance/risk
calculations, technical analysis, news & calendar, and a rule-based AI
advisory layer.

## Stack

React 19 · Vite · TypeScript (strict) · TailwindCSS v4 · React Router ·
Zustand (with `persist`) · TanStack Query · Recharts · React Hook Form ·
Zod · Axios · PapaParse · Vitest.

## Getting started

```bash
npm install
npm run dev
```

Your data (portfolio, transactions, watchlists, journal) is saved to
this browser's local storage automatically — nothing is sent to any
server. Two optional integrations need their own free API keys, added
in **Settings** once the app is running:

| Feature | Provider | Get a key |
|---|---|---|
| Market data (live quotes, price charts, technical indicators) | [Twelve Data](https://twelvedata.com) | Free tier, ~800 requests/day |
| News & Calendar (earnings, dividends, economic events) | [Finnhub](https://finnhub.io) | Free tier |

Both keys are stored in this browser only (localStorage) — see
`CHANGELOG.md` Commits 008b/009 for the trade-offs of that choice.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once (CI mode) |
| `npm run lint` | Run oxlint |

## Architecture

See `CHANGELOG.md` for the full, commit-by-commit history of
architectural decisions.

- `src/types/domain.ts` — domain model (Portfolio, Asset, Position,
  Trade, Dividend, CashMovement, Watchlist, JournalEntry, MarketQuote).
- `src/services/engines/` — **Commander Core**: Portfolio, Performance,
  Risk, Allocation, Statistics, Dividend and Signal (full technical
  indicator suite) engines. Pure functions only — no React or store
  dependencies (ADR-004). All financial calculations live here.
- `src/services/import/` — CSV import mapping (column + type mapping,
  validation, de-duplication).
- `src/services/marketdata/` — Twelve Data client (quotes, historical
  price series).
- `src/services/news/` — Finnhub client (news, earnings/dividend/
  economic calendars).
- `src/services/reports/` — Reports page composition (realized P/L and
  dividends by period, approximate CAGR).
- `src/services/screener/` — fundamental filtering for the Screener.
- `src/services/ai/` — rule-based AI Commander advisory engine (not an
  LLM — see CHANGELOG Commit 007 for why).
- `src/services/backup/` — Backup/Restore JSON serialization.
- `src/store/` — Zustand store, persisted to localStorage (Commit 010).
  Holds raw transaction history and user-authored records only; the
  portfolio is always rebuilt from trades (ADR-005). Live market quotes
  are explicitly excluded from persistence.
- `src/hooks/` — the bridge between the store and Commander Core/
  external data for React components.
- `src/utils/validation.ts` — business validation rules (PRD v1.2 §7).
- `src/tests/` — Vitest suite; one test file per engine/service.

## Known limitations (stated plainly, not hidden)

- **Base Currency** is a display label only — no FX conversion between
  currencies is performed anywhere in the app.
- **Screener technical filters** are not wired — would require bulk
  historical price fetches across every known asset, risking the
  Twelve Data free-tier quota. Fundamental filters work fully.
- **Economic/Dividend Calendar** availability on Finnhub's free tier is
  unconfirmed — the UI surfaces Finnhub's real error if either endpoint
  isn't available on your plan, rather than faking data.
- **AI Commander** is a deterministic rule-based assistant, not a
  language model — a real LLM integration would need a backend proxy to
  keep an API key secure, which this local-first architecture doesn't
  have.

## Status

**MVP complete** (SFS §17: Dashboard, Portfolio, Transactions, CSV
Import, Commander Core, Reports, Settings) through **Commit 010 —
Polish**. See `CHANGELOG.md` for the complete history and what's
explicitly deferred to future versions (cloud sync, mobile apps,
automatic broker sync, multi-portfolio, backtesting).
