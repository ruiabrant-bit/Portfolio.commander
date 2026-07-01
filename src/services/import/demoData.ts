import type { Asset, Trade, Dividend, CashMovement, MarketQuote } from '../../types/domain';

/**
 * Demo data seed.
 *
 * ADR-005 states the CSV import is the only source of truth for
 * transaction history — this seed exists purely so the Portfolio and
 * Position Detail screens have something real to render and be verified
 * against before the CSV import wizard exists (Commit 004). It produces
 * plain `Trade`/`Dividend`/`CashMovement` records like any other import
 * would; nothing downstream treats it specially. Remove the "Load Demo
 * Data" entry point once Commit 004 ships.
 */
export function buildDemoData(): {
  assets: Asset[];
  trades: Trade[];
  dividends: Dividend[];
  cashMovements: CashMovement[];
  quotes: MarketQuote[];
} {
  const assets: Asset[] = [
    {
      id: 'AAPL',
      ticker: 'AAPL',
      isin: 'US0378331005',
      name: 'Apple Inc.',
      assetType: 'STOCK',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      currency: 'USD',
    },
    {
      id: 'MSFT',
      ticker: 'MSFT',
      isin: 'US5949181045',
      name: 'Microsoft Corporation',
      assetType: 'STOCK',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Software',
      currency: 'USD',
    },
    {
      id: 'JNJ',
      ticker: 'JNJ',
      isin: 'US4781601046',
      name: 'Johnson & Johnson',
      assetType: 'STOCK',
      exchange: 'NYSE',
      sector: 'Healthcare',
      industry: 'Pharmaceuticals',
      currency: 'USD',
    },
    {
      id: 'VWCE',
      ticker: 'VWCE',
      isin: 'IE00BK5BQT80',
      name: 'Vanguard FTSE All-World UCITS ETF',
      assetType: 'ETF',
      exchange: 'XETRA',
      sector: null,
      industry: null,
      currency: 'EUR',
    },
  ];

  const trades: Trade[] = [
    { id: 't1', portfolioId: 'default', assetId: 'AAPL', type: 'BUY', quantity: 15, price: 165.2, fees: 1, taxes: 0, date: '2023-03-10', importHash: 'demo-t1' },
    { id: 't2', portfolioId: 'default', assetId: 'AAPL', type: 'BUY', quantity: 5, price: 190.5, fees: 1, taxes: 0, date: '2023-11-02', importHash: 'demo-t2' },
    { id: 't3', portfolioId: 'default', assetId: 'MSFT', type: 'BUY', quantity: 8, price: 310.0, fees: 1, taxes: 0, date: '2023-05-18', importHash: 'demo-t3' },
    { id: 't4', portfolioId: 'default', assetId: 'JNJ', type: 'BUY', quantity: 10, price: 160.0, fees: 1, taxes: 0, date: '2024-01-15', importHash: 'demo-t4' },
    { id: 't5', portfolioId: 'default', assetId: 'JNJ', type: 'SELL', quantity: 3, price: 152.0, fees: 1, taxes: 2, date: '2024-04-20', importHash: 'demo-t5' },
    { id: 't6', portfolioId: 'default', assetId: 'VWCE', type: 'BUY', quantity: 40, price: 105.3, fees: 0, taxes: 0, date: '2024-02-01', importHash: 'demo-t6' },
  ];

  const dividends: Dividend[] = [
    { id: 'd1', portfolioId: 'default', assetId: 'AAPL', gross: 12.6, net: 10.7, tax: 1.9, paymentDate: '2024-05-16', importHash: 'demo-d1' },
    { id: 'd2', portfolioId: 'default', assetId: 'JNJ', gross: 9.8, net: 8.3, tax: 1.5, paymentDate: '2024-06-10', importHash: 'demo-d2' },
  ];

  const cashMovements: CashMovement[] = [
    { id: 'c1', portfolioId: 'default', type: 'DEPOSIT', amount: 10000, currency: 'EUR', date: '2023-01-01', importHash: 'demo-c1' },
    { id: 'c2', portfolioId: 'default', type: 'DEPOSIT', amount: 2000, currency: 'EUR', date: '2024-01-05', importHash: 'demo-c2' },
  ];

  const quotes: MarketQuote[] = [
    { assetId: 'AAPL', price: 205.4, change: 1.8, changePercent: 0.88, timestamp: new Date().toISOString() },
    { assetId: 'MSFT', price: 428.1, change: -2.3, changePercent: -0.53, timestamp: new Date().toISOString() },
    { assetId: 'JNJ', price: 148.9, change: 0.4, changePercent: 0.27, timestamp: new Date().toISOString() },
    { assetId: 'VWCE', price: 118.75, change: 0.6, changePercent: 0.51, timestamp: new Date().toISOString() },
  ];

  return { assets, trades, dividends, cashMovements, quotes };
}
