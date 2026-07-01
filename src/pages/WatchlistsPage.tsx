import { useMemo, useState } from 'react';
import { Star, Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';

/**
 * Watchlists (PRD v1.1): multiple watchlists, custom tags, manual
 * ordering and favorites. Price alerts are explicitly future scope per
 * the PRD and are not implemented here.
 */
export function WatchlistsPage() {
  const watchlists = usePortfolioStore((s) => s.watchlists);
  const watchlistItems = usePortfolioStore((s) => s.watchlistItems);
  const assets = usePortfolioStore((s) => s.assets);

  const addWatchlist = usePortfolioStore((s) => s.addWatchlist);
  const removeWatchlist = usePortfolioStore((s) => s.removeWatchlist);
  const addWatchlistItem = usePortfolioStore((s) => s.addWatchlistItem);
  const removeWatchlistItem = usePortfolioStore((s) => s.removeWatchlistItem);
  const reorderWatchlistItem = usePortfolioStore((s) => s.reorderWatchlistItem);
  const toggleFavorite = usePortfolioStore((s) => s.toggleWatchlistItemFavorite);
  const setTags = usePortfolioStore((s) => s.setWatchlistItemTags);
  const upsertAsset = usePortfolioStore((s) => s.upsertAsset);

  const [activeId, setActiveId] = useState<string | null>(watchlists[0]?.id ?? null);
  const [newListName, setNewListName] = useState('');
  const [newTicker, setNewTicker] = useState('');

  const activeWatchlist = watchlists.find((w) => w.id === activeId) ?? watchlists[0] ?? null;

  const items = useMemo(
    () =>
      watchlistItems
        .filter((i) => i.watchlistId === activeWatchlist?.id)
        .sort((a, b) => a.order - b.order),
    [watchlistItems, activeWatchlist],
  );

  function handleCreateList() {
    const name = newListName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    addWatchlist({ id, name });
    setActiveId(id);
    setNewListName('');
  }

  function handleAddTicker() {
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker || !activeWatchlist) return;

    const existingAsset = assets.find((a) => a.ticker === ticker);
    const assetId = existingAsset?.id ?? ticker;
    if (!existingAsset) {
      upsertAsset({
        id: assetId,
        ticker,
        isin: null,
        name: ticker,
        assetType: 'STOCK',
        exchange: null,
        sector: null,
        industry: null,
        currency: 'EUR',
      });
    }

    const siblingCount = watchlistItems.filter(
      (i) => i.watchlistId === activeWatchlist.id,
    ).length;

    addWatchlistItem({
      id: crypto.randomUUID(),
      watchlistId: activeWatchlist.id,
      assetId,
      order: siblingCount,
      tags: [],
      isFavorite: false,
    });
    setNewTicker('');
  }

  return (
    <div className="flex h-full">
      {/* Watchlist selector */}
      <aside className="w-52 shrink-0 border-r border-border p-3">
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-text-muted">
          Watchlists
        </h2>
        <ul className="mb-3 space-y-0.5">
          {watchlists.map((w) => (
            <li key={w.id} className="group flex items-center">
              <button
                onClick={() => setActiveId(w.id)}
                className={`flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm ${
                  activeWatchlist?.id === w.id
                    ? 'bg-surface-raised text-text'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text'
                }`}
              >
                {w.name}
              </button>
              <button
                onClick={() => {
                  removeWatchlist(w.id);
                  if (activeId === w.id) setActiveId(null);
                }}
                aria-label={`Delete ${w.name}`}
                className="hidden px-1 text-text-faint hover:text-negative group-hover:block"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            placeholder="New watchlist…"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleCreateList}
            className="rounded-md border border-border p-1 text-text-muted hover:bg-surface-hover"
            aria-label="Create watchlist"
          >
            <Plus size={14} />
          </button>
        </div>
      </aside>

      {/* Active watchlist */}
      <div className="flex-1 p-4 lg:p-6">
        {!activeWatchlist ? (
          <p className="py-16 text-center text-sm text-text-muted">
            Create a watchlist to get started.
          </p>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <h1 className="mr-auto text-xl font-semibold tracking-tight">
                {activeWatchlist.name}
              </h1>
              <input
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
                placeholder="Add ticker (e.g. TSLA)"
                className="w-40 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
              <button
                onClick={handleAddTicker}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
              >
                Add
              </button>
            </div>

            {items.length === 0 ? (
              <p className="py-16 text-center text-sm text-text-muted">
                No tickers in this watchlist yet.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {items.map((item, index) => {
                  const asset = assets.find((a) => a.id === item.assetId);
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        aria-label="Toggle favorite"
                        className={item.isFavorite ? 'text-yellow-400' : 'text-text-faint'}
                      >
                        <Star size={15} fill={item.isFavorite ? 'currentColor' : 'none'} />
                      </button>

                      <span className="w-16 shrink-0 font-medium">
                        {asset?.ticker ?? item.assetId}
                      </span>
                      <span className="flex-1 truncate text-sm text-text-muted">
                        {asset?.name ?? '—'}
                      </span>

                      <input
                        value={item.tags.join(', ')}
                        onChange={(e) =>
                          setTags(
                            item.id,
                            e.target.value
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean),
                          )
                        }
                        placeholder="tags…"
                        className="w-32 rounded-md border border-border bg-surface px-2 py-1 text-xs placeholder:text-text-faint focus:border-accent focus:outline-none"
                      />

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => reorderWatchlistItem(item.id, 'up')}
                          disabled={index === 0}
                          className="text-text-faint hover:text-text disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          onClick={() => reorderWatchlistItem(item.id, 'down')}
                          disabled={index === items.length - 1}
                          className="text-text-faint hover:text-text disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown size={15} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeWatchlistItem(item.id)}
                        aria-label="Remove from watchlist"
                        className="text-text-faint hover:text-negative"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
