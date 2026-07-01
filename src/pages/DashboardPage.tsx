import { useMemo, useState } from 'react';
import { CalendarDays, Newspaper, SlidersHorizontal } from 'lucide-react';
import { useDashboardKPIs } from '../hooks/useDashboardKPIs';
import { usePositionRows } from '../hooks/usePositionRows';
import { usePortfolioStore } from '../store/portfolioStore';
import { allocationByAssetType, allocationBySector } from '../services/engines/allocationEngine';
import { KpiRow } from '../components/dashboard/KpiRow';
import { AllocationChart } from '../components/dashboard/AllocationChart';
import { WatchlistWidget } from '../components/dashboard/WatchlistWidget';
import { TopMovers } from '../components/dashboard/TopMovers';
import { RecentTransactionsWidget } from '../components/dashboard/RecentTransactionsWidget';
import { DashboardPlaceholderWidget } from '../components/dashboard/DashboardPlaceholderWidget';

type WidgetKey =
  | 'assetAllocation'
  | 'sectorAllocation'
  | 'watchlist'
  | 'topWinners'
  | 'topLosers'
  | 'recentTransactions'
  | 'calendar'
  | 'news';

const WIDGET_LABELS: Record<WidgetKey, string> = {
  assetAllocation: 'Asset Allocation',
  sectorAllocation: 'Sector Allocation',
  watchlist: 'Watchlist',
  topWinners: 'Top Winners',
  topLosers: 'Top Losers',
  recentTransactions: 'Recent Transactions',
  calendar: 'Economic Calendar',
  news: 'News',
};

/**
 * Dashboard (PRD v1.1/v1.3): KPI row + widget grid, every widget
 * clickable through to its module. The PRD v1.3 wireframe shows a 3x3
 * grid (Allocation/Sector/Watchlist, Transactions/Calendar/News); this
 * adds a Top Winners/Top Losers row to also satisfy the full v1.1
 * widget list, which doesn't fit the 3x3 wireframe as drawn.
 *
 * "Widgets configurable by the user" (PRD v1.3) is implemented as a
 * show/hide toggle. It's session-only for now — no persistence layer
 * exists yet (that's Commit 010 / Settings), so preferences reset on
 * reload. Documented rather than silently limited.
 */
export function DashboardPage() {
  const kpis = useDashboardKPIs();
  const rows = usePositionRows();
  const portfolio = usePortfolioStore((s) => s.portfolio);
  const assets = usePortfolioStore((s) => s.assets);

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visible, setVisible] = useState<Record<WidgetKey, boolean>>({
    assetAllocation: true,
    sectorAllocation: true,
    watchlist: true,
    topWinners: true,
    topLosers: true,
    recentTransactions: true,
    calendar: true,
    news: true,
  });

  const positions = useMemo(() => rows.map((r) => r.position), [rows]);
  const assetAllocationBuckets = useMemo(
    () => allocationByAssetType(positions, assets),
    [positions, assets],
  );
  const sectorAllocationBuckets = useMemo(
    () => allocationBySector(positions, assets),
    [positions, assets],
  );

  function toggle(key: WidgetKey) {
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold tracking-tight">Dashboard</h1>
        <div className="relative">
          <button
            onClick={() => setCustomizeOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <SlidersHorizontal size={14} />
            Customize
          </button>
          {customizeOpen && (
            <div className="absolute right-0 z-10 mt-1 w-52 rounded-md border border-border bg-surface p-2 shadow-lg">
              {(Object.keys(WIDGET_LABELS) as WidgetKey[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-hover"
                >
                  <input
                    type="checkbox"
                    checked={visible[key]}
                    onChange={() => toggle(key)}
                    className="accent-accent"
                  />
                  {WIDGET_LABELS[key]}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {!kpis ? (
        <p className="py-16 text-center text-sm text-text-muted">Loading portfolio…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <KpiRow kpis={kpis} currency={portfolio?.baseCurrency ?? 'EUR'} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {visible.assetAllocation && (
              <AllocationChart title="Asset Allocation" buckets={assetAllocationBuckets} />
            )}
            {visible.sectorAllocation && (
              <AllocationChart title="Sector Allocation" buckets={sectorAllocationBuckets} />
            )}
            {visible.watchlist && <WatchlistWidget />}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {visible.topWinners && <TopMovers rows={rows} direction="winners" />}
            {visible.topLosers && <TopMovers rows={rows} direction="losers" />}
            {visible.recentTransactions && <RecentTransactionsWidget />}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visible.calendar && (
              <DashboardPlaceholderWidget
                title="Economic Calendar"
                icon={CalendarDays}
                text="Lands in Commit 009 — News & Calendar."
              />
            )}
            {visible.news && (
              <DashboardPlaceholderWidget
                title="News"
                icon={Newspaper}
                text="Portfolio-relevant news feed lands in Commit 009."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
