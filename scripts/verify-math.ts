/**
 * Re-runs the identities documented in the README against the shared math
 * module so the write-up cannot drift from production code.
 *
 *   npx tsx scripts/verify-math.ts
 */
import {
  TIER_STEP_CORRELATION,
  cumulativePropagationFactor,
  expectedPropagatedMove,
  expectedRecovery,
  isLongSetup,
  lagGap,
  recommendLeverage,
  riskLevel,
  scaledSignificance,
  stopLossPct,
  volumeRisk,
} from '../shared/propagation';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`MATH MISMATCH: ${message}`);
  }
}

function approx(actual: number, expected: number, digits = 8) {
  const scale = 10 ** digits;
  assert(
    Math.round(actual * scale) === Math.round(expected * scale),
    `expected ${expected}, got ${actual}`,
  );
}

const phi = {
  mega: 1,
  large: 0.94,
  largeMedium: 0.94 * 0.87,
  smallMedium: 0.94 * 0.87 * 0.72,
  small: 0.94 * 0.87 * 0.72 * 0.58,
  micro: 0.94 * 0.87 * 0.72 * 0.58 * 0.23,
};

approx(cumulativePropagationFactor('mega'), phi.mega);
approx(cumulativePropagationFactor('large'), phi.large);
approx(cumulativePropagationFactor('largeMedium'), phi.largeMedium);
approx(cumulativePropagationFactor('smallMedium'), phi.smallMedium);
approx(cumulativePropagationFactor('small'), phi.small);
approx(cumulativePropagationFactor('micro'), phi.micro);

assert(TIER_STEP_CORRELATION.mega === 1, 'mega step correlation is the identity');
assert(phi.small === 0.94 * 0.87 * 0.72 * 0.58, 'small-cap factor product');

// Worked example from the README (ZEC-class small cap after a +2% BTC/ETH day)
const leaderMomentum = 2.0;
const expectedMove = expectedPropagatedMove(leaderMomentum, 'small');
approx(expectedMove, 2.0 * phi.small);

const actualChange = -0.5;
const gap = lagGap(expectedMove, actualChange);
approx(gap, expectedMove - actualChange);
assert(isLongSetup(actualChange, 0.8, gap) === true, 'positive lag gap must be a long');

const shortGap = lagGap(expectedMove, 3.0);
assert(isLongSetup(3.0, 0.8, shortGap) === false, 'negative lag gap must be a short');

const deviation = Math.abs(actualChange - 0.8);
approx(deviation, 1.3);
const volRisk = 55;
const corrRisk = Math.min(100, deviation * 5);
const liqRisk = volumeRisk(8_000_000, 100_000_000);
const trendRisk = Math.min(100, Math.abs(actualChange - 1.0) * 3);
const risk = (volRisk + corrRisk + liqRisk + trendRisk) / 4;
approx(corrRisk, 6.5);
approx(liqRisk, 34);
approx(trendRisk, 4.5);
approx(risk, 25);
assert(riskLevel(risk) === 'low', '25% risk is low');
assert(recommendLeverage(risk) === '5-7x', '25% risk maps to 5-7x');

const recovery = expectedRecovery(deviation, gap, risk);
approx(recovery, Math.max(deviation, Math.abs(gap)) * 0.6 * 0.75);
assert(stopLossPct(risk) === Math.max(3, risk * 0.15), 'stop is max(3, 0.15 * risk)');

const sigma = scaledSignificance(Math.abs(gap), 200);
approx(sigma, (Math.abs(gap) / 10) * Math.sqrt(200));

console.log('propagation factors');
console.log(`  mega         φ = ${phi.mega.toFixed(6)}`);
console.log(`  large        φ = ${phi.large.toFixed(6)}`);
console.log(`  largeMedium  φ = ${phi.largeMedium.toFixed(6)}`);
console.log(`  smallMedium  φ = ${phi.smallMedium.toFixed(6)}`);
console.log(`  small        φ = ${phi.small.toFixed(6)}`);
console.log(`  micro        φ = ${phi.micro.toFixed(6)}`);
console.log('');
console.log('README worked example');
console.log(`  L (BTC/ETH)     = ${leaderMomentum.toFixed(2)}%`);
console.log(`  E[r] small      = ${expectedMove.toFixed(4)}%`);
console.log(`  actual          = ${actualChange.toFixed(2)}%`);
console.log(`  lagGap          = ${gap.toFixed(4)}%  → ${isLongSetup(actualChange, 0.8, gap) ? 'LONG' : 'SHORT'}`);
console.log(`  risk            = ${risk.toFixed(2)}  (${riskLevel(risk)}, ${recommendLeverage(risk)})`);
console.log(`  expected return = ${recovery.toFixed(4)}%`);
console.log(`  stop            = ${stopLossPct(risk).toFixed(2)}%`);
console.log('');
console.log('All identities net out.');
