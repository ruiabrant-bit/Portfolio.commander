import type { Position, Dividend } from '../../types/domain';
import { calculateMarketValue, calculateUnrealizedProfit } from './portfolioEngine';

/**
 * Performance Engine — PRD v1.2 §5.
 *
 * Time-series based metrics (Monthly / YTD / Annualized Return, CAGR) take
 * a `PortfolioValuePoint[]` — a chronologically sorted history of total
 * portfolio value. The store/services/import layer is responsible for
 * persisting these snapshots; this engine only consumes them.
 */

export interface PortfolioValuePoint {
  date: string; // ISO date
  value: number;
}

/** Today's P/L = Sum over positions of Quantity × (CurrentPrice - PreviousClose). */
export function calculateTodaysPL(
  positions: Position[],
  previousClose: Map<string, number>,
): number {
  return positions.reduce((sum, p) => {
    const prevClose = previousClose.get(p.assetId) ?? p.currentPrice;
    return sum + p.quantity * (p.currentPrice - prevClose);
  }, 0);
}

/** Total Unrealized Profit across all open positions. */
export function calculateTotalUnrealizedProfit(positions: Position[]): number {
  return positions.reduce((sum, p) => sum + calculateUnrealizedProfit(p), 0);
}

/** Total Return (%) = (Portfolio Value - Invested Capital) / Invested Capital. */
export function calculateTotalReturn(
  portfolioValue: number,
  investedCapital: number,
): number {
  if (investedCapital === 0) return 0;
  return (portfolioValue - investedCapital) / investedCapital;
}

/** CAGR = (Ending Value / Beginning Value)^(1 / years) - 1. */
export function calculateCAGR(
  beginningValue: number,
  endingValue: number,
  years: number,
): number {
  if (beginningValue <= 0 || years <= 0) return 0;
  return Math.pow(endingValue / beginningValue, 1 / years) - 1;
}

/** Annualized Return derived from a total return over a holding period. */
export function calculateAnnualizedReturn(totalReturn: number, years: number): number {
  if (years <= 0) return 0;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

/** Dividend Yield = Trailing 12M Dividends / Portfolio Value. */
export function calculateDividendYield(
  dividends: Dividend[],
  portfolioValue: number,
  asOf: Date = new Date(),
): number {
  if (portfolioValue === 0) return 0;
  const oneYearAgo = new Date(asOf);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const trailing12mNet = dividends
    .filter((d) => new Date(d.paymentDate) >= oneYearAgo && new Date(d.paymentDate) <= asOf)
    .reduce((sum, d) => sum + d.net, 0);

  return trailing12mNet / portfolioValue;
}

/** Returns the value point on or immediately before a given date. */
function valueAsOf(
  series: PortfolioValuePoint[],
  date: Date,
): PortfolioValuePoint | undefined {
  const sorted = [...series].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  let result: PortfolioValuePoint | undefined;
  for (const point of sorted) {
    if (new Date(point.date).getTime() <= date.getTime()) {
      result = point;
    } else {
      break;
    }
  }
  return result;
}

/** Year-to-Date Return, based on value at the last close of prior year vs latest. */
export function calculateYTDReturn(
  series: PortfolioValuePoint[],
  asOf: Date = new Date(),
): number {
  if (series.length === 0) return 0;
  const startOfYear = new Date(Date.UTC(asOf.getFullYear(), 0, 1));
  const startPoint = valueAsOf(series, startOfYear) ?? series[0];
  const latestPoint = valueAsOf(series, asOf) ?? series[series.length - 1];
  if (!startPoint || startPoint.value === 0) return 0;
  return (latestPoint.value - startPoint.value) / startPoint.value;
}

/** Monthly Return for the calendar month containing `asOf`. */
export function calculateMonthlyReturn(
  series: PortfolioValuePoint[],
  asOf: Date = new Date(),
): number {
  if (series.length === 0) return 0;
  const startOfMonth = new Date(Date.UTC(asOf.getFullYear(), asOf.getMonth(), 1));
  const startPoint = valueAsOf(series, startOfMonth) ?? series[0];
  const latestPoint = valueAsOf(series, asOf) ?? series[series.length - 1];
  if (!startPoint || startPoint.value === 0) return 0;
  return (latestPoint.value - startPoint.value) / startPoint.value;
}

/** Portfolio Value = Sum of Market Value across positions (helper re-export point). */
export function sumMarketValue(positions: Position[]): number {
  return positions.reduce((sum, p) => sum + calculateMarketValue(p), 0);
}
