import type { Trade, Dividend } from '../../types/domain';
import { getRealizedTradeProfits } from '../engines/portfolioEngine';

export type Period = 'month' | 'year';

function periodKey(dateISO: string, period: Period): string {
  return period === 'year' ? dateISO.slice(0, 4) : dateISO.slice(0, 7); // YYYY or YYYY-MM
}

/**
 * Realized P/L grouped by month or year (PRD v1.1 Reports: "Performance
 * by month/year"). Built from the same per-trade realized profit the
 * Statistics Engine uses — nothing new is calculated, just regrouped by
 * period. This is exact, unlike a full historical Total Return series,
 * which would require persisted daily portfolio value snapshots that
 * don't exist yet.
 */
export function realizedProfitByPeriod(trades: Trade[], period: Period): Map<string, number> {
  const map = new Map<string, number>();
  for (const { date, profit } of getRealizedTradeProfits(trades)) {
    const key = periodKey(date, period);
    map.set(key, (map.get(key) ?? 0) + profit);
  }
  return map;
}

/** Net dividend income grouped by month or year (PRD v1.1 Reports: "Dividend reports"). */
export function dividendsByPeriod(dividends: Dividend[], period: Period): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of dividends) {
    const key = periodKey(d.paymentDate, period);
    map.set(key, (map.get(key) ?? 0) + d.net);
  }
  return map;
}

/**
 * Approximate CAGR since the first recorded trade. This is a
 * simplification — it treats Invested Capital as a single lump sum at
 * the first trade date, ignoring the timing of later contributions, so
 * it will differ from a true money-weighted (XIRR) return. Labeled as
 * "Approximate" everywhere it's shown; a cash-flow-weighted version
 * needs a persisted contribution timeline, out of scope here.
 */
export function approximateCAGRSinceInception(
  trades: Trade[],
  investedCapital: number,
  portfolioValue: number,
  asOf: Date = new Date(),
): number | null {
  if (trades.length === 0 || investedCapital <= 0) return null;
  const firstDate = trades.reduce(
    (earliest, t) => (new Date(t.date) < earliest ? new Date(t.date) : earliest),
    new Date(trades[0].date),
  );
  const years = (asOf.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years <= 0) return null;
  return Math.pow(portfolioValue / investedCapital, 1 / years) - 1;
}

/** Sorted list of period keys present across one or more maps, ascending. */
export function sortedPeriodKeys(...maps: Map<string, number>[]): string[] {
  const keys = new Set<string>();
  for (const map of maps) {
    for (const key of map.keys()) keys.add(key);
  }
  return Array.from(keys).sort();
}
