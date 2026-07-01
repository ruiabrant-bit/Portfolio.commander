import type {
  Trade,
  CashMovement,
  Position,
  PortfolioSnapshot,
  Asset,
} from '../../types/domain';
import {
  assertValidTrade,
  assertSellDoesNotExceedHolding,
} from '../../utils/validation';

/**
 * Portfolio Engine
 *
 * Business Rules enforced here (PRD v1.2 §2/§3, ADR-005):
 * - Portfolio is reconstructed EXCLUSIVELY from transaction history.
 * - Average price changes only after Buy transactions.
 * - Sell transactions reduce quantity but never modify the average price
 *   of the remaining shares.
 * - Negative quantities are not allowed.
 * - A closed position has quantity equal to zero.
 * - No manual edits to calculated values (positions are always derived).
 *
 * React components must never call these calculations directly (ADR-004) —
 * they consume the results via the store/hooks layer instead.
 */

export interface RealizedTradeProfit {
  tradeId: string;
  assetId: string;
  date: string;
  profit: number;
}

interface PositionAccumulator {
  assetId: string;
  quantity: number;
  averagePrice: number;
  /** Realized profit accumulated across all Sell trades for this asset. */
  realizedProfit: number;
  /** Realized profit broken down per individual Sell trade. */
  tradeProfits: RealizedTradeProfit[];
}

/**
 * Replays a chronologically ordered list of trades for a single asset and
 * returns the resulting accumulator state (quantity, average price,
 * realized profit). Pure function — no I/O, fully deterministic.
 */
function replayTradesForAsset(assetId: string, trades: Trade[]): PositionAccumulator {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const acc: PositionAccumulator = {
    assetId,
    quantity: 0,
    averagePrice: 0,
    realizedProfit: 0,
    tradeProfits: [],
  };

  for (const trade of sorted) {
    assertValidTrade(trade);

    if (trade.type === 'BUY') {
      const newQuantity = acc.quantity + trade.quantity;
      // Average price changes only after Buy transactions.
      acc.averagePrice =
        newQuantity === 0
          ? 0
          : (acc.quantity * acc.averagePrice + trade.quantity * trade.price) /
            newQuantity;
      acc.quantity = newQuantity;
    } else if (trade.type === 'SELL') {
      assertSellDoesNotExceedHolding(acc.quantity, trade.quantity, assetId);
      // Realized profit for this lot: (sell price - avg cost) * qty, net of
      // this trade's fees and taxes.
      const tradeProfit =
        (trade.price - acc.averagePrice) * trade.quantity - trade.fees - trade.taxes;
      acc.realizedProfit += tradeProfit;
      acc.tradeProfits.push({
        tradeId: trade.id,
        assetId,
        date: trade.date,
        profit: tradeProfit,
      });
      acc.quantity -= trade.quantity;
      // Sell transactions never modify the average purchase price of the
      // remaining shares.
      if (acc.quantity === 0) {
        acc.averagePrice = 0; // closed position: nothing left to average
      }
    }
  }

  return acc;
}

/**
 * Builds the full set of Positions for a portfolio from its trade history.
 * Positions with quantity 0 (closed) are excluded from the active list but
 * their realized profit is still reflected via `getRealizedProfitByAsset`.
 */
export function buildPositions(
  portfolioId: string,
  trades: Trade[],
  quotesByAssetId: Map<string, number>,
): Position[] {
  const tradesByAsset = groupTradesByAsset(trades);
  const positions: Position[] = [];

  for (const [assetId, assetTrades] of tradesByAsset) {
    const acc = replayTradesForAsset(assetId, assetTrades);
    if (acc.quantity > 0) {
      positions.push({
        id: `${portfolioId}:${assetId}`,
        portfolioId,
        assetId,
        quantity: acc.quantity,
        averagePrice: acc.averagePrice,
        currentPrice: quotesByAssetId.get(assetId) ?? acc.averagePrice,
      });
    }
  }

  return positions;
}

/** Realized profit per asset, derived purely from trade history. */
export function getRealizedProfitByAsset(trades: Trade[]): Map<string, number> {
  const tradesByAsset = groupTradesByAsset(trades);
  const result = new Map<string, number>();
  for (const [assetId, assetTrades] of tradesByAsset) {
    result.set(assetId, replayTradesForAsset(assetId, assetTrades).realizedProfit);
  }
  return result;
}

export function getTotalRealizedProfit(trades: Trade[]): number {
  let total = 0;
  for (const value of getRealizedProfitByAsset(trades).values()) {
    total += value;
  }
  return total;
}

/** Flat list of realized profit per individual Sell trade, across all assets. */
export function getRealizedTradeProfits(trades: Trade[]): RealizedTradeProfit[] {
  const tradesByAsset = groupTradesByAsset(trades);
  const result: RealizedTradeProfit[] = [];
  for (const [assetId, assetTrades] of tradesByAsset) {
    result.push(...replayTradesForAsset(assetId, assetTrades).tradeProfits);
  }
  return result;
}

function groupTradesByAsset(trades: Trade[]): Map<string, Trade[]> {
  const map = new Map<string, Trade[]>();
  for (const trade of trades) {
    const list = map.get(trade.assetId) ?? [];
    list.push(trade);
    map.set(trade.assetId, list);
  }
  return map;
}

/**
 * Cash Balance (PRD v1.2 §2):
 * opening cash + deposits - withdrawals - purchases + sales
 *   + dividends + interest - fees - taxes
 */
export function calculateCashBalance(
  openingCash: number,
  trades: Trade[],
  cashMovements: CashMovement[],
): number {
  let cash = openingCash;

  for (const trade of trades) {
    const gross = trade.quantity * trade.price;
    if (trade.type === 'BUY') {
      cash -= gross + trade.fees + trade.taxes;
    } else {
      cash += gross - trade.fees - trade.taxes;
    }
  }

  for (const movement of cashMovements) {
    switch (movement.type) {
      case 'DEPOSIT':
      case 'DIVIDEND':
      case 'INTEREST':
        cash += movement.amount;
        break;
      case 'WITHDRAWAL':
      case 'FEE':
      case 'TAX':
        cash -= movement.amount;
        break;
    }
  }

  return cash;
}

/** Market Value = Quantity × Current Price. */
export function calculateMarketValue(position: Position): number {
  return position.quantity * position.currentPrice;
}

/** Unrealized Profit = (Current Price - Average Price) × Quantity. */
export function calculateUnrealizedProfit(position: Position): number {
  return (position.currentPrice - position.averagePrice) * position.quantity;
}

/** Portfolio Value = Cash + Sum(Market Value). */
export function calculatePortfolioValue(positions: Position[], cash: number): number {
  return cash + positions.reduce((sum, p) => sum + calculateMarketValue(p), 0);
}

/** Invested Capital = Sum(Quantity × Average Price). */
export function calculateInvestedCapital(positions: Position[]): number {
  return positions.reduce((sum, p) => sum + p.quantity * p.averagePrice, 0);
}

/** Weight = Market Value / Total Portfolio Value. */
export function calculatePositionWeight(
  position: Position,
  portfolioValue: number,
): number {
  if (portfolioValue === 0) return 0;
  return calculateMarketValue(position) / portfolioValue;
}

export function calculateCashAllocation(cash: number, portfolioValue: number): number {
  if (portfolioValue === 0) return 0;
  return cash / portfolioValue;
}

/**
 * Rebuilds a complete, internally-consistent view of a portfolio purely
 * from its transaction history (ADR-005). This is the single entry point
 * the rest of the app should use to derive portfolio state.
 */
export function rebuildPortfolio(
  snapshot: PortfolioSnapshot,
  openingCash = 0,
): {
  positions: Position[];
  cash: number;
  portfolioValue: number;
  investedCapital: number;
  realizedProfit: number;
} {
  const quotesByAssetId = new Map(snapshot.quotes.map((q) => [q.assetId, q.price]));
  const positions = buildPositions(
    snapshot.portfolio.id,
    snapshot.trades,
    quotesByAssetId,
  );
  const cash = calculateCashBalance(openingCash, snapshot.trades, snapshot.cashMovements);
  const portfolioValue = calculatePortfolioValue(positions, cash);
  const investedCapital = calculateInvestedCapital(positions);
  const realizedProfit = getTotalRealizedProfit(snapshot.trades);

  return { positions, cash, portfolioValue, investedCapital, realizedProfit };
}

/** Helper used by Allocation Engine to resolve Asset metadata for a Position. */
export function findAsset(assets: Asset[], assetId: string): Asset | undefined {
  return assets.find((a) => a.id === assetId);
}
