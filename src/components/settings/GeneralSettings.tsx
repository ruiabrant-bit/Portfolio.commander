import { useRef, useState } from 'react';
import { Download, Upload, Sun, Moon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useTheme } from '../../hooks/useTheme';
import { downloadBackup, parseBackup, BackupValidationError } from '../../services/backup/backupService';
import type { Currency } from '../../types/domain';

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF'];

/**
 * General Settings (PRD v1.1): Base currency, Theme, Import/Export,
 * Backup/Restore.
 *
 * Honesty note on Base Currency: changing it only relabels totals in
 * the UI (KPI cards, etc.) — no currency conversion is performed
 * between assets/cash held in different currencies. There's no FX rate
 * model anywhere in the app. Stated here rather than implying real
 * multi-currency support that doesn't exist.
 */
export function GeneralSettings() {
  const portfolio = usePortfolioStore((s) => s.portfolio);
  const setPortfolio = usePortfolioStore((s) => s.setPortfolio);
  const restoreAll = usePortfolioStore((s) => s.restoreAll);

  const { theme, setTheme } = useTheme();

  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');
  const [confirmingRestore, setConfirmingRestore] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const state = usePortfolioStore.getState();
    downloadBackup({
      portfolio: state.portfolio,
      assets: state.assets,
      trades: state.trades,
      dividends: state.dividends,
      cashMovements: state.cashMovements,
      watchlists: state.watchlists,
      watchlistItems: state.watchlistItems,
      journalEntries: state.journalEntries,
    });
  }

  function handleFileSelected(file: File) {
    // Never overwrite without confirmation — same principle as CSV import (PRD v1.2 §1).
    setConfirmingRestore(file);
  }

  async function confirmRestore() {
    if (!confirmingRestore) return;
    try {
      const text = await confirmingRestore.text();
      const snapshot = parseBackup(text);
      restoreAll(snapshot);
      setRestoreStatus('success');
      setRestoreMessage('Backup restored.');
    } catch (err) {
      setRestoreStatus('error');
      setRestoreMessage(err instanceof BackupValidationError ? err.message : 'Failed to restore backup.');
    } finally {
      setConfirmingRestore(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Base Currency</h2>
        <select
          value={portfolio?.baseCurrency ?? 'EUR'}
          onChange={(e) =>
            portfolio && setPortfolio({ ...portfolio, baseCurrency: e.target.value as Currency })
          }
          className="rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-text-faint">
          Relabels totals only — no currency conversion is performed between assets or cash held
          in different currencies. There's no FX rate source wired into the app.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Theme</h2>
        <div className="flex overflow-hidden rounded-md border border-border text-sm">
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-1.5 px-3 py-1.5 ${
              theme === 'dark' ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface-hover'
            }`}
          >
            <Moon size={13} /> Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1.5 px-3 py-1.5 ${
              theme === 'light' ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface-hover'
            }`}
          >
            <Sun size={13} /> Light
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold">Backup / Restore</h2>
        <p className="mb-3 text-xs text-text-muted">
          Exports everything (portfolio, transactions, watchlists, journal) as a JSON file.
          Separate from the automatic local storage — useful for moving to a new browser or
          keeping an off-device copy. Nothing here is ever sent to a server.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <Download size={14} /> Export Backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <Upload size={14} /> Restore from Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
          />
        </div>

        {restoreStatus === 'success' && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-positive">
            <CheckCircle2 size={13} /> {restoreMessage}
          </p>
        )}
        {restoreStatus === 'error' && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-negative">
            <AlertTriangle size={13} /> {restoreMessage}
          </p>
        )}
      </div>

      {confirmingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4">
            <div className="mb-2 flex items-center gap-2 text-negative">
              <AlertTriangle size={16} />
              <h3 className="text-sm font-semibold">Overwrite current data?</h3>
            </div>
            <p className="mb-4 text-sm text-text-muted">
              Restoring <span className="font-medium">{confirmingRestore.name}</span> will replace
              everything currently in the app — portfolio, transactions, watchlists and journal.
              This can't be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmingRestore(null)}
                className="rounded-md px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="rounded-md bg-negative px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                Overwrite and Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
