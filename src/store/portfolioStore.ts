import { create } from 'zustand';
import type {
  Portfolio,
  Asset,
  Trade,
  Dividend,
  CashMovement,
  MarketQuote,
} from '../types/domain';

/**
 * Portfolio Store (ADR-003).
 *
 * Holds only raw domain entities — the transaction history and reference
 * data that the portfolio is reconstructed from. It intentionally does
 * NOT store derived values like positions, portfolio value, or risk
 * metrics: those are always computed on demand via Commander Core
 * (services/engines), per ADR-004 and ADR-005 ("Portfolio state is
 * rebuilt from transaction history").
 */
export interface PortfolioState {
  portfolio: Portfolio | null;
  assets: Asset[];
  trades: Trade[];
  dividends: Dividend[];
  cashMovements: CashMovement[];
  quotes: MarketQuote[];

  setPortfolio: (portfolio: Portfolio) => void;
  setAssets: (assets: Asset[]) => void;
  addTrades: (trades: Trade[]) => void;
  addDividends: (dividends: Dividend[]) => void;
  addCashMovements: (movements: CashMovement[]) => void;
  setQuotes: (quotes: MarketQuote[]) => void;
  reset: () => void;
}

const initialState = {
  portfolio: null,
  assets: [],
  trades: [],
  dividends: [],
  cashMovements: [],
  quotes: [],
};

export const usePortfolioStore = create<PortfolioState>((set) => ({
  ...initialState,

  setPortfolio: (portfolio) => set({ portfolio }),

  setAssets: (assets) => set({ assets }),

  addTrades: (newTrades) =>
    set((state) => ({
      // Import de-duplication (PRD v1.2 §1): skip trades whose importHash
      // already exists in the store.
      trades: dedupeByImportHash(state.trades, newTrades),
    })),

  addDividends: (newDividends) =>
    set((state) => ({
      dividends: dedupeByImportHash(state.dividends, newDividends),
    })),

  addCashMovements: (newMovements) =>
    set((state) => ({
      cashMovements: dedupeByImportHash(state.cashMovements, newMovements),
    })),

  setQuotes: (quotes) => set({ quotes }),

  reset: () => set(initialState),
}));

function dedupeByImportHash<T extends { id: string; importHash?: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const knownHashes = new Set(
    existing.map((e) => e.importHash).filter((h): h is string => !!h),
  );
  const deduped = incoming.filter(
    (item) => !item.importHash || !knownHashes.has(item.importHash),
  );
  return [...existing, ...deduped];
}
