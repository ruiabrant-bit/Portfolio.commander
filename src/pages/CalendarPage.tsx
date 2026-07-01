import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { KeyRound, CalendarDays } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useFinnhubApiKey } from '../hooks/useFinnhubApiKey';
import {
  fetchEarningsCalendar,
  fetchEconomicCalendar,
  fetchDividendCalendar,
  NewsDataError,
} from '../services/news/finnhubClient';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

/**
 * Calendar (PRD v1.1): Earnings calendar, Dividend calendar, Economic
 * events (Fed, ECB, CPI, PPI, GDP, Payrolls). This module didn't exist
 * as a route before Commit 009 — it was defined in the PRD as its own
 * module distinct from News, but the Commit 002 routing/sidebar work
 * only wired News. Added here, alongside the data to fill it.
 *
 * Earnings is filtered client-side to assets already known to the app,
 * since Finnhub's calendar endpoint returns all US companies otherwise
 * (irrelevant to a personal portfolio). Economic and Dividend calendar
 * endpoint availability on the free tier is uncertain (see
 * finnhubClient.ts) — both fail loudly with Finnhub's real error rather
 * than silently showing nothing if the plan doesn't include them.
 */
export function CalendarPage() {
  const { apiKey } = useFinnhubApiKey();
  const assets = usePortfolioStore((s) => s.assets);
  const knownTickers = useMemo(() => new Set(assets.map((a) => a.ticker)), [assets]);

  const earnings = useQuery({
    queryKey: ['earningsCalendar', apiKey],
    queryFn: () => fetchEarningsCalendar(apiKey as string),
    enabled: Boolean(apiKey),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const economic = useQuery({
    queryKey: ['economicCalendar', apiKey],
    queryFn: () => fetchEconomicCalendar(apiKey as string),
    enabled: Boolean(apiKey),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const dividends = useQuery({
    queryKey: ['dividendCalendar', apiKey],
    queryFn: () => fetchDividendCalendar(apiKey as string),
    enabled: Boolean(apiKey),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const relevantEarnings = (earnings.data ?? []).filter((e) => knownTickers.has(e.symbol));
  const relevantDividends = (dividends.data ?? []).filter((d) => knownTickers.has(d.symbol));

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <KeyRound size={20} className="text-text-faint" />
        <p className="text-sm text-text-muted">Connect a Finnhub API key to see the calendar.</p>
        <Link to="/settings" className="text-sm text-accent hover:underline">
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Earnings — your holdings</h2>
        <CalendarSection
          isLoading={earnings.isLoading}
          error={earnings.error}
          isEmpty={relevantEarnings.length === 0}
          emptyText="No upcoming earnings dates found for your holdings in the next 3 weeks."
        >
          <ul className="divide-y divide-border rounded-lg border border-border">
            {relevantEarnings.map((e, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{e.symbol}</span>
                <span className="text-text-muted">{fmtDate(e.date)}</span>
                <span className="font-data text-xs text-text-muted">
                  EPS est. {e.epsEstimate ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </CalendarSection>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Dividends — your holdings</h2>
        <CalendarSection
          isLoading={dividends.isLoading}
          error={dividends.error}
          isEmpty={relevantDividends.length === 0}
          emptyText="No upcoming ex-dividend dates found for your holdings."
        >
          <ul className="divide-y divide-border rounded-lg border border-border">
            {relevantDividends.map((d, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{d.symbol}</span>
                <span className="text-text-muted">Ex-date {fmtDate(d.exDate)}</span>
                <span className="font-data text-xs">{d.amount}</span>
              </li>
            ))}
          </ul>
        </CalendarSection>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Economic Events</h2>
        <CalendarSection
          isLoading={economic.isLoading}
          error={economic.error}
          isEmpty={(economic.data ?? []).length === 0}
          emptyText="No economic events available."
        >
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(economic.data ?? []).slice(0, 20).map((e, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{e.event}</span>
                <span className="text-text-muted">{e.country}</span>
                <span className="text-xs text-text-muted">{fmtDate(e.date)}</span>
              </li>
            ))}
          </ul>
        </CalendarSection>
      </section>
    </div>
  );
}

function CalendarSection({
  isLoading,
  error,
  isEmpty,
  emptyText,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <p className="py-4 text-center text-sm text-text-muted">Loading…</p>;
  }
  if (error) {
    return (
      <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-negative">
        {error instanceof NewsDataError ? error.message : 'Failed to load.'}
      </p>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-text-muted">
        <CalendarDays size={14} className="shrink-0" />
        {emptyText}
      </div>
    );
  }
  return <>{children}</>;
}
