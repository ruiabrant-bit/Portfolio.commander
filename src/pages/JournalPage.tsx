import { useMemo, useState } from 'react';
import { Trash2, NotebookPen } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';

/**
 * Journal (PRD v1.1): "each investment may contain thesis, screenshots,
 * lessons learned and review date". Screenshots and review-date
 * reminders are not implemented yet (no file storage / notification
 * layer exists in this commit); this is the global, cross-asset view of
 * the same JournalEntry records editable per-position in the Notes tab.
 */
export function JournalPage() {
  const entries = usePortfolioStore((s) => s.journalEntries);
  const assets = usePortfolioStore((s) => s.assets);
  const addJournalEntry = usePortfolioStore((s) => s.addJournalEntry);
  const removeJournalEntry = usePortfolioStore((s) => s.removeJournalEntry);

  const [assetTicker, setAssetTicker] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [entries],
  );

  function handleAdd() {
    const ticker = assetTicker.trim().toUpperCase();
    if (!ticker || !notes.trim()) return;
    const asset = assets.find((a) => a.ticker === ticker);
    addJournalEntry({
      id: crypto.randomUUID(),
      assetId: asset?.id ?? ticker,
      title: title.trim() || 'Note',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    setAssetTicker('');
    setTitle('');
    setNotes('');
  }

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Journal</h1>

      <div className="mb-5 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-medium text-text-muted">New entry</h2>
        <div className="mb-2 flex gap-2">
          <input
            value={assetTicker}
            onChange={(e) => setAssetTicker(e.target.value)}
            placeholder="Ticker (e.g. AAPL)"
            className="w-32 rounded-md border border-border bg-bg px-3 py-1.5 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="flex-1 rounded-md border border-border bg-bg px-3 py-1.5 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Thesis, lesson learned, or review notes…"
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-bg px-3 py-1.5 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!assetTicker.trim() || !notes.trim()}
          className="mt-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
        >
          Save entry
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <NotebookPen size={20} className="text-text-faint" />
          <p className="text-sm text-text-muted">No journal entries yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((entry) => {
            const asset = assets.find((a) => a.id === entry.assetId);
            return (
              <li key={entry.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span>
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-data text-xs text-text-muted">
                      {asset?.ticker ?? entry.assetId}
                    </span>{' '}
                    <span className="font-medium">{entry.title}</span>
                  </span>
                  <div className="flex items-center gap-2 whitespace-nowrap text-xs text-text-faint">
                    {new Date(entry.createdAt).toLocaleDateString()}
                    <button
                      onClick={() => removeJournalEntry(entry.id)}
                      aria-label="Delete entry"
                      className="text-text-faint hover:text-negative"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-text-muted">{entry.notes}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
