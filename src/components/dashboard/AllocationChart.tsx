import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { WidgetCard } from './WidgetCard';
import type { AllocationBucket } from '../../services/engines/allocationEngine';

const COLORS = ['#4f7cff', '#16c784', '#f5a623', '#ea3943', '#a855f7', '#22d3ee', '#f472b6'];

interface AllocationChartProps {
  title: string;
  buckets: AllocationBucket[];
}

/** Asset Allocation / Sector Allocation widgets (PRD v1.1 Dashboard). */
export function AllocationChart({ title, buckets }: AllocationChartProps) {
  const data = buckets.map((b) => ({ name: b.label, value: b.value }));

  return (
    <WidgetCard title={title} to="/portfolio">
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">No data yet.</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={30} outerRadius={55} paddingAngle={2}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => (typeof value === 'number' ? value.toFixed(2) : value)}
                  contentStyle={{
                    background: '#12151c',
                    border: '1px solid #1f2430',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 space-y-1 text-xs">
            {buckets.slice(0, 5).map((b, i) => (
              <li key={b.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-text-muted">{b.label}</span>
                </span>
                <span className="font-data shrink-0">{(b.weight * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}
