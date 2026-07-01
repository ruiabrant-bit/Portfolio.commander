import { describe, it, expect } from 'vitest';
import { calculateTradeStatistics, calculatePositionStatistics } from '../../services/engines/statisticsEngine';
import type { Trade, Position } from '../../types/domain';

describe('statisticsEngine', () => {
  it('computes win rate from realized profit per Sell trade', () => {
    const trades: Trade[] = [
      { id: '1', portfolioId: 'p1', assetId: 'AAPL', type: 'BUY', quantity: 10, price: 100, fees: 0, taxes: 0, date: '2024-01-01' },
      { id: '2', portfolioId: 'p1', assetId: 'AAPL', type: 'SELL', quantity: 5, price: 150, fees: 0, taxes: 0, date: '2024-02-01' }, // win: +250
      { id: '3', portfolioId: 'p1', assetId: 'AAPL', type: 'SELL', quantity: 5, price: 80, fees: 0, taxes: 0, date: '2024-03-01' }, // loss: -100
    ];
    const stats = calculateTradeStatistics(trades);
    expect(stats.totalTrades).toBe(3);
    expect(stats.buyCount).toBe(1);
    expect(stats.sellCount).toBe(2);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(1);
    expect(stats.winRate).toBeCloseTo(0.5, 6);
  });

  it('identifies the largest open position by market value', () => {
    const positions: Position[] = [
      { id: '1', portfolioId: 'p1', assetId: 'AAPL', quantity: 10, averagePrice: 100, currentPrice: 100 }, // 1000
      { id: '2', portfolioId: 'p1', assetId: 'MSFT', quantity: 1, averagePrice: 300, currentPrice: 300 }, // 300
    ];
    const stats = calculatePositionStatistics(positions);
    expect(stats.openPositions).toBe(2);
    expect(stats.largestPosition?.assetId).toBe('AAPL');
    expect(stats.smallestPosition?.assetId).toBe('MSFT');
  });
});
