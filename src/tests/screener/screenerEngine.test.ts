import { describe, it, expect } from 'vitest';
import { filterByFundamentals } from '../../services/screener/screenerEngine';
import type { Asset } from '../../types/domain';

function asset(id: string, fundamentals: Asset['fundamentals']): Asset {
  return {
    id,
    ticker: id,
    isin: null,
    name: id,
    assetType: 'STOCK',
    exchange: null,
    sector: null,
    industry: null,
    currency: 'USD',
    fundamentals,
  };
}

const assets: Asset[] = [
  asset('CHEAP', { peRatio: 8, marketCap: 5_000_000_000, roe: 0.1, dividendYield: 0.04 }),
  asset('GROWTH', { peRatio: 45, marketCap: 800_000_000_000, roe: 0.25, revenueGrowth: 0.3 }),
  asset('UNKNOWN', undefined),
];

describe('filterByFundamentals', () => {
  it('returns all assets when no filters are set', () => {
    expect(filterByFundamentals(assets, {})).toHaveLength(3);
  });

  it('filters by max P/E', () => {
    const result = filterByFundamentals(assets, { maxPE: 20 });
    expect(result.map((a) => a.id)).toEqual(['CHEAP']);
  });

  it('filters by min market cap', () => {
    const result = filterByFundamentals(assets, { minMarketCap: 100_000_000_000 });
    expect(result.map((a) => a.id)).toEqual(['GROWTH']);
  });

  it('excludes assets with no fundamentals data when a filter is set', () => {
    const result = filterByFundamentals(assets, { minROE: 0 });
    expect(result.some((a) => a.id === 'UNKNOWN')).toBe(false);
  });

  it('combines multiple filters with AND logic', () => {
    const result = filterByFundamentals(assets, { maxPE: 50, minROE: 0.2 });
    expect(result.map((a) => a.id)).toEqual(['GROWTH']);
  });

  it('filters by minimum dividend yield', () => {
    const result = filterByFundamentals(assets, { minDividendYield: 0.02 });
    expect(result.map((a) => a.id)).toEqual(['CHEAP']);
  });
});
