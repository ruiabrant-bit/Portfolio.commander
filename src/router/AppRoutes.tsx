import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { PortfolioPage } from '../pages/PortfolioPage';
import { TransactionsPage } from '../pages/TransactionsPage';
import { WatchlistsPage } from '../pages/WatchlistsPage';
import { ScreenerPage } from '../pages/ScreenerPage';
import { NewsPage } from '../pages/NewsPage';
import { JournalPage } from '../pages/JournalPage';
import { AICommanderPage } from '../pages/AICommanderPage';
import { SettingsPage } from '../pages/SettingsPage';

/**
 * Code-splitting (Commit 010 Polish): the Recharts-heavy pages
 * (Dashboard, Reports, Position Detail, Calendar) are lazy-loaded so
 * they don't bloat the initial bundle for people who only ever look at
 * Portfolio/Transactions. Addresses the >500kB bundle-size build
 * warning that had been accumulating since Commit 005 (Recharts is the
 * bulk of it) without removing Recharts or its features.
 */
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ReportsPage = lazy(() =>
  import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const PositionDetailPage = lazy(() =>
  import('../pages/PositionDetailPage').then((m) => ({ default: m.PositionDetailPage })),
);
const CalendarPage = lazy(() =>
  import('../pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);

function RouteFallback() {
  return <p className="p-8 text-center text-sm text-text-muted">Loading…</p>;
}

/**
 * Route map (PRD v1.3 navigation rules: max 2 clicks to any core
 * feature). Every top-level module is reachable directly from the
 * Sidebar (1 click); Position Detail is 1 click from Portfolio (2 total).
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="portfolio/:assetId" element={<PositionDetailPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="watchlists" element={<WatchlistsPage />} />
          <Route path="screener" element={<ScreenerPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="ai-commander" element={<AICommanderPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
