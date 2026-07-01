import { useMemo } from 'react';
import { usePortfolioSnapshot } from './usePortfolioSnapshot';
import { usePortfolioStore } from '../store/portfolioStore';
import { calculateTodaysPL, calculateTotalReturn } from '../services/engines/performanceEngine';

export interface DashboardKPIs {
  portfolioValue: number;
  todaysPL: number;
  totalReturn: number;
  cash: number;
  investedCapital: number;
}

/** KPI row values (PRD v1.1 Dashboard widgets). */
export function useDashboardKPIs(): DashboardKPIs | null {
  const snapshot = usePortfolioSnapshot();
  const quotes = usePortfolioStore((s) => s.quotes);

  return useMemo(() => {
    if (!snapshot) return null;

    // MarketQuote carries `change` (absolute, vs previous close) already,
    // so previousClose = currentPrice - change.
    const previousClose = new Map(quotes.map((q) => [q.assetId, q.price - q.change]));

    return {
      portfolioValue: snapshot.portfolioValue,
      todaysPL: calculateTodaysPL(snapshot.positions, previousClose),
      totalReturn: calculateTotalReturn(snapshot.portfolioValue, snapshot.investedCapital),
      cash: snapshot.cash,
      investedCapital: snapshot.investedCapital,
    };
  }, [snapshot, quotes]);
}
