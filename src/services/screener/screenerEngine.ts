import type { Asset } from '../../types/domain';

/**
 * Screener Engine — fundamental side (PRD v1.1 §Screener).
 *
 * Technical filters (RSI, EMA, SMA, MACD, ATR, Volume) are not
 * implemented here: they need historical price series per asset, and no
 * market data provider is wired into the app (see signalEngine.ts
 * header for the same caveat). This engine only covers fundamentals,
 * which the app can hold directly on `Asset.fundamentals` without an
 * external data source, since the user enters them manually until one
 * is integrated.
 */
export interface FundamentalFilters {
  minMarketCap?: number;
  maxMarketCap?: number;
  minPE?: number;
  maxPE?: number;
  minPEG?: number;
  maxPEG?: number;
  minROE?: number;
  minRevenueGrowth?: number;
  minEPSGrowth?: number;
  minDividendYield?: number;
}

function passes(value: number | undefined, min?: number, max?: number): boolean {
  if (min !== undefined && (value === undefined || value < min)) return false;
  if (max !== undefined && (value === undefined || value > max)) return false;
  return true;
}

export function filterByFundamentals(assets: Asset[], filters: FundamentalFilters): Asset[] {
  return assets.filter((asset) => {
    const f = asset.fundamentals ?? {};
    return (
      passes(f.marketCap, filters.minMarketCap, filters.maxMarketCap) &&
      passes(f.peRatio, filters.minPE, filters.maxPE) &&
      passes(f.pegRatio, filters.minPEG, filters.maxPEG) &&
      passes(f.roe, filters.minROE) &&
      passes(f.revenueGrowth, filters.minRevenueGrowth) &&
      passes(f.epsGrowth, filters.minEPSGrowth) &&
      passes(f.dividendYield, filters.minDividendYield)
    );
  });
}
