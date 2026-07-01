import { FileBarChart } from 'lucide-react';
import { PlaceholderPage } from '../components/PlaceholderPage';

export function ReportsPage() {
  return (
    <PlaceholderPage
      icon={FileBarChart}
      title="Reports"
      description="Monthly/annual performance, allocation, dividend and sector/country exposure reports."
      commitLabel="Coming in Commit 006 — Reports"
    />
  );
}
