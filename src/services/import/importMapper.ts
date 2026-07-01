import type { Asset, Trade, Dividend, CashMovement, Currency } from '../../types/domain';
import { assertValidTrade, assertValidDividend, isSupportedCurrency, ValidationError } from '../../utils/validation';
import { fnv1aHash } from '../../utils/hash';

export type TransactionCategory =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'FEE'
  | 'TAX'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'IGNORE';

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  'BUY',
  'SELL',
  'DIVIDEND',
  'INTEREST',
  'FEE',
  'TAX',
  'DEPOSIT',
  'WITHDRAWAL',
  'IGNORE',
];

/** Semantic field -> CSV column header the user picked in the mapping step. */
export interface ColumnMapping {
  date: string | null;
  type: string | null;
  ticker: string | null;
  isin: string | null;
  name: string | null;
  quantity: string | null;
  price: string | null;
  fees: string | null;
  taxes: string | null;
  amount: string | null;
  currency: string | null;
}

export const EMPTY_MAPPING: ColumnMapping = {
  date: null,
  type: null,
  ticker: null,
  isin: null,
  name: null,
  quantity: null,
  price: null,
  fees: null,
  taxes: null,
  amount: null,
  currency: null,
};

export type TypeValueMap = Record<string, TransactionCategory>;

export interface RowResult {
  rowIndex: number;
  status: 'ok' | 'error' | 'duplicate' | 'ignored';
  category: TransactionCategory;
  message?: string;
}

export interface ImportResult {
  trades: Trade[];
  dividends: Dividend[];
  cashMovements: CashMovement[];
  newAssets: Asset[];
  rowResults: RowResult[];
}

/** Distinct raw values found in the mapped "type" column, for the type-mapping step. */
export function getDistinctTypeValues(
  rows: Record<string, string>[],
  typeColumn: string | null,
): string[] {
  if (!typeColumn) return [];
  const values = new Set<string>();
  for (const row of rows) {
    const v = row[typeColumn]?.trim();
    if (v) values.add(v);
  }
  return Array.from(values);
}

/**
 * Parses a locale-formatted number. Handles both "1234.56" and EU-style
 * "1.234,56" / "1234,56" by treating the last separator as decimal.
 */
export function parseLocaleNumber(raw: string | undefined): number {
  if (!raw) return NaN;
  const trimmed = raw.trim().replace(/[€$£\s]/g, '');
  if (trimmed === '') return NaN;

  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');

  let normalized = trimmed;
  if (lastComma > lastDot) {
    // comma is the decimal separator; dots (if any) are thousands separators
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // dot is the decimal separator; commas (if any) are thousands separators
    normalized = trimmed.replace(/,/g, '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

/** Parses ISO (YYYY-MM-DD) and common EU date formats (DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY). */
export function parseFlexibleDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return trimmed.slice(0, 10);

  const euMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

interface MapRowsArgs {
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  typeValueMap: TypeValueMap;
  baseCurrency: Currency;
  portfolioId: string;
  knownAssetIds: Set<string>;
  knownImportHashes: Set<string>;
}

/**
 * Maps parsed + column-mapped CSV rows into domain records. Every row is
 * validated per PRD v1.2 §7; rows that fail validation are reported in
 * `rowResults` rather than thrown, so the wizard can show a full preview
 * with only the failing rows highlighted (PRD v1.3: "duplicates
 * highlighted visually", "validates before import").
 */
export function mapRowsToImportResult({
  rows,
  mapping,
  typeValueMap,
  baseCurrency,
  portfolioId,
  knownAssetIds,
  knownImportHashes,
}: MapRowsArgs): ImportResult {
  const trades: Trade[] = [];
  const dividends: Dividend[] = [];
  const cashMovements: CashMovement[] = [];
  const newAssets: Asset[] = [];
  const seenAssetIds = new Set(knownAssetIds);
  const rowResults: RowResult[] = [];

  rows.forEach((row, rowIndex) => {
    const rawType = mapping.type ? row[mapping.type]?.trim() ?? '' : '';
    const category = typeValueMap[rawType] ?? 'IGNORE';

    if (category === 'IGNORE') {
      rowResults.push({ rowIndex, status: 'ignored', category });
      return;
    }

    const importHash = fnv1aHash(JSON.stringify(row));
    if (knownImportHashes.has(importHash)) {
      rowResults.push({ rowIndex, status: 'duplicate', category });
      return;
    }

    const dateISO = parseFlexibleDate(mapping.date ? row[mapping.date] : undefined);
    if (!dateISO) {
      rowResults.push({ rowIndex, status: 'error', category, message: 'Unrecognized or missing date.' });
      return;
    }

    const currencyRaw = mapping.currency ? row[mapping.currency]?.trim() : undefined;
    const currency: Currency =
      currencyRaw && isSupportedCurrency(currencyRaw) ? currencyRaw : baseCurrency;

    try {
      if (category === 'BUY' || category === 'SELL') {
        const ticker = mapping.ticker ? row[mapping.ticker]?.trim() : undefined;
        const isin = mapping.isin ? row[mapping.isin]?.trim() : undefined;
        const assetId = ticker || isin;
        if (!assetId) throw new ValidationError('TICKER_REQUIRED', 'Ticker is mandatory.');

        const quantity = parseLocaleNumber(mapping.quantity ? row[mapping.quantity] : undefined);
        const price = parseLocaleNumber(mapping.price ? row[mapping.price] : undefined);
        const fees = mapping.fees ? parseLocaleNumber(row[mapping.fees]) || 0 : 0;
        const taxes = mapping.taxes ? parseLocaleNumber(row[mapping.taxes]) || 0 : 0;

        const trade: Trade = {
          id: crypto.randomUUID(),
          portfolioId,
          assetId,
          type: category,
          quantity,
          price,
          fees,
          taxes,
          date: dateISO,
          importHash,
        };
        assertValidTrade(trade);
        trades.push(trade);
        ensureAsset(assetId, ticker, isin, mapping.name ? row[mapping.name] : undefined, currency);
      } else if (category === 'DIVIDEND') {
        const ticker = mapping.ticker ? row[mapping.ticker]?.trim() : undefined;
        const isin = mapping.isin ? row[mapping.isin]?.trim() : undefined;
        const assetId = ticker || isin;
        if (!assetId) throw new ValidationError('TICKER_REQUIRED', 'Ticker is mandatory.');

        const net = parseLocaleNumber(mapping.amount ? row[mapping.amount] : undefined);
        const tax = mapping.taxes ? parseLocaleNumber(row[mapping.taxes]) || 0 : 0;

        const dividend: Dividend = {
          id: crypto.randomUUID(),
          portfolioId,
          assetId,
          gross: net + tax,
          net,
          tax,
          paymentDate: dateISO,
          importHash,
        };
        assertValidDividend(dividend);
        dividends.push(dividend);
        ensureAsset(assetId, ticker, isin, mapping.name ? row[mapping.name] : undefined, currency);
      } else {
        // INTEREST / FEE / TAX / DEPOSIT / WITHDRAWAL — cash movements
        const amount = Math.abs(parseLocaleNumber(mapping.amount ? row[mapping.amount] : undefined));
        if (!(amount > 0)) {
          throw new ValidationError('AMOUNT_MUST_BE_POSITIVE', 'Amount must be positive.');
        }
        cashMovements.push({
          id: crypto.randomUUID(),
          portfolioId,
          type: category,
          amount,
          currency,
          date: dateISO,
          importHash,
        });
      }

      rowResults.push({ rowIndex, status: 'ok', category });
    } catch (err) {
      const message = err instanceof ValidationError ? err.message : 'Invalid row.';
      rowResults.push({ rowIndex, status: 'error', category, message });
    }
  });

  function ensureAsset(
    assetId: string,
    ticker: string | undefined,
    isin: string | undefined,
    name: string | undefined,
    currency: Currency,
  ) {
    if (seenAssetIds.has(assetId)) return;
    seenAssetIds.add(assetId);
    newAssets.push({
      id: assetId,
      ticker: ticker || assetId,
      isin: isin || null,
      name: name || ticker || assetId,
      assetType: 'STOCK',
      exchange: null,
      sector: null,
      industry: null,
      currency,
    });
  }

  return { trades, dividends, cashMovements, newAssets, rowResults };
}
