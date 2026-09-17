/**
 * Day reconciliation — turning elapsed time into settled history.
 *
 * Runs on app load, on tab focus, and on a timer. Walks every logical day between
 * the last resolved day and *yesterday*, settling each one. Today is never resolved:
 * it stays live so you can keep ticking habits off.
 *
 * Two hard rules:
 *  1. A day is resolved exactly once. Already-written logs are never recomputed, so
 *     editing a chain cannot rewrite the past.
 *  2. If the current day key is not strictly after the last resolved day (clock
 *     rollback, travelling west across a timezone), we do nothing at all.
 */

import { Chain, DailyLog, HISTORY_WINDOW_DAYS } from '../types';
import { resolveDay } from './momentum';
import { addDaysToKey, compareKeys, keyRange, nextDayKey, prevDayKey } from './dayKey';

/** Longest gap we'll simulate day-by-day before fast-forwarding. */
const MAX_CATCHUP_DAYS = 400;

/**
 * Which habits count on a given day.
 *
 * The grandfathering rule: a habit added to an EXISTING chain only starts counting the
 * next day, so adding one at 07:00 can't retroactively break today's chain or your
 * streak.
 *
 * The exception is a chain's founding habits — anything added on the chain's own
 * creation day counts immediately. Without this, a brand-new chain would show 0/0 and
 * be uncompletable on the day you build it, which is the exact moment motivation is
 * highest. There's no streak or momentum to protect on day one, so there's nothing for
 * the rule to guard against.
 */
export function requiredHabitIdsFor(chain: Chain, dayKey: string): string[] {
  return chain.habits
    .filter(
      (h) => compareKeys(h.addedOnDayKey, dayKey) < 0 || h.addedOnDayKey === chain.createdOnDayKey,
    )
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((h) => h.id);
}

export function logFor(chain: Chain, dayKey: string): DailyLog | undefined {
  return chain.history.find((l) => l.date === dayKey);
}

export function reconcileChain(chain: Chain, currentDayKey: string): Chain {
  const firstUnresolved = chain.lastResolvedDayKey
    ? nextDayKey(chain.lastResolvedDayKey)
    : chain.createdOnDayKey;

  // Nothing to settle — or the clock moved backwards. Either way, leave it alone.
  if (compareKeys(firstUnresolved, currentDayKey) >= 0) return chain;

  const earliestAllowed = addDaysToKey(currentDayKey, -MAX_CATCHUP_DAYS);
  const start =
    compareKeys(firstUnresolved, earliestAllowed) < 0 ? earliestAllowed : firstUnresolved;
  const end = prevDayKey(currentDayKey);
  const days = keyRange(start, end);
  if (days.length === 0) return chain;

  const byDate = new Map<string, DailyLog>(chain.history.map((l) => [l.date, l]));

  let momentum = chain.momentum;
  let streak = chain.currentStreak;
  let resilience = chain.resilience;
  let bestStreak = chain.bestStreak;
  let previousDayBigPush = byDate.get(prevDayKey(start))?.bigPush ?? false;

  for (const day of days) {
    const existing = byDate.get(day);

    // Prefer the frozen snapshot if one exists; otherwise derive from current habits.
    const required =
      existing && existing.requiredHabitIds.length > 0
        ? existing.requiredHabitIds
        : requiredHabitIdsFor(chain, day);

    const requiredSet = new Set(required);
    const completed = (existing?.completedHabitIds ?? []).filter((id) => requiredSet.has(id));
    const ratio = required.length === 0 ? 0 : completed.length / required.length;
    const bigPush = existing?.bigPush ?? false;

    const out = resolveDay({
      momentum,
      streak,
      resilience,
      ratio,
      requiredCount: required.length,
      bigPush,
      previousDayBigPush,
    });

    momentum = out.momentum;
    streak = out.streak;
    resilience = out.resilience;
    if (streak > bestStreak) bestStreak = streak;

    byDate.set(day, {
      date: day,
      completedHabitIds: completed,
      requiredHabitIds: required,
      chainCompleted: out.outcome === 'full',
      momentumAtEndOfDay: momentum,
      outcome: out.outcome,
      bigPush,
      resolved: true,
    });

    previousDayBigPush = bigPush;
  }

  const cutoff = addDaysToKey(currentDayKey, -(HISTORY_WINDOW_DAYS - 1));
  const history = Array.from(byDate.values())
    .filter((l) => compareKeys(l.date, cutoff) >= 0)
    .sort((a, b) => compareKeys(a.date, b.date));

  return {
    ...chain,
    momentum,
    currentStreak: streak,
    resilience,
    bestStreak,
    history,
    lastResolvedDayKey: end,
  };
}

export function reconcileAll(chains: Chain[], currentDayKey: string): Chain[] {
  let changed = false;
  const next = chains.map((c) => {
    const r = reconcileChain(c, currentDayKey);
    if (r !== c) changed = true;
    return r;
  });
  return changed ? next : chains;
}
