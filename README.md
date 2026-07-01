# Portfolio Commander

Professional, local-first investment management platform for a single
private investor. Trade Republic CSV import, portfolio/performance/risk
calculations, and an AI-assisted decision layer (see the PRD/SFS docs for
full product scope).

## Stack

React 19 · Vite · TypeScript (strict) · TailwindCSS v4 · React Router ·
Zustand · TanStack Query · Recharts · React Hook Form · Zod · Axios ·
Vitest.

## Getting started

```bash
npm install
npm run dev
```

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

See `CHANGELOG.md` for a running log of architectural decisions.

- `src/types/domain.ts` — domain model (Portfolio, Asset, Position,
  Trade, Dividend, CashMovement, Watchlist, JournalEntry, MarketQuote).
- `src/services/engines/` — **Commander Core**: Portfolio, Performance,
  Risk, Allocation, Statistics, Dividend and Signal engines. Pure
  functions only — no React or store dependencies (ADR-004). All
  financial calculations live here and nowhere else.
- `src/store/` — Zustand store holding raw transaction history only. No
  derived values are stored; the portfolio is always rebuilt from trades
  (ADR-005).
- `src/hooks/usePortfolioSnapshot.ts` — the bridge between the store and
  Commander Core for React components.
- `src/utils/validation.ts` — business validation rules (PRD v1.2 §7).
- `src/tests/` — Vitest suite; one test file per engine plus validation.

## Status

**Commit 001 — Project Bootstrap + Commander Core.** See `CHANGELOG.md`
for what's in and what's explicitly deferred to later commits.
