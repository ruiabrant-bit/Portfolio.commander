import { useState } from 'react';
import { X } from 'lucide-react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { assertValidTrade, ValidationError } from '../../utils/validation';
import type { Asset, AssetType, Currency, Trade, TradeType } from '../../types/domain';

const ASSET_TYPES: AssetType[] = ['STOCK', 'ETF', 'CASH', 'CRYPTO', 'BOND'];
const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF'];

interface AddTradeModalProps {
  onClose: () => void;
}

/**
 * Manual trade entry (Commit 011, requested explicitly after the CSV
 * import commit): lets someone create a Trade by hand instead of
 * importing a CSV — e.g. to record an already-open position by entering
 * "I hold N shares at average cost P as of date D" as a single BUY
 * trade.
 *
 * This does NOT bypass ADR-005. It creates a real `Trade` record
 * through the same `addTrades` store action CSV import uses, validated
 * by the same `assertValidTrade` rules (PRD v1.2 §7). The resulting
 * Position is still fully derived by Commander Core — nothing here
 * writes to a Position directly or overrides a calculated value.
 */
export function AddTradeModal({ onClose }: AddTradeModalProps) {
  const portfolio = usePortfolioStore((s) => s.portfolio);
  const assets = usePortfolioStore((s) => s.assets);
  const upsertAsset = usePortfolioStore((s) => s.upsertAsset);
  const addTrades = usePortfolioStore((s) => s.addTrades);

  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('STOCK');
  const [sector, setSector] = useState('');
  const [currency, setCurrency] = useState<Currency>(portfolio?.baseCurrency ?? 'EUR');
  const [type, setType] = useState<TradeType>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fees, setFees] = useState('0');
  const [taxes, setTaxes] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const existingAsset = assets.find((a) => a.ticker.toUpperCase() === ticker.trim().toUpperCase());

  function handleSubmit() {
    setError(null);
    if (!portfolio) {
      setError('No portfolio initialized yet.');
      return;
    }

    const assetId = existingAsset?.id ?? ticker.trim().toUpperCase();
    const trade: Trade = {
      id: crypto.randomUUID(),
      portfolioId: portfolio.id,
      assetId,
      type,
      quantity: Number(quantity),
      price: Number(price),
      fees: Number(fees) || 0,
      taxes: Number(taxes) || 0,
      date,
      // No importHash — manual entries are never subject to CSV
      // de-duplication, matching the store's existing dedupe logic
      // (dedupeByImportHash only skips items that *have* a hash).
    };

    try {
      assertValidTrade(trade);
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Invalid trade.');
      return;
    }

    if (!existingAsset) {
      const newAsset: Asset = {
        id: assetId,
        ticker: ticker.trim().toUpperCase(),
        isin: null,
        name: name.trim() || ticker.trim().toUpperCase(),
        assetType,
        exchange: null,
        sector: sector.trim() || null,
        industry: null,
        currency,
      };
      upsertAsset(newAsset);
    }

    addTrades([trade]);
    onClose();
  }

  const isValid = ticker.trim() && Number(quantity) > 0 && Number(price) > 0 && date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Add Trade Manually</h2>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <p className="mb-3 text-xs text-text-muted">
          Creates a real trade record — the same way CSV import does. Use this to record an
          already-open position (e.g. "10 shares at €150 avg cost since 2023-03-10").
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ticker *">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="AAPL"
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="Type *">
            <select value={type} onChange={(e) => setType(e.target.value as TradeType)} className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none">
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </Field>

          {!existingAsset && (
            <>
              <Field label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple Inc." className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
              </Field>
              <Field label="Asset Type">
                <select value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)} className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none">
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sector">
                <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Technology" className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
              </Field>
              <Field label="Currency">
                <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {existingAsset && (
            <div className="col-span-2 rounded-md bg-surface-raised px-2.5 py-1.5 text-xs text-text-muted">
              Existing asset: <span className="font-medium text-text">{existingAsset.name}</span>
            </div>
          )}

          <Field label="Quantity *">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="Avg Price *">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="150.00"
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="Date *">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
          </Field>
          <Field label="Fees">
            <input type="number" value={fees} onChange={(e) => setFees(e.target.value)} className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
          </Field>
          <Field label="Taxes">
            <input type="number" value={taxes} onChange={(e) => setTaxes(e.target.value)} className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
          </Field>
        </div>

        {error && <p className="mt-3 text-xs text-negative">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
          >
            Add Trade
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-text-muted">{label}</span>
      {children}
    </label>
  );
}
