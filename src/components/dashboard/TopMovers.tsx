import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetCard } from './WidgetCard';
import type { PositionRow } from '../../hooks/usePositionRows';

interface MoversProps {
  rows: PositionRow[];
  direction: 'winners' | 'losers';
}

function returnPct(row: PositionRow): number {
  if (row.position.averagePrice === 0) return 0;
  return (row.position.currentPrice - row.position.averagePrice) / row.position.averagePrice;
}

/** Top Winners / Top Losers widgets (PRD v1.1 Dashboard). */
export function TopMovers({ rows, direction }: MoversProps) {
  const navigate = useNavigate();

  const sorted = useMemo(() => {
    const withReturn = rows.map((r) => ({ row: r, pct: returnPct(r) }));
    withReturn.sort((a, b) => (direction === 'winners' ? b.pct - a.pct : a.pct - b.pct));
    return withReturn.slice(0, 4);
  }, [rows, direction]);

  return (
    <WidgetCard title={direction === 'winners' ? 'Top Winners' : 'Top Losers'} to="/portfolio">
      {sorted.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No positions yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map(({ row, pct }) => (
            <li
              key={row.position.id}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/portfolio/${row.position.assetId}`);
              }}
              className="flex items-center justify-between rounded px-1 py-1 text-sm hover:bg-surface-hover"
            >
              <span className="font-medium">{row.asset?.ticker ?? row.position.assetId}</span>
              <span className={`font-data ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                {pct >= 0 ? '+' : ''}
                {(pct * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
