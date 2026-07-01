import { Briefcase } from 'lucide-react';
import { PlaceholderPage } from '../components/PlaceholderPage';

export function PortfolioPage() {
  return (
    <PlaceholderPage
      icon={Briefcase}
      title="Portfolio"
      description="Full holdings table with grouping by Sector, Country, Asset Type and Currency."
      commitLabel="Coming in Commit 003 — Portfolio Module"
    />
  );
}
