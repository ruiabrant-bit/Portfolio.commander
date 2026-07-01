import { describe, it, expect } from 'vitest';
import {
  getTotalDividendsNet,
  getDividendsByAsset,
  getDividendsByYear,
  getTrailing12MonthDividends,
} from '../../services/engines/dividendEngine';
import type { Dividend } from '../../types/domain';

const dividends: Dividend[] = [
  { id: 'd1', portfolioId: 'p1', assetId: 'AAPL', gross: 12, net: 10, tax: 2, paymentDate: '2023-06-01' },
  { id: 'd2', portfolioId: 'p1', assetId: 'AAPL', gross: 12, net: 10, tax: 2, paymentDate: '2024-01-01' },
  { id: 'd3', portfolioId: 'p1', assetId: 'MSFT', gross: 6, net: 5, tax: 1, paymentDate: '2024-03-01' },
];

describe('dividendEngine', () => {
  it('sums total net dividends', () => {
    expect(getTotalDividendsNet(dividends)).toBe(25);
  });

  it('groups net dividends by asset', () => {
    const byAsset = getDividendsByAsset(dividends);
    expect(byAsset.get('AAPL')).toBe(20);
    expect(byAsset.get('MSFT')).toBe(5);
  });

  it('groups net dividends by calendar year', () => {
    const byYear = getDividendsByYear(dividends);
    expect(byYear.get(2023)).toBe(10);
    expect(byYear.get(2024)).toBe(15);
  });

  it('computes trailing 12 month dividends as of a given date', () => {
    const asOf = new Date('2024-06-01');
    // d1 (2023-06-01) is exactly 12 months prior — included; d2 & d3 included.
    expect(getTrailing12MonthDividends(dividends, asOf)).toBe(25);
  });
});
