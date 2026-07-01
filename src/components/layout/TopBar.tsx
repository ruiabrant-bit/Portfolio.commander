import { Menu, Search, Bell, Sparkles, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopBarProps {
  onMenuClick: () => void;
}

/**
 * Top bar (PRD v1.3): Search, Market Status, Notifications, AI Commander,
 * Profile. Market status is a static placeholder here — it becomes a live
 * indicator once market data wiring lands (Commit 005/009).
 */
export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-3 lg:px-4">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover hover:text-text lg:hidden"
      >
        <Menu size={20} />
      </button>

      <Link to="/" className="flex items-center gap-2 pr-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-xs font-bold text-white">
          PC
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">
          Portfolio Commander
        </span>
      </Link>

      <div className="relative ml-1 hidden max-w-xs flex-1 md:block">
        <Search
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <input
          type="text"
          placeholder="Search tickers, positions, news…"
          className="w-full rounded-md border border-border bg-bg py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted sm:flex">
          <Circle size={7} className="fill-positive text-positive" />
          Market Open
        </span>

        <Link
          to="/ai-commander"
          className="flex items-center gap-1.5 rounded-md bg-accent-muted px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
        >
          <Sparkles size={14} />
          <span className="hidden sm:inline">Ask AI</span>
        </Link>

        <button
          aria-label="Notifications"
          className="rounded-md p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <Bell size={18} />
        </button>

        <Link
          to="/settings"
          aria-label="Profile"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-xs font-medium text-text-muted hover:text-text"
        >
          RA
        </Link>
      </div>
    </header>
  );
}
