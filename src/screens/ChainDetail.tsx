/** Chain detail — history, charts, and the editor. */

import { useMemo, useState } from 'react';
import { colorOf } from '../types';
import { protection } from '../lib/momentum';
import { buildTodayView, completionStats, heatmapCells, momentumSeries } from '../lib/selectors';
import { archiveChain, currentDayKey, restoreChain, useStore } from '../state/store';
import Flywheel from '../components/flywheel/Flywheel';
import Heatmap from '../components/history/Heatmap';
import MomentumChart from '../components/history/MomentumChart';
import ChainBuilder from '../components/builder/ChainBuilder';
import { ChevronLeft, Trash } from '../components/ui/Icons';
import { toast } from '../components/ui/Toast';
import { back, navigate } from '../router';

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-0.5 font-display text-xl font-bold leading-none" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}

export default function ChainDetail({ chainId }: { chainId: string }) {
  const { state } = useStore();
  const todayK = currentDayKey();
  const chain = state.chains.find((c) => c.id === chainId);
  const [range, setRange] = useState<30 | 90>(30);

  const view = useMemo(() => (chain ? buildTodayView(chain, todayK) : null), [chain, todayK]);
  const cells = useMemo(() => (chain ? heatmapCells(chain, todayK, 90) : []), [chain, todayK]);
  const series = useMemo(
    () => (chain && view ? momentumSeries(chain, todayK, range, view.liveMomentum) : []),
    [chain, todayK, range, view],
  );

  if (!chain || !view) {
    return (
      <div className="panel p-8 text-center text-sm text-ink/55 dark:text-paper/50">
        That chain no longer exists.
        <button type="button" className="btn-ghost mt-3 w-full" onClick={() => navigate('#/chains')}>
          Back to chains
        </button>
      </div>
    );
  }

  const color = colorOf(chain);
  const stats = completionStats(chain, todayK, range);
  const armour = protection(chain.resilience);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="-ml-2 rounded-sm p-2 text-ink/50 hover:text-ink dark:text-paper/45 dark:hover:text-paper"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-display text-[22px] font-extrabold tracking-tight">
          {chain.name}
        </h1>
        {chain.archived && (
          <span className="rounded-sm border border-ember/40 px-2 py-0.5 font-display text-2xs font-bold uppercase tracking-wider text-ember">
            In trash
          </span>
        )}
      </header>

      <section className="panel flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-center sm:gap-7">
        <Flywheel momentum={view.liveMomentum} color={color} size={168} streak={chain.currentStreak} />
        <div className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-2">
          <Stat label="Momentum" value={view.liveMomentum.toFixed(1)} accent={color.hex} />
          <Stat label="Streak" value={`${chain.currentStreak}d`} />
          <Stat label="Best streak" value={`${chain.bestStreak}d`} />
          <Stat label="Decay armour" value={`${Math.round(armour * 100)}%`} />
          <Stat label={`Full days / ${range}`} value={`${stats.full}`} />
          <Stat label="Completion" value={`${Math.round(stats.rate * 100)}%`} />
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Momentum</h2>
          <div className="flex overflow-hidden rounded-sm border border-black/10 dark:border-white/10">
            {([30, 90] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 font-display text-2xs font-bold uppercase tracking-wider transition-colors ${
                  range === r
                    ? 'bg-ink text-paper dark:bg-paper dark:text-ink'
                    : 'text-ink/45 dark:text-paper/40'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
        <MomentumChart chain={chain} series={series} />
      </section>

      <section className="panel p-4 sm:p-5">
        <h2 className="eyebrow mb-3">Last 90 days</h2>
        <Heatmap chain={chain} cells={cells} />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink/45 dark:text-paper/40">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color.hex }} /> full
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color.hex, opacity: 0.4 }} /> partial
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-ink/10 dark:bg-paper/10" /> missed
          </span>
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <h2 className="eyebrow mb-4">Edit chain</h2>
        <ChainBuilder chain={chain} />
      </section>

      <section className="panel border-ember/25 p-4 sm:p-5">
        <h2 className="eyebrow mb-1 text-ember/80">Danger</h2>
        <p className="mb-3 text-xs leading-relaxed text-ink/55 dark:text-paper/50">
          {chain.history.length} logged days. Moving to trash is reversible — permanent deletion lives
          in Data and needs the chain name typed out.
        </p>
        {chain.archived ? (
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              restoreChain(chain.id);
              toast('Chain restored', { tone: 'good' });
            }}
          >
            Restore chain
          </button>
        ) : (
          <button
            type="button"
            className="btn-danger w-full"
            onClick={() => {
              archiveChain(chain.id);
              toast(`"${chain.name}" moved to trash`, {
                tone: 'warn',
                actionLabel: 'Undo',
                onAction: () => restoreChain(chain.id),
                duration: 9000,
              });
              navigate('#/chains');
            }}
          >
            <Trash size={16} /> Move to trash
          </button>
        )}
      </section>
    </div>
  );
}
