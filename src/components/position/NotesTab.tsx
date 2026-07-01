import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { usePortfolioStore } from '../../store/portfolioStore';

/**
 * Shows and edits investment thesis / personal notes for a single asset
 * (PRD v1.1 Position Detail: "Show investment thesis and personal
 * notes"). Backed by the same `JournalEntry` records used by the
 * standalone Journal module (PRD v1.1: "thesis, screenshots, lessons
 * learned and review date"), so an entry created here also shows up in
 * the global Journal, and vice versa.
 */
export function NotesTab({ assetId }: { assetId: string }) {
  const entries = usePortfolioStore((s) => s.journalEntries);
  const addJournalEntry = usePortfolioStore((s) => s.addJournalEntry);
  const removeJournalEntry = usePortfolioStore((s) => s.removeJournalEntry);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const assetEntries = useMemo(
    () =>
      entries
        .filter((e) => e.assetId === assetId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries, assetId],
  );

  function handleAdd() {
    if (!notes.trim()) return;
    addJournalEntry({
      id: crypto.randomUUID(),
      assetId,
      title: title.trim() || 'Note',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    setTitle('');
    setNotes('');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-medium text-text-muted">Add thesis or note</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Investment Thesis)"
          className="mb-2 w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why did you buy this? What would change your mind?"
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-bg px-3 py-1.5 text-sm placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!notes.trim()}
          className="mt-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
        >
          Save note
        </button>
      </div>

      {assetEntries.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          No notes yet for this position.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assetEntries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border bg-surface p-3 text-sm"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="font-medium">{entry.title}</span>
                <div className="flex items-center gap-2 whitespace-nowrap text-xs text-text-faint">
                  {new Date(entry.createdAt).toLocaleDateString()}
                  <button
                    onClick={() => removeJournalEntry(entry.id)}
                    aria-label="Delete note"
                    className="text-text-faint hover:text-negative"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-text-muted">{entry.notes}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
