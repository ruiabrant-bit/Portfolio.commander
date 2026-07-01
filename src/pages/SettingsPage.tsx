import { Settings } from 'lucide-react';
import { PlaceholderPage } from '../components/PlaceholderPage';

export function SettingsPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      title="Settings"
      description="Base currency, theme, import/export and backup/restore."
      commitLabel="Coming in Commit 010 — Polish"
    />
  );
}
