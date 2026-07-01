import { useEffect } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { usePortfolioSnapshot } from '../hooks/usePortfolioSnapshot';

const ENGINES = [
  'Portfolio Engine',
  'Performance Engine',
  'Risk Engine',
  'Allocation Engine',
  'Statistics Engine',
  'Dividend Engine',
  'Signal Engine',
] as const;

/**
 * Commit 002 scope: this is still a verification screen, not the real
 * Dashboard wireframe (KPI row / Allocation+Watchlist row / Transactions
 * +Calendar+News row). Full Dashboard widgets land in Commit 005 per
 * Appendix A. What's real here: routing, layout shell, and the
 * store <-> Commander Core wiring inherited from Commit 001.
 */
export function DashboardPage() {
  const portfolio = usePortfolioStore((s) => s.portfolio);
  const initPortfolio = usePortfolioStore((s) => s.setPortfolio);
  const snapshot = usePortfolioSnapshot();

  useEffect(() => {
    if (!portfolio) {
      initPortfolio({
        id: 'default',
        name: 'Main Portfolio',
        baseCurrency: 'EUR',
        cashBalance: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }, [portfolio, initPortfolio]);

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          Commander Core online · KPI widgets arrive in Commit 005
        </p>
      </div>

      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-medium text-text-muted">Engines</h2>
        <ul className="space-y-2">
          {ENGINES.map((engine) => (
            <li key={engine} className="flex items-center justify-between text-sm">
              <span>{engine}</span>
              <span className="flex items-center gap-1.5 text-positive">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                ready
              </span>
            </li>
          ))}
        </ul>
      </div>

      {snapshot && (
        <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 text-sm">
          <h2 className="mb-3 text-sm font-medium text-text-muted">
            Sample Portfolio Snapshot
          </h2>
          <dl className="font-data space-y-1.5">
            <div className="flex justify-between">
              <dt className="font-sans text-text-muted">Positions</dt>
              <dd>{snapshot.positions.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-sans text-text-muted">Cash</dt>
              <dd>{snapshot.cash.toFixed(2)} EUR</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-sans text-text-muted">Portfolio Value</dt>
              <dd>{snapshot.portfolioValue.toFixed(2)} EUR</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
