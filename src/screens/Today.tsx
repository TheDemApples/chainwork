/**
 * Today — the screen that must work in under ten seconds, half asleep, one thumb.
 *
 * Every active chain is stacked here so there's zero navigation between them, and each
 * chain's flywheel sits directly beside its own rail: tick a node and the wheel right
 * next to your thumb kicks and speeds up. That adjacency is the whole point — a hero
 * wheel parked at the top of the page would be further from the action and feel less
 * causal.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chain, colorOf } from '../types';
import { bandFor } from '../lib/momentum';
import { buildTodayView, weeklySummary } from '../lib/selectors';
import { formatKeyLong, mondayOf, weekdayOf } from '../lib/dayKey';
import { currentDayKey, setBigPush, toggleHabit, undoLast, updateSettings, useStore } from '../state/store';
import Flywheel from '../components/flywheel/Flywheel';
import ChainRail from '../components/chain/ChainRail';
import { Bolt, Flame, Plus, Undo } from '../components/ui/Icons';
import { toast } from '../components/ui/Toast';
import { navigate } from '../router';

function ChainSection({
  chain,
  todayK,
  focused,
  onFocus,
  registerApi,
}: {
  chain: Chain;
  todayK: string;
  focused: boolean;
  onFocus: () => void;
  registerApi: (api: { toggleIndex: (i: number) => void; next: () => void; undo: () => void }) => void;
}) {
  const color = colorOf(chain);
  const view = useMemo(() => buildTodayView(chain, todayK), [chain, todayK]);
  const [kick, setKick] = useState(0);

  const onToggle = useCallback(
    (habitId: string) => {
      toggleHabit(chain.id, habitId);
      setKick((k) => k + 1);
      onFocus();
    },
    [chain.id, onFocus],
  );

  // Expose imperative actions for the keyboard layer.
  useEffect(() => {
    registerApi({
      toggleIndex: (i: number) => {
        const habit = view.required[i];
        if (habit) onToggle(habit.id);
      },
      next: () => {
        if (view.nextIndex >= 0) onToggle(view.required[view.nextIndex].id);
      },
      undo: () => {
        const id = undoLast(chain.id);
        if (id) toast('Undone', { duration: 1400 });
      },
    });
  }, [registerApi, view, onToggle, chain.id]);

  const band = bandFor(view.liveMomentum);
  const anyDone = view.completedIds.size > 0;

  return (
    <article
      onPointerDown={onFocus}
      className={`panel p-4 transition-colors duration-200 sm:p-5 ${
        focused ? '' : 'border-dashed'
      }`}
      style={focused ? { borderColor: `${color.hex}44` } : undefined}
    >
      <div className="grid gap-4 md:grid-cols-[auto_1fr] md:gap-7">
        <div className="flex items-center gap-4 md:flex-col md:items-center">
          <div className="shrink-0">
            <Flywheel
              momentum={view.liveMomentum}
              color={color}
              size={124}
              kick={kick}
              streak={chain.currentStreak}
            />
          </div>

          <div className="min-w-0 flex-1 md:text-center">
            <button
              type="button"
              onClick={() => navigate(`#/chains/${chain.id}`)}
              className="block max-w-full truncate text-left font-display text-lg font-bold tracking-tight hover:underline md:text-center"
            >
              {chain.name}
            </button>
            <p className="mt-0.5 text-xs text-ink/50 dark:text-paper/45">{band.blurb}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:justify-center">
              <span className="tnum inline-flex items-center gap-1 text-ink/60 dark:text-paper/55">
                <Flame size={13} style={{ color: color.hex }} />
                <strong className="font-display">{chain.currentStreak}</strong> day
              </span>
              <span className="tnum text-ink/40 dark:text-paper/35">best {chain.bestStreak}</span>
              <span className="tnum font-display font-semibold" style={{ color: color.hex }}>
                {view.completedCount}/{view.requiredCount}
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <ChainRail chain={chain} view={view} onToggle={onToggle} showHotkeys={focused} />

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/[0.07] pt-3 text-xs dark:border-white/[0.06]">
            {view.isComplete ? (
              <button
                type="button"
                onClick={() => {
                  setBigPush(chain.id, !view.bigPush);
                  toast(
                    view.bigPush
                      ? 'Big push off'
                      : 'Big push on — bigger boost tonight, faster decay tomorrow.',
                    { tone: view.bigPush ? 'neutral' : 'warn' },
                  );
                }}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-display text-2xs font-bold uppercase tracking-wider transition-colors ${
                  view.bigPush ? 'border-ember bg-ember/15 text-ember' : 'border-black/[0.12] text-ink/50 dark:border-white/[0.12] dark:text-paper/45'
                }`}
              >
                <Bolt size={13} /> Big push
              </button>
            ) : (
              <span className="tnum text-ink/50 dark:text-paper/45">
                Finish for{' '}
                <strong className="font-display" style={{ color: color.hex }}>
                  +{view.remainingGain.toFixed(1)}
                </strong>
              </span>
            )}

            {view.requiredCount > 0 && !view.isComplete && (
              <span className="tnum text-ember/85">
                Skip costs <strong className="font-display">−{view.skipCost.toFixed(1)}</strong>
              </span>
            )}

            {anyDone && (
              <button
                type="button"
                onClick={() => {
                  const id = undoLast(chain.id);
                  if (id) toast('Undone', { duration: 1400 });
                }}
                className="ml-auto inline-flex items-center gap-1 text-ink/40 transition-colors hover:text-ink dark:text-paper/35 dark:hover:text-paper"
              >
                <Undo size={14} /> Undo
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function WeeklyBanner({ chains, todayK }: { chains: Chain[]; todayK: string }) {
  const lines = chains.map((c) => weeklySummary(c, todayK)).filter((l): l is string => Boolean(l));
  if (lines.length === 0) return null;

  return (
    <div className="panel anim-rise border-l-2 p-4" style={{ borderLeftColor: '#E0A22B' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Monday readout</p>
          <ul className="mt-1.5 space-y-1">
            {lines.map((l) => (
              <li key={l} className="text-sm leading-snug text-ink/75 dark:text-paper/70">
                {l}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="shrink-0 font-display text-2xs font-bold uppercase tracking-wider text-ink/40 hover:text-ink dark:text-paper/35"
          onClick={() => updateSettings({ lastWeeklySummaryKey: mondayOf(todayK) })}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function Today() {
  const { state } = useStore();
  const todayK = currentDayKey();
  const chains = state.chains.filter((c) => !c.archived);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const apis = useRef(new Map<string, { toggleIndex: (i: number) => void; next: () => void; undo: () => void }>());

  const focused = focusedId && chains.some((c) => c.id === focusedId) ? focusedId : chains[0]?.id ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!focused) return;
      const api = apis.current.get(focused);
      if (!api) return;

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        api.toggleIndex(Number(e.key) - 1);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        api.next();
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        api.undo();
      } else if (e.key === 'j' || e.key === 'ArrowDown' || e.key === 'k' || e.key === 'ArrowUp') {
        const dir = e.key === 'j' || e.key === 'ArrowDown' ? 1 : -1;
        const i = chains.findIndex((c) => c.id === focused);
        const next = chains[(i + dir + chains.length) % chains.length];
        if (next) {
          e.preventDefault();
          setFocusedId(next.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused, chains]);

  const isMonday = weekdayOf(todayK) === 1;
  const showWeekly = isMonday && state.settings.lastWeeklySummaryKey !== mondayOf(todayK);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="eyebrow">{formatKeyLong(todayK)}</p>
          <h1 className="font-display text-[26px] font-extrabold leading-none tracking-tight">Today</h1>
        </div>
        <span className="hidden font-display text-2xs uppercase tracking-wider text-ink/35 dark:text-paper/30 sm:block">
          1–9 tick · space next · u undo
        </span>
      </header>

      {showWeekly && <WeeklyBanner chains={chains} todayK={todayK} />}

      {chains.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-ink/55 dark:text-paper/50">No chains yet.</p>
          <button type="button" className="btn-solid" onClick={() => navigate('#/chains')}>
            <Plus size={16} /> Build your first chain
          </button>
        </div>
      ) : (
        chains.map((chain) => (
          <ChainSection
            key={chain.id}
            chain={chain}
            todayK={todayK}
            focused={chain.id === focused}
            onFocus={() => setFocusedId(chain.id)}
            registerApi={(api) => apis.current.set(chain.id, api)}
          />
        ))
      )}
    </div>
  );
}
