import { ArrowLeftRight } from 'lucide-react';
import { PlaceholderPage } from '../components/PlaceholderPage';

export function TransactionsPage() {
  return (
    <PlaceholderPage
      icon={ArrowLeftRight}
      title="Transactions"
      description="Trade Republic CSV import wizard with validation and duplicate detection."
      commitLabel="Coming in Commit 004 — CSV Import"
    />
  );
}
