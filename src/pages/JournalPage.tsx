import { NotebookPen } from 'lucide-react';
import { PlaceholderPage } from '../components/PlaceholderPage';

export function JournalPage() {
  return (
    <PlaceholderPage
      icon={NotebookPen}
      title="Journal"
      description="Investment thesis, screenshots, lessons learned and review dates per position."
      commitLabel="Coming in Commit 003 — Portfolio Module"
    />
  );
}
