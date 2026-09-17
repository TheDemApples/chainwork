/**
 * Persistence. IndexedDB primary, localStorage mirror as a belt-and-braces backup
 * (the payload is a few KB at most, so mirroring is free insurance against
 * private-mode quirks and idb being unavailable).
 */

import { openDB, type IDBPDatabase } from 'idb';
import {
  AppState,
  Chain,
  DayOutcomeKind,
  DEFAULT_SETTINGS,
  HISTORY_WINDOW_DAYS,
  SCHEMA_VERSION,
  Settings,
} from '../types';

const OUTCOMES: DayOutcomeKind[] = ['full', 'partial', 'miss', 'neutral'];

const DB_NAME = 'chainwork';
const DB_VERSION = 1;
const STORE = 'state';
const RECORD_KEY = 'app';
const LS_KEY = 'chainwork:state';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const asNumber = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const asString = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);

/**
 * Defensive normalisation. Anything that comes off disk or out of an import file
 * runs through here, so a corrupt or hand-edited payload degrades instead of crashing.
 */
export function migrate(raw: unknown): AppState {
  const input = (raw ?? {}) as Partial<AppState> & Record<string, unknown>;

  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...((input.settings as Partial<Settings>) ?? {}),
  };
  settings.dayBoundaryHour = Math.min(6, Math.max(0, asNumber(settings.dayBoundaryHour, 4)));
  settings.theme = settings.theme === 'light' ? 'light' : 'dark';

  const chains: Chain[] = asArray<Partial<Chain>>(input.chains).map((c, i) => {
    const habits = asArray<Record<string, unknown>>(c.habits).map((h, hi) => ({
      id: asString(h.id, `habit-${i}-${hi}`),
      name: asString(h.name, 'Untitled habit'),
      order: asNumber(h.order, hi),
      icon: typeof h.icon === 'string' ? h.icon : undefined,
      addedAt: asString(h.addedAt, new Date(0).toISOString()),
      addedOnDayKey: asString(h.addedOnDayKey, '1970-01-01'),
    }));

    const history = asArray<Record<string, unknown>>(c.history)
      .map((l) => ({
        date: asString(l.date, '1970-01-01'),
        completedHabitIds: asArray<string>(l.completedHabitIds),
        requiredHabitIds: asArray<string>(l.requiredHabitIds),
        chainCompleted: Boolean(l.chainCompleted),
        momentumAtEndOfDay: asNumber(l.momentumAtEndOfDay, 0),
        outcome: OUTCOMES.includes(l.outcome as DayOutcomeKind) ? (l.outcome as DayOutcomeKind) : 'miss',
        bigPush: Boolean(l.bigPush),
        resolved: Boolean(l.resolved),
      }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(-HISTORY_WINDOW_DAYS);

    return {
      id: asString(c.id, `chain-${i}`),
      name: asString(c.name, 'Untitled chain'),
      colorId: (c.colorId ?? 'brass') as Chain['colorId'],
      createdAt: asString(c.createdAt, new Date().toISOString()),
      createdOnDayKey: asString(c.createdOnDayKey, '1970-01-01'),
      habits: habits.sort((a, b) => a.order - b.order),
      archivedHabits: asArray<Chain['archivedHabits'][number]>(c.archivedHabits),
      momentum: Math.min(100, Math.max(0, asNumber(c.momentum, 0))),
      resilience: Math.max(0, asNumber(c.resilience, 0)),
      currentStreak: Math.max(0, asNumber(c.currentStreak, 0)),
      bestStreak: Math.max(0, asNumber(c.bestStreak, 0)),
      history,
      lastResolvedDayKey:
        typeof c.lastResolvedDayKey === 'string' ? c.lastResolvedDayKey : null,
      reminderTime: typeof c.reminderTime === 'string' ? c.reminderTime : null,
      archived: Boolean(c.archived),
    };
  });

  return { schemaVersion: SCHEMA_VERSION, chains, settings };
}

export async function loadState(): Promise<AppState | null> {
  try {
    const db = await getDb();
    const raw = await db.get(STORE, RECORD_KEY);
    if (raw) return migrate(raw);
  } catch {
    /* fall through to localStorage */
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    /* no persisted state */
  }
  return null;
}

export async function saveState(state: AppState): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, state, RECORD_KEY);
  } catch {
    /* idb unavailable — localStorage below is the fallback, not just a mirror */
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode; idb above is authoritative */
  }
}

export async function clearState(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE, RECORD_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

/** Trailing-edge debounce so rapid habit ticking doesn't thrash the disk. */
export function createDebouncedSaver(delay = 180): (state: AppState) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: AppState | null = null;

  const flush = () => {
    timer = null;
    if (pending) {
      void saveState(pending);
      pending = null;
    }
  };

  if (typeof window !== 'undefined') {
    // Don't lose the last tick if the tab is closed mid-debounce.
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && pending) {
        if (timer) clearTimeout(timer);
        flush();
      }
    });
  }

  return (state: AppState) => {
    pending = state;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };
}
