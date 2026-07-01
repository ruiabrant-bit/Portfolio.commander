import { useMemo, useState } from 'react';
import { Upload, CheckCircle2, XCircle, Copy, X } from 'lucide-react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { parseCSV } from '../../services/import/csvParser';
import {
  mapRowsToImportResult,
  getDistinctTypeValues,
  EMPTY_MAPPING,
  TRANSACTION_CATEGORIES,
  type ColumnMapping,
  type TypeValueMap,
  type ImportResult,
} from '../../services/import/importMapper';

type Step = 'upload' | 'mapColumns' | 'mapTypes' | 'preview';

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  date: 'Date *',
  type: 'Type *',
  ticker: 'Ticker',
  isin: 'ISIN',
  name: 'Asset Name',
  quantity: 'Quantity',
  price: 'Price',
  fees: 'Fees',
  taxes: 'Taxes',
  amount: 'Amount',
  currency: 'Currency',
};

interface ImportWizardProps {
  onClose: () => void;
}

/**
 * PRD v1.3 Transactions flow: "import wizard that validates before
 * importing, duplicates highlighted visually". No Trade Republic sample
 * file was available to hardcode an exact column schema against, so this
 * wizard asks the user to map their CSV's columns and per-value
 * transaction types once — a safer, format-agnostic approach than
 * guessing a specific export layout.
 */
export function ImportWizard({ onClose }: ImportWizardProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [typeValueMap, setTypeValueMap] = useState<TypeValueMap>({});

  const portfolio = usePortfolioStore((s) => s.portfolio);
  const assets = usePortfolioStore((s) => s.assets);
  const trades = usePortfolioStore((s) => s.trades);
  const dividends = usePortfolioStore((s) => s.dividends);
  const cashMovements = usePortfolioStore((s) => s.cashMovements);
  const setAssets = usePortfolioStore((s) => s.setAssets);
  const addTrades = usePortfolioStore((s) => s.addTrades);
  const addDividends = usePortfolioStore((s) => s.addDividends);
  const addCashMovements = usePortfolioStore((s) => s.addCashMovements);

  const distinctTypeValues = useMemo(
    () => getDistinctTypeValues(rows, mapping.type),
    [rows, mapping.type],
  );

  const knownImportHashes = useMemo(() => {
    const all = [...trades, ...dividends, ...cashMovements];
    return new Set(all.map((r) => r.importHash).filter((h): h is string => !!h));
  }, [trades, dividends, cashMovements]);

  const importResult: ImportResult | null = useMemo(() => {
    if (step !== 'preview' || !portfolio) return null;
    return mapRowsToImportResult({
      rows,
      mapping,
      typeValueMap,
      baseCurrency: portfolio.baseCurrency,
      portfolioId: portfolio.id,
      knownAssetIds: new Set(assets.map((a) => a.id)),
      knownImportHashes,
    });
  }, [step, rows, mapping, typeValueMap, portfolio, assets, knownImportHashes]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parseCSV(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setFileName(file.name);
      setStep('mapColumns');
    };
    reader.readAsText(file);
  }

  function handleConfirmImport() {
    if (!importResult) return;
    if (importResult.newAssets.length > 0) {
      setAssets([...assets, ...importResult.newAssets]);
    }
    if (importResult.trades.length > 0) addTrades(importResult.trades);
    if (importResult.dividends.length > 0) addDividends(importResult.dividends);
    if (importResult.cashMovements.length > 0) addCashMovements(importResult.cashMovements);
    onClose();
  }

  const okCount = importResult?.rowResults.filter((r) => r.status === 'ok').length ?? 0;
  const errorCount = importResult?.rowResults.filter((r) => r.status === 'error').length ?? 0;
  const dupCount = importResult?.rowResults.filter((r) => r.status === 'duplicate').length ?? 0;
  const ignoredCount = importResult?.rowResults.filter((r) => r.status === 'ignored').length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Import Transactions CSV</h2>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step === 'upload' && (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center hover:border-accent">
              <Upload size={22} className="text-text-faint" />
              <div>
                <p className="text-sm font-medium">Click to select a CSV file</p>
                <p className="mt-1 text-xs text-text-muted">
                  Any CSV export works — you'll map its columns in the next step.
                </p>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          )}

          {step === 'mapColumns' && (
            <div>
              <p className="mb-3 text-xs text-text-muted">
                {fileName} · {rows.length} rows · Map your CSV columns to Portfolio
                Commander fields. Fields marked * are required.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                  <label key={field} className="flex flex-col gap-1 text-xs">
                    <span className="text-text-muted">{FIELD_LABELS[field]}</span>
                    <select
                      value={mapping[field] ?? ''}
                      onChange={(e) =>
                        setMapping((m) => ({ ...m, [field]: e.target.value || null }))
                      }
                      className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 'mapTypes' && (
            <div>
              <p className="mb-3 text-xs text-text-muted">
                Found {distinctTypeValues.length} distinct value(s) in the Type column.
                Tell us what each one means.
              </p>
              <div className="flex flex-col gap-2">
                {distinctTypeValues.map((value) => (
                  <div key={value} className="flex items-center gap-3">
                    <span className="w-40 truncate text-sm">{value}</span>
                    <select
                      value={typeValueMap[value] ?? 'IGNORE'}
                      onChange={(e) =>
                        setTypeValueMap((m) => ({
                          ...m,
                          [value]: e.target.value as TypeValueMap[string],
                        }))
                      }
                      className="flex-1 rounded-md border border-border bg-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                    >
                      {TRANSACTION_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'preview' && importResult && (
            <div>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <Badge icon={CheckCircle2} tone="positive" label={`${okCount} ready`} />
                <Badge icon={Copy} tone="muted" label={`${dupCount} duplicates (skipped)`} />
                <Badge icon={XCircle} tone="negative" label={`${errorCount} errors`} />
                <Badge icon={XCircle} tone="muted" label={`${ignoredCount} ignored`} />
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-border text-left text-text-muted">
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">Category</th>
                      <th className="px-2 py-1.5">Status</th>
                      <th className="px-2 py-1.5">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.rowResults.map((r) => (
                      <tr key={r.rowIndex} className="border-b border-border last:border-0">
                        <td className="px-2 py-1 text-text-faint">{r.rowIndex + 1}</td>
                        <td className="px-2 py-1">{r.category}</td>
                        <td
                          className={`px-2 py-1 font-medium ${
                            r.status === 'ok'
                              ? 'text-positive'
                              : r.status === 'error'
                                ? 'text-negative'
                                : 'text-text-muted'
                          }`}
                        >
                          {r.status}
                        </td>
                        <td className="px-2 py-1 text-text-muted">{r.message ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {step === 'mapColumns' && (
              <button
                onClick={() => setStep('mapTypes')}
                disabled={!mapping.date || !mapping.type}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
              >
                Next: Map Types
              </button>
            )}
            {step === 'mapTypes' && (
              <button
                onClick={() => setStep('preview')}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
              >
                Preview Import
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleConfirmImport}
                disabled={okCount === 0}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
              >
                Import {okCount} row{okCount === 1 ? '' : 's'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  tone: 'positive' | 'negative' | 'muted';
}) {
  const toneClass =
    tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-text-muted';
  return (
    <span className={`flex items-center gap-1 rounded-full border border-border px-2 py-1 ${toneClass}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
