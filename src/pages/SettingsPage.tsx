import { MarketDataSettings } from '../components/settings/MarketDataSettings';
import { NewsSettings } from '../components/settings/NewsSettings';
import { GeneralSettings } from '../components/settings/GeneralSettings';

/**
 * Settings (PRD v1.1/v1.3): Base currency, Theme, Import/Export,
 * Backup/Restore, Application preferences (Market Data / News API keys
 * count as application preferences). Completed in Commit 010 — no
 * longer a placeholder page, satisfying the Definition of Done rule
 * "no placeholder pages in completed modules".
 */
export function SettingsPage() {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Settings</h1>
      <div className="flex max-w-2xl flex-col gap-4">
        <GeneralSettings />
        <MarketDataSettings />
        <NewsSettings />
      </div>
    </div>
  );
}
