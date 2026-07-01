import { describe, it, expect } from 'vitest';
import {
  calculateMaxPositionWeight,
  calculateConcentration,
  calculateMaxDrawdown,
  calculateVolatility,
  calculateSharpeRatio,
} from '../../services/engines/riskEngine';
import type { Position } from '../../types/domain';
import type { PortfolioValuePoint } from '../../services/engines/performanceEngine';

describe('riskEngine', () => {
  it('Max Position Weight is the largest single position share', () => {
    const positions: Position[] = [
      { id: '1', portfolioId: 'p1', assetId: 'AAPL', quantity: 10, averagePrice: 100, currentPrice: 100 }, // 1000
      { id: '2', portfolioId: 'p1', assetId: 'MSFT', quantity: 5, averagePrice: 100, currentPrice: 100 }, // 500
    ];
    expect(calculateMaxPositionWeight(positions, 1500)).toBeCloseTo(1000 / 1500, 6);
  });

  it('Concentration returns the weight of the largest allocation bucket', () => {
    expect(
      calculateConcentration([
        { label: 'Technology', value: 800, weight: 0.8 },
        { label: 'Healthcare', value: 200, weight: 0.2 },
      ]),
    ).toBe(0.8);
  });

  it('Max Drawdown captures the largest peak-to-trough decline', () => {
    const series: PortfolioValuePoint[] = [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 1200 }, // peak
      { date: '2024-01-03', value: 900 }, // trough: (900-1200)/1200 = -0.25
      { date: '2024-01-04', value: 1100 },
    ];
    expect(calculateMaxDrawdown(series)).toBeCloseTo(-0.25, 6);
  });

  it('Volatility is zero for a flat (no-change) series', () => {
    const series: PortfolioValuePoint[] = [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 1000 },
      { date: '2024-01-03', value: 1000 },
    ];
    expect(calculateVolatility(series)).toBe(0);
  });

  it('Sharpe Ratio is zero when there is no return variance', () => {
    const series: PortfolioValuePoint[] = [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 1000 },
    ];
    expect(calculateSharpeRatio(series)).toBe(0);
  });
});
