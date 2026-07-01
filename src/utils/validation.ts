import type { Currency, Trade, Dividend } from '../types/domain';

/**
 * Validation Rules — PRD v1.2 §7.
 * Every rule here throws a ValidationError with a stable `code` so that
 * callers (import wizard, forms) can map errors to user-facing messages.
 */

export class ValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ValidationError';
  }
}

const SUPPORTED_CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF'];

export function isSupportedCurrency(currency: string): currency is Currency {
  return (SUPPORTED_CURRENCIES as string[]).includes(currency);
}

export function assertValidTrade(trade: Trade, now: Date = new Date()): void {
  if (!trade.assetId) {
    throw new ValidationError('TICKER_REQUIRED', 'Ticker is mandatory.');
  }
  if (!(trade.quantity > 0)) {
    throw new ValidationError(
      'QUANTITY_MUST_BE_POSITIVE',
      'Quantity must be greater than zero for Buy/Sell.',
    );
  }
  if (!(trade.price > 0)) {
    throw new ValidationError('PRICE_MUST_BE_POSITIVE', 'Price must be positive.');
  }
  if (trade.fees < 0) {
    throw new ValidationError('COMMISSION_NEGATIVE', 'Commission cannot be negative.');
  }
  if (trade.taxes < 0) {
    throw new ValidationError('TAX_NEGATIVE', 'Taxes cannot be negative.');
  }
  if (new Date(trade.date).getTime() > now.getTime()) {
    throw new ValidationError('DATE_IN_FUTURE', 'Trade date cannot be in the future.');
  }
}

export function assertValidDividend(dividend: Dividend): void {
  if (!(dividend.gross > 0)) {
    throw new ValidationError(
      'DIVIDEND_MUST_BE_POSITIVE',
      'Dividend amount must be positive.',
    );
  }
  if (!dividend.assetId) {
    throw new ValidationError('TICKER_REQUIRED', 'Ticker is mandatory.');
  }
}

export function assertValidCurrency(currency: string): asserts currency is Currency {
  if (!isSupportedCurrency(currency)) {
    throw new ValidationError(
      'UNSUPPORTED_CURRENCY',
      `Currency "${currency}" is not supported.`,
    );
  }
}

/**
 * Business Rule (PRD v1.2 §2): negative quantities are not allowed.
 * Used by the Portfolio Engine when replaying a Sell against a position.
 */
export function assertSellDoesNotExceedHolding(
  currentQuantity: number,
  sellQuantity: number,
  assetId: string,
): void {
  if (sellQuantity > currentQuantity + 1e-9) {
    throw new ValidationError(
      'NEGATIVE_QUANTITY',
      `Sell quantity (${sellQuantity}) exceeds current holding (${currentQuantity}) for asset ${assetId}. Negative quantities are not allowed.`,
    );
  }
}
