import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useMarketDataApiKey } from '../../hooks/useMarketDataApiKey';
import { useAssetTimeSeries } from '../../hooks/useAssetTimeSeries';
import {
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateBollingerBands,
} from '../../services/engines/signalEngine';
import { MarketDataError } from '../../services/marketdata/twelveDataClient';

function lastDefined(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null) return values[i];
  }
  return null;
}

export function TechnicalAnalysisTab({ ticker }: { ticker: string }) {
  const { apiKey } = useMarketDataApiKey();
  const { data, isLoading, error } = useAssetTimeSeries(ticker, apiKey);

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
        <KeyRound size={20} className="text-text-faint" />
        <p className="text-sm text-text-muted">
          Connect a Twelve Data API key to compute real indicator values.
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

  if (!data || data.length < 30) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        Not enough price history yet for {ticker} to compute indicators reliably.
      </p>
    );
  }

  const rsi = lastDefined(calculateRSI(data, 14));
  const macd = calculateMACD(data);
  const macdLast = lastDefined(macd.macdLine);
  const signalLast = lastDefined(macd.signalLine);
  const atr = lastDefined(calculateATR(data, 14));
  const bb = calculateBollingerBands(data, 20, 2);
  const bbUpper = lastDefined(bb.upper);
  const bbLower = lastDefined(bb.lower);
  const lastClose = data[data.length - 1].close;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat label="RSI (14)" value={rsi === null ? '—' : rsi.toFixed(1)} hint={rsiHint(rsi)} />
      <Stat
        label="MACD"
        value={macdLast === null ? '—' : macdLast.toFixed(2)}
        hint={macdLast !== null && signalLast !== null ? (macdLast > signalLast ? 'Above signal' : 'Below signal') : undefined}
      />
      <Stat label="ATR (14)" value={atr === null ? '—' : atr.toFixed(2)} hint="Average true range" />
      <Stat
        label="Bollinger Upper"
        value={bbUpper === null ? '—' : bbUpper.toFixed(2)}
        hint={bbUpper !== null && lastClose > bbUpper ? 'Price above band' : undefined}
      />
      <Stat
        label="Bollinger Lower"
        value={bbLower === null ? '—' : bbLower.toFixed(2)}
        hint={bbLower !== null && lastClose < bbLower ? 'Price below band' : undefined}
      />
      <Stat label="Last Close" value={lastClose.toFixed(2)} />
    </div>
  );
}

function rsiHint(rsi: number | null): string | undefined {
  if (rsi === null) return undefined;
  if (rsi >= 70) return 'Overbought territory';
  if (rsi <= 30) return 'Oversold territory';
  return undefined;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="font-data mt-1 text-lg">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-text-faint">{hint}</div>}
    </div>
  );
}
