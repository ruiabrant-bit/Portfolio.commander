import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  Star,
  SlidersHorizontal,
  Newspaper,
  NotebookPen,
  FileBarChart,
  Sparkles,
  Settings,
  X,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/watchlists', label: 'Watchlists', icon: Star },
  { to: '/screener', label: 'Screener', icon: SlidersHorizontal },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

/**
 * Persistent sidebar (PRD v1.3): every core module is one click away.
 * AI Commander is visually separated as it is a cross-cutting feature
 * rather than a data module.
 */
export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
          <span className="text-sm font-semibold">Menu</span>
          <button onClick={onClose} aria-label="Close menu" className="text-text-muted">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-surface-raised text-text'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-colors ${
                      isActive ? 'bg-accent' : 'bg-transparent'
                    }`}
                  />
                  <Icon size={17} strokeWidth={1.75} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <NavLink
            to="/ai-commander"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text'
              }`
            }
          >
            <Sparkles size={17} strokeWidth={1.75} />
            AI Commander
          </NavLink>
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `mt-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-surface-raised text-text'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text'
              }`
            }
          >
            <Settings size={17} strokeWidth={1.75} />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}
