import { useEffect } from 'react';
import { usePortfolioStore } from './store/portfolioStore';
import { usePortfolioSnapshot } from './hooks/usePortfolioSnapshot';

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
 * Commit 001 scope: project bootstrap + Commander Core only.
 * This screen exists to verify the store <-> engines wiring end to end.
 * Full Layout + Navigation (sidebar, top bar, routed pages) lands in
 * Commit 002 per SFS Appendix A.
 */
function App() {
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0b0e14] p-8 text-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Portfolio Commander</h1>
        <p className="mt-1 text-sm text-gray-400">
          Bootstrap — Commander Core online
        </p>
      </div>

      <div className="w-full max-w-md rounded-lg border border-gray-800 bg-[#12141c] p-5">
        <h2 className="mb-3 text-sm font-medium text-gray-400">Engines</h2>
        <ul className="space-y-2">
          {ENGINES.map((engine) => (
            <li key={engine} className="flex items-center justify-between text-sm">
              <span>{engine}</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ready
              </span>
            </li>
          ))}
        </ul>
      </div>

      {snapshot && (
        <div className="w-full max-w-md rounded-lg border border-gray-800 bg-[#12141c] p-5 text-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-400">
            Sample Portfolio Snapshot
          </h2>
          <dl className="space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-gray-400">Positions</dt>
              <dd>{snapshot.positions.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Cash</dt>
              <dd>{snapshot.cash.toFixed(2)} EUR</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Portfolio Value</dt>
              <dd>{snapshot.portfolioValue.toFixed(2)} EUR</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

export default App;
