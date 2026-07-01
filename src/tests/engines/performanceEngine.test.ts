import { describe, it, expect } from 'vitest';
import {
  calculateTodaysPL,
  calculateTotalReturn,
  calculateCAGR,
  calculateDividendYield,
  calculateYTDReturn,
  type PortfolioValuePoint,
} from '../../services/engines/performanceEngine';
import type { Position, Dividend } from '../../types/domain';

describe('performanceEngine', () => {
  it("Today's P/L sums quantity x (current - previous close)", () => {
    const positions: Position[] = [
      { id: '1', portfolioId: 'p1', assetId: 'AAPL', quantity: 10, averagePrice: 100, currentPrice: 120 },
      { id: '2', portfolioId: 'p1', assetId: 'MSFT', quantity: 5, averagePrice: 300, currentPrice: 310 },
    ];
    const previousClose = new Map([
      ['AAPL', 118],
      ['MSFT', 305],
    ]);
    // AAPL: 10*(120-118)=20 ; MSFT: 5*(310-305)=25 => 45
    expect(calculateTodaysPL(positions, previousClose)).toBe(45);
  });

  it('Total Return = (value - invested) / invested', () => {
    expect(calculateTotalReturn(1200, 1000)).toBeCloseTo(0.2, 6);
    expect(calculateTotalReturn(100, 0)).toBe(0);
  });

  it('CAGR compounds correctly over multiple years', () => {
    // doubling over 2 years => CAGR ~ 41.42%
    expect(calculateCAGR(1000, 2000, 2)).toBeCloseTo(0.41421356, 6);
  });

  it('Dividend Yield uses trailing 12 month net dividends over portfolio value', () => {
    const asOf = new Date('2024-06-01');
    const dividends: Dividend[] = [
      { id: 'd1', portfolioId: 'p1', assetId: 'AAPL', gross: 12, net: 10, tax: 2, paymentDate: '2024-01-01' },
      { id: 'd2', portfolioId: 'p1', assetId: 'AAPL', gross: 12, net: 10, tax: 2, paymentDate: '2022-01-01' }, // too old
    ];
    expect(calculateDividendYield(dividends, 1000, asOf)).toBeCloseTo(0.01, 6);
  });

  it('YTD Return compares value at start of year to latest value', () => {
    const series: PortfolioValuePoint[] = [
      { date: '2023-12-31', value: 1000 },
      { date: '2024-06-01', value: 1100 },
    ];
    expect(calculateYTDReturn(series, new Date('2024-06-01'))).toBeCloseTo(0.1, 6);
  });
});
