import type { Asset, Position } from '../../types/domain';
import { calculateMarketValue, findAsset } from './portfolioEngine';

/**
 * Allocation Engine — PRD v1.2 §4.
 * Groups Market Value by a chosen Asset dimension (sector, country/exchange,
 * currency, asset type). Country is not a first-class field on Asset in the
 * v1.0 data model, so it is derived from `exchange` unless a caller supplies
 * an explicit mapping.
 */

export interface AllocationBucket {
  label: string;
  value: number;
  weight: number;
}

function groupBy(
  positions: Position[],
  assets: Asset[],
  keyFn: (asset: Asset) => string | null,
): AllocationBucket[] {
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const position of positions) {
    const asset = findAsset(assets, position.assetId);
    const key = asset ? (keyFn(asset) ?? 'Unknown') : 'Unknown';
    const value = calculateMarketValue(position);
    totals.set(key, (totals.get(key) ?? 0) + value);
    grandTotal += value;
  }

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      value,
      weight: grandTotal === 0 ? 0 : value / grandTotal,
    }))
    .sort((a, b) => b.value - a.value);
}

export function allocationBySector(
  positions: Position[],
  assets: Asset[],
): AllocationBucket[] {
  return groupBy(positions, assets, (a) => a.sector);
}

export function allocationByCountry(
  positions: Position[],
  assets: Asset[],
  exchangeToCountry: Record<string, string> = {},
): AllocationBucket[] {
  return groupBy(
    positions,
    assets,
    (a) => (a.exchange ? (exchangeToCountry[a.exchange] ?? a.exchange) : null),
  );
}

export function allocationByCurrency(
  positions: Position[],
  assets: Asset[],
): AllocationBucket[] {
  return groupBy(positions, assets, (a) => a.currency);
}

export function allocationByAssetType(
  positions: Position[],
  assets: Asset[],
): AllocationBucket[] {
  return groupBy(positions, assets, (a) => a.assetType);
}
