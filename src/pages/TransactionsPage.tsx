import { useMemo, useState } from 'react';
import { Upload, Plus, ArrowLeftRight } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { ImportWizard } from '../components/import/ImportWizard';
import { AddTradeModal } from '../components/import/AddTradeModal';

type Row =
  | { kind: 'trade'; date: string; label: string; detail: string; amount: number }
  | { kind: 'dividend'; date: string; label: string; detail: string; amount: number }
  | { kind: 'cash'; date: string; label: string; detail: string; amount: number };

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Transactions (PRD v1.1/v1.3): unified view of trades, dividends and
 * cash movements, plus the CSV import entry point.
 */
export function TransactionsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [addTradeOpen, setAddTradeOpen] = useState(false);
  const trades = usePortfolioStore((s) => s.trades);
  const dividends = usePortfolioStore((s) => s.dividends);
  const cashMovements = usePortfolioStore((s) => s.cashMovements);
  const assets = usePortfolioStore((s) => s.assets);

  const rows: Row[] = useMemo(() => {
    const tickerOf = (assetId: string) => assets.find((a) => a.id === assetId)?.ticker ?? assetId;

    const tradeRows: Row[] = trades.map((t) => ({
      kind: 'trade',
      date: t.date,
      label: `${t.type} ${tickerOf(t.assetId)}`,
      detail: `${t.quantity} @ ${fmt(t.price)}`,
      amount: t.type === 'BUY' ? -(t.quantity * t.price + t.fees + t.taxes) : t.quantity * t.price - t.fees - t.taxes,
    }));

    const dividendRows: Row[] = dividends.map((d) => ({
      kind: 'dividend',
      date: d.paymentDate,
      label: `Dividend ${tickerOf(d.assetId)}`,
      detail: `gross ${fmt(d.gross)}, tax ${fmt(d.tax)}`,
      amount: d.net,
    }));

    const cashRows: Row[] = cashMovements.map((c) => ({
      kind: 'cash',
      date: c.date,
      label: c.type,
      detail: c.currency,
      amount: ['DEPOSIT', 'DIVIDEND', 'INTEREST'].includes(c.type) ? c.amount : -c.amount,
    }));

    return [...tradeRows, ...dividendRows, ...cashRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [trades, dividends, cashMovements, assets]);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold tracking-tight">Transactions</h1>
        <button
          onClick={() => setAddTradeOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <Plus size={14} />
          Add Trade Manually
        </button>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Upload size={14} />
          Import CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <ArrowLeftRight size={20} className="text-text-faint" />
          <p className="text-sm text-text-muted">
            No transactions yet. Import a CSV or add a trade manually to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Detail</th>
                <th className="font-data px-3 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text-muted">{r.date}</td>
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2 text-text-muted">{r.detail}</td>
                  <td
                    className={`font-data px-3 py-2 text-right ${
                      r.amount >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {r.amount >= 0 ? '+' : ''}
                    {fmt(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {wizardOpen && <ImportWizard onClose={() => setWizardOpen(false)} />}
      {addTradeOpen && <AddTradeModal onClose={() => setAddTradeOpen(false)} />}
    </div>
  );
}
