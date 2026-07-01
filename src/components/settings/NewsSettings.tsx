import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useFinnhubApiKey } from '../../hooks/useFinnhubApiKey';

/**
 * News & Calendar settings (Commit 009). Same pattern and trade-off as
 * MarketDataSettings (Commit 008b): key stored client-side, by the
 * person's choice, reused here rather than re-litigated.
 */
export function NewsSettings() {
  const { apiKey, saveApiKey, clearApiKey } = useFinnhubApiKey();
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold">News & Calendar — Finnhub</h2>
      <p className="mb-3 text-xs text-text-muted">
        Powers the News feed and Calendar (earnings, dividends, economic events). Stored in this
        browser only.
      </p>

      {!apiKey ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Finnhub API key"
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
            onClick={clearApiKey}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-hover"
          >
            Remove key
          </button>
        </div>
      )}
    </div>
  );
}
