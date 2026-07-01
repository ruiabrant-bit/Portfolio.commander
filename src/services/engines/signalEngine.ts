/**
 * Signal Engine — SFS §6 / §11.
 *
 * Per the SFS Appendix A suggested development order, full Technical
 * Analysis (RSI, MACD, ATR, VWAP, Bollinger Bands, Support/Resistance,
 * Fibonacci) is scoped to Commit 008. This bootstrap commit establishes
 * the engine's module boundary and implements the two foundational
 * building blocks (SMA, EMA) that every other indicator in the suite will
 * be composed from, so later commits extend rather than redesign this
 * module (Instructions for AI Development Agent: never redesign
 * architecture unless explicitly requested).
 */

export interface PricePoint {
  date: string; // ISO date
  close: number;
}

/** Simple Moving Average over the last `period` closes. */
export function calculateSMA(prices: PricePoint[], period: number): (number | null)[] {
  const closes = prices.map((p) => p.close);
  return closes.map((_, i) => {
    if (i + 1 < period) return null;
    const window = closes.slice(i + 1 - period, i + 1);
    return window.reduce((a, b) => a + b, 0) / period;
  });
}

/** Exponential Moving Average, seeded by the SMA of the first `period` closes. */
export function calculateEMA(prices: PricePoint[], period: number): (number | null)[] {
  const closes = prices.map((p) => p.close);
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period) return result;

  const multiplier = 2 / (period + 1);
  const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = seed;

  let prevEma = seed;
  for (let i = period; i < closes.length; i++) {
    const ema = (closes[i] - prevEma) * multiplier + prevEma;
    result[i] = ema;
    prevEma = ema;
  }

  return result;
}

/**
 * Not yet implemented — planned for Commit 008 (Technical Analysis):
 * calculateRSI, calculateMACD, calculateATR, calculateVWAP,
 * calculateBollingerBands, findSupportResistance, calculateFibonacciLevels.
 */
