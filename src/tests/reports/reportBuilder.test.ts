import { describe, it, expect } from 'vitest';
import {
  realizedProfitByPeriod,
  dividendsByPeriod,
  approximateCAGRSinceInception,
  sortedPeriodKeys,
} from '../../services/reports/reportBuilder';
import type { Trade, Dividend } from '../../types/domain';

function trade(overrides: Partial<Trade>): Trade {
  return {
    id: overrides.id ?? 't',
    portfolioId: 'p1',
    assetId: 'AAPL',
    type: 'BUY',
    quantity: 1,
    price: 100,
    fees: 0,
    taxes: 0,
    date: '2024-01-01',
    ...overrides,
  };
}

describe('realizedProfitByPeriod', () => {
  it('groups realized profit by month', () => {
    const trades: Trade[] = [
      trade({ id: '1', type: 'BUY', quantity: 10, price: 100, date: '2024-01-01' }),
      trade({ id: '2', type: 'SELL', quantity: 5, price: 150, date: '2024-02-10' }), // +250
      trade({ id: '3', type: 'SELL', quantity: 5, price: 80, date: '2024-03-05' }), // -100
    ];
    const byMonth = realizedProfitByPeriod(trades, 'month');
    expect(byMonth.get('2024-02')).toBe(250);
    expect(byMonth.get('2024-03')).toBe(-100);
  });

  it('groups realized profit by year', () => {
    const trades: Trade[] = [
      trade({ id: '1', type: 'BUY', quantity: 10, price: 100, date: '2023-01-01' }),
      trade({ id: '2', type: 'SELL', quantity: 5, price: 150, date: '2023-06-10' }),
      trade({ id: '3', type: 'SELL', quantity: 5, price: 200, date: '2024-01-10' }),
    ];
    const byYear = realizedProfitByPeriod(trades, 'year');
    expect(byYear.get('2023')).toBe(250);
    expect(byYear.get('2024')).toBe(500);
  });
});

describe('dividendsByPeriod', () => {
  it('groups net dividends by year', () => {
    const dividends: Dividend[] = [
      { id: 'd1', portfolioId: 'p1', assetId: 'AAPL', gross: 12, net: 10, tax: 2, paymentDate: '2023-06-01' },
      { id: 'd2', portfolioId: 'p1', assetId: 'AAPL', gross: 12, net: 10, tax: 2, paymentDate: '2024-01-01' },
    ];
    const byYear = dividendsByPeriod(dividends, 'year');
    expect(byYear.get('2023')).toBe(10);
    expect(byYear.get('2024')).toBe(10);
  });
});

describe('approximateCAGRSinceInception', () => {
  it('returns null when there are no trades', () => {
    expect(approximateCAGRSinceInception([], 1000, 1200)).toBeNull();
  });

  it('computes CAGR from the earliest trade date to now', () => {
    const trades: Trade[] = [trade({ date: '2022-01-01' })];
    const asOf = new Date('2024-01-01'); // ~2 years later
    const result = approximateCAGRSinceInception(trades, 1000, 1210, asOf);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.1, 1); // ~10% CAGR to reach 1.21x over 2 years
  });
});

describe('sortedPeriodKeys', () => {
  it('merges and sorts keys across multiple maps', () => {
    const a = new Map([['2024-02', 1]]);
    const b = new Map([['2024-01', 1], ['2024-03', 1]]);
    expect(sortedPeriodKeys(a, b)).toEqual(['2024-01', '2024-02', '2024-03']);
  });
});
