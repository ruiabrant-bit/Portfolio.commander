/**
 * Finnhub client (Commit 009, person's explicit choice: Finnhub as a
 * single provider for News + Calendar, reusing the client-side
 * (localStorage) key storage pattern established for market data in
 * Commit 008b).
 *
 * Confidence note: Company News and Earnings Calendar endpoint shapes
 * are implemented against Finnhub's documented free-tier API. Economic
 * Calendar and Dividend Calendar availability/shape on the free tier is
 * less certain from training data alone — rather than guess and risk
 * silently wrong data, both fail loudly with Finnhub's real error
 * message surfaced in the UI if the endpoint doesn't behave as
 * expected, instead of being omitted or faked.
 */

const BASE_URL = 'https://finnhub.io/api/v1';

export class NewsDataError extends Error {
  code: 'NO_API_KEY' | 'INVALID_KEY' | 'RATE_LIMIT' | 'NOT_AVAILABLE' | 'UNKNOWN';

  constructor(
    code: 'NO_API_KEY' | 'INVALID_KEY' | 'RATE_LIMIT' | 'NOT_AVAILABLE' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = 'NewsDataError';
  }
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: string; // ISO
  relatedTicker: string;
}

export interface EarningsEvent {
  symbol: string;
  date: string; // ISO date
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
}

export interface EconomicEvent {
  event: string;
  country: string;
  date: string; // ISO date
  impact: string | null;
  actual: number | null;
  estimate: number | null;
}

export interface DividendEvent {
  symbol: string;
  exDate: string; // ISO date
  payDate: string | null;
  amount: number;
}

interface RawNewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number; // unix seconds
}

export function mapNewsResponse(raw: RawNewsItem[], relatedTicker: string): NewsArticle[] {
  return raw.map((item) => ({
    id: String(item.id),
    headline: item.headline,
    summary: item.summary,
    source: item.source,
    url: item.url,
    datetime: new Date(item.datetime * 1000).toISOString(),
    relatedTicker,
  }));
}

interface RawEarningsResponse {
  earningsCalendar?: {
    symbol: string;
    date: string;
    epsEstimate: number | null;
    epsActual: number | null;
    revenueEstimate: number | null;
    revenueActual: number | null;
  }[];
  error?: string;
}

export function mapEarningsResponse(raw: RawEarningsResponse): EarningsEvent[] {
  if (raw.error) {
    throw new NewsDataError('UNKNOWN', raw.error);
  }
  return (raw.earningsCalendar ?? []).map((e) => ({
    symbol: e.symbol,
    date: e.date,
    epsEstimate: e.epsEstimate,
    epsActual: e.epsActual,
    revenueEstimate: e.revenueEstimate,
    revenueActual: e.revenueActual,
  }));
}

interface RawEconomicResponse {
  economicCalendar?: {
    event: string;
    country: string;
    time: string;
    impact: string;
    actual: number | null;
    estimate: number | null;
  }[];
  error?: string;
}

export function mapEconomicResponse(raw: RawEconomicResponse): EconomicEvent[] {
  if (raw.error) {
    throw new NewsDataError('NOT_AVAILABLE', raw.error);
  }
  return (raw.economicCalendar ?? []).map((e) => ({
    event: e.event,
    country: e.country,
    date: e.time.slice(0, 10),
    impact: e.impact ?? null,
    actual: e.actual,
    estimate: e.estimate,
  }));
}

interface RawDividendResponse {
  dividendCalendar?: {
    symbol: string;
    date: string;
    payDate: string | null;
    amount: number;
  }[];
  error?: string;
}

export function mapDividendResponse(raw: RawDividendResponse): DividendEvent[] {
  if (raw.error) {
    throw new NewsDataError('NOT_AVAILABLE', raw.error);
  }
  return (raw.dividendCalendar ?? []).map((d) => ({
    symbol: d.symbol,
    exDate: d.date,
    payDate: d.payDate,
    amount: d.amount,
  }));
}

async function request<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = params.token;
  if (!apiKey) {
    throw new NewsDataError('NO_API_KEY', 'No Finnhub API key configured.');
  }
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new NewsDataError('UNKNOWN', 'Network error reaching Finnhub.');
  }

  if (response.status === 401 || response.status === 403) {
    const body = await response.json().catch(() => ({}));
    throw new NewsDataError(
      response.status === 401 ? 'INVALID_KEY' : 'NOT_AVAILABLE',
      body.error ?? `Finnhub returned ${response.status} — this endpoint may require a paid plan.`,
    );
  }
  if (response.status === 429) {
    throw new NewsDataError('RATE_LIMIT', 'Finnhub rate limit reached — try again later.');
  }

  return response.json() as Promise<T>;
}

const dateStr = (d: Date) => d.toISOString().slice(0, 10);

export async function fetchCompanyNews(
  symbol: string,
  apiKey: string,
  daysBack = 7,
): Promise<NewsArticle[]> {
  const to = new Date();
  const from = new Date(to.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const raw = await request<RawNewsItem[]>('/company-news', {
    symbol,
    from: dateStr(from),
    to: dateStr(to),
    token: apiKey,
  });
  return mapNewsResponse(raw ?? [], symbol);
}

export async function fetchEarningsCalendar(
  apiKey: string,
  daysAhead = 21,
): Promise<EarningsEvent[]> {
  const from = new Date();
  const to = new Date(from.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const raw = await request<RawEarningsResponse>('/calendar/earnings', {
    from: dateStr(from),
    to: dateStr(to),
    token: apiKey,
  });
  return mapEarningsResponse(raw);
}

export async function fetchEconomicCalendar(apiKey: string): Promise<EconomicEvent[]> {
  const raw = await request<RawEconomicResponse>('/calendar/economic', { token: apiKey });
  return mapEconomicResponse(raw);
}

export async function fetchDividendCalendar(
  apiKey: string,
  daysAhead = 30,
): Promise<DividendEvent[]> {
  const from = new Date();
  const to = new Date(from.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const raw = await request<RawDividendResponse>('/calendar/dividend', {
    from: dateStr(from),
    to: dateStr(to),
    token: apiKey,
  });
  return mapDividendResponse(raw);
}
