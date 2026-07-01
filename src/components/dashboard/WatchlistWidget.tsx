import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { WidgetCard } from './WidgetCard';
import { usePortfolioStore } from '../../store/portfolioStore';

/** Watchlist widget (PRD v1.1 Dashboard): shows the first watchlist's items. */
export function WatchlistWidget() {
  const navigate = useNavigate();
  const watchlists = usePortfolioStore((s) => s.watchlists);
  const watchlistItems = usePortfolioStore((s) => s.watchlistItems);
  const assets = usePortfolioStore((s) => s.assets);
  const quotes = usePortfolioStore((s) => s.quotes);

  const firstList = watchlists[0];
  const items = useMemo(
    () =>
      watchlistItems
        .filter((i) => i.watchlistId === firstList?.id)
        .sort((a, b) => a.order - b.order)
        .slice(0, 5),
    [watchlistItems, firstList],
  );

  return (
    <WidgetCard title="Watchlist" to="/watchlists">
      {!firstList || items.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          No watchlist items yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const asset = assets.find((a) => a.id === item.assetId);
            const quote = quotes.find((q) => q.assetId === item.assetId);
            return (
              <li
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/portfolio/${item.assetId}`);
                }}
                className="flex items-center justify-between rounded px-1 py-1 text-sm hover:bg-surface-hover"
              >
                <span className="flex items-center gap-1.5">
                  {item.isFavorite && <Star size={12} className="fill-yellow-400 text-yellow-400" />}
                  <span className="font-medium">{asset?.ticker ?? item.assetId}</span>
                </span>
                <span className="font-data text-text-muted">
                  {quote ? quote.price.toFixed(2) : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
