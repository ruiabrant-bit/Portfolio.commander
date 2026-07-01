import { describe, it, expect } from 'vitest';
import {
  mapNewsResponse,
  mapEarningsResponse,
  mapEconomicResponse,
  mapDividendResponse,
  NewsDataError,
} from '../../services/news/finnhubClient';

describe('mapNewsResponse', () => {
  it('maps raw news items to NewsArticle, converting unix seconds to ISO', () => {
    const result = mapNewsResponse(
      [{ id: 1, headline: 'Apple beats estimates', summary: 'Q2 results', source: 'Reuters', url: 'https://example.com', datetime: 1717200000 }],
      'AAPL',
    );
    expect(result[0]).toEqual({
      id: '1',
      headline: 'Apple beats estimates',
      summary: 'Q2 results',
      source: 'Reuters',
      url: 'https://example.com',
      datetime: new Date(1717200000 * 1000).toISOString(),
      relatedTicker: 'AAPL',
    });
  });

  it('returns an empty array for an empty response', () => {
    expect(mapNewsResponse([], 'AAPL')).toEqual([]);
  });
});

describe('mapEarningsResponse', () => {
  it('maps the earningsCalendar array', () => {
    const result = mapEarningsResponse({
      earningsCalendar: [
        { symbol: 'AAPL', date: '2024-07-25', epsEstimate: 1.5, epsActual: null, revenueEstimate: 90000, revenueActual: null },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('AAPL');
  });

  it('throws NewsDataError when the response carries an error field', () => {
    expect(() => mapEarningsResponse({ error: 'access denied' })).toThrow(NewsDataError);
  });

  it('returns an empty array when earningsCalendar is missing', () => {
    expect(mapEarningsResponse({})).toEqual([]);
  });
});

describe('mapEconomicResponse', () => {
  it('maps economic events, truncating time to a date', () => {
    const result = mapEconomicResponse({
      economicCalendar: [{ event: 'CPI', country: 'US', time: '2024-07-10T12:30:00', impact: 'high', actual: null, estimate: 3.1 }],
    });
    expect(result[0].date).toBe('2024-07-10');
    expect(result[0].event).toBe('CPI');
  });

  it('throws NewsDataError (NOT_AVAILABLE-friendly) when the response carries an error field', () => {
    expect(() => mapEconomicResponse({ error: 'This endpoint requires a paid plan.' })).toThrow(NewsDataError);
  });
});

describe('mapDividendResponse', () => {
  it('maps dividend calendar entries', () => {
    const result = mapDividendResponse({
      dividendCalendar: [{ symbol: 'JNJ', date: '2024-08-01', payDate: '2024-08-15', amount: 1.19 }],
    });
    expect(result[0]).toEqual({ symbol: 'JNJ', exDate: '2024-08-01', payDate: '2024-08-15', amount: 1.19 });
  });

  it('throws NewsDataError when the response carries an error field', () => {
    expect(() => mapDividendResponse({ error: 'not available' })).toThrow(NewsDataError);
  });
});
