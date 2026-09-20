/**
 * Shared lag-propagation math.
 *
 * Leader (BTC/ETH) 24h momentum is scaled by a decaying product of
 * adjacent-tier correlations to get the move a given tier is *expected*
 * to have printed once the cascade has fully propagated. The residual
 * versus a token's actual 24h return is the lag gap — the quantity the
 * engine trades.
 *
 * This module is the source of truth for the formulas documented in the
 * README. `scripts/verify-math.ts` re-runs the identities below so the
 * README numbers cannot drift from the code.
 */

export const TIER_ORDER = [
  'mega',
  'large',
  'largeMedium',
  'smallMedium',
  'small',
  'micro',
] as const;

export type Tier = (typeof TIER_ORDER)[number];

/**
 * Adjacent-tier 24h correlation used as the one-step decay in the cascade.
 * Mega is 1 by definition (the leaders *are* the signal).
 */
export const TIER_STEP_CORRELATION: Record<Tier, number> = {
  mega: 1,
  large: 0.94,
  largeMedium: 0.87,
  smallMedium: 0.72,
  small: 0.58,
  micro: 0.23,
};

/**
 * Cumulative product of step correlations from Mega down to `tier`.
 *
 *   φ(mega)         = 1
 *   φ(large)        = 0.94
 *   φ(largeMedium)  = 0.94 × 0.87
 *   φ(smallMedium)  = 0.94 × 0.87 × 0.72
 *   φ(small)        = 0.94 × 0.87 × 0.72 × 0.58
 *   φ(micro)        = 0.94 × 0.87 × 0.72 × 0.58 × 0.23
 */
export function cumulativePropagationFactor(tier: Tier): number {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx === -1) return 1;
  let factor = 1;
  for (let i = 1; i <= idx; i++) {
    factor *= TIER_STEP_CORRELATION[TIER_ORDER[i]];
  }
  return factor;
}

export function expectedPropagatedMove(leaderMomentum: number, tier: Tier): number {
  return leaderMomentum * cumulativePropagationFactor(tier);
}

/** Residual: model-implied return minus the token's actual 24h return. */
export function lagGap(expectedMove: number, actualChange: number): number {
  return expectedMove - actualChange;
}

/**
 * Direction is always toward closing the gap:
 *   lagGap > 0  → actual < expected → long (underperformed the cascade)
 *   lagGap < 0  → actual > expected → short (outperformed the cascade)
 * Falls back to within-tier mean reversion when the lag signal is muted.
 */
export function isLongSetup(coinChange: number, tierAvg: number, gap: number): boolean {
  if (Math.abs(gap) > 0.5) return gap > 0;
  return coinChange < tierAvg;
}

/** Partial catch-up: 60% of the dominant dislocation, haircut by risk. */
export function expectedRecovery(deviation: number, lagGapValue: number, riskPercentage: number): number {
  const dominantMove = Math.max(deviation, Math.abs(lagGapValue));
  return dominantMove * 0.6 * ((100 - riskPercentage) / 100);
}

export function stopLossPct(riskPercentage: number): number {
  return Math.max(3, riskPercentage * 0.15);
}

export function riskLevel(riskPercentage: number): 'low' | 'medium' | 'high' {
  if (riskPercentage <= 30) return 'low';
  if (riskPercentage <= 60) return 'medium';
  return 'high';
}

export function recommendLeverage(riskPercentage: number): string {
  if (riskPercentage <= 20) return '8-10x';
  if (riskPercentage <= 35) return '5-7x';
  if (riskPercentage <= 50) return '3-5x';
  return '2-3x';
}

export const TIER_VOLATILITY_RISK: Record<Tier, number> = {
  mega: 15,
  large: 25,
  largeMedium: 35,
  smallMedium: 45,
  small: 55,
  micro: 75,
};

export function volumeRisk(volume: number, marketCap: number): number {
  if (marketCap === 0) return 100;
  const volumeRatio = volume / marketCap;
  if (volumeRatio < 0.005) return 80;
  if (volumeRatio > 0.5) return 70;
  return Math.max(10, 50 - volumeRatio * 200);
}

export function scaledSignificance(magnitude: number, sampleSize: number): number {
  return Math.min(5, (magnitude / 10) * Math.sqrt(sampleSize));
}
