import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, type PricePoint } from '../../services/engines/signalEngine';

const prices: PricePoint[] = [
  { date: '2024-01-01', close: 10 },
  { date: '2024-01-02', close: 12 },
  { date: '2024-01-03', close: 14 },
  { date: '2024-01-04', close: 16 },
  { date: '2024-01-05', close: 18 },
];

describe('signalEngine', () => {
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
    // multiplier = 2/(3+1) = 0.5; ema[3] = (16-12)*0.5+12 = 14
    expect(ema[3]).toBeCloseTo(14, 6);
  });
});
