import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateVWAP,
  calculateBollingerBands,
  findSupportResistance,
  calculateFibonacciLevels,
  type PricePoint,
  type OHLCV,
} from '../../services/engines/signalEngine';

const prices: PricePoint[] = [
  { date: '2024-01-01', close: 10 },
  { date: '2024-01-02', close: 12 },
  { date: '2024-01-03', close: 14 },
  { date: '2024-01-04', close: 16 },
  { date: '2024-01-05', close: 18 },
];

describe('signalEngine — SMA/EMA', () => {
  it('SMA is null until enough data points exist, then averages the trailing window', () => {
    const sma = calculateSMA(prices, 3);
    expect(sma[0]).toBeNull();
    expect(sma[1]).toBeNull();
    expect(sma[2]).toBeCloseTo((10 + 12 + 14) / 3, 6);
    expect(sma[3]).toBeCloseTo((12 + 14 + 16) / 3, 6);
    expect(sma[4]).toBeCloseTo((14 + 16 + 18) / 3, 6);
  });

  it('EMA seeds with the SMA of the first period and is null before that', () => {
    const ema = calculateEMA(prices, 3);
    expect(ema[0]).toBeNull();
    expect(ema[1]).toBeNull();
    expect(ema[2]).toBeCloseTo((10 + 12 + 14) / 3, 6);
    expect(ema[3]).toBeCloseTo(14, 6); // (16-12)*0.5+12
  });
});

function makeSeries(closes: number[]): PricePoint[] {
  return closes.map((close, i) => ({ date: `2024-01-${String(i + 1).padStart(2, '0')}`, close }));
}

describe('signalEngine — RSI', () => {
  it('is null before the first full period', () => {
    const rsi = calculateRSI(makeSeries([1, 2, 3]), 14);
    expect(rsi.every((v) => v === null)).toBe(true);
  });

  it('is 100 for a strictly increasing series (no losses)', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 10 + i);
    const rsi = calculateRSI(makeSeries(closes), 14);
    expect(rsi[14]).toBe(100);
  });

  it('is 0 for a strictly decreasing series (no gains)', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 - i);
    const rsi = calculateRSI(makeSeries(closes), 14);
    expect(rsi[14]).toBe(0);
  });
});

describe('signalEngine — MACD', () => {
  it('produces matching-length arrays with nulls before warm-up', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 10 + i * 0.5);
    const { macdLine, signalLine, histogram } = calculateMACD(makeSeries(closes), 12, 26, 9);
    expect(macdLine).toHaveLength(40);
    expect(signalLine).toHaveLength(40);
    expect(histogram).toHaveLength(40);
    expect(macdLine[0]).toBeNull();
    expect(macdLine[39]).not.toBeNull();
  });

  it('histogram equals macdLine minus signalLine wherever both are defined', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 10 + Math.sin(i / 3) * 5 + i * 0.2);
    const { macdLine, signalLine, histogram } = calculateMACD(makeSeries(closes));
    for (let i = 0; i < closes.length; i++) {
      if (macdLine[i] !== null && signalLine[i] !== null) {
        expect(histogram[i]).toBeCloseTo((macdLine[i] as number) - (signalLine[i] as number), 6);
      }
    }
  });
});

function makeBars(pairs: { close: number; high: number; low: number; volume?: number }[]): OHLCV[] {
  return pairs.map((p, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: p.close,
    close: p.close,
    high: p.high,
    low: p.low,
    volume: p.volume ?? 100,
  }));
}

describe('signalEngine — ATR', () => {
  it('converges to the constant true range for bars with fixed high-low spread and no gaps', () => {
    const bars = makeBars(Array.from({ length: 20 }, () => ({ close: 100, high: 101, low: 99 })));
    const atr = calculateATR(bars, 14);
    expect(atr[14]).toBeCloseTo(2, 6);
    expect(atr[19]).toBeCloseTo(2, 6);
  });
});

describe('signalEngine — VWAP', () => {
  it('equals the constant typical price when price and volume are constant', () => {
    const bars = makeBars(Array.from({ length: 5 }, () => ({ close: 100, high: 100, low: 100, volume: 50 })));
    const vwap = calculateVWAP(bars);
    vwap.forEach((v) => expect(v).toBeCloseTo(100, 6));
  });

  it('weights higher-volume bars more heavily', () => {
    const bars = makeBars([
      { close: 100, high: 100, low: 100, volume: 1 },
      { close: 200, high: 200, low: 200, volume: 99 },
    ]);
    const vwap = calculateVWAP(bars);
    // Should be much closer to 200 than to 100.
    expect(vwap[1]).toBeGreaterThan(190);
  });
});

describe('signalEngine — Bollinger Bands', () => {
  it('collapses to the mean when price is constant (zero std dev)', () => {
    const series = makeSeries(Array(25).fill(100));
    const { upper, middle, lower } = calculateBollingerBands(series, 20, 2);
    expect(middle[24]).toBeCloseTo(100, 6);
    expect(upper[24]).toBeCloseTo(100, 6);
    expect(lower[24]).toBeCloseTo(100, 6);
  });

  it('widens the bands as volatility increases', () => {
    const volatile = makeSeries(
      Array.from({ length: 25 }, (_, i) => 100 + (i % 2 === 0 ? 10 : -10)),
    );
    const { upper, lower } = calculateBollingerBands(volatile, 20, 2);
    expect((upper[24] as number) - (lower[24] as number)).toBeGreaterThan(5);
  });
});

describe('signalEngine — Support/Resistance', () => {
  it('detects a clear local low as support and local high as resistance', () => {
    const closes = [50, 48, 46, 44, 42, 40, 42, 44, 46, 48, 50, 52, 54, 52, 50, 48, 46, 44, 42, 40];
    const bars = makeBars(closes.map((c) => ({ close: c, high: c + 1, low: c - 1 })));
    const levels = findSupportResistance(bars, 3);
    expect(levels.some((l) => l.type === 'support')).toBe(true);
    expect(levels.some((l) => l.type === 'resistance')).toBe(true);
  });
});

describe('signalEngine — Fibonacci', () => {
  it('computes standard retracement levels between a swing low and high', () => {
    const levels = calculateFibonacciLevels(100, 200);
    const byRatio = new Map(levels.map((l) => [l.ratio, l.price]));
    expect(byRatio.get(0)).toBe(200);
    expect(byRatio.get(1)).toBe(100);
    expect(byRatio.get(0.5)).toBe(150);
    expect(byRatio.get(0.618)).toBeCloseTo(138.2, 1);
  });
});
