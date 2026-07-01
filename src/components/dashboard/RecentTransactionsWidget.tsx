import { useMemo } from 'react';
import { WidgetCard } from './WidgetCard';
import { usePortfolioStore } from '../../store/portfolioStore';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Recent Transactions widget (PRD v1.1/v1.3 Dashboard). */
export function RecentTransactionsWidget() {
  const trades = usePortfolioStore((s) => s.trades);
  const assets = usePortfolioStore((s) => s.assets);

  const recent = useMemo(
    () =>
      [...trades]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [trades],
  );

  return (
    <WidgetCard title="Recent Transactions" to="/transactions">
      {recent.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No transactions yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((t) => {
            const ticker = assets.find((a) => a.id === t.assetId)?.ticker ?? t.assetId;
            return (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className={t.type === 'BUY' ? 'text-positive' : 'text-negative'}>
                    {t.type}
                  </span>{' '}
                  <span className="font-medium">{ticker}</span>
                </span>
                <span className="font-data text-text-muted">
                  {fmt(t.quantity)} @ {fmt(t.price)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
