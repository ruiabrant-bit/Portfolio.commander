import { Settings } from 'lucide-react';
import { MarketDataSettings } from '../components/settings/MarketDataSettings';

/**
 * Settings (PRD v1.1/v1.3): base currency, theme, import/export,
 * backup/restore. Full implementation is Commit 010 — Polish. The
 * Market Data section below is a deliberate, documented exception: it
 * was built in Commit 008b because the Twelve Data API key needed a
 * real home once market data integration existed, ahead of the rest of
 * Settings.
 */
export function SettingsPage() {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Settings</h1>

      <div className="mb-4">
        <MarketDataSettings />
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
        <Settings size={20} className="text-text-faint" />
        <div>
          <p className="text-sm font-medium">Base currency, theme, import/export, backup/restore</p>
          <p className="mt-1 text-sm text-text-muted">Coming in Commit 010 — Polish.</p>
        </div>
      </div>
    </div>
  );
}
