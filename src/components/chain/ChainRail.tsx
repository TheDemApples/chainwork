/**
 * The daily execution rail — the screen that has to be usable in under 10 seconds.
 *
 * One tap per node, no modals, no confirmations. Completing node N energises the
 * connector and pops a ring on node N+1: the "unlock". Out-of-order completion is
 * allowed (life isn't ordered) but the next node is always the visually loudest one.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Chain, colorOf, Habit } from '../../types';
import { TodayView } from '../../lib/selectors';
import { Check, Bolt } from '../ui/Icons';

interface ChainRailProps {
  chain: Chain;
  view: TodayView;
  onToggle: (habitId: string) => void;
  /** Keyboard focus target, for the 1–9 shortcut affordance. */
  showHotkeys?: boolean;
}

const ROW = 64; // px — node 44 + 10 top + 10 bottom
const NODE_TOP = 10;
const NODE_SIZE = 44;

export default function ChainRail({ chain, view, onToggle, showHotkeys = false }: ChainRailProps) {
  const color = colorOf(chain);
  const [burst, setBurst] = useState<string | null>(null);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
    },
    [],
  );

  const handle = useCallback(
    (habit: Habit, wasDone: boolean) => {
      onToggle(habit.id);
      if (!wasDone) {
        if (navigator.vibrate) navigator.vibrate(8);
        setBurst(habit.id);
        if (burstTimer.current) clearTimeout(burstTimer.current);
        burstTimer.current = setTimeout(() => setBurst(null), 650);
      }
    },
    [onToggle],
  );

  const all = [...view.required, ...view.grandfathered];

  if (all.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-ink/45 dark:text-paper/40">
        No habits yet. Add a few links to forge this chain.
      </p>
    );
  }

  return (
    <ul className="relative list-none">
      {all.map((habit, i) => {
        const isRequired = i < view.required.length;
        const done = view.completedIds.has(habit.id);
        const isNext = isRequired && i === view.nextIndex;
        const prevDone = i > 0 && view.completedIds.has(all[i - 1].id);
        const last = i === all.length - 1;

        return (
          <li key={habit.id} className="relative" style={{ height: ROW }}>
            {/* connector into the next node */}
            {!last && (
              <>
                <span
                  className="absolute left-[32px] w-[2px] -translate-x-1/2 rounded-full transition-colors duration-300"
                  style={{
                    top: NODE_TOP + NODE_SIZE,
                    height: ROW - NODE_SIZE,
                    background: done ? color.hex : 'currentColor',
                    opacity: done ? 0.9 : 0.16,
                  }}
                />
                {done && burst === habit.id && (
                  <svg
                    className="pointer-events-none absolute left-[32px] -translate-x-1/2"
                    style={{ top: NODE_TOP + NODE_SIZE, height: ROW - NODE_SIZE, width: 2 }}
                    aria-hidden
                  >
                    <line
                      x1="1"
                      y1="0"
                      x2="1"
                      y2={ROW - NODE_SIZE}
                      stroke={color.hex}
                      strokeWidth="4"
                      strokeDasharray={ROW - NODE_SIZE}
                      style={{ animation: 'link-charge 320ms cubic-bezier(0.22,1,0.36,1)' }}
                    />
                  </svg>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => handle(habit, done)}
              aria-pressed={done}
              className="group flex w-full items-center gap-3.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
              style={{ height: ROW }}
            >
              {/* node */}
              <span className="relative grid shrink-0 place-items-center" style={{ width: 64 }}>
                {isNext && !done && (
                  <span
                    className="absolute rounded-full"
                    style={{
                      width: NODE_SIZE,
                      height: NODE_SIZE,
                      boxShadow: `0 0 0 2px ${color.hex}`,
                      opacity: 0.35,
                    }}
                  />
                )}
                {burst === habit.id && (
                  <span
                    className="anim-unlock-ring absolute rounded-full"
                    style={{ width: NODE_SIZE, height: NODE_SIZE, boxShadow: `0 0 0 2.5px ${color.hex}` }}
                  />
                )}
                <span
                  className={`${burst === habit.id ? 'anim-seat' : ''} grid place-items-center rounded-full border-2 transition-all duration-200`}
                  style={{
                    width: NODE_SIZE,
                    height: NODE_SIZE,
                    borderColor: done ? color.hex : isNext ? color.hex : 'currentColor',
                    background: done ? color.hex : 'transparent',
                    color: done ? '#0B0C0E' : undefined,
                    opacity: done || isNext ? 1 : 0.32,
                  }}
                >
                  {done ? (
                    <Check size={20} strokeWidth={3.2} className="text-ink" />
                  ) : habit.icon ? (
                    <span className="text-[17px] leading-none">{habit.icon}</span>
                  ) : (
                    <span
                      className="tnum font-display text-sm font-bold"
                      style={{ color: isNext ? color.hex : undefined }}
                    >
                      {i + 1}
                    </span>
                  )}
                </span>
              </span>

              {/* label */}
              <span className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                <span
                  className={`truncate text-[15px] leading-tight transition-all duration-200 ${
                    done
                      ? 'text-ink/35 line-through decoration-1 dark:text-paper/30'
                      : isNext
                        ? 'font-medium text-ink dark:text-paper'
                        : 'text-ink/55 dark:text-paper/50'
                  }`}
                >
                  {habit.name}
                </span>
                {!isRequired && (
                  <span
                    className="shrink-0 rounded-sm border px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider"
                    style={{ borderColor: `${color.hex}55`, color: color.hex }}
                    title="Added today — it starts counting tomorrow, so it can't break today's chain."
                  >
                    New
                  </span>
                )}
                {showHotkeys && i < 9 && !done && (
                  <kbd className="ml-auto hidden shrink-0 rounded-[3px] border border-black/[0.12] px-1.5 py-0.5 font-display text-[10px] font-semibold text-ink/35 dark:border-white/[0.12] dark:text-paper/30 sm:block">
                    {i + 1}
                  </kbd>
                )}
              </span>
            </button>
          </li>
        );
      })}

      {view.isComplete && (
        <li className="anim-rise flex items-center gap-2 pl-[18px] pt-1">
          <Bolt size={15} className="shrink-0" style={{ color: color.hex }} />
          <span className="font-display text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: color.hex }}>
            Chain closed · streak {chain.currentStreak + 1}
          </span>
        </li>
      )}
    </ul>
  );
}
