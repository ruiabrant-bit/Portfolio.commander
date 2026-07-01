import { useMemo, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { Download } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { usePortfolioSnapshot } from '../hooks/usePortfolioSnapshot';
import { usePositionRows } from '../hooks/usePositionRows';
import {
  allocationBySector,
  allocationByCountry,
  allocationByCurrency,
  allocationByAssetType,
} from '../services/engines/allocationEngine';
import {
  realizedProfitByPeriod,
  dividendsByPeriod,
  approximateCAGRSinceInception,
  sortedPeriodKeys,
  type Period,
} from '../services/reports/reportBuilder';
import { getTotalDividendsNet, getDividendsByAsset } from '../services/engines/dividendEngine';
import { downloadCSV } from '../utils/csv';

const fmt = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function BucketBarChart({ data }: { data: { period: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">No data for this period yet.</p>;
  }
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#8b92a3' }} axisLine={{ stroke: '#1f2430' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#8b92a3' }} axisLine={{ stroke: '#1f2430' }} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#12151c', border: '1px solid #1f2430', borderRadius: 6, fontSize: 12 }}
            formatter={(value) => (typeof value === 'number' ? fmt(value) : value)}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value >= 0 ? '#16c784' : '#ea3943'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AllocationTable({
  title,
  buckets,
}: {
  title: string;
  buckets: { label: string; value: number; weight: number }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-text-muted">{title}</h3>
      {buckets.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No data yet.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {buckets.map((b) => (
              <tr key={b.label} className="border-b border-border last:border-0">
                <td className="py-1.5 text-text-muted">{b.label}</td>
                <td className="font-data py-1.5 text-right">{fmt(b.value)}</td>
                <td className="font-data w-14 py-1.5 text-right text-text-muted">
                  {fmt(b.weight * 100, 1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * Reports (PRD v1.1): performance by month/year, allocation, dividends,
 * sector/country exposure. "Export PDF" is explicitly future scope per
 * PRD v1.3 — CSV export is offered instead, reusing the same utility as
 * the Portfolio page, since it's real and available now.
 *
 * Performance here means realized P/L by period, computed exactly from
 * trade history — not a full historical Total Return curve, which would
 * need persisted daily portfolio value snapshots that don't exist yet
 * (would land with market history in Commit 008/009).
 */
export function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const trades = usePortfolioStore((s) => s.trades);
  const dividends = usePortfolioStore((s) => s.dividends);
  const assets = usePortfolioStore((s) => s.assets);
  const snapshot = usePortfolioSnapshot();
  const rows = usePositionRows();

  const positions = useMemo(() => rows.map((r) => r.position), [rows]);

  const realizedBuckets = useMemo(() => realizedProfitByPeriod(trades, period), [trades, period]);
  const dividendBuckets = useMemo(() => dividendsByPeriod(dividends, period), [dividends, period]);

  const realizedChartData = useMemo(
    () => sortedPeriodKeys(realizedBuckets).map((p) => ({ period: p, value: realizedBuckets.get(p) ?? 0 })),
    [realizedBuckets],
  );
  const dividendChartData = useMemo(
    () => sortedPeriodKeys(dividendBuckets).map((p) => ({ period: p, value: dividendBuckets.get(p) ?? 0 })),
    [dividendBuckets],
  );

  const approxCAGR = useMemo(
    () =>
      snapshot ? approximateCAGRSinceInception(trades, snapshot.investedCapital, snapshot.portfolioValue) : null,
    [trades, snapshot],
  );

  const sectorBuckets = useMemo(() => allocationBySector(positions, assets), [positions, assets]);
  const countryBuckets = useMemo(() => allocationByCountry(positions, assets), [positions, assets]);
  const currencyBuckets = useMemo(() => allocationByCurrency(positions, assets), [positions, assets]);
  const assetTypeBuckets = useMemo(() => allocationByAssetType(positions, assets), [positions, assets]);

  const dividendsByAssetMap = useMemo(() => getDividendsByAsset(dividends), [dividends]);

  function handleExportDividends() {
    downloadCSV(
      'dividend-report.csv',
      Array.from(dividendsByAssetMap.entries()).map(([assetId, net]) => ({
        Ticker: assets.find((a) => a.id === assetId)?.ticker ?? assetId,
        'Net Dividends': net,
      })),
    );
  }

  if (!snapshot) {
    return <p className="p-8 text-center text-sm text-text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold tracking-tight">Reports</h1>
        <button
          disabled
          title="PDF export is future scope per the PRD"
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-text-faint opacity-50"
        >
          <Download size={14} />
          Export PDF (coming soon)
        </button>
      </div>

      {/* Performance */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold">Performance</h2>
          <div className="flex overflow-hidden rounded-md border border-border text-xs">
            {(['month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 capitalize ${
                  period === p ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                {p}ly
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Total Return" value={`${(((snapshot.portfolioValue - snapshot.investedCapital) / (snapshot.investedCapital || 1)) * 100).toFixed(1)}%`} />
          <MiniStat
            label="Approx. CAGR"
            value={approxCAGR === null ? '—' : `${(approxCAGR * 100).toFixed(1)}%`}
            hint="Simplified, not cash-flow-weighted"
          />
          <MiniStat label="Realized P/L (total)" value={`${fmt(Array.from(realizedProfitByPeriod(trades, 'year').values()).reduce((a, b) => a + b, 0))}`} />
          <MiniStat label="Unrealized P/L" value={fmt(snapshot.positions.reduce((sum, p) => sum + (p.currentPrice - p.averagePrice) * p.quantity, 0))} />
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium text-text-muted">
            Realized P/L by {period}
          </h3>
          <BucketBarChart data={realizedChartData} />
        </div>
      </section>

      {/* Allocation */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Allocation</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AllocationTable title="By Sector" buckets={sectorBuckets} />
          <AllocationTable title="By Country / Exchange" buckets={countryBuckets} />
          <AllocationTable title="By Currency" buckets={currencyBuckets} />
          <AllocationTable title="By Asset Type" buckets={assetTypeBuckets} />
        </div>
      </section>

      {/* Dividends */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold">Dividends</h2>
          <button
            onClick={handleExportDividends}
            disabled={dividendsByAssetMap.size === 0}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
        <div className="mb-3">
          <MiniStat label="Total Net Dividends" value={fmt(getTotalDividendsNet(dividends))} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium text-text-muted">
            Dividend income by {period}
          </h3>
          <BucketBarChart data={dividendChartData} />
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="font-data mt-1 text-lg">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-text-faint">{hint}</div>}
    </div>
  );
}
