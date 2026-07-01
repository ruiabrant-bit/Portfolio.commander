import type { MarketQuote } from '../../types/domain';
import type { OHLCV } from '../engines/signalEngine';

/**
 * Twelve Data client (Commit 008b, person's explicit choice: Twelve
 * Data provider, key stored client-side). Free tier: ~800 requests/day
 * — quotes are batched into a single request per refresh to conserve
 * quota; historical series are fetched per-asset only when the person
 * actually opens that position's Chart/Technical Analysis tab, not
 * proactively for every known asset.
 */

const BASE_URL = 'https://api.twelvedata.com';

export class MarketDataError extends Error {
  code: 'NO_API_KEY' | 'INVALID_KEY' | 'RATE_LIMIT' | 'SYMBOL_NOT_FOUND' | 'UNKNOWN';

  constructor(
    code: 'NO_API_KEY' | 'INVALID_KEY' | 'RATE_LIMIT' | 'SYMBOL_NOT_FOUND' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = 'MarketDataError';
  }
}

interface RawQuote {
  symbol: string;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  datetime?: string;
  code?: number;
  message?: string;
}

/** Maps a single Twelve Data quote object into our MarketQuote shape. Pure, testable. */
export function mapQuoteResponse(raw: RawQuote, assetId: string): MarketQuote {
  if (raw.code && raw.code >= 400) {
    throw new MarketDataError(
      raw.code === 401 || raw.code === 403 ? 'INVALID_KEY' : 'UNKNOWN',
      raw.message ?? 'Unknown error from market data provider.',
    );
  }
  const price = Number(raw.close);
  const change = Number(raw.change ?? 0);
  const changePercent = Number(raw.percent_change ?? 0);
  if (!Number.isFinite(price)) {
    throw new MarketDataError('SYMBOL_NOT_FOUND', `No quote data for ${assetId}.`);
  }
  return {
    assetId,
    price,
    change: Number.isFinite(change) ? change : 0,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    timestamp: raw.datetime ? new Date(raw.datetime).toISOString() : new Date().toISOString(),
  };
}

interface RawTimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface RawTimeSeriesResponse {
  values?: RawTimeSeriesValue[];
  status?: string;
  code?: number;
  message?: string;
}

/** Maps a Twelve Data time_series response into ascending-chronological OHLCV[]. Pure, testable. */
export function mapTimeSeriesResponse(raw: RawTimeSeriesResponse): OHLCV[] {
  if (raw.status === 'error' || (raw.code && raw.code >= 400)) {
    throw new MarketDataError(
      raw.code === 401 || raw.code === 403 ? 'INVALID_KEY' : 'UNKNOWN',
      raw.message ?? 'Unknown error from market data provider.',
    );
  }
  const values = raw.values ?? [];
  // Twelve Data returns most-recent-first; we want ascending for indicators.
  return [...values]
    .reverse()
    .map((v) => ({
      date: v.datetime.slice(0, 10),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume),
    }));
}

async function request<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = params.apikey;
  if (!apiKey) {
    throw new MarketDataError('NO_API_KEY', 'No Twelve Data API key configured.');
  }
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new MarketDataError('UNKNOWN', 'Network error reaching Twelve Data.');
  }

  if (response.status === 429) {
    throw new MarketDataError('RATE_LIMIT', 'Twelve Data rate limit reached — try again later.');
  }
  return response.json() as Promise<T>;
}

/**
 * Fetches current quotes for multiple symbols in a single request
 * (comma-separated `symbol` param), to conserve free-tier quota.
 */
export async function fetchQuotes(
  assetIdsBySymbol: Map<string, string>,
  apiKey: string,
): Promise<MarketQuote[]> {
  if (assetIdsBySymbol.size === 0) return [];
  const symbols = Array.from(assetIdsBySymbol.keys());
  const raw = await request<Record<string, RawQuote> | RawQuote>('/quote', {
    symbol: symbols.join(','),
    apikey: apiKey,
  });

  // Twelve Data returns a single object for one symbol, or an object
  // keyed by symbol for multiple.
  const entries: RawQuote[] =
    symbols.length === 1 ? [raw as RawQuote] : Object.values(raw as Record<string, RawQuote>);

  return entries.map((entry) => mapQuoteResponse(entry, assetIdsBySymbol.get(entry.symbol) ?? entry.symbol));
}

export async function fetchTimeSeries(
  symbol: string,
  apiKey: string,
  interval: '1day' | '1week' = '1day',
  outputsize = 100,
): Promise<OHLCV[]> {
  const raw = await request<RawTimeSeriesResponse>('/time_series', {
    symbol,
    interval,
    outputsize: String(outputsize),
    apikey: apiKey,
  });
  return mapTimeSeriesResponse(raw);
}
