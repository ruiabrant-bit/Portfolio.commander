import { useMemo } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { rebuildPortfolio } from '../services/engines/portfolioEngine';
import type { PortfolioSnapshot } from '../types/domain';

/**
 * Derives the current portfolio state (positions, cash, value, invested
 * capital, realized profit) purely from raw transaction history held in
 * the store, by delegating to Commander Core (ADR-004/ADR-005).
 *
 * Components should use this hook instead of calling engines directly, so
 * calculations stay in one place and are memoized against store changes.
 */
export function usePortfolioSnapshot() {
  const portfolio = usePortfolioStore((s) => s.portfolio);
  const assets = usePortfolioStore((s) => s.assets);
  const trades = usePortfolioStore((s) => s.trades);
  const dividends = usePortfolioStore((s) => s.dividends);
  const cashMovements = usePortfolioStore((s) => s.cashMovements);
  const quotes = usePortfolioStore((s) => s.quotes);

  return useMemo(() => {
    if (!portfolio) return null;

    const snapshot: PortfolioSnapshot = {
      portfolio,
      trades,
      dividends,
      cashMovements,
      assets,
      quotes,
    };

    return rebuildPortfolio(snapshot);
  }, [portfolio, assets, trades, dividends, cashMovements, quotes]);
}
