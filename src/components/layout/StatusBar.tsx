/**
 * Status bar (PRD v1.3 layout: Top bar + Sidebar + Status bar).
 * Local-first indicator; will reflect real sync/import state once
 * persistence lands.
 */
export function StatusBar() {
  return (
    <footer className="flex h-6 items-center justify-between border-t border-border bg-surface px-3 text-[11px] text-text-faint">
      <span>Local-first · No cloud sync</span>
      <span className="font-data">Portfolio Commander · v0.1.0</span>
    </footer>
  );
}
