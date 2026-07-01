import { describe, it, expect } from 'vitest';
import {
  buildPositions,
  calculateCashBalance,
  calculateMarketValue,
  calculateUnrealizedProfit,
  calculatePortfolioValue,
  calculateInvestedCapital,
  calculatePositionWeight,
  getTotalRealizedProfit,
  rebuildPortfolio,
} from '../../services/engines/portfolioEngine';
import { ValidationError } from '../../utils/validation';
import type { Trade, CashMovement, PortfolioSnapshot } from '../../types/domain';

function makeTrade(overrides: Partial<Trade>): Trade {
  return {
    id: overrides.id ?? crypto.randomUUID(),
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

describe('portfolioEngine — average price rules (PRD v1.2 §3)', () => {
  it('sets average price to the buy price on the first Buy', () => {
    const trades = [makeTrade({ type: 'BUY', quantity: 10, price: 100 })];
    const positions = buildPositions('p1', trades, new Map());
    expect(positions).toHaveLength(1);
    expect(positions[0].averagePrice).toBe(100);
    expect(positions[0].quantity).toBe(10);
  });

  it('recomputes weighted average price after a second Buy', () => {
    const trades = [
      makeTrade({ id: '1', type: 'BUY', quantity: 10, price: 100, date: '2024-01-01' }),
      makeTrade({ id: '2', type: 'BUY', quantity: 10, price: 200, date: '2024-02-01' }),
    ];
    const positions = buildPositions('p1', trades, new Map());
    // (10*100 + 10*200) / 20 = 150
    expect(positions[0].averagePrice).toBe(150);
    expect(positions[0].quantity).toBe(20);
  });

  it('never modifies the average price of remaining shares on a Sell', () => {
    const trades = [
      makeTrade({ id: '1', type: 'BUY', quantity: 10, price: 100, date: '2024-01-01' }),
      makeTrade({ id: '2', type: 'SELL', quantity: 4, price: 500, date: '2024-03-01' }),
    ];
    const positions = buildPositions('p1', trades, new Map());
    expect(positions[0].averagePrice).toBe(100); // unchanged despite sell at 500
    expect(positions[0].quantity).toBe(6);
  });

  it('excludes fully closed positions (quantity === 0) from the active list', () => {
    const trades = [
      makeTrade({ id: '1', type: 'BUY', quantity: 10, price: 100, date: '2024-01-01' }),
      makeTrade({ id: '2', type: 'SELL', quantity: 10, price: 150, date: '2024-02-01' }),
    ];
    const positions = buildPositions('p1', trades, new Map());
    expect(positions).toHaveLength(0);
  });

  it('rejects a Sell that would push quantity negative', () => {
    const trades = [
      makeTrade({ id: '1', type: 'BUY', quantity: 5, price: 100, date: '2024-01-01' }),
      makeTrade({ id: '2', type: 'SELL', quantity: 10, price: 100, date: '2024-02-01' }),
    ];
    expect(() => buildPositions('p1', trades, new Map())).toThrow(ValidationError);
  });

  it('reconstructs the portfolio exclusively from transaction history (ADR-005)', () => {
    const trades = [
      makeTrade({ id: '1', assetId: 'AAPL', type: 'BUY', quantity: 10, price: 100, date: '2024-01-01' }),
      makeTrade({ id: '2', assetId: 'MSFT', type: 'BUY', quantity: 5, price: 300, date: '2024-01-05' }),
    ];
    const quotes = new Map([
      ['AAPL', 120],
      ['MSFT', 310],
    ]);
    const positions = buildPositions('p1', trades, quotes);
    expect(positions).toHaveLength(2);
  });
});

describe('portfolioEngine — realized profit', () => {
  it('computes realized profit net of fees and taxes on Sell', () => {
    const trades = [
      makeTrade({ id: '1', type: 'BUY', quantity: 10, price: 100, date: '2024-01-01' }),
      makeTrade({
        id: '2',
        type: 'SELL',
        quantity: 10,
        price: 150,
        fees: 5,
        taxes: 10,
        date: '2024-02-01',
      }),
    ];
    // (150-100)*10 - 5 - 10 = 500 - 15 = 485
    expect(getTotalRealizedProfit(trades)).toBe(485);
  });
});

describe('portfolioEngine — calculations (PRD v1.2 §3/§4)', () => {
  it('Market Value = Quantity x Current Price', () => {
    expect(
      calculateMarketValue({
        id: 'x',
        portfolioId: 'p1',
        assetId: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currentPrice: 120,
      }),
    ).toBe(1200);
  });

  it('Unrealized Profit = (Current Price - Average Price) x Quantity', () => {
    expect(
      calculateUnrealizedProfit({
        id: 'x',
        portfolioId: 'p1',
        assetId: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currentPrice: 120,
      }),
    ).toBe(200);
  });

  it('Portfolio Value = Cash + Sum(Market Value)', () => {
    const positions = [
      { id: '1', portfolioId: 'p1', assetId: 'AAPL', quantity: 10, averagePrice: 100, currentPrice: 120 },
      { id: '2', portfolioId: 'p1', assetId: 'MSFT', quantity: 5, averagePrice: 300, currentPrice: 310 },
    ];
    expect(calculatePortfolioValue(positions, 1000)).toBe(1000 + 1200 + 1550);
  });

  it('Invested Capital = Sum(Quantity x Average Price)', () => {
    const positions = [
      { id: '1', portfolioId: 'p1', assetId: 'AAPL', quantity: 10, averagePrice: 100, currentPrice: 120 },
    ];
    expect(calculateInvestedCapital(positions)).toBe(1000);
  });

  it('Weight = Market Value / Total Portfolio Value', () => {
    const position = {
      id: '1',
      portfolioId: 'p1',
      assetId: 'AAPL',
      quantity: 10,
      averagePrice: 100,
      currentPrice: 120,
    };
    expect(calculatePositionWeight(position, 1200)).toBe(1);
    expect(calculatePositionWeight(position, 2400)).toBe(0.5);
  });
});

describe('portfolioEngine — cash balance (PRD v1.2 §2)', () => {
  it('computes cash as opening + deposits - withdrawals - purchases + sales + dividends + interest - fees - taxes', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', type: 'BUY', quantity: 10, price: 100, fees: 1, taxes: 0 }),
      makeTrade({ id: '2', type: 'SELL', quantity: 5, price: 120, fees: 1, taxes: 2 }),
    ];
    const cashMovements: CashMovement[] = [
      { id: 'c1', portfolioId: 'p1', type: 'DEPOSIT', amount: 5000, currency: 'EUR', date: '2024-01-01' },
      { id: 'c2', portfolioId: 'p1', type: 'WITHDRAWAL', amount: 200, currency: 'EUR', date: '2024-01-02' },
      { id: 'c3', portfolioId: 'p1', type: 'DIVIDEND', amount: 15, currency: 'EUR', date: '2024-01-03' },
      { id: 'c4', portfolioId: 'p1', type: 'INTEREST', amount: 3, currency: 'EUR', date: '2024-01-04' },
      { id: 'c5', portfolioId: 'p1', type: 'FEE', amount: 2, currency: 'EUR', date: '2024-01-05' },
      { id: 'c6', portfolioId: 'p1', type: 'TAX', amount: 4, currency: 'EUR', date: '2024-01-06' },
    ];

    const openingCash = 0;
    const purchases = 10 * 100 + 1; // 1001
    const sales = 5 * 120 - 1 - 2; // 597
    const expected =
      openingCash + 5000 - 200 - purchases + sales + 15 + 3 - 2 - 4;

    expect(calculateCashBalance(openingCash, trades, cashMovements)).toBeCloseTo(expected, 6);
  });
});

describe('portfolioEngine — rebuildPortfolio integration', () => {
  it('produces a fully consistent snapshot from raw transaction history', () => {
    const snapshot: PortfolioSnapshot = {
      portfolio: { id: 'p1', name: 'Main', baseCurrency: 'EUR', cashBalance: 0, createdAt: '2024-01-01' },
      trades: [makeTrade({ id: '1', quantity: 10, price: 100 })],
      dividends: [],
      cashMovements: [
        { id: 'c1', portfolioId: 'p1', type: 'DEPOSIT', amount: 2000, currency: 'EUR', date: '2024-01-01' },
      ],
      assets: [
        {
          id: 'AAPL',
          ticker: 'AAPL',
          isin: null,
          name: 'Apple Inc.',
          assetType: 'STOCK',
          exchange: 'NASDAQ',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          currency: 'USD',
        },
      ],
      quotes: [{ assetId: 'AAPL', price: 120, change: 0, changePercent: 0, timestamp: '2024-06-01' }],
    };

    const result = rebuildPortfolio(snapshot);
    expect(result.positions).toHaveLength(1);
    expect(result.cash).toBe(2000 - 1000);
    expect(result.portfolioValue).toBe(1000 + 1200);
    expect(result.investedCapital).toBe(1000);
  });
});
