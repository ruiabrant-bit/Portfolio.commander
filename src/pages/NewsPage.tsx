import { Newspaper } from 'lucide-react';
import { PlaceholderPage } from '../components/PlaceholderPage';

export function NewsPage() {
  return (
    <PlaceholderPage
      icon={Newspaper}
      title="News"
      description="Portfolio-relevant news feed, prioritized by your current holdings."
      commitLabel="Coming in Commit 009 — News & Calendar"
    />
  );
}
