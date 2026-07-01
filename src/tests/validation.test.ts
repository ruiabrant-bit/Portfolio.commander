import { describe, it, expect } from 'vitest';
import {
  assertValidTrade,
  assertValidDividend,
  assertValidCurrency,
  assertSellDoesNotExceedHolding,
  ValidationError,
} from '../utils/validation';
import type { Trade, Dividend } from '../types/domain';

function baseTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: '1',
    portfolioId: 'p1',
    assetId: 'AAPL',
    type: 'BUY',
    quantity: 10,
    price: 100,
    fees: 0,
    taxes: 0,
    date: '2024-01-01',
    ...overrides,
  };
}

describe('validation — trades (PRD v1.2 §7)', () => {
  it('accepts a valid trade', () => {
    expect(() => assertValidTrade(baseTrade())).not.toThrow();
  });

  it('rejects missing ticker (assetId)', () => {
    expect(() => assertValidTrade(baseTrade({ assetId: '' }))).toThrow(ValidationError);
  });

  it('rejects quantity <= 0', () => {
    expect(() => assertValidTrade(baseTrade({ quantity: 0 }))).toThrow(ValidationError);
    expect(() => assertValidTrade(baseTrade({ quantity: -5 }))).toThrow(ValidationError);
  });

  it('rejects non-positive price', () => {
    expect(() => assertValidTrade(baseTrade({ price: 0 }))).toThrow(ValidationError);
  });

  it('rejects negative commission (fees)', () => {
    expect(() => assertValidTrade(baseTrade({ fees: -1 }))).toThrow(ValidationError);
  });

  it('rejects a trade date in the future', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(() =>
      assertValidTrade(baseTrade({ date: future.toISOString() })),
    ).toThrow(ValidationError);
  });
});

describe('validation — dividends', () => {
  it('rejects a non-positive dividend amount', () => {
    const dividend: Dividend = {
      id: 'd1',
      portfolioId: 'p1',
      assetId: 'AAPL',
      gross: 0,
      net: 0,
      tax: 0,
      paymentDate: '2024-01-01',
    };
    expect(() => assertValidDividend(dividend)).toThrow(ValidationError);
  });
});

describe('validation — currency', () => {
  it('accepts supported currencies', () => {
    expect(() => assertValidCurrency('EUR')).not.toThrow();
  });

  it('rejects unsupported currencies', () => {
    expect(() => assertValidCurrency('JPY')).toThrow(ValidationError);
  });
});

describe('validation — negative quantity guard (PRD v1.2 §2)', () => {
  it('throws when selling more than currently held', () => {
    expect(() => assertSellDoesNotExceedHolding(5, 10, 'AAPL')).toThrow(ValidationError);
  });

  it('allows selling exactly the full holding', () => {
    expect(() => assertSellDoesNotExceedHolding(10, 10, 'AAPL')).not.toThrow();
  });
});
