import { describe, it, expect } from 'vitest';
import { answerQuery, type AIContext } from '../../services/ai/aiCommander';
import type { Asset, Position } from '../../types/domain';

const assets: Asset[] = [
  {
    id: 'AAPL',
    ticker: 'AAPL',
    isin: null,
    name: 'Apple',
    assetType: 'STOCK',
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Hardware',
    currency: 'USD',
  },
  {
    id: 'JNJ',
    ticker: 'JNJ',
    isin: null,
    name: 'Johnson & Johnson',
    assetType: 'STOCK',
    exchange: 'NYSE',
    sector: 'Healthcare',
    industry: 'Pharma',
    currency: 'USD',
  },
];

function ctxWithConcentration(): AIContext {
  const positions: Position[] = [
    { id: '1', portfolioId: 'p1', assetId: 'AAPL', quantity: 100, averagePrice: 100, currentPrice: 150 }, // 15000
    { id: '2', portfolioId: 'p1', assetId: 'JNJ', quantity: 10, averagePrice: 100, currentPrice: 100 }, // 1000
  ];
  return {
    positions,
    assets,
    portfolioValue: 16000,
    cash: 0,
    baseCurrency: 'EUR',
  };
}

function emptyCtx(): AIContext {
  return { positions: [], assets: [], portfolioValue: 0, cash: 1000, baseCurrency: 'EUR' };
}

describe('AI Commander — every answer includes reasoning (PRD v1.2 S9)', () => {
  it('risk query returns advisory language and non-empty reasoning', () => {
    const res = answerQuery('what is my risk?', ctxWithConcentration());
    expect(res.reasoning.length).toBeGreaterThan(0);
    expect(res.answer.toLowerCase()).toMatch(/consider/);
  });

  it('flags concentration when a position exceeds the threshold', () => {
    const res = answerQuery('what is my risk?', ctxWithConcentration());
    expect(res.answer).toMatch(/largest position/i);
  });

  it('does not flag concentration when positions are balanced', () => {
    const balancedAssets: Asset[] = [
      { id: 'A', ticker: 'A', isin: null, name: 'A', assetType: 'STOCK', exchange: null, sector: 'Tech', industry: null, currency: 'USD' },
      { id: 'B', ticker: 'B', isin: null, name: 'B', assetType: 'STOCK', exchange: null, sector: 'Healthcare', industry: null, currency: 'USD' },
      { id: 'C', ticker: 'C', isin: null, name: 'C', assetType: 'STOCK', exchange: null, sector: 'Energy', industry: null, currency: 'USD' },
      { id: 'D', ticker: 'D', isin: null, name: 'D', assetType: 'STOCK', exchange: null, sector: 'Financials', industry: null, currency: 'USD' },
      { id: 'E', ticker: 'E', isin: null, name: 'E', assetType: 'STOCK', exchange: null, sector: 'Industrials', industry: null, currency: 'USD' },
    ];
    const balanced: AIContext = {
      positions: balancedAssets.map((a, i) => ({
        id: String(i),
        portfolioId: 'p1',
        assetId: a.id,
        quantity: 10,
        averagePrice: 100,
        currentPrice: 100,
      })),
      assets: balancedAssets,
      portfolioValue: 5000, // 5 positions x 1000 = 20% each
      cash: 0,
      baseCurrency: 'EUR',
    };
    const res = answerQuery('what is my risk?', balanced);
    expect(res.answer.toLowerCase()).toMatch(/reasonably spread/);
  });
});

describe('AI Commander — riskiest position', () => {
  it('identifies the highest-weight position as riskiest by concentration', () => {
    const res = answerQuery('what is my riskiest position?', ctxWithConcentration());
    expect(res.answer).toMatch(/AAPL/);
    expect(res.reasoning.some((r) => r.includes('weight'))).toBe(true);
  });

  it('handles an empty portfolio gracefully', () => {
    const res = answerQuery('what is my riskiest position?', emptyCtx());
    expect(res.answer).toMatch(/no open positions/i);
  });
});

describe('AI Commander — diversification', () => {
  it('warns when portfolio spans very few sectors', () => {
    const res = answerQuery('am I diversified?', ctxWithConcentration());
    expect(res.answer.toLowerCase()).toMatch(/consider/);
  });
});

describe('AI Commander — capital allocation (risk considered before suggesting, PRD v1.2 S9)', () => {
  it('parses an amount and always mentions current concentration before suggesting', () => {
    const res = answerQuery('where should I invest €500?', ctxWithConcentration());
    expect(res.reasoning.some((r) => r.toLowerCase().includes('weight'))).toBe(true);
    expect(res.answer).toMatch(/500/);
  });

  it('handles a first-position scenario (no existing holdings)', () => {
    const res = answerQuery('where should I invest 1000?', emptyCtx());
    expect(res.answer.toLowerCase()).toMatch(/first position|diversified/);
  });
});

describe('AI Commander — unmatched query falls back to help', () => {
  it('returns example queries for unrecognized input', () => {
    const res = answerQuery('what is the meaning of life', ctxWithConcentration());
    expect(res.answer.toLowerCase()).toMatch(/portfolio data/);
  });
});

describe('AI Commander — news query is honestly deferred, not fabricated', () => {
  it('states news is not available yet rather than making something up', () => {
    const res = answerQuery('summarize the news', ctxWithConcentration());
    expect(res.answer.toLowerCase()).toMatch(/commit 009/);
  });
});
