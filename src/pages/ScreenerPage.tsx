import { SlidersHorizontal } from 'lucide-react';
import { PlaceholderPage } from '../components/PlaceholderPage';

export function ScreenerPage() {
  return (
    <PlaceholderPage
      icon={SlidersHorizontal}
      title="Screener"
      description="Fundamental filters (Market Cap, P/E, ROE…) and technical filters (RSI, MACD, EMA…)."
      commitLabel="Coming in Commit 008 — Technical Analysis"
    />
  );
}
