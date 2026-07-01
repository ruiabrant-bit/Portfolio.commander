import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../store/portfolioStore';
import type { Trade } from '../types/domain';

function makeTrade(id: string, importHash?: string): Trade {
  return {
    id,
    portfolioId: 'p1',
    assetId: 'AAPL',
    type: 'BUY',
    quantity: 1,
    price: 100,
    fees: 0,
    taxes: 0,
    date: '2024-01-01',
    importHash,
  };
}

describe('portfolioStore', () => {
  beforeEach(() => {
    usePortfolioStore.getState().reset();
  });

  it('deduplicates trades by importHash on addTrades (PRD v1.2 §1)', () => {
    const { addTrades } = usePortfolioStore.getState();
    addTrades([makeTrade('t1', 'hash-1'), makeTrade('t2', 'hash-2')]);
    addTrades([makeTrade('t3', 'hash-1'), makeTrade('t4', 'hash-3')]); // hash-1 is a dup

    const trades = usePortfolioStore.getState().trades;
    expect(trades).toHaveLength(3);
    expect(trades.map((t) => t.importHash)).toEqual(['hash-1', 'hash-2', 'hash-3']);
  });

  it('keeps trades without an importHash (manual entries never deduped away)', () => {
    const { addTrades } = usePortfolioStore.getState();
    addTrades([makeTrade('t1'), makeTrade('t2')]);
    expect(usePortfolioStore.getState().trades).toHaveLength(2);
  });

  it('reorders watchlist items only within the same watchlist', () => {
    const { addWatchlist, addWatchlistItem, reorderWatchlistItem } =
      usePortfolioStore.getState();
    addWatchlist({ id: 'w1', name: 'Tech' });
    addWatchlistItem({ id: 'i1', watchlistId: 'w1', assetId: 'AAPL', order: 0, tags: [], isFavorite: false });
    addWatchlistItem({ id: 'i2', watchlistId: 'w1', assetId: 'MSFT', order: 1, tags: [], isFavorite: false });

    reorderWatchlistItem('i2', 'up');

    const items = usePortfolioStore
      .getState()
      .watchlistItems.filter((i) => i.watchlistId === 'w1')
      .sort((a, b) => a.order - b.order);
    expect(items[0].assetId).toBe('MSFT');
    expect(items[1].assetId).toBe('AAPL');
  });

  it('does nothing when reordering past the first or last item', () => {
    const { addWatchlist, addWatchlistItem, reorderWatchlistItem } =
      usePortfolioStore.getState();
    addWatchlist({ id: 'w1', name: 'Tech' });
    addWatchlistItem({ id: 'i1', watchlistId: 'w1', assetId: 'AAPL', order: 0, tags: [], isFavorite: false });

    reorderWatchlistItem('i1', 'up');
    const items = usePortfolioStore.getState().watchlistItems;
    expect(items[0].order).toBe(0);
  });

  it('toggles watchlist item favorite flag', () => {
    const { addWatchlist, addWatchlistItem, toggleWatchlistItemFavorite } =
      usePortfolioStore.getState();
    addWatchlist({ id: 'w1', name: 'Tech' });
    addWatchlistItem({ id: 'i1', watchlistId: 'w1', assetId: 'AAPL', order: 0, tags: [], isFavorite: false });

    toggleWatchlistItemFavorite('i1');
    expect(usePortfolioStore.getState().watchlistItems[0].isFavorite).toBe(true);
    toggleWatchlistItemFavorite('i1');
    expect(usePortfolioStore.getState().watchlistItems[0].isFavorite).toBe(false);
  });

  it('removing a watchlist also removes its items', () => {
    const { addWatchlist, addWatchlistItem, removeWatchlist } = usePortfolioStore.getState();
    addWatchlist({ id: 'w1', name: 'Tech' });
    addWatchlistItem({ id: 'i1', watchlistId: 'w1', assetId: 'AAPL', order: 0, tags: [], isFavorite: false });

    removeWatchlist('w1');
    const state = usePortfolioStore.getState();
    expect(state.watchlists).toHaveLength(0);
    expect(state.watchlistItems).toHaveLength(0);
  });

  it('adds and updates journal entries', () => {
    const { addJournalEntry, updateJournalEntry } = usePortfolioStore.getState();
    addJournalEntry({
      id: 'j1',
      assetId: 'AAPL',
      title: 'Thesis',
      notes: 'Strong ecosystem moat.',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    updateJournalEntry('j1', { notes: 'Updated thesis.' });

    const entry = usePortfolioStore.getState().journalEntries[0];
    expect(entry.notes).toBe('Updated thesis.');
    expect(entry.title).toBe('Thesis'); // untouched fields preserved
  });
});
