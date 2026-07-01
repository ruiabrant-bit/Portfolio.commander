import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Pencil } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { filterByFundamentals, type FundamentalFilters } from '../services/screener/screenerEngine';
import type { Asset } from '../types/domain';

const fmt = (n: number | undefined, digits = 2) =>
  n === undefined ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: digits });

const fmtPct = (n: number | undefined) => (n === undefined ? '—' : `${(n * 100).toFixed(1)}%`);

/**
 * Screener (PRD v1.1): fundamental filters (Market Cap, P/E, PEG, ROE,
 * Revenue Growth, EPS Growth, Dividend Yield) and technical filters
 * (RSI, EMA, SMA, MACD, ATR, Volume).
 *
 * Only the fundamental side works here. Technical filters need
 * historical price data per asset, which no part of this app collects
 * yet (see signalEngine.ts) — the section below is visible but
 * disabled, with the reason stated plainly rather than hidden.
 *
 * The asset universe is whatever is already known to the app (imported
 * via CSV or added manually) — there's no external screening API
 * wired in, so this doesn't search the whole market yet.
 */
export function ScreenerPage() {
  const navigate = useNavigate();
  const assets = usePortfolioStore((s) => s.assets);
  const upsertAsset = usePortfolioStore((s) => s.upsertAsset);

  const [filters, setFilters] = useState<FundamentalFilters>({});
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  const results = useMemo(() => filterByFundamentals(assets, filters), [assets, filters]);
  const editingAsset = assets.find((a) => a.id === editingAssetId) ?? null;

  function setFilter<K extends keyof FundamentalFilters>(key: K, raw: string) {
    const value = raw === '' ? undefined : Number(raw);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Screener</h1>

      {assets.length === 0 && (
        <div className="mb-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-muted">
          No assets known yet — import a CSV or add tickers to a watchlist first. There's no
          market-wide search here (no external data provider is wired in).
        </div>
      )}

      {/* Fundamental filters */}
      <div className="mb-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-text-muted">Fundamental Filters</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FilterInput label="Min P/E" onChange={(v) => setFilter('minPE', v)} />
          <FilterInput label="Max P/E" onChange={(v) => setFilter('maxPE', v)} />
          <FilterInput label="Max PEG" onChange={(v) => setFilter('maxPEG', v)} />
          <FilterInput label="Min ROE %" onChange={(v) => setFilter('minROE', v ? String(Number(v) / 100) : '')} />
          <FilterInput
            label="Min Revenue Growth %"
            onChange={(v) => setFilter('minRevenueGrowth', v ? String(Number(v) / 100) : '')}
          />
          <FilterInput
            label="Min EPS Growth %"
            onChange={(v) => setFilter('minEPSGrowth', v ? String(Number(v) / 100) : '')}
          />
          <FilterInput
            label="Min Dividend Yield %"
            onChange={(v) => setFilter('minDividendYield', v ? String(Number(v) / 100) : '')}
          />
          <FilterInput label="Min Market Cap" onChange={(v) => setFilter('minMarketCap', v)} />
        </div>
      </div>

      {/* Technical filters - honestly disabled */}
      <div className="mb-4 rounded-lg border border-dashed border-border bg-surface/50 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-text-muted">
          <Info size={14} />
          Technical Filters (RSI, EMA, SMA, MACD, ATR, Volume)
        </div>
        <p className="text-xs text-text-faint">
          Disabled — these need historical price data per asset, which no market data provider is
          wired into the app yet. The indicator math is implemented and tested (Signal Engine);
          this just doesn't have real data to run it against.
        </p>
      </div>

      {/* Results */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs text-text-muted">
              <th className="px-3 py-2 font-medium">Ticker</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="font-data px-3 py-2 text-right font-medium">P/E</th>
              <th className="font-data px-3 py-2 text-right font-medium">PEG</th>
              <th className="font-data px-3 py-2 text-right font-medium">ROE</th>
              <th className="font-data px-3 py-2 text-right font-medium">Rev. Growth</th>
              <th className="font-data px-3 py-2 text-right font-medium">Div. Yield</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {results.map((asset) => (
              <tr key={asset.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td
                  onClick={() => navigate(`/portfolio/${asset.id}`)}
                  className="cursor-pointer px-3 py-2 font-medium"
                >
                  {asset.ticker}
                </td>
                <td className="px-3 py-2 text-text-muted">{asset.name}</td>
                <td className="font-data px-3 py-2 text-right">{fmt(asset.fundamentals?.peRatio)}</td>
                <td className="font-data px-3 py-2 text-right">{fmt(asset.fundamentals?.pegRatio)}</td>
                <td className="font-data px-3 py-2 text-right">{fmtPct(asset.fundamentals?.roe)}</td>
                <td className="font-data px-3 py-2 text-right">{fmtPct(asset.fundamentals?.revenueGrowth)}</td>
                <td className="font-data px-3 py-2 text-right">{fmtPct(asset.fundamentals?.dividendYield)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setEditingAssetId(asset.id)}
                    aria-label={`Edit fundamentals for ${asset.ticker}`}
                    className="text-text-faint hover:text-text"
                  >
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">No assets match these filters.</p>
        )}
      </div>

      {editingAsset && (
        <FundamentalsEditor
          asset={editingAsset}
          onSave={(fundamentals) => {
            upsertAsset({ ...editingAsset, fundamentals });
            setEditingAssetId(null);
          }}
          onClose={() => setEditingAssetId(null)}
        />
      )}
    </div>
  );
}

function FilterInput({ label, onChange }: { label: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-text-muted">{label}</span>
      <input
        type="number"
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function FundamentalsEditor({
  asset,
  onSave,
  onClose,
}: {
  asset: Asset;
  onSave: (fundamentals: NonNullable<Asset['fundamentals']>) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState(asset.fundamentals ?? {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Edit fundamentals — {asset.ticker}</h3>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <EditField label="Market Cap" value={values.marketCap} onChange={(v) => setValues((s) => ({ ...s, marketCap: v }))} />
          <EditField label="P/E" value={values.peRatio} onChange={(v) => setValues((s) => ({ ...s, peRatio: v }))} />
          <EditField label="PEG" value={values.pegRatio} onChange={(v) => setValues((s) => ({ ...s, pegRatio: v }))} />
          <EditField label="ROE (%)" value={values.roe !== undefined ? values.roe * 100 : undefined} onChange={(v) => setValues((s) => ({ ...s, roe: v === undefined ? undefined : v / 100 }))} />
          <EditField
            label="Rev. Growth (%)"
            value={values.revenueGrowth !== undefined ? values.revenueGrowth * 100 : undefined}
            onChange={(v) => setValues((s) => ({ ...s, revenueGrowth: v === undefined ? undefined : v / 100 }))}
          />
          <EditField
            label="EPS Growth (%)"
            value={values.epsGrowth !== undefined ? values.epsGrowth * 100 : undefined}
            onChange={(v) => setValues((s) => ({ ...s, epsGrowth: v === undefined ? undefined : v / 100 }))}
          />
          <EditField
            label="Dividend Yield (%)"
            value={values.dividendYield !== undefined ? values.dividendYield * 100 : undefined}
            onChange={(v) => setValues((s) => ({ ...s, dividendYield: v === undefined ? undefined : v / 100 }))}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            onClick={() => onSave(values)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-text-muted">{label}</span>
      <input
        type="number"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
    </label>
  );
}
