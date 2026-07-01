import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Portfolio,
  Asset,
  Trade,
  Dividend,
  CashMovement,
  MarketQuote,
  Watchlist,
  WatchlistItem,
  JournalEntry,
} from '../types/domain';

/**
 * Portfolio Store (ADR-003).
 *
 * Holds only raw domain entities — the transaction history and reference
 * data that the portfolio is reconstructed from. It intentionally does
 * NOT store derived values like positions, portfolio value, or risk
 * metrics: those are always computed on demand via Commander Core
 * (services/engines), per ADR-004 and ADR-005 ("Portfolio state is
 * rebuilt from transaction history"). Watchlists and Journal entries are
 * user-authored records (not derived), so they live here directly.
 *
 * PERSISTENCE (Commit 010): wrapped in Zustand's `persist` middleware,
 * writing to localStorage. This was missing from Commit 001 through 009
 * — every commit's Definition of Done checks passed because tests don't
 * exercise a page reload, but in practice the whole portfolio was lost
 * on every refresh, which directly contradicts ADR-001 ("local-first,
 * offline-capable"). Fixed here rather than carried forward silently.
 * `quotes` is deliberately excluded from persistence (see
 * `partialize` below) — it's live market data, stale the moment it's
 * saved, and should always come from a fresh Twelve Data refresh.
 */
export interface PortfolioState {
  portfolio: Portfolio | null;
  assets: Asset[];
  trades: Trade[];
  dividends: Dividend[];
  cashMovements: CashMovement[];
  quotes: MarketQuote[];
  watchlists: Watchlist[];
  watchlistItems: WatchlistItem[];
  journalEntries: JournalEntry[];

  setPortfolio: (portfolio: Portfolio) => void;
  setAssets: (assets: Asset[]) => void;
  upsertAsset: (asset: Asset) => void;
  addTrades: (trades: Trade[]) => void;
  addDividends: (dividends: Dividend[]) => void;
  addCashMovements: (movements: CashMovement[]) => void;
  setQuotes: (quotes: MarketQuote[]) => void;

  addWatchlist: (watchlist: Watchlist) => void;
  removeWatchlist: (watchlistId: string) => void;
  addWatchlistItem: (item: WatchlistItem) => void;
  removeWatchlistItem: (itemId: string) => void;
  reorderWatchlistItem: (itemId: string, direction: 'up' | 'down') => void;
  toggleWatchlistItemFavorite: (itemId: string) => void;
  setWatchlistItemTags: (itemId: string, tags: string[]) => void;

  addJournalEntry: (entry: JournalEntry) => void;
  updateJournalEntry: (id: string, patch: Partial<Omit<JournalEntry, 'id'>>) => void;
  removeJournalEntry: (id: string) => void;

  /** Replaces the entire persisted domain state — used by Backup/Restore. */
  restoreAll: (snapshot: PersistedSnapshot) => void;
  reset: () => void;
}

export interface PersistedSnapshot {
  portfolio: Portfolio | null;
  assets: Asset[];
  trades: Trade[];
  dividends: Dividend[];
  cashMovements: CashMovement[];
  watchlists: Watchlist[];
  watchlistItems: WatchlistItem[];
  journalEntries: JournalEntry[];
}

const initialState = {
  portfolio: null,
  assets: [],
  trades: [],
  dividends: [],
  cashMovements: [],
  quotes: [],
  watchlists: [],
  watchlistItems: [],
  journalEntries: [],
};

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      ...initialState,

      setPortfolio: (portfolio) => set({ portfolio }),

      setAssets: (assets) => set({ assets }),

      upsertAsset: (asset) =>
        set((state) => {
          const exists = state.assets.some((a) => a.id === asset.id);
          return {
            assets: exists
              ? state.assets.map((a) => (a.id === asset.id ? asset : a))
              : [...state.assets, asset],
          };
        }),

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

      addWatchlist: (watchlist) =>
        set((state) => ({ watchlists: [...state.watchlists, watchlist] })),

      removeWatchlist: (watchlistId) =>
        set((state) => ({
          watchlists: state.watchlists.filter((w) => w.id !== watchlistId),
          watchlistItems: state.watchlistItems.filter(
            (i) => i.watchlistId !== watchlistId,
          ),
        })),

      addWatchlistItem: (item) =>
        set((state) => ({ watchlistItems: [...state.watchlistItems, item] })),

      removeWatchlistItem: (itemId) =>
        set((state) => ({
          watchlistItems: state.watchlistItems.filter((i) => i.id !== itemId),
        })),

      reorderWatchlistItem: (itemId, direction) =>
        set((state) => {
          const item = state.watchlistItems.find((i) => i.id === itemId);
          if (!item) return state;
          const siblings = state.watchlistItems
            .filter((i) => i.watchlistId === item.watchlistId)
            .sort((a, b) => a.order - b.order);
          const index = siblings.findIndex((i) => i.id === itemId);
          const swapIndex = direction === 'up' ? index - 1 : index + 1;
          if (swapIndex < 0 || swapIndex >= siblings.length) return state;

          const a = siblings[index];
          const b = siblings[swapIndex];
          const updated = state.watchlistItems.map((i) => {
            if (i.id === a.id) return { ...i, order: b.order };
            if (i.id === b.id) return { ...i, order: a.order };
            return i;
          });
          return { watchlistItems: updated };
        }),

      toggleWatchlistItemFavorite: (itemId) =>
        set((state) => ({
          watchlistItems: state.watchlistItems.map((i) =>
            i.id === itemId ? { ...i, isFavorite: !i.isFavorite } : i,
          ),
        })),

      setWatchlistItemTags: (itemId, tags) =>
        set((state) => ({
          watchlistItems: state.watchlistItems.map((i) =>
            i.id === itemId ? { ...i, tags } : i,
          ),
        })),

      addJournalEntry: (entry) =>
        set((state) => ({ journalEntries: [...state.journalEntries, entry] })),

      updateJournalEntry: (id, patch) =>
        set((state) => ({
          journalEntries: state.journalEntries.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        })),

      removeJournalEntry: (id) =>
        set((state) => ({
          journalEntries: state.journalEntries.filter((e) => e.id !== id),
        })),

      restoreAll: (snapshot) =>
        set({
          ...snapshot,
          quotes: [], // never restored from backup — always re-fetched live
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'portfolio-commander-store',
      storage: createJSONStorage(() => localStorage),
      // `quotes` is live market data, not user data — excluded from
      // persistence so a stale price never survives a reload.
      partialize: (state) => {
        const { quotes: _quotes, ...persisted } = state;
        return persisted;
      },
    },
  ),
);

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
