import { useParams } from 'react-router-dom';
import { LineChart } from 'lucide-react';
import { PlaceholderPage } from '../components/PlaceholderPage';

export function PositionDetailPage() {
  const { assetId } = useParams();
  return (
    <PlaceholderPage
      icon={LineChart}
      title={assetId ? `Position — ${assetId}` : 'Position Detail'}
      description="Chart, thesis, personal notes and performance breakdown for this position."
      commitLabel="Coming in Commit 003 — Portfolio Module"
    />
  );
}
