/**
 * Domain Model types.
 * Source of truth: Portfolio_Commander_ADR_Data_Model_v1_0.
 *
 * These types are intentionally plain data shapes (no class behaviour).
 * All behaviour / calculations live in services/engines (ADR-004).
 */

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

export type AssetType = 'STOCK' | 'ETF' | 'CASH' | 'CRYPTO' | 'BOND';

export type TradeType = 'BUY' | 'SELL';

export type CashMovementType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'FEE'
  | 'TAX';

export interface Portfolio {
  id: string;
  name: string;
  baseCurrency: Currency;
  cashBalance: number;
  createdAt: string; // ISO date
}

export interface Asset {
  id: string;
  ticker: string;
  isin: string | null;
  name: string;
  assetType: AssetType;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  currency: Currency;
}

/**
 * Position is a DERIVED entity: it must always be reconstructible from
 * the Trade history of a given Asset within a Portfolio (ADR-005).
 * It is never edited directly.
 */
export interface Position {
  id: string;
  portfolioId: string;
  assetId: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
}

export interface Trade {
  id: string;
  portfolioId: string;
  assetId: string;
  type: TradeType;
  quantity: number;
  price: number;
  fees: number;
  taxes: number;
  date: string; // ISO date
  /** Import de-duplication key (e.g. hash of raw Trade Republic row). */
  importHash?: string;
}

export interface Dividend {
  id: string;
  portfolioId: string;
  assetId: string;
  gross: number;
  net: number;
  tax: number;
  paymentDate: string; // ISO date
  importHash?: string;
}

export interface CashMovement {
  id: string;
  portfolioId: string;
  type: CashMovementType;
  amount: number;
  currency: Currency;
  date: string; // ISO date
  importHash?: string;
}

export interface Watchlist {
  id: string;
  name: string;
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  assetId: string;
  order: number;
  tags: string[];
  isFavorite: boolean;
}

export interface JournalEntry {
  id: string;
  assetId: string;
  title: string;
  notes: string;
  createdAt: string; // ISO date
}

export interface MarketQuote {
  assetId: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string; // ISO date
}

/**
 * Aggregate input bundle most Commander Core engines operate on.
 * Keeping this explicit avoids engines reaching into a global store,
 * which keeps business logic testable in isolation (ADR-004).
 */
export interface PortfolioSnapshot {
  portfolio: Portfolio;
  trades: Trade[];
  dividends: Dividend[];
  cashMovements: CashMovement[];
  assets: Asset[];
  quotes: MarketQuote[];
}
