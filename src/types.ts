/**
 * Chainwork data model.
 *
 * Invariants that matter:
 *  - DailyLog rows are FROZEN once resolved. Editing a chain never rewrites history.
 *  - Habits carry `addedOnDayKey`; they only become *required* the day AFTER they're added.
 *  - Deleted habits move to `archivedHabits` so old logs can still render their names.
 */

export type ChainColorId = 'brass' | 'ember' | 'patina' | 'cobalt' | 'violet' | 'rose';

export interface ChainColor {
  id: ChainColorId;
  label: string;
  hex: string;
  /** Dimmer companion used for tracks, grid lines and unfilled arcs. */
  dim: string;
}

export const CHAIN_COLORS: Record<ChainColorId, ChainColor> = {
  brass: { id: 'brass', label: 'Brass', hex: '#E0A22B', dim: '#5C4312' },
  ember: { id: 'ember', label: 'Ember', hex: '#D9541E', dim: '#5A230C' },
  patina: { id: 'patina', label: 'Patina', hex: '#2E8B77', dim: '#123932' },
  cobalt: { id: 'cobalt', label: 'Cobalt', hex: '#3D6BC4', dim: '#152C52' },
  violet: { id: 'violet', label: 'Violet', hex: '#7A5AC4', dim: '#2E2352' },
  rose: { id: 'rose', label: 'Rose', hex: '#C4467A', dim: '#521C33' },
};

export const CHAIN_COLOR_LIST: ChainColor[] = Object.values(CHAIN_COLORS);

export interface Habit {
  id: string;
  name: string;
  order: number;
  icon?: string;
  /** ISO timestamp of creation. */
  addedAt: string;
  /** Logical day key on which this habit was added. Required from the NEXT day onward. */
  addedOnDayKey: string;
}

export interface ArchivedHabit {
  id: string;
  name: string;
  icon?: string;
  archivedAt: string;
  archivedOnDayKey: string;
}

export type DayOutcomeKind = 'full' | 'partial' | 'miss' | 'neutral';

export interface DailyLog {
  /** Logical day key, `YYYY-MM-DD`, local time, shifted by the day-boundary hour. */
  date: string;
  completedHabitIds: string[];
  /** Snapshot of what was required that day — frozen, never recomputed. */
  requiredHabitIds: string[];
  chainCompleted: boolean;
  momentumAtEndOfDay: number;
  outcome: DayOutcomeKind;
  bigPush: boolean;
  /** False while the day is still live (i.e. today). True once the engine has settled it. */
  resolved: boolean;
}

export interface Chain {
  id: string;
  name: string;
  colorId: ChainColorId;
  createdAt: string;
  createdOnDayKey: string;
  habits: Habit[];
  archivedHabits: ArchivedHabit[];
  /** Committed momentum as of the end of `lastResolvedDayKey`. 0–100. */
  momentum: number;
  /** Decay armour. Tracks streak while performing, halves per consecutive missed day. */
  resilience: number;
  currentStreak: number;
  bestStreak: number;
  /** Rolling window, newest last. Trimmed to HISTORY_WINDOW_DAYS. */
  history: DailyLog[];
  lastResolvedDayKey: string | null;
  /** `HH:MM` local, or null for no reminder. */
  reminderTime: string | null;
  archived: boolean;
}

export interface Settings {
  /** Hour (0–6) at which a new logical day begins. Default 4am. */
  dayBoundaryHour: number;
  theme: 'dark' | 'light';
  remindersEnabled: boolean;
  lastWeeklySummaryKey: string | null;
  reducedMotion: boolean;
}

export interface AppState {
  schemaVersion: number;
  chains: Chain[];
  settings: Settings;
}

export const SCHEMA_VERSION = 1;
export const HISTORY_WINDOW_DAYS = 90;

export const DEFAULT_SETTINGS: Settings = {
  dayBoundaryHour: 4,
  theme: 'dark',
  remindersEnabled: false,
  lastWeeklySummaryKey: null,
  reducedMotion: false,
};

export function colorOf(chain: Chain): ChainColor {
  return CHAIN_COLORS[chain.colorId] ?? CHAIN_COLORS.brass;
}
