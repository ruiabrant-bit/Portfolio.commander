import { describe, it, expect } from 'vitest';
import {
  allocationBySector,
  allocationByCurrency,
} from '../../services/engines/allocationEngine';
import type { Asset, Position } from '../../types/domain';

const assets: Asset[] = [
  {
    id: 'AAPL',
    ticker: 'AAPL',
    isin: null,
    name: 'Apple',
    assetType: 'STOCK',
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Hardware',
    currency: 'USD',
  },
  {
    id: 'JNJ',
    ticker: 'JNJ',
    isin: null,
    name: 'Johnson & Johnson',
    assetType: 'STOCK',
    exchange: 'NYSE',
    sector: 'Healthcare',
    industry: 'Pharma',
    currency: 'USD',
  },
];

const positions: Position[] = [
  { id: '1', portfolioId: 'p1', assetId: 'AAPL', quantity: 10, averagePrice: 100, currentPrice: 150 }, // 1500
  { id: '2', portfolioId: 'p1', assetId: 'JNJ', quantity: 10, averagePrice: 100, currentPrice: 100 }, // 1000
];

describe('allocationEngine', () => {
  it('groups market value by sector and computes weights that sum to 1', () => {
    const buckets = allocationBySector(positions, assets);
    const tech = buckets.find((b) => b.label === 'Technology');
    const health = buckets.find((b) => b.label === 'Healthcare');
    expect(tech?.value).toBe(1500);
    expect(health?.value).toBe(1000);
    const totalWeight = buckets.reduce((sum, b) => sum + b.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 6);
  });

  it('groups market value by currency', () => {
    const buckets = allocationByCurrency(positions, assets);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe('USD');
    expect(buckets[0].value).toBe(2500);
  });
});
