import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { KeyRound } from 'lucide-react';
import { useMarketDataApiKey } from '../../hooks/useMarketDataApiKey';
import { useAssetTimeSeries } from '../../hooks/useAssetTimeSeries';
import { calculateSMA } from '../../services/engines/signalEngine';
import { MarketDataError } from '../../services/marketdata/twelveDataClient';

export function PriceChartTab({ ticker }: { ticker: string }) {
  const { apiKey } = useMarketDataApiKey();
  const { data, isLoading, error } = useAssetTimeSeries(ticker, apiKey);

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
        <KeyRound size={20} className="text-text-faint" />
        <p className="text-sm text-text-muted">
          Connect a Twelve Data API key to see a real price chart.
        </p>
        <Link to="/settings" className="text-sm text-accent hover:underline">
          Go to Settings
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-text-muted">Loading price history…</p>;
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-negative">
        {error instanceof MarketDataError ? error.message : 'Failed to load price history.'}
      </p>
    );
  }

  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">No price history available for {ticker}.</p>;
  }

  const sma20 = calculateSMA(data, 20);
  const chartData = data.map((d, i) => ({ date: d.date, close: d.close, sma20: sma20[i] }));

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-text-muted">{ticker} — Daily Close (SMA 20)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b92a3' }} axisLine={{ stroke: '#1f2430' }} tickLine={false} minTickGap={30} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#8b92a3' }} axisLine={{ stroke: '#1f2430' }} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#12151c', border: '1px solid #1f2430', borderRadius: 6, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="close" stroke="#4f7cff" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="sma20" stroke="#f5a623" dot={false} strokeWidth={1} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
