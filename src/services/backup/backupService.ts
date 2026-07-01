import type { PersistedSnapshot } from '../../store/portfolioStore';

/**
 * Backup/Restore (PRD v1.1 Settings). Separate from the automatic
 * localStorage persistence added in Commit 010 — this is a
 * user-triggered export/import of the same data, useful for moving to
 * a new browser/machine or keeping an off-device copy, since nothing
 * here syncs to any server (ADR-001, local-first).
 */

const BACKUP_VERSION = 1;

interface BackupFile {
  version: number;
  exportedAt: string;
  data: PersistedSnapshot;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export function serializeBackup(data: PersistedSnapshot): string {
  const file: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Parses and minimally validates a backup file's shape. Deliberately
 * shallow validation (checks the expected top-level arrays exist) —
 * this is a personal local backup tool, not a public import endpoint,
 * so it doesn't need PRD v1.2 §7-grade validation, but it must never
 * silently accept garbage and corrupt the store.
 */
export function parseBackup(json: string): PersistedSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BackupValidationError('This file is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BackupValidationError('Backup file is malformed.');
  }
  const file = parsed as Partial<BackupFile>;
  if (typeof file.version !== 'number') {
    throw new BackupValidationError('Backup file is missing a version — not a Portfolio Commander backup.');
  }
  if (!file.data || typeof file.data !== 'object') {
    throw new BackupValidationError('Backup file has no data section.');
  }

  const data = file.data as Partial<PersistedSnapshot>;
  const requiredArrayFields: (keyof PersistedSnapshot)[] = [
    'assets',
    'trades',
    'dividends',
    'cashMovements',
    'watchlists',
    'watchlistItems',
    'journalEntries',
  ];
  for (const field of requiredArrayFields) {
    if (!Array.isArray(data[field])) {
      throw new BackupValidationError(`Backup file is missing or has an invalid "${field}" field.`);
    }
  }

  return {
    portfolio: data.portfolio ?? null,
    assets: data.assets!,
    trades: data.trades!,
    dividends: data.dividends!,
    cashMovements: data.cashMovements!,
    watchlists: data.watchlists!,
    watchlistItems: data.watchlistItems!,
    journalEntries: data.journalEntries!,
  };
}

export function downloadBackup(data: PersistedSnapshot): void {
  const json = serializeBackup(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `portfolio-commander-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
