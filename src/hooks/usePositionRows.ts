import { useMemo } from 'react';
import { usePortfolioSnapshot } from './usePortfolioSnapshot';
import { usePortfolioStore } from '../store/portfolioStore';
import {
  calculateMarketValue,
  calculateUnrealizedProfit,
  calculatePositionWeight,
  findAsset,
} from '../services/engines/portfolioEngine';
import type { Asset, Position } from '../types/domain';

export interface PositionRow {
  position: Position;
  asset: Asset | undefined;
  marketValue: number;
  unrealizedProfit: number;
  weight: number;
}

/** Enriches each Position with its Asset metadata and derived metrics. */
export function usePositionRows(): PositionRow[] {
  const snapshot = usePortfolioSnapshot();
  const assets = usePortfolioStore((s) => s.assets);

  return useMemo(() => {
    if (!snapshot) return [];
    return snapshot.positions.map((position) => ({
      position,
      asset: findAsset(assets, position.assetId),
      marketValue: calculateMarketValue(position),
      unrealizedProfit: calculateUnrealizedProfit(position),
      weight: calculatePositionWeight(position, snapshot.portfolioValue),
    }));
  }, [snapshot, assets]);
}
