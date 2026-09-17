/**
 * The momentum engine.
 *
 * Pure. No React, no IO, no Date.now(). Everything in here is a function of its inputs,
 * which is what makes the mechanic testable and the history reproducible.
 *
 * ── The model ────────────────────────────────────────────────────────────────
 * Momentum decays EXPONENTIALLY toward zero rather than by flat subtraction, so a
 * flywheel at 88 sheds more absolute energy than one at 15 (more kinetic energy to
 * lose), momentum can never go negative, and an n-day gap has a closed form.
 *
 *   protection(R) = min(0.85, R / (R + 12))
 *
 *   λ = 0                          full day
 *     = 0.045 · (1 − protection)   partial day
 *     = 0.250 · (1 − protection)   missed day
 *
 *   M₁   = M · e^(−λ)
 *   gain = 14 · (1 − M₁/100)^0.7 · (1 + 0.25 · protection)
 *          × 0.5 · ratio^1.5   if partial
 *          × 1.6               if big push
 *   M'   = clamp(M₁ + gain, 0, 100)
 *
 * ── Why resilience is separate from streak ───────────────────────────────────
 * Using the raw streak as decay armour produces a non-monotonic collapse: break a
 * 30-day streak and day 1 costs −5.2 but day 2 costs −15.5, because the streak snapped
 * to zero. The pain curve ran backwards. So armour lives in `resilience`, which HALVES
 * per consecutive missed day and is restored by `max(streak+1, resilience)` on a full
 * day. Result: a monotonic ramp of consequences, a grace window if you bounce back
 * fast, and no free ride after a long absence (14 days erodes armour to ~0).
 */

export interface MomentumConfig {
  gainMax: number;
  gainCurve: number;
  lambdaZero: number;
  lambdaPartial: number;
  protectK: number;
  protectCap: number;
  partialGainScale: number;
  partialGainCurve: number;
  streakGainBonus: number;
  bigPushGain: number;
  bigPushNextDayDecay: number;
  resilienceDecayOnMiss: number;
}

/** Single source of truth for the mechanic. Retune here, nowhere else. */
export const MOMENTUM_CONFIG: MomentumConfig = {
  gainMax: 14,
  gainCurve: 0.7,
  lambdaZero: 0.25,
  lambdaPartial: 0.045,
  protectK: 12,
  protectCap: 0.85,
  partialGainScale: 0.5,
  partialGainCurve: 1.5,
  streakGainBonus: 0.25,
  bigPushGain: 1.6,
  bigPushNextDayDecay: 1.5,
  resilienceDecayOnMiss: 0.5,
};

export type OutcomeKind = 'full' | 'partial' | 'miss' | 'neutral';

export interface DayInput {
  momentum: number;
  streak: number;
  resilience: number;
  /** Fraction of REQUIRED habits completed, 0–1. */
  ratio: number;
  /** If 0, the day is neutral: nothing was required, so nothing is gained or lost. */
  requiredCount: number;
  bigPush?: boolean;
  /** Big-push days carry a hangover: the next day decays 1.5× faster. */
  previousDayBigPush?: boolean;
}

export interface DayOutcome {
  momentum: number;
  streak: number;
  resilience: number;
  /** Signed. Negative. */
  decay: number;
  gain: number;
  /** Net change in momentum. */
  delta: number;
  protection: number;
  outcome: OutcomeKind;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const clamp01 = (n: number): number => clamp(n, 0, 1);

/** Fraction of decay absorbed by accumulated resilience. Asymptotes to 0.85 — never immune. */
export function protection(resilience: number, cfg: MomentumConfig = MOMENTUM_CONFIG): number {
  if (!Number.isFinite(resilience) || resilience <= 0) return 0;
  return Math.min(cfg.protectCap, resilience / (resilience + cfg.protectK));
}

/**
 * Settle exactly one logical day.
 *
 * Callers resolve gaps by iterating day-by-day rather than passing an elapsed count,
 * because protection erodes as the gap widens — compressing it would be too lenient.
 */
export function resolveDay(input: DayInput, cfg: MomentumConfig = MOMENTUM_CONFIG): DayOutcome {
  const momentum = clamp(input.momentum, 0, 100);
  const streak = Math.max(0, input.streak);
  const resilience = Math.max(0, input.resilience);
  const prot = protection(resilience, cfg);

  // Nothing was required (empty chain, or every habit was added today) — day is a no-op.
  if (input.requiredCount <= 0) {
    return {
      momentum,
      streak,
      resilience,
      decay: 0,
      gain: 0,
      delta: 0,
      protection: prot,
      outcome: 'neutral',
    };
  }

  const ratio = clamp01(input.ratio);
  const outcome: OutcomeKind = ratio >= 1 ? 'full' : ratio > 0 ? 'partial' : 'miss';

  let lambda: number;
  if (outcome === 'full') lambda = 0;
  else if (outcome === 'partial') lambda = cfg.lambdaPartial * (1 - prot);
  else lambda = cfg.lambdaZero * (1 - prot);

  if (input.previousDayBigPush) lambda *= cfg.bigPushNextDayDecay;

  const afterDecay = momentum * Math.exp(-lambda);
  const decay = afterDecay - momentum;

  let gain = 0;
  if (ratio > 0) {
    const headroom = Math.max(0, 1 - afterDecay / 100);
    gain = cfg.gainMax * Math.pow(headroom, cfg.gainCurve) * (1 + cfg.streakGainBonus * prot);
    if (outcome === 'partial') {
      gain *= cfg.partialGainScale * Math.pow(ratio, cfg.partialGainCurve);
    } else if (input.bigPush) {
      gain *= cfg.bigPushGain;
    }
  }

  const nextMomentum = clamp(afterDecay + gain, 0, 100);

  let nextStreak: number;
  let nextResilience: number;
  if (outcome === 'full') {
    nextStreak = streak + 1;
    // Performing restores armour; a fast comeback keeps some of what you earned.
    nextResilience = Math.max(streak + 1, resilience);
  } else if (outcome === 'partial') {
    // Partial credit keeps you alive but never advances you. Streak freezes, not resets.
    nextStreak = streak;
    nextResilience = resilience;
  } else {
    nextStreak = 0;
    nextResilience = resilience * cfg.resilienceDecayOnMiss;
  }

  return {
    momentum: nextMomentum,
    streak: nextStreak,
    resilience: nextResilience,
    decay,
    gain,
    delta: nextMomentum - momentum,
    protection: prot,
    outcome,
  };
}

/** Momentum → angular velocity for the flywheel, in degrees/second. */
export function angularVelocity(momentum: number): number {
  if (momentum < 1.5) return 0; // visibly stalled
  return 6 + 90 * Math.pow(clamp(momentum, 0, 100) / 100, 1.3);
}

export interface MomentumBand {
  min: number;
  label: string;
  blurb: string;
}

export const MOMENTUM_BANDS: MomentumBand[] = [
  { min: 80, label: 'Flywheel', blurb: 'Self-sustaining. Protect it.' },
  { min: 60, label: 'Humming', blurb: 'Real momentum. Keep feeding it.' },
  { min: 35, label: 'Building', blurb: 'Traction forming.' },
  { min: 15, label: 'Turning', blurb: 'Moving, barely.' },
  { min: 0, label: 'Stalled', blurb: 'Push it from a standstill.' },
];

export function bandFor(momentum: number): MomentumBand {
  return MOMENTUM_BANDS.find((b) => momentum >= b.min) ?? MOMENTUM_BANDS[MOMENTUM_BANDS.length - 1];
}

/** Human-readable cost of skipping today, used in the UI to make stakes legible. */
export function skipCost(momentum: number, resilience: number, cfg: MomentumConfig = MOMENTUM_CONFIG): number {
  const prot = protection(resilience, cfg);
  return momentum - momentum * Math.exp(-cfg.lambdaZero * (1 - prot));
}
