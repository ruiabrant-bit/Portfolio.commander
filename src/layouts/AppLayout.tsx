import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusBar } from '../components/layout/StatusBar';
import { useTheme } from '../hooks/useTheme';

/**
 * Global layout (PRD v1.3): Top bar + persistent Sidebar + Status bar,
 * with a hamburger-driven overlay sidebar on tablet/mobile. Every page
 * is rendered through this shell via <Outlet />.
 */
export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useTheme(); // applies the persisted theme attribute on mount

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <TopBar onMenuClick={() => setMobileNavOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
