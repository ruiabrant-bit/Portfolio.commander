import { useNavigate } from 'react-router-dom';
import type { DashboardKPIs } from '../../hooks/useDashboardKPIs';

const fmt = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

interface KpiRowProps {
  kpis: DashboardKPIs;
  currency: string;
}

/** PRD v1.3 Dashboard row 1. Each card is clickable → Portfolio. */
export function KpiRow({ kpis, currency }: KpiRowProps) {
  const navigate = useNavigate();

  const cards: { label: string; value: string; tone?: 'positive' | 'negative' }[] = [
    { label: 'Portfolio Value', value: `${fmt(kpis.portfolioValue)} ${currency}` },
    {
      label: "Today's P/L",
      value: `${kpis.todaysPL >= 0 ? '+' : ''}${fmt(kpis.todaysPL)} ${currency}`,
      tone: kpis.todaysPL >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Total Return',
      value: `${kpis.totalReturn >= 0 ? '+' : ''}${fmt(kpis.totalReturn * 100, 1)}%`,
      tone: kpis.totalReturn >= 0 ? 'positive' : 'negative',
    },
    { label: 'Cash', value: `${fmt(kpis.cash)} ${currency}` },
    { label: 'Invested Capital', value: `${fmt(kpis.investedCapital)} ${currency}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={() => navigate('/portfolio')}
          className="rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong"
        >
          <div className="text-xs text-text-muted">{card.label}</div>
          <div
            className={`font-data mt-1 text-lg ${
              card.tone === 'positive'
                ? 'text-positive'
                : card.tone === 'negative'
                  ? 'text-negative'
                  : 'text-text'
            }`}
          >
            {card.value}
          </div>
        </button>
      ))}
    </div>
  );
}
