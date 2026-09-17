/**
 * Starter content and demo data.
 *
 * The demo generator writes only *intent* (which habits were ticked on which day) and
 * then lets the real engine settle every day. Nothing is faked — the momentum curve
 * you see in demo mode is the same code path as the live one.
 */

import { AppState, Chain, DEFAULT_SETTINGS, Habit, SCHEMA_VERSION, ChainColorId } from '../types';
import { addDaysToKey, keyRange } from './dayKey';
import { reconcileChain } from './reconcile';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function makeHabit(name: string, order: number, dayKey: string, icon?: string): Habit {
  return {
    id: uid('h'),
    name,
    order,
    icon,
    addedAt: new Date().toISOString(),
    addedOnDayKey: dayKey,
  };
}

export function makeChain(
  name: string,
  colorId: ChainColorId,
  dayKey: string,
  habitSpecs: Array<[string, string?]> = [],
): Chain {
  return {
    id: uid('c'),
    name,
    colorId,
    createdAt: new Date().toISOString(),
    createdOnDayKey: dayKey,
    habits: habitSpecs.map(([n, icon], i) => makeHabit(n, i, dayKey, icon)),
    archivedHabits: [],
    momentum: 0,
    resilience: 0,
    currentStreak: 0,
    bestStreak: 0,
    history: [],
    lastResolvedDayKey: null,
    reminderTime: null,
    archived: false,
  };
}

export function starterState(todayK: string): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    chains: [
      makeChain('Morning chain', 'brass', todayK, [
        ['Make bed', '🛏️'],
        ['10 pushups', '💪'],
        ['Drink water', '💧'],
        ['Review top 3 tasks', '🎯'],
      ]),
      makeChain('Shutdown chain', 'cobalt', todayK, [
        ['Close all tabs', '🗂️'],
        ['Tomorrow’s top 3', '📝'],
        ['Phone on charger, out of room', '🔌'],
      ]),
    ],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Deterministic PRNG so the demo looks the same every time it's generated. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface DemoSpec {
  name: string;
  colorId: ChainColorId;
  habits: Array<[string, string?]>;
  /** Probability of a fully completed day. */
  pFull: number;
  /** Probability of a partial day, given not full. */
  pPartial: number;
  seed: number;
  /** A deliberate slump, as [startDaysAgo, endDaysAgo]. */
  slump?: [number, number];
}

const DEMO_SPECS: DemoSpec[] = [
  {
    name: 'Morning chain',
    colorId: 'brass',
    habits: [
      ['Make bed', '🛏️'],
      ['10 pushups', '💪'],
      ['Drink water', '💧'],
      ['Review top 3 tasks', '🎯'],
    ],
    pFull: 0.78,
    pPartial: 0.55,
    seed: 20260917,
    slump: [38, 31],
  },
  {
    name: 'Shutdown chain',
    colorId: 'cobalt',
    habits: [
      ['Close all tabs', '🗂️'],
      ['Tomorrow’s top 3', '📝'],
      ['Phone on charger', '🔌'],
    ],
    pFull: 0.52,
    pPartial: 0.6,
    seed: 77123,
  },
  {
    name: 'Study chain',
    colorId: 'patina',
    habits: [
      ['Phone in drawer', '📵'],
      ['25 min deep work', '⏱️'],
      ['Log what I learned', '🗒️'],
    ],
    pFull: 0.34,
    pPartial: 0.5,
    seed: 4242,
    slump: [20, 12],
  },
];

const DEMO_DAYS = 74;

export function demoState(todayK: string): AppState {
  const createdOn = addDaysToKey(todayK, -DEMO_DAYS);

  const chains = DEMO_SPECS.map((spec) => {
    const chain = makeChain(spec.name, spec.colorId, createdOn, spec.habits);
    const rand = lcg(spec.seed);
    const ids = chain.habits.map((h) => h.id);

    // Habits existed from day one of the chain.
    const window = keyRange(addDaysToKey(createdOn, 1), addDaysToKey(todayK, -1));

    chain.history = window.map((date, idx) => {
      const daysAgo = window.length - idx;
      const inSlump = spec.slump ? daysAgo <= spec.slump[0] && daysAgo >= spec.slump[1] : false;

      const roll = rand();
      let completed: string[];
      if (inSlump) {
        completed = roll < 0.25 ? ids.slice(0, 1) : [];
      } else if (roll < spec.pFull) {
        completed = ids.slice();
      } else if (roll < spec.pFull + (1 - spec.pFull) * spec.pPartial) {
        const n = 1 + Math.floor(rand() * Math.max(1, ids.length - 1));
        completed = ids.slice(0, n);
      } else {
        completed = [];
      }

      return {
        date,
        completedHabitIds: completed,
        requiredHabitIds: ids.slice(),
        chainCompleted: false,
        momentumAtEndOfDay: 0,
        outcome: 'miss' as const,
        bigPush: false,
        resolved: false, // the engine will settle these for real
      };
    });

    // Let the actual momentum engine compute every value.
    return reconcileChain(chain, todayK);
  });

  return { schemaVersion: SCHEMA_VERSION, chains, settings: { ...DEFAULT_SETTINGS } };
}
