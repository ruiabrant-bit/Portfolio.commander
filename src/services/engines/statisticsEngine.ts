import type { Trade, Position } from '../../types/domain';
import { getRealizedTradeProfits } from './portfolioEngine';

/**
 * Statistics Engine — SFS §6.
 * Descriptive statistics over trade history and current positions.
 * These are informational, not used for compliance-critical calculations.
 */

export interface TradeStatistics {
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // winningTrades / (winningTrades + losingTrades)
  averageWin: number;
  averageLoss: number;
}

export function calculateTradeStatistics(trades: Trade[]): TradeStatistics {
  const buyCount = trades.filter((t) => t.type === 'BUY').length;
  const sellCount = trades.filter((t) => t.type === 'SELL').length;

  const realizedProfits = getRealizedTradeProfits(trades).map((t) => t.profit);
  const winning = realizedProfits.filter((p) => p > 0);
  const losing = realizedProfits.filter((p) => p < 0);

  return {
    totalTrades: trades.length,
    buyCount,
    sellCount,
    winningTrades: winning.length,
    losingTrades: losing.length,
    winRate:
      winning.length + losing.length === 0
        ? 0
        : winning.length / (winning.length + losing.length),
    averageWin: winning.length === 0 ? 0 : winning.reduce((a, b) => a + b, 0) / winning.length,
    averageLoss: losing.length === 0 ? 0 : losing.reduce((a, b) => a + b, 0) / losing.length,
  };
}

export interface PositionCountStatistics {
  openPositions: number;
  largestPosition: Position | null;
  smallestPosition: Position | null;
}

export function calculatePositionStatistics(
  positions: Position[],
): PositionCountStatistics {
  if (positions.length === 0) {
    return { openPositions: 0, largestPosition: null, smallestPosition: null };
  }
  const byValue = [...positions].sort(
    (a, b) => b.quantity * b.currentPrice - a.quantity * a.currentPrice,
  );
  return {
    openPositions: positions.length,
    largestPosition: byValue[0],
    smallestPosition: byValue[byValue.length - 1],
  };
}
