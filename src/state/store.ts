/**
 * App store. `useSyncExternalStore` over a plain immutable snapshot — no Redux, no
 * context re-render cascades, and the mutators are callable from outside React
 * (keyboard handlers, timers, the reconciler).
 */

import { useSyncExternalStore } from 'react';
import {
  AppState,
  Chain,
  ChainColorId,
  DailyLog,
  DEFAULT_SETTINGS,
  Habit,
  SCHEMA_VERSION,
  Settings,
} from '../types';
import { createDebouncedSaver, clearState, loadState } from '../lib/storage';
import { todayKey } from '../lib/dayKey';
import { logFor, reconcileAll, requiredHabitIdsFor } from '../lib/reconcile';
import { demoState, makeChain, makeHabit, starterState, uid } from '../lib/seed';

export interface StoreSnapshot {
  state: AppState;
  hydrated: boolean;
}

const EMPTY: AppState = {
  schemaVersion: SCHEMA_VERSION,
  chains: [],
  settings: { ...DEFAULT_SETTINGS },
};

let snapshot: StoreSnapshot = { state: EMPTY, hydrated: false };
const listeners = new Set<() => void>();
const persist = createDebouncedSaver();

function emit(): void {
  listeners.forEach((l) => l());
}

function commit(state: AppState, opts: { persist?: boolean; hydrated?: boolean } = {}): void {
  snapshot = { state, hydrated: opts.hydrated ?? snapshot.hydrated };
  if (opts.persist !== false) persist(state);
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSnapshot = (): StoreSnapshot => snapshot;

export function useStore(): StoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const getState = (): AppState => snapshot.state;

export function currentDayKey(): string {
  return todayKey(snapshot.state.settings.dayBoundaryHour);
}

// ── lifecycle ──────────────────────────────────────────────────────────────

export async function initStore(): Promise<void> {
  const loaded = await loadState();
  const boundary = loaded?.settings.dayBoundaryHour ?? DEFAULT_SETTINGS.dayBoundaryHour;
  const tk = todayKey(boundary);
  const base = loaded ?? starterState(tk);
  commit({ ...base, chains: reconcileAll(base.chains, tk) }, { hydrated: true, persist: Boolean(loaded) });
}

/** Settle any days that have elapsed. Cheap and idempotent — safe to call often. */
export function reconcileNow(): void {
  const s = snapshot.state;
  const chains = reconcileAll(s.chains, currentDayKey());
  if (chains !== s.chains) commit({ ...s, chains });
}

// ── helpers ────────────────────────────────────────────────────────────────

function mutateChain(chainId: string, fn: (chain: Chain) => Chain): void {
  const s = snapshot.state;
  let touched = false;
  const chains = s.chains.map((c) => {
    if (c.id !== chainId) return c;
    const next = fn(c);
    if (next !== c) touched = true;
    return next;
  });
  if (touched) commit({ ...s, chains });
}

function upsertLog(history: DailyLog[], log: DailyLog): DailyLog[] {
  const idx = history.findIndex((l) => l.date === log.date);
  if (idx === -1) return [...history, log].sort((a, b) => (a.date < b.date ? -1 : 1));
  const next = history.slice();
  next[idx] = log;
  return next;
}

function liveLogFrom(chain: Chain, dayKey: string, completed: string[], bigPush: boolean): DailyLog {
  const required = requiredHabitIdsFor(chain, dayKey);
  const requiredSet = new Set(required);
  const doneRequired = completed.filter((id) => requiredSet.has(id));
  const isFull = required.length > 0 && doneRequired.length === required.length;
  return {
    date: dayKey,
    completedHabitIds: completed,
    requiredHabitIds: required,
    chainCompleted: isFull,
    momentumAtEndOfDay: 0, // written when the day is settled
    outcome: required.length === 0 ? 'neutral' : isFull ? 'full' : doneRequired.length > 0 ? 'partial' : 'miss',
    bigPush,
    resolved: false,
  };
}

// ── chain CRUD ─────────────────────────────────────────────────────────────

export function createChain(name: string, colorId: ChainColorId): string {
  const s = snapshot.state;
  const chain = makeChain(name.trim() || 'New chain', colorId, currentDayKey());
  commit({ ...s, chains: [...s.chains, chain] });
  return chain.id;
}

export function renameChain(chainId: string, name: string): void {
  mutateChain(chainId, (c) => ({ ...c, name: name.trim() || c.name }));
}

export function setChainColor(chainId: string, colorId: ChainColorId): void {
  mutateChain(chainId, (c) => ({ ...c, colorId }));
}

export function setChainReminder(chainId: string, reminderTime: string | null): void {
  mutateChain(chainId, (c) => ({ ...c, reminderTime }));
}

/** Soft delete. History survives so it can be restored from the Data screen. */
export function archiveChain(chainId: string): void {
  mutateChain(chainId, (c) => ({ ...c, archived: true }));
}

export function restoreChain(chainId: string): void {
  mutateChain(chainId, (c) => ({ ...c, archived: false }));
}

/** Irreversible. Requires typed confirmation at the call site. */
export function purgeChain(chainId: string): void {
  const s = snapshot.state;
  commit({ ...s, chains: s.chains.filter((c) => c.id !== chainId) });
}

// ── habit CRUD ─────────────────────────────────────────────────────────────

export function addHabit(chainId: string, name: string, icon?: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const tk = currentDayKey();
  mutateChain(chainId, (c) => ({
    ...c,
    habits: [...c.habits, makeHabit(trimmed, c.habits.length, tk, icon)],
  }));
}

export function updateHabit(chainId: string, habitId: string, patch: Partial<Pick<Habit, 'name' | 'icon'>>): void {
  mutateChain(chainId, (c) => ({
    ...c,
    habits: c.habits.map((h) =>
      h.id === habitId ? { ...h, ...patch, name: (patch.name ?? h.name).trim() || h.name } : h,
    ),
  }));
}

/** Soft-archives so historical logs can still resolve the habit's name. */
export function removeHabit(chainId: string, habitId: string): void {
  const tk = currentDayKey();
  mutateChain(chainId, (c) => {
    const target = c.habits.find((h) => h.id === habitId);
    if (!target) return c;
    return {
      ...c,
      habits: c.habits
        .filter((h) => h.id !== habitId)
        .sort((a, b) => a.order - b.order)
        .map((h, i) => ({ ...h, order: i })),
      archivedHabits: [
        ...c.archivedHabits,
        {
          id: target.id,
          name: target.name,
          icon: target.icon,
          archivedAt: new Date().toISOString(),
          archivedOnDayKey: tk,
        },
      ],
    };
  });
}

export function reorderHabits(chainId: string, orderedIds: string[]): void {
  mutateChain(chainId, (c) => {
    const map = new Map(c.habits.map((h) => [h.id, h]));
    const next: Habit[] = [];
    orderedIds.forEach((id, i) => {
      const h = map.get(id);
      if (h) {
        next.push({ ...h, order: i });
        map.delete(id);
      }
    });
    // Anything not named keeps its relative order at the end.
    Array.from(map.values())
      .sort((a, b) => a.order - b.order)
      .forEach((h) => next.push({ ...h, order: next.length }));
    return { ...c, habits: next };
  });
}

// ── daily execution ────────────────────────────────────────────────────────

export function toggleHabit(chainId: string, habitId: string): void {
  const tk = currentDayKey();
  mutateChain(chainId, (c) => {
    const existing = logFor(c, tk);
    const completed = [...(existing?.completedHabitIds ?? [])];
    const at = completed.indexOf(habitId);
    if (at >= 0) completed.splice(at, 1);
    else completed.push(habitId);
    return { ...c, history: upsertLog(c.history, liveLogFrom(c, tk, completed, existing?.bigPush ?? false)) };
  });
}

/** Undo the most recently ticked habit — the only "are you sure" the app needs. */
export function undoLast(chainId: string): string | null {
  const tk = currentDayKey();
  const chain = snapshot.state.chains.find((c) => c.id === chainId);
  const last = logFor(chain ?? ({} as Chain), tk)?.completedHabitIds.slice(-1)[0] ?? null;
  if (!last) return null;
  toggleHabit(chainId, last);
  return last;
}

export function setBigPush(chainId: string, value: boolean): void {
  const tk = currentDayKey();
  mutateChain(chainId, (c) => {
    const existing = logFor(c, tk);
    return {
      ...c,
      history: upsertLog(c.history, liveLogFrom(c, tk, existing?.completedHabitIds ?? [], value)),
    };
  });
}

export function completeAll(chainId: string): void {
  const tk = currentDayKey();
  mutateChain(chainId, (c) => {
    const required = requiredHabitIdsFor(c, tk);
    const existing = logFor(c, tk);
    return { ...c, history: upsertLog(c.history, liveLogFrom(c, tk, required, existing?.bigPush ?? false)) };
  });
}

// ── settings & data ────────────────────────────────────────────────────────

export function updateSettings(patch: Partial<Settings>): void {
  const s = snapshot.state;
  const settings = { ...s.settings, ...patch };
  // Changing the day boundary can shift which logical day "now" belongs to.
  commit({ ...s, settings, chains: reconcileAll(s.chains, todayKey(settings.dayBoundaryHour)) });
}

export function replaceState(next: AppState): void {
  const tk = todayKey(next.settings.dayBoundaryHour);
  commit({ ...next, chains: reconcileAll(next.chains, tk) });
}

export function loadDemoData(): void {
  replaceState(demoState(todayKey(DEFAULT_SETTINGS.dayBoundaryHour)));
}

export async function resetEverything(): Promise<void> {
  await clearState();
  const tk = todayKey(DEFAULT_SETTINGS.dayBoundaryHour);
  commit(starterState(tk));
}

export { uid };
