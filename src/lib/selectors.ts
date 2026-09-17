/**
 * Derived view state. Nothing here mutates; everything is a function of (chain, today).
 *
 * A note on live momentum: we show the GAIN you've banked today immediately, but we do
 * not silently drain the number for decay that hasn't landed yet. Decay is applied at
 * rollover and surfaced explicitly in the UI ("−4.1 at 4am"). Showing a falling number
 * the moment you open the app would be both confusing and demotivating; hiding the
 * threat entirely would be dishonest. So: gains live, losses announced.
 */

import { Chain, DailyLog, Habit } from '../types';
import { resolveDay, skipCost as computeSkipCost } from './momentum';
import { logFor, requiredHabitIdsFor } from './reconcile';
import { addDaysToKey, compareKeys, keyRange, prevDayKey } from './dayKey';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface TodayView {
  required: Habit[];
  /** Added today — grandfathered, can't break today's chain. */
  grandfathered: Habit[];
  completedIds: Set<string>;
  completedCount: number;
  requiredCount: number;
  ratio: number;
  isComplete: boolean;
  /** Index into `required` of the next unfinished node, or -1. */
  nextIndex: number;
  bigPush: boolean;
  committedMomentum: number;
  liveMomentum: number;
  projectedEndOfDay: number;
  /** Negative, or 0 if the chain is complete. */
  pendingDecay: number;
  gainSoFar: number;
  /** Extra momentum still on the table if you finish right now. */
  remainingGain: number;
  skipCost: number;
}

export function activeHabits(chain: Chain): Habit[] {
  return chain.habits.slice().sort((a, b) => a.order - b.order);
}

export function habitNameById(chain: Chain, id: string): string {
  return (
    chain.habits.find((h) => h.id === id)?.name ??
    chain.archivedHabits.find((h) => h.id === id)?.name ??
    'Removed habit'
  );
}

export function buildTodayView(chain: Chain, todayK: string): TodayView {
  const requiredIds = requiredHabitIdsFor(chain, todayK);
  const requiredSet = new Set(requiredIds);
  const ordered = activeHabits(chain);

  const required = ordered.filter((h) => requiredSet.has(h.id));
  const grandfathered = ordered.filter((h) => !requiredSet.has(h.id));

  const log = logFor(chain, todayK);
  // Unfiltered: a habit added today can still be ticked, it just doesn't count yet.
  const completedIds = new Set(log?.completedHabitIds ?? []);
  const requiredCount = required.length;
  const completedCount = required.filter((h) => completedIds.has(h.id)).length;
  const ratio = requiredCount === 0 ? 0 : completedCount / requiredCount;
  const isComplete = requiredCount > 0 && completedCount === requiredCount;
  const bigPush = log?.bigPush ?? false;

  const previousDayBigPush = logFor(chain, prevDayKey(todayK))?.bigPush ?? false;
  const base = {
    momentum: chain.momentum,
    streak: chain.currentStreak,
    resilience: chain.resilience,
    requiredCount,
    bigPush,
    previousDayBigPush,
  };

  const now = resolveDay({ ...base, ratio });
  const ifFinished = resolveDay({ ...base, ratio: 1 });

  const gainSoFar = ratio > 0 ? now.gain : 0;
  const liveMomentum = clamp(chain.momentum + gainSoFar, 0, 100);

  let nextIndex = -1;
  for (let i = 0; i < required.length; i += 1) {
    if (!completedIds.has(required[i].id)) {
      nextIndex = i;
      break;
    }
  }

  return {
    required,
    grandfathered,
    completedIds,
    completedCount,
    requiredCount,
    ratio,
    isComplete,
    nextIndex,
    bigPush,
    committedMomentum: chain.momentum,
    liveMomentum,
    projectedEndOfDay: now.momentum,
    pendingDecay: isComplete ? 0 : now.decay,
    gainSoFar,
    remainingGain: Math.max(0, ifFinished.momentum - liveMomentum),
    skipCost: computeSkipCost(chain.momentum, chain.resilience),
  };
}

// ── History ────────────────────────────────────────────────────────────────

export interface HeatCell {
  date: string;
  ratio: number;
  outcome: DailyLog['outcome'] | 'none';
  /** Before the chain existed — render as void, not as a miss. */
  preHistory: boolean;
  isToday: boolean;
}

export function heatmapCells(chain: Chain, todayK: string, days = 90): HeatCell[] {
  const start = addDaysToKey(todayK, -(days - 1));
  const byDate = new Map(chain.history.map((l) => [l.date, l]));

  return keyRange(start, todayK).map((date) => {
    const preHistory = compareKeys(date, chain.createdOnDayKey) < 0;
    const log = byDate.get(date);
    if (!log) {
      return { date, ratio: 0, outcome: preHistory ? 'none' : 'miss', preHistory, isToday: date === todayK };
    }
    const req = log.requiredHabitIds.length;
    const ratio = req === 0 ? 0 : log.completedHabitIds.length / req;
    return { date, ratio, outcome: log.outcome, preHistory, isToday: date === todayK };
  });
}

export interface SeriesPoint {
  date: string;
  value: number;
}

/** Momentum at end of each day, carrying the last known value across unlogged gaps. */
export function momentumSeries(chain: Chain, todayK: string, days: number, liveToday: number): SeriesPoint[] {
  const start = addDaysToKey(todayK, -(days - 1));
  const byDate = new Map(chain.history.map((l) => [l.date, l]));
  const out: SeriesPoint[] = [];
  let carry = 0;

  // Seed the carry from the newest log strictly before the window.
  for (const log of chain.history) {
    if (compareKeys(log.date, start) < 0) carry = log.momentumAtEndOfDay;
  }

  for (const date of keyRange(start, todayK)) {
    if (date === todayK) {
      out.push({ date, value: liveToday });
      continue;
    }
    const log = byDate.get(date);
    if (log?.resolved) carry = log.momentumAtEndOfDay;
    out.push({ date, value: carry });
  }
  return out;
}

export interface CompletionStats {
  full: number;
  partial: number;
  miss: number;
  tracked: number;
  rate: number;
}

export function completionStats(chain: Chain, todayK: string, days: number): CompletionStats {
  const start = addDaysToKey(todayK, -(days - 1));
  let full = 0;
  let partial = 0;
  let miss = 0;

  for (const log of chain.history) {
    if (compareKeys(log.date, start) < 0) continue;
    if (log.date === todayK) continue;
    if (!log.resolved || log.outcome === 'neutral') continue;
    if (log.outcome === 'full') full += 1;
    else if (log.outcome === 'partial') partial += 1;
    else miss += 1;
  }

  const tracked = full + partial + miss;
  return { full, partial, miss, tracked, rate: tracked === 0 ? 0 : full / tracked };
}

/**
 * Monday morning readout. Looks at the seven days ending yesterday.
 */
export function weeklySummary(chain: Chain, todayK: string): string | null {
  const end = prevDayKey(todayK);
  const start = addDaysToKey(end, -6);
  const byDate = new Map(chain.history.map((l) => [l.date, l]));

  let full = 0;
  let partial = 0;
  let tracked = 0;
  let first: number | null = null;
  let last: number | null = null;

  for (const date of keyRange(start, end)) {
    if (compareKeys(date, chain.createdOnDayKey) < 0) continue;
    const log = byDate.get(date);
    tracked += 1;
    if (log?.outcome === 'full') full += 1;
    else if (log?.outcome === 'partial') partial += 1;
    if (log?.resolved) {
      if (first === null) first = log.momentumAtEndOfDay;
      last = log.momentumAtEndOfDay;
    }
  }

  if (tracked === 0) return null;

  const delta = first !== null && last !== null ? last - first : 0;
  const trend =
    delta > 3 ? 'trending up' : delta < -3 ? 'trending down' : 'holding flat';
  const partialNote = partial > 0 ? `, ${partial} partial` : '';

  return `${chain.name}: completed ${full}/${tracked} days${partialNote}. Momentum ${
    delta >= 0 ? '+' : ''
  }${delta.toFixed(1)} — ${trend}.`;
}
