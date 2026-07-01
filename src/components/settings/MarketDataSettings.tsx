import { useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useMarketDataApiKey } from '../../hooks/useMarketDataApiKey';
import { usePortfolioStore } from '../../store/portfolioStore';
import { fetchQuotes, MarketDataError } from '../../services/marketdata/twelveDataClient';

/**
 * Market Data settings (Commit 008b). Built ahead of the full Settings
 * page (Commit 010) because the API key needs a real home now that
 * market data integration exists — the rest of Settings stays a
 * placeholder, only this section is real.
 *
 * Key is stored in the browser (person's explicit choice — see
 * utils/apiKeyStorage.ts). Prices are refreshed manually via the button
 * below, not on a timer, to keep control over Twelve Data's free-tier
 * quota in the person's hands.
 */
export function MarketDataSettings() {
  const { apiKey, saveApiKey, clearApiKey } = useMarketDataApiKey();
  const assets = usePortfolioStore((s) => s.assets);
  const setQuotes = usePortfolioStore((s) => s.setQuotes);
  const quotes = usePortfolioStore((s) => s.quotes);

  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleRefresh() {
    if (!apiKey) return;
    setStatus('loading');
    setMessage('');
    try {
      const symbolMap = new Map(assets.map((a) => [a.ticker, a.id]));
      const fresh = await fetchQuotes(symbolMap, apiKey);
      setQuotes(fresh);
      setStatus('success');
      setMessage(`Updated ${fresh.length} quote${fresh.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof MarketDataError ? err.message : 'Failed to refresh prices.');
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold">Market Data — Twelve Data</h2>
      <p className="mb-3 text-xs text-text-muted">
        Stored in this browser only. Prices refresh manually to stay within the free-tier quota.
      </p>

      {!apiKey ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Twelve Data API key"
              className="w-full rounded-md border border-border bg-bg px-3 py-1.5 pr-8 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={() => inputValue.trim() && saveApiKey(inputValue.trim())}
            disabled={!inputValue.trim()}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted">
            <CheckCircle2 size={13} className="text-positive" />
            API key configured
          </span>
          <button
            onClick={handleRefresh}
            disabled={status === 'loading' || assets.length === 0}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
          >
            <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
            Refresh Prices
          </button>
          <button
            onClick={clearApiKey}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-hover"
          >
            Remove key
          </button>
        </div>
      )}

      {status === 'success' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-positive">
          <CheckCircle2 size={13} />
          {message}
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-negative">
          <XCircle size={13} />
          {message}
        </p>
      )}
      {apiKey && assets.length === 0 && (
        <p className="mt-2 text-xs text-text-faint">No known assets yet to fetch quotes for.</p>
      )}
      {quotes.length > 0 && (
        <p className="mt-2 text-xs text-text-faint">
          Last refresh covered {quotes.length} asset{quotes.length === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  );
}
