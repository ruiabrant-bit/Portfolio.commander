/**
 * Signal Engine — SFS §6 / §11.
 *
 * Full technical indicator suite: SMA, EMA, RSI, MACD, ATR, VWAP,
 * Bollinger Bands, Support/Resistance, Fibonacci retracement levels.
 * Every function here is pure and operates on a price series the
 * caller supplies — it has no opinion about where that series comes
 * from.
 *
 * IMPORTANT CONTEXT (Commit 008): no market data provider is wired
 * into the app yet. Nothing in the PRD/SFS assigns a commit to
 * integrating one (Appendix A jumps from "Technical Analysis" straight
 * to "News & Calendar" without a market-data-source step in between).
 * These functions are therefore complete and tested against synthetic
 * data, but the UI (Screener technical filters, Position Detail
 * Technical Analysis tab) cannot call them with real data yet and says
 * so explicitly rather than faking it.
 */

export interface PricePoint {
  date: string; // ISO date
  close: number;
}

export interface OHLCV extends PricePoint {
  open: number;
  high: number;
  low: number;
  volume: number;
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
 * Relative Strength Index (Wilder's smoothing method), period defaults
 * to 14. Returns null for indices before the first full period.
 */
export function calculateRSI(prices: PricePoint[], period = 14): (number | null)[] {
  const closes = prices.map((p) => p.close);
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gainSum += change;
    else lossSum += Math.abs(change);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = rsiFromAverages(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = rsiFromAverages(avgGain, avgLoss);
  }

  return result;
}

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * MACD: fast EMA - slow EMA, plus a signal line (EMA of the MACD line)
 * and histogram (MACD - signal). Defaults: 12/26/9, the standard.
 */
export interface MACDResult {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  prices: PricePoint[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macdLine: (number | null)[] = prices.map((_, i) => {
    const f = fastEMA[i];
    const s = slowEMA[i];
    return f === null || s === null ? null : f - s;
  });

  // Signal line = EMA of the MACD line, computed only over the
  // contiguous non-null tail of macdLine.
  const firstValidIndex = macdLine.findIndex((v) => v !== null);
  const signalLine: (number | null)[] = new Array(prices.length).fill(null);
  if (firstValidIndex !== -1) {
    const macdSeries: PricePoint[] = macdLine
      .slice(firstValidIndex)
      .map((v, i) => ({ date: prices[firstValidIndex + i].date, close: v as number }));
    const signalEMA = calculateEMA(macdSeries, signalPeriod);
    signalEMA.forEach((v, i) => {
      signalLine[firstValidIndex + i] = v;
    });
  }

  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = signalLine[i];
    return m === null || s === null ? null : m - s;
  });

  return { macdLine, signalLine, histogram };
}

/**
 * Average True Range: Wilder's smoothed average of True Range over
 * `period` bars. True Range = max(high-low, |high-prevClose|,
 * |low-prevClose|).
 */
export function calculateATR(bars: OHLCV[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length <= period) return result;

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const { high, low } = bars[i];
    const prevClose = bars[i - 1].close;
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period] = atr;
  for (let i = period + 1; i < bars.length; i++) {
    const tr = trueRanges[i - 1];
    atr = (atr * (period - 1) + tr) / period;
    result[i] = atr;
  }

  return result;
}

/**
 * Volume Weighted Average Price, cumulative from the start of the
 * supplied series (typical intraday usage resets daily — callers pass
 * only the bars for the session they want).
 */
export function calculateVWAP(bars: OHLCV[]): number[] {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  return bars.map((bar) => {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativePV += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;
    return cumulativeVolume === 0 ? typicalPrice : cumulativePV / cumulativeVolume;
  });
}

/** Bollinger Bands: SMA middle band, +/- `stdDevMultiplier` standard deviations. */
export interface BollingerBandsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateBollingerBands(
  prices: PricePoint[],
  period = 20,
  stdDevMultiplier = 2,
): BollingerBandsResult {
  const closes = prices.map((p) => p.close);
  const middle = calculateSMA(prices, period);
  const upper: (number | null)[] = new Array(prices.length).fill(null);
  const lower: (number | null)[] = new Array(prices.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const window = closes.slice(i + 1 - period, i + 1);
    const mean = middle[i] as number;
    const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + stdDevMultiplier * sd;
    lower[i] = mean - stdDevMultiplier * sd;
  }

  return { upper, middle, lower };
}

/**
 * Simple pivot-based Support/Resistance: a bar is a pivot low/high if
 * its low/high is the most extreme within `window` bars on each side.
 * Returns the detected levels sorted ascending — the lowest is the
 * strongest nearby support, the highest the strongest nearby
 * resistance, for typical usage.
 */
export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  index: number;
}

export function findSupportResistance(bars: OHLCV[], window = 5): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = [];

  for (let i = window; i < bars.length - window; i++) {
    const slice = bars.slice(i - window, i + window + 1);
    const isLow = slice.every((b) => b.low >= bars[i].low);
    const isHigh = slice.every((b) => b.high <= bars[i].high);
    if (isLow) levels.push({ price: bars[i].low, type: 'support', index: i });
    if (isHigh) levels.push({ price: bars[i].high, type: 'resistance', index: i });
  }

  return levels.sort((a, b) => a.price - b.price);
}

/** Standard Fibonacci retracement levels between a swing low and swing high. */
export interface FibonacciLevel {
  ratio: number;
  price: number;
}

const FIBONACCI_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export function calculateFibonacciLevels(swingLow: number, swingHigh: number): FibonacciLevel[] {
  const range = swingHigh - swingLow;
  return FIBONACCI_RATIOS.map((ratio) => ({
    ratio,
    price: swingHigh - range * ratio,
  }));
}
