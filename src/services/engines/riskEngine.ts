import type { Position } from '../../types/domain';
import type { AllocationBucket } from './allocationEngine';
import type { PortfolioValuePoint } from './performanceEngine';
import { calculateMarketValue } from './portfolioEngine';

/**
 * Risk Engine — PRD v1.2 §6.
 */

/** Maximum Position Weight = largest single position's share of portfolio value. */
export function calculateMaxPositionWeight(
  positions: Position[],
  portfolioValue: number,
): number {
  if (portfolioValue === 0 || positions.length === 0) return 0;
  const max = Math.max(...positions.map((p) => calculateMarketValue(p)));
  return max / portfolioValue;
}

/** Sector/Country Concentration = weight of the single largest bucket. */
export function calculateConcentration(buckets: AllocationBucket[]): number {
  if (buckets.length === 0) return 0;
  return Math.max(...buckets.map((b) => b.weight));
}

/** Daily returns derived from a chronological portfolio value series. */
function dailyReturns(series: PortfolioValuePoint[]): number[] {
  const sorted = [...series].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].value;
    const curr = sorted[i].value;
    if (prev !== 0) returns.push((curr - prev) / prev);
  }
  return returns;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

const TRADING_DAYS_PER_YEAR = 252;

/** Annualized Portfolio Volatility (stdev of daily returns x sqrt(252)). */
export function calculateVolatility(series: PortfolioValuePoint[]): number {
  const returns = dailyReturns(series);
  return stdDev(returns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/** Maximum Drawdown: largest peak-to-trough decline over the series. */
export function calculateMaxDrawdown(series: PortfolioValuePoint[]): number {
  const sorted = [...series].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  let peak = -Infinity;
  let maxDrawdown = 0;

  for (const point of sorted) {
    peak = Math.max(peak, point.value);
    if (peak > 0) {
      const drawdown = (point.value - peak) / peak;
      maxDrawdown = Math.min(maxDrawdown, drawdown);
    }
  }

  return maxDrawdown; // negative or zero
}

/**
 * Sharpe Ratio = (mean daily return - daily risk-free rate) / stdev(daily returns),
 * annualized by sqrt(252).
 */
export function calculateSharpeRatio(
  series: PortfolioValuePoint[],
  annualRiskFreeRate = 0,
): number {
  const returns = dailyReturns(series);
  if (returns.length < 2) return 0;
  const dailyRiskFree = annualRiskFreeRate / TRADING_DAYS_PER_YEAR;
  const excessMean = mean(returns) - dailyRiskFree;
  const sd = stdDev(returns);
  if (sd === 0) return 0;
  return (excessMean / sd) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Sortino Ratio: like Sharpe, but the denominator only considers downside
 * deviation (returns below the risk-free rate).
 */
export function calculateSortinoRatio(
  series: PortfolioValuePoint[],
  annualRiskFreeRate = 0,
): number {
  const returns = dailyReturns(series);
  if (returns.length < 2) return 0;
  const dailyRiskFree = annualRiskFreeRate / TRADING_DAYS_PER_YEAR;
  const excessMean = mean(returns) - dailyRiskFree;

  const downside = returns.filter((r) => r < dailyRiskFree);
  if (downside.length === 0) return 0;
  const downsideDeviation = Math.sqrt(
    downside.reduce((sum, r) => sum + (r - dailyRiskFree) ** 2, 0) / downside.length,
  );
  if (downsideDeviation === 0) return 0;
  return (excessMean / downsideDeviation) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}
