import type { Asset, Position } from '../../types/domain';
import { calculatePositionWeight } from '../engines/portfolioEngine';
import { calculateMaxPositionWeight, calculateConcentration } from '../engines/riskEngine';
import { allocationBySector, allocationByAssetType } from '../engines/allocationEngine';

/**
 * AI Commander advisory engine.
 *
 * This is a deterministic, rule-based assistant — not an LLM. See
 * CHANGELOG Commit 007 for why: calling the Anthropic API from the
 * browser would require embedding an API key in the client bundle,
 * which is unsafe, and this app's architecture (ADR-001, local-first,
 * no backend) has no proxy to hold that key. Every function here still
 * enforces the PRD v1.2 §9 rules that any AI Commander implementation
 * must follow:
 *   - recommendations are advisory only ("consider", never "do this")
 *   - every recommendation carries reasoning
 *   - portfolio risk is considered before suggesting anything
 *   - concentration/diversification is explained, not just stated
 */

export interface AIContext {
  positions: Position[];
  assets: Asset[];
  portfolioValue: number;
  cash: number;
  baseCurrency: string;
}

export interface AICommanderResponse {
  answer: string;
  reasoning: string[];
}

const CONCENTRATION_WARNING_THRESHOLD = 0.25; // 25% in one position or sector

function findAsset(assets: Asset[], assetId: string): Asset | undefined {
  return assets.find((a) => a.id === assetId);
}

function answerRisk(ctx: AIContext): AICommanderResponse {
  if (ctx.positions.length === 0) {
    return {
      answer: 'There are no open positions yet, so there is no position-level risk to report.',
      reasoning: ['Risk metrics require at least one open position.'],
    };
  }

  const maxWeight = calculateMaxPositionWeight(ctx.positions, ctx.portfolioValue);
  const sectorBuckets = allocationBySector(ctx.positions, ctx.assets);
  const sectorConcentration = calculateConcentration(sectorBuckets);
  const topSector = sectorBuckets[0];

  const reasoning = [
    `Largest single position is ${(maxWeight * 100).toFixed(1)}% of the portfolio.`,
    topSector
      ? `Largest sector (${topSector.label}) is ${(sectorConcentration * 100).toFixed(1)}% of invested value.`
      : 'No sector data available for the current positions.',
  ];

  const flags: string[] = [];
  if (maxWeight > CONCENTRATION_WARNING_THRESHOLD) {
    flags.push(
      `your largest position alone exceeds ${(CONCENTRATION_WARNING_THRESHOLD * 100).toFixed(0)}% of the portfolio`,
    );
  }
  if (sectorConcentration > CONCENTRATION_WARNING_THRESHOLD) {
    flags.push(
      `${topSector?.label ?? 'one sector'} makes up more than ${(CONCENTRATION_WARNING_THRESHOLD * 100).toFixed(0)}% of invested value`,
    );
  }

  const answer =
    flags.length > 0
      ? `Consider reviewing concentration risk: ${flags.join(' and ')}. A single adverse move in that position or sector would have an outsized effect on total portfolio value.`
      : 'Concentration looks reasonably spread — no single position or sector dominates the portfolio at the moment.';

  return {
    answer,
    reasoning: [
      ...reasoning,
      'Note: volatility, Sharpe and Sortino ratios need historical portfolio value data, which isn\'t collected yet — this answer only covers concentration, not price-based risk.',
    ],
  };
}

function answerRiskiestPosition(ctx: AIContext): AICommanderResponse {
  if (ctx.positions.length === 0) {
    return {
      answer: 'There are no open positions to evaluate.',
      reasoning: ['No positions in the portfolio.'],
    };
  }

  const sorted = [...ctx.positions].sort(
    (a, b) =>
      calculatePositionWeight(b, ctx.portfolioValue) - calculatePositionWeight(a, ctx.portfolioValue),
  );
  const top = sorted[0];
  const asset = findAsset(ctx.assets, top.assetId);
  const weight = calculatePositionWeight(top, ctx.portfolioValue);
  const unrealizedPct =
    top.averagePrice === 0 ? 0 : (top.currentPrice - top.averagePrice) / top.averagePrice;

  return {
    answer: `By concentration, ${asset?.ticker ?? top.assetId} is your riskiest position — it's ${(weight * 100).toFixed(1)}% of the portfolio, so it has the largest single-position impact on total value if it moves.`,
    reasoning: [
      `Position weight: ${(weight * 100).toFixed(1)}% of portfolio value.`,
      `Current unrealized return on this position: ${unrealizedPct >= 0 ? '+' : ''}${(unrealizedPct * 100).toFixed(1)}%.`,
      'This ranks positions by portfolio weight (concentration risk), not by price volatility — historical volatility per position needs market data history not yet available.',
    ],
  };
}

function answerDiversification(ctx: AIContext): AICommanderResponse {
  if (ctx.positions.length === 0) {
    return {
      answer: 'No positions yet, so there is nothing to diversify.',
      reasoning: ['No positions in the portfolio.'],
    };
  }

  const sectorBuckets = allocationBySector(ctx.positions, ctx.assets);
  const assetTypeBuckets = allocationByAssetType(ctx.positions, ctx.assets);
  const sectorCount = sectorBuckets.length;
  const topSector = sectorBuckets[0];

  const reasoning = [
    `Positions span ${sectorCount} sector${sectorCount === 1 ? '' : 's'} and ${assetTypeBuckets.length} asset type${assetTypeBuckets.length === 1 ? '' : 's'}.`,
    topSector
      ? `Most concentrated sector: ${topSector.label} at ${(topSector.weight * 100).toFixed(1)}%.`
      : 'No sector data available.',
  ];

  const answer =
    sectorCount <= 2
      ? `Consider whether ${sectorCount} sector${sectorCount === 1 ? '' : 's'} is enough diversification for your risk tolerance — a downturn concentrated in ${topSector?.label ?? 'that sector'} would affect a large share of the portfolio at once.`
      : `Sector spread looks reasonable across ${sectorCount} sectors. The largest, ${topSector?.label}, is still worth watching if it grows well beyond the others.`;

  return { answer, reasoning };
}

function answerAllocateCapital(ctx: AIContext, amount: number): AICommanderResponse {
  const sectorBuckets = allocationBySector(ctx.positions, ctx.assets);
  const maxWeight = calculateMaxPositionWeight(ctx.positions, ctx.portfolioValue);

  const reasoning = [
    `Current largest position weight: ${(maxWeight * 100).toFixed(1)}% of portfolio.`,
    sectorBuckets.length > 0
      ? `Current sector spread: ${sectorBuckets.map((b) => `${b.label} ${(b.weight * 100).toFixed(0)}%`).join(', ')}.`
      : 'No existing positions to compare against yet.',
  ];

  const underweightSector = [...sectorBuckets].sort((a, b) => a.weight - b.weight)[0];

  const answer =
    sectorBuckets.length === 0
      ? `With ${ctx.baseCurrency} ${amount.toLocaleString()} to deploy and no existing positions, this would be a first position — consider starting with a broad, diversified holding rather than a single concentrated bet, given there's no existing portfolio context to balance against.`
      : maxWeight > CONCENTRATION_WARNING_THRESHOLD
        ? `Before adding new capital, consider that your largest position is already ${(maxWeight * 100).toFixed(1)}% of the portfolio. Adding ${ctx.baseCurrency} ${amount.toLocaleString()} to it would increase concentration further — the underweight sector currently is ${underweightSector?.label ?? 'not clear from current data'}, which may be worth considering instead.`
        : `Portfolio concentration looks reasonable right now. If you're looking to deploy ${ctx.baseCurrency} ${amount.toLocaleString()}, the currently underweight sector is ${underweightSector?.label ?? 'not clear from current data'} — worth a look if it fits your thesis, alongside your own research.`;

  return { answer, reasoning };
}

function answerHelp(): AICommanderResponse {
  return {
    answer:
      "I can help with questions grounded in your current portfolio data — try asking about risk, your riskiest position, diversification, or where to deploy new capital (e.g. \"where should I invest €500?\").",
    reasoning: [
      'This is a rule-based assistant reading your Commander Core data directly — not a language model. See Settings/About for details.',
    ],
  };
}

const AMOUNT_REGEX = /(?:€|eur|\$|usd)?\s*([\d.,]+)\s*(?:€|eur|\$|usd)?/i;

function extractAmount(query: string): number | null {
  const investKeywords = /(invest|deploy|allocate|put)/i;
  if (!investKeywords.test(query)) return null;
  const match = query.match(AMOUNT_REGEX);
  if (!match) return null;
  const raw = match[1].replace(/\./g, '').replace(',', '.');
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Routes a natural-language query to the matching rule-based handler.
 * Every branch returns advisory language + reasoning, per PRD v1.2 §9.
 */
export function answerQuery(query: string, ctx: AIContext): AICommanderResponse {
  const q = query.toLowerCase();

  const amount = extractAmount(q);
  if (amount !== null) return answerAllocateCapital(ctx, amount);

  if (/riskiest|most risky/.test(q)) return answerRiskiestPosition(ctx);
  if (/diversif/.test(q)) return answerDiversification(ctx);
  if (/risk/.test(q)) return answerRisk(ctx);
  if (/news|summary/.test(q)) {
    return {
      answer:
        "News summaries need the News feed, which lands in Commit 009 — I can't answer that yet.",
      reasoning: ['No news data source is wired into the app in this commit.'],
    };
  }

  return answerHelp();
}

export const EXAMPLE_QUERIES = [
  'What is my current risk?',
  'What is my riskiest position?',
  'Am I diversified enough?',
  'Where should I invest €500?',
];
