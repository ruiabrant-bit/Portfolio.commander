import { describe, it, expect } from 'vitest';
import {
  parseLocaleNumber,
  parseFlexibleDate,
  mapRowsToImportResult,
  getDistinctTypeValues,
  EMPTY_MAPPING,
  type ColumnMapping,
} from '../../services/import/importMapper';
import { fnv1aHash } from '../../utils/hash';

describe('parseLocaleNumber', () => {
  it('parses plain decimal numbers', () => {
    expect(parseLocaleNumber('123.45')).toBe(123.45);
  });

  it('parses EU-style comma decimals', () => {
    expect(parseLocaleNumber('123,45')).toBe(123.45);
  });

  it('parses EU-style thousands + decimal comma', () => {
    expect(parseLocaleNumber('1.234,56')).toBe(1234.56);
  });

  it('parses US-style thousands + decimal dot', () => {
    expect(parseLocaleNumber('1,234.56')).toBe(1234.56);
  });

  it('strips currency symbols', () => {
    expect(parseLocaleNumber('€ 99,90')).toBe(99.9);
  });

  it('returns NaN for empty/undefined input', () => {
    expect(Number.isNaN(parseLocaleNumber(undefined))).toBe(true);
    expect(Number.isNaN(parseLocaleNumber(''))).toBe(true);
  });
});

describe('parseFlexibleDate', () => {
  it('parses ISO dates', () => {
    expect(parseFlexibleDate('2024-03-15')).toBe('2024-03-15');
  });

  it('parses DD.MM.YYYY (common EU export format)', () => {
    expect(parseFlexibleDate('15.03.2024')).toBe('2024-03-15');
  });

  it('parses DD/MM/YYYY', () => {
    expect(parseFlexibleDate('05/01/2024')).toBe('2024-01-05');
  });

  it('returns null for unparseable input', () => {
    expect(parseFlexibleDate('not-a-date')).toBeNull();
    expect(parseFlexibleDate(undefined)).toBeNull();
  });
});

describe('getDistinctTypeValues', () => {
  it('returns unique, trimmed values from the mapped type column', () => {
    const rows = [{ Type: 'Kauf' }, { Type: 'Verkauf' }, { Type: 'Kauf' }, { Type: ' Dividende ' }];
    expect(getDistinctTypeValues(rows, 'Type')).toEqual(['Kauf', 'Verkauf', 'Dividende']);
  });

  it('returns an empty array when no column is mapped', () => {
    expect(getDistinctTypeValues([{ Type: 'Kauf' }], null)).toEqual([]);
  });
});

const baseMapping: ColumnMapping = {
  ...EMPTY_MAPPING,
  date: 'Date',
  type: 'Type',
  ticker: 'Ticker',
  quantity: 'Qty',
  price: 'Price',
  fees: 'Fees',
  amount: 'Amount',
};

describe('mapRowsToImportResult', () => {
  it('maps a Buy row into a valid Trade and creates the referenced Asset', () => {
    const rows = [{ Date: '2024-01-10', Type: 'Kauf', Ticker: 'AAPL', Qty: '10', Price: '150.5', Fees: '1' }];
    const result = mapRowsToImportResult({
      rows,
      mapping: baseMapping,
      typeValueMap: { Kauf: 'BUY' },
      baseCurrency: 'EUR',
      portfolioId: 'p1',
      knownAssetIds: new Set(),
      knownImportHashes: new Set(),
    });

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].type).toBe('BUY');
    expect(result.trades[0].quantity).toBe(10);
    expect(result.newAssets).toHaveLength(1);
    expect(result.rowResults[0].status).toBe('ok');
  });

  it('ignores rows whose type is not mapped to a category', () => {
    const rows = [{ Date: '2024-01-10', Type: 'Unknown Event', Ticker: 'AAPL', Qty: '10', Price: '150' }];
    const result = mapRowsToImportResult({
      rows,
      mapping: baseMapping,
      typeValueMap: {},
      baseCurrency: 'EUR',
      portfolioId: 'p1',
      knownAssetIds: new Set(),
      knownImportHashes: new Set(),
    });
    expect(result.trades).toHaveLength(0);
    expect(result.rowResults[0].status).toBe('ignored');
  });

  it('flags rows whose importHash is already known as duplicates and skips them', () => {
    const row = { Date: '2024-01-10', Type: 'Kauf', Ticker: 'AAPL', Qty: '10', Price: '150' };
    const rows = [row];
    // Compute the same hash the mapper would compute for this exact row.
    const hash = fnv1aHash(JSON.stringify(row));

    const result = mapRowsToImportResult({
      rows,
      mapping: baseMapping,
      typeValueMap: { Kauf: 'BUY' },
      baseCurrency: 'EUR',
      portfolioId: 'p1',
      knownAssetIds: new Set(),
      knownImportHashes: new Set([hash]),
    });
    expect(result.trades).toHaveLength(0);
    expect(result.rowResults[0].status).toBe('duplicate');
  });

  it('reports validation errors per row instead of throwing (PRD v1.2 §7)', () => {
    const rows = [{ Date: '2024-01-10', Type: 'Kauf', Ticker: 'AAPL', Qty: '-5', Price: '150' }];
    const result = mapRowsToImportResult({
      rows,
      mapping: baseMapping,
      typeValueMap: { Kauf: 'BUY' },
      baseCurrency: 'EUR',
      portfolioId: 'p1',
      knownAssetIds: new Set(),
      knownImportHashes: new Set(),
    });
    expect(result.trades).toHaveLength(0);
    expect(result.rowResults[0].status).toBe('error');
    expect(result.rowResults[0].message).toBeDefined();
  });

  it('maps a Deposit row into a CashMovement', () => {
    const rows = [{ Date: '2024-01-01', Type: 'Deposit', Amount: '1000' }];
    const result = mapRowsToImportResult({
      rows,
      mapping: baseMapping,
      typeValueMap: { Deposit: 'DEPOSIT' },
      baseCurrency: 'EUR',
      portfolioId: 'p1',
      knownAssetIds: new Set(),
      knownImportHashes: new Set(),
    });
    expect(result.cashMovements).toHaveLength(1);
    expect(result.cashMovements[0].type).toBe('DEPOSIT');
    expect(result.cashMovements[0].amount).toBe(1000);
  });

  it('does not duplicate an Asset that already exists in the store', () => {
    const rows = [{ Date: '2024-01-10', Type: 'Kauf', Ticker: 'AAPL', Qty: '10', Price: '150' }];
    const result = mapRowsToImportResult({
      rows,
      mapping: baseMapping,
      typeValueMap: { Kauf: 'BUY' },
      baseCurrency: 'EUR',
      portfolioId: 'p1',
      knownAssetIds: new Set(['AAPL']),
      knownImportHashes: new Set(),
    });
    expect(result.newAssets).toHaveLength(0);
  });
});
