import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePositionRows } from '../hooks/usePositionRows';
import { usePortfolioStore } from '../store/portfolioStore';
import { NotesTab } from '../components/position/NotesTab';

type TabId =
  | 'overview'
  | 'chart'
  | 'transactions'
  | 'dividends'
  | 'notes'
  | 'technical'
  | 'fundamental'
  | 'ai-summary';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'chart', label: 'Chart' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'dividends', label: 'Dividends' },
  { id: 'notes', label: 'Notes' },
  { id: 'technical', label: 'Technical Analysis' },
  { id: 'fundamental', label: 'Fundamental Analysis' },
  { id: 'ai-summary', label: 'AI Summary' },
];

const fmt = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Position Detail (PRD v1.1): tabs preserve state while switching (kept
 * as local component state, not route-driven, per PRD v1.3 "tabs that
 * preserve state"). Overview/Transactions/Dividends/Notes are fully real
 * — they read directly from the store and Commander Core. Chart /
 * Technical / Fundamental / AI Summary depend on data sources that don't
 * exist yet (market history, indicators, AI layer) and are scoped to
 * later commits.
 */
export function PositionDetailPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const rows = usePositionRows();
  const trades = usePortfolioStore((s) => s.trades);
  const dividends = usePortfolioStore((s) => s.dividends);

  const row = useMemo(() => rows.find((r) => r.position.assetId === assetId), [rows, assetId]);
  const assetTrades = useMemo(
    () =>
      trades
        .filter((t) => t.assetId === assetId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [trades, assetId],
  );
  const assetDividends = useMemo(
    () =>
      dividends
        .filter((d) => d.assetId === assetId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()),
    [dividends, assetId],
  );

  if (!row) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-text-muted">
          No open position found for <span className="font-data">{assetId}</span>.
        </p>
        <button
          onClick={() => navigate('/portfolio')}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <ArrowLeft size={14} /> Back to Portfolio
        </button>
      </div>
    );
  }

  const returnPct =
    row.position.averagePrice === 0
      ? 0
      : ((row.position.currentPrice - row.position.averagePrice) / row.position.averagePrice) * 100;

  return (
    <div className="p-4 lg:p-6">
      <button
        onClick={() => navigate('/portfolio')}
        className="mb-3 flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={14} /> Portfolio
      </button>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {row.asset?.ticker ?? assetId}
          </h1>
          <p className="text-sm text-text-muted">{row.asset?.name ?? 'Unknown asset'}</p>
        </div>
        <div className="text-right">
          <div className="font-data text-2xl">{fmt(row.position.currentPrice)}</div>
          <div className={`font-data text-sm ${returnPct >= 0 ? 'text-positive' : 'text-negative'}`}>
            {returnPct >= 0 ? '+' : ''}
            {fmt(returnPct, 2)}% vs avg cost
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <dl className="grid max-w-lg grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Field label="Quantity" value={fmt(row.position.quantity, 4)} />
          <Field label="Average Price" value={fmt(row.position.averagePrice)} />
          <Field label="Market Value" value={fmt(row.marketValue)} />
          <Field label="Weight" value={`${fmt(row.weight * 100, 1)}%`} />
          <Field
            label="Unrealized P/L"
            value={`${row.unrealizedProfit >= 0 ? '+' : ''}${fmt(row.unrealizedProfit)}`}
            positive={row.unrealizedProfit >= 0}
          />
          <Field label="Sector" value={row.asset?.sector ?? '—'} />
          <Field label="Exchange" value={row.asset?.exchange ?? '—'} />
          <Field label="Currency" value={row.asset?.currency ?? '—'} />
        </dl>
      )}

      {activeTab === 'chart' && (
        <TabPlaceholder text="Price chart with technical overlays lands in Commit 008/009, once market data history is wired." />
      )}

      {activeTab === 'transactions' && (
        <TransactionsTable trades={assetTrades} />
      )}

      {activeTab === 'dividends' && <DividendsTable dividends={assetDividends} />}

      {activeTab === 'notes' && assetId && <NotesTab assetId={assetId} />}

      {activeTab === 'technical' && (
        <TabPlaceholder text="RSI, MACD, EMA/SMA, Bollinger Bands and more land in Commit 008 — Technical Analysis." />
      )}

      {activeTab === 'fundamental' && (
        <TabPlaceholder text="Fundamental ratios (P/E, PEG, ROE, Revenue Growth…) land alongside the Screener in Commit 008." />
      )}

      {activeTab === 'ai-summary' && (
        <TabPlaceholder text="AI Commander position summaries land in Commit 007." />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd
        className={`font-data ${
          positive === undefined ? '' : positive ? 'text-positive' : 'text-negative'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function TabPlaceholder({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-muted">
      {text}
    </div>
  );
}

function TransactionsTable({
  trades,
}: {
  trades: ReturnType<typeof usePortfolioStore.getState>['trades'];
}) {
  if (trades.length === 0) {
    return <TabPlaceholder text="No transactions recorded for this asset yet." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs text-text-muted">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="font-data px-3 py-2 text-right font-medium">Qty</th>
            <th className="font-data px-3 py-2 text-right font-medium">Price</th>
            <th className="font-data px-3 py-2 text-right font-medium">Fees</th>
            <th className="font-data px-3 py-2 text-right font-medium">Taxes</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-text-muted">{t.date}</td>
              <td className={`px-3 py-2 ${t.type === 'BUY' ? 'text-positive' : 'text-negative'}`}>
                {t.type}
              </td>
              <td className="font-data px-3 py-2 text-right">{fmt(t.quantity, 4)}</td>
              <td className="font-data px-3 py-2 text-right">{fmt(t.price)}</td>
              <td className="font-data px-3 py-2 text-right">{fmt(t.fees)}</td>
              <td className="font-data px-3 py-2 text-right">{fmt(t.taxes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DividendsTable({
  dividends,
}: {
  dividends: ReturnType<typeof usePortfolioStore.getState>['dividends'];
}) {
  if (dividends.length === 0) {
    return <TabPlaceholder text="No dividends recorded for this asset yet." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs text-text-muted">
            <th className="px-3 py-2 font-medium">Payment Date</th>
            <th className="font-data px-3 py-2 text-right font-medium">Gross</th>
            <th className="font-data px-3 py-2 text-right font-medium">Tax</th>
            <th className="font-data px-3 py-2 text-right font-medium">Net</th>
          </tr>
        </thead>
        <tbody>
          {dividends.map((d) => (
            <tr key={d.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-text-muted">{d.paymentDate}</td>
              <td className="font-data px-3 py-2 text-right">{fmt(d.gross)}</td>
              <td className="font-data px-3 py-2 text-right">{fmt(d.tax)}</td>
              <td className="font-data px-3 py-2 text-right text-positive">{fmt(d.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
