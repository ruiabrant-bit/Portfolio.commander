import type { Dividend } from '../../types/domain';

/**
 * Dividend Engine — SFS §6, PRD v1.2 §5 (Dividend Yield input).
 */

export function getTotalDividendsNet(dividends: Dividend[]): number {
  return dividends.reduce((sum, d) => sum + d.net, 0);
}

export function getTotalDividendsGross(dividends: Dividend[]): number {
  return dividends.reduce((sum, d) => sum + d.gross, 0);
}

export function getDividendsByAsset(dividends: Dividend[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of dividends) {
    map.set(d.assetId, (map.get(d.assetId) ?? 0) + d.net);
  }
  return map;
}

export function getDividendsByYear(dividends: Dividend[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const d of dividends) {
    const year = new Date(d.paymentDate).getFullYear();
    map.set(year, (map.get(year) ?? 0) + d.net);
  }
  return map;
}

/** Trailing 12-month dividend income, used as the numerator for Dividend Yield. */
export function getTrailing12MonthDividends(
  dividends: Dividend[],
  asOf: Date = new Date(),
): number {
  const oneYearAgo = new Date(asOf);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return dividends
    .filter((d) => {
      const paymentDate = new Date(d.paymentDate);
      return paymentDate >= oneYearAgo && paymentDate <= asOf;
    })
    .reduce((sum, d) => sum + d.net, 0);
}
