import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Database } from 'lucide-react';
import { usePositionRows, type PositionRow } from '../hooks/usePositionRows';
import { usePortfolioStore } from '../store/portfolioStore';
import { buildDemoData } from '../services/import/demoData';
import { downloadCSV } from '../utils/csv';

type GroupBy = 'none' | 'sector' | 'country' | 'assetType' | 'currency';

const GROUP_LABELS: Record<GroupBy, string> = {
  none: 'No grouping',
  sector: 'Sector',
  country: 'Country',
  assetType: 'Asset Type',
  currency: 'Currency',
};

function groupKey(row: PositionRow, groupBy: GroupBy): string {
  if (groupBy === 'none') return '';
  if (!row.asset) return 'Unknown';
  if (groupBy === 'sector') return row.asset.sector ?? 'Unknown';
  if (groupBy === 'country') return row.asset.exchange ?? 'Unknown';
  if (groupBy === 'assetType') return row.asset.assetType;
  return row.asset.currency;
}

const fmt = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function PortfolioPage() {
  const navigate = useNavigate();
  const rows = usePositionRows();
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const setAssets = usePortfolioStore((s) => s.setAssets);
  const addTrades = usePortfolioStore((s) => s.addTrades);
  const addDividends = usePortfolioStore((s) => s.addDividends);
  const addCashMovements = usePortfolioStore((s) => s.addCashMovements);
  const setQuotes = usePortfolioStore((s) => s.setQuotes);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.asset?.ticker.toLowerCase().includes(q) ||
        r.asset?.name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ label: '', rows: filtered }];
    const map = new Map<string, PositionRow[]>();
    for (const row of filtered) {
      const key = groupKey(row, groupBy);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return Array.from(map.entries())
      .map(([label, groupRows]) => ({ label, rows: groupRows }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered, groupBy]);

  function handleExport() {
    downloadCSV(
      'portfolio-positions.csv',
      filtered.map((r) => ({
        Ticker: r.asset?.ticker ?? r.position.assetId,
        Name: r.asset?.name ?? '',
        Quantity: r.position.quantity,
        'Avg Price': r.position.averagePrice,
        'Current Price': r.position.currentPrice,
        'Market Value': r.marketValue,
        'Unrealized P/L': r.unrealizedProfit,
        'Weight %': (r.weight * 100).toFixed(2),
        Sector: r.asset?.sector ?? '',
        Currency: r.asset?.currency ?? '',
      })),
    );
  }

  function handleLoadDemoData() {
    const demo = buildDemoData();
    setAssets(demo.assets);
    addTrades(demo.trades);
    addDividends(demo.dividends);
    addCashMovements(demo.cashMovements);
    setQuotes(demo.quotes);
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold tracking-tight">Portfolio</h1>

        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker or name…"
            className="w-48 rounded-md border border-border bg-surface py-1.5 pl-8 pr-3 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </div>

        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
        >
          {(Object.keys(GROUP_LABELS) as GroupBy[]).map((key) => (
            <option key={key} value={key}>
              Group by: {GROUP_LABELS[key]}
            </option>
          ))}
        </select>

        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Database size={22} className="text-text-faint" />
          <div>
            <p className="text-sm font-medium">No positions yet</p>
            <p className="mt-1 max-w-sm text-sm text-text-muted">
              Import your Trade Republic CSV to populate your portfolio. The
              import wizard lands in Commit 004 — until then, you can load
              sample data to try out this screen.
            </p>
          </div>
          <button
            onClick={handleLoadDemoData}
            className="mt-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
          >
            Load Demo Data
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Ticker</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="font-data px-3 py-2 text-right font-medium">Qty</th>
                <th className="font-data px-3 py-2 text-right font-medium">Avg Price</th>
                <th className="font-data px-3 py-2 text-right font-medium">
                  Current Price
                </th>
                <th className="font-data px-3 py-2 text-right font-medium">
                  Market Value
                </th>
                <th className="font-data px-3 py-2 text-right font-medium">
                  Unrealized P/L
                </th>
                <th className="font-data px-3 py-2 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.label || 'flat'}>
                  {group.label && (
                    <tr className="bg-surface/60">
                      <td colSpan={8} className="px-3 py-1.5 text-xs font-medium text-text-muted">
                        {group.label} · {group.rows.length}
                      </td>
                    </tr>
                  )}
                  {group.rows.map((row) => (
                    <tr
                      key={row.position.id}
                      onClick={() => navigate(`/portfolio/${row.position.assetId}`)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-hover"
                    >
                      <td className="px-3 py-2 font-medium">
                        {row.asset?.ticker ?? row.position.assetId}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{row.asset?.name ?? '—'}</td>
                      <td className="font-data px-3 py-2 text-right">
                        {fmt(row.position.quantity, 4)}
                      </td>
                      <td className="font-data px-3 py-2 text-right">
                        {fmt(row.position.averagePrice)}
                      </td>
                      <td className="font-data px-3 py-2 text-right">
                        {fmt(row.position.currentPrice)}
                      </td>
                      <td className="font-data px-3 py-2 text-right">
                        {fmt(row.marketValue)}
                      </td>
                      <td
                        className={`font-data px-3 py-2 text-right ${
                          row.unrealizedProfit >= 0 ? 'text-positive' : 'text-negative'
                        }`}
                      >
                        {row.unrealizedProfit >= 0 ? '+' : ''}
                        {fmt(row.unrealizedProfit)}
                      </td>
                      <td className="font-data px-3 py-2 text-right">
                        {fmt(row.weight * 100, 1)}%
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
