/** Dashboard — every chain's state of play at a glance. */

import { useState } from 'react';
import { CHAIN_COLOR_LIST, Chain, ChainColorId, colorOf } from '../types';
import { bandFor } from '../lib/momentum';
import { buildTodayView, completionStats, heatmapCells } from '../lib/selectors';
import { createChain, currentDayKey, useStore } from '../state/store';
import Flywheel from '../components/flywheel/Flywheel';
import { ChevronRight, Flame, Plus } from '../components/ui/Icons';
import { navigate } from '../router';

function MiniStrip({ chain, todayK }: { chain: Chain; todayK: string }) {
  const color = colorOf(chain);
  const cells = heatmapCells(chain, todayK, 21);
  return (
    <div className="flex gap-[3px]">
      {cells.map((c) => (
        <span
          key={c.date}
          className="h-3 flex-1 rounded-[1.5px]"
          style={{
            background:
              c.outcome === 'full'
                ? color.hex
                : c.outcome === 'partial'
                  ? color.hex
                  : 'currentColor',
            opacity:
              c.preHistory ? 0.04 : c.outcome === 'full' ? 1 : c.outcome === 'partial' ? 0.2 + 0.4 * c.ratio : 0.08,
          }}
          title={c.date}
        />
      ))}
    </div>
  );
}

function ChainCard({ chain, todayK }: { chain: Chain; todayK: string }) {
  const color = colorOf(chain);
  const view = buildTodayView(chain, todayK);
  const stats = completionStats(chain, todayK, 30);
  const band = bandFor(view.liveMomentum);

  return (
    <button
      type="button"
      onClick={() => navigate(`#/chains/${chain.id}`)}
      className="panel group w-full p-4 text-left transition-colors hover:border-black/20 dark:hover:border-white/20"
    >
      <div className="flex items-center gap-4">
        <Flywheel momentum={view.liveMomentum} color={color} size={86} showReadout={false} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-display text-base font-bold tracking-tight">{chain.name}</h2>
            <ChevronRight className="ml-auto shrink-0 text-ink/25 transition-transform group-hover:translate-x-0.5 dark:text-paper/25" />
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="tnum font-display text-3xl font-extrabold leading-none tracking-tight">
              {Math.round(view.liveMomentum)}
            </span>
            <span
              className="font-display text-2xs font-bold uppercase tracking-[0.15em]"
              style={{ color: color.hex }}
            >
              {band.label}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-ink/50 dark:text-paper/45">
            <span className="tnum inline-flex items-center gap-1">
              <Flame size={12} style={{ color: color.hex }} />
              {chain.currentStreak}d
            </span>
            <span className="tnum">best {chain.bestStreak}d</span>
            <span className="tnum">{Math.round(stats.rate * 100)}% / 30d</span>
            <span className="tnum font-semibold" style={{ color: view.isComplete ? color.hex : undefined }}>
              {view.completedCount}/{view.requiredCount} today
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-ink dark:text-paper">
        <MiniStrip chain={chain} todayK={todayK} />
      </div>
    </button>
  );
}

export default function Chains() {
  const { state } = useStore();
  const todayK = currentDayKey();
  const chains = state.chains.filter((c) => !c.archived);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [colorId, setColorId] = useState<ChainColorId>('brass');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createChain(trimmed, colorId);
    setName('');
    setCreating(false);
    navigate(`#/chains/${id}`);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="eyebrow">{chains.length} active</p>
          <h1 className="font-display text-[26px] font-extrabold leading-none tracking-tight">Chains</h1>
        </div>
        <button type="button" className="btn-solid" onClick={() => setCreating((v) => !v)}>
          <Plus size={16} /> New
        </button>
      </header>

      {creating && (
        <div className="panel anim-rise space-y-3 p-4">
          <input
            autoFocus
            className="field font-display font-semibold"
            placeholder="Chain name — e.g. Shutdown chain"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') setCreating(false);
            }}
          />
          <div className="flex flex-wrap gap-2">
            {CHAIN_COLOR_LIST.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                onClick={() => setColorId(c.id)}
                className="h-8 w-8 rounded-full transition-transform hover:scale-105"
                style={{
                  background: c.hex,
                  outline: c.id === colorId ? `2px solid ${c.hex}` : 'none',
                  outlineOffset: 3,
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="button" className="btn-solid flex-1" onClick={submit} disabled={!name.trim()}>
              Create chain
            </button>
          </div>
        </div>
      )}

      {chains.length === 0 && !creating && (
        <div className="panel p-10 text-center text-sm text-ink/50 dark:text-paper/45">
          No chains yet. Hit <strong>New</strong> to forge one.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {chains.map((chain) => (
          <ChainCard key={chain.id} chain={chain} todayK={todayK} />
        ))}
      </div>
    </div>
  );
}
