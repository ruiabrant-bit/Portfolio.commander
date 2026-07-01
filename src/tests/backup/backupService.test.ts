import { describe, it, expect } from 'vitest';
import { serializeBackup, parseBackup, BackupValidationError } from '../../services/backup/backupService';
import type { PersistedSnapshot } from '../../store/portfolioStore';

const snapshot: PersistedSnapshot = {
  portfolio: { id: 'p1', name: 'Main', baseCurrency: 'EUR', cashBalance: 0, createdAt: '2024-01-01' },
  assets: [],
  trades: [],
  dividends: [],
  cashMovements: [],
  watchlists: [],
  watchlistItems: [],
  journalEntries: [],
};

describe('serializeBackup / parseBackup round-trip', () => {
  it('round-trips a snapshot without data loss', () => {
    const json = serializeBackup(snapshot);
    const restored = parseBackup(json);
    expect(restored).toEqual(snapshot);
  });

  it('includes a version and exportedAt timestamp in the serialized file', () => {
    const json = serializeBackup(snapshot);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(typeof parsed.exportedAt).toBe('string');
  });
});

describe('parseBackup validation', () => {
  it('rejects invalid JSON', () => {
    expect(() => parseBackup('not json')).toThrow(BackupValidationError);
  });

  it('rejects a file with no version field', () => {
    expect(() => parseBackup(JSON.stringify({ data: {} }))).toThrow(BackupValidationError);
  });

  it('rejects a file with no data section', () => {
    expect(() => parseBackup(JSON.stringify({ version: 1 }))).toThrow(BackupValidationError);
  });

  it('rejects a file missing a required array field', () => {
    const broken = { version: 1, data: { ...snapshot, trades: undefined } };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(BackupValidationError);
  });

  it('accepts a null portfolio (fresh install backup)', () => {
    const withNullPortfolio = { version: 1, data: { ...snapshot, portfolio: null } };
    const result = parseBackup(JSON.stringify(withNullPortfolio));
    expect(result.portfolio).toBeNull();
  });
});
