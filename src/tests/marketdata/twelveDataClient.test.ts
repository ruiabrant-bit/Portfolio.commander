import { describe, it, expect } from 'vitest';
import { mapQuoteResponse, mapTimeSeriesResponse, MarketDataError } from '../../services/marketdata/twelveDataClient';

describe('mapQuoteResponse', () => {
  it('maps a valid quote response to a MarketQuote', () => {
    const quote = mapQuoteResponse(
      { symbol: 'AAPL', close: '205.40', change: '1.80', percent_change: '0.88', datetime: '2024-06-01' },
      'AAPL',
    );
    expect(quote).toEqual({
      assetId: 'AAPL',
      price: 205.4,
      change: 1.8,
      changePercent: 0.88,
      timestamp: new Date('2024-06-01').toISOString(),
    });
  });

  it('throws MarketDataError for an invalid API key response', () => {
    expect(() => mapQuoteResponse({ symbol: 'AAPL', code: 401, message: 'invalid apikey' }, 'AAPL')).toThrow(
      MarketDataError,
    );
  });

  it('throws MarketDataError when the symbol has no close price', () => {
    expect(() => mapQuoteResponse({ symbol: 'NOPE' }, 'NOPE')).toThrow(MarketDataError);
  });

  it('defaults missing change/percent_change to 0', () => {
    const quote = mapQuoteResponse({ symbol: 'AAPL', close: '100' }, 'AAPL');
    expect(quote.change).toBe(0);
    expect(quote.changePercent).toBe(0);
  });
});

describe('mapTimeSeriesResponse', () => {
  it('reverses Twelve Data most-recent-first order into ascending chronological order', () => {
    const result = mapTimeSeriesResponse({
      status: 'ok',
      values: [
        { datetime: '2024-01-03', open: '3', high: '3', low: '3', close: '3', volume: '100' },
        { datetime: '2024-01-02', open: '2', high: '2', low: '2', close: '2', volume: '100' },
        { datetime: '2024-01-01', open: '1', high: '1', low: '1', close: '1', volume: '100' },
      ],
    });
    expect(result.map((v) => v.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
  });

  it('parses numeric fields correctly', () => {
    const result = mapTimeSeriesResponse({
      status: 'ok',
      values: [{ datetime: '2024-01-01', open: '10.5', high: '11', low: '9.5', close: '10.8', volume: '1000' }],
    });
    expect(result[0]).toEqual({ date: '2024-01-01', open: 10.5, high: 11, low: 9.5, close: 10.8, volume: 1000 });
  });

  it('throws MarketDataError on an error response', () => {
    expect(() => mapTimeSeriesResponse({ status: 'error', code: 401, message: 'invalid apikey' })).toThrow(
      MarketDataError,
    );
  });

  it('returns an empty array when values is missing', () => {
    expect(mapTimeSeriesResponse({ status: 'ok' })).toEqual([]);
  });
});
