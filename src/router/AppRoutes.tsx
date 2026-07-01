import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { PortfolioPage } from '../pages/PortfolioPage';
import { PositionDetailPage } from '../pages/PositionDetailPage';
import { TransactionsPage } from '../pages/TransactionsPage';
import { WatchlistsPage } from '../pages/WatchlistsPage';
import { ScreenerPage } from '../pages/ScreenerPage';
import { NewsPage } from '../pages/NewsPage';
import { CalendarPage } from '../pages/CalendarPage';
import { JournalPage } from '../pages/JournalPage';
import { ReportsPage } from '../pages/ReportsPage';
import { AICommanderPage } from '../pages/AICommanderPage';
import { SettingsPage } from '../pages/SettingsPage';

/**
 * Route map (PRD v1.3 navigation rules: max 2 clicks to any core
 * feature). Every top-level module is reachable directly from the
 * Sidebar (1 click); Position Detail is 1 click from Portfolio (2 total).
 */
export function AppRoutes() {
  return (
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
  );
}
