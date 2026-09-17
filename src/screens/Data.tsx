/** Data & settings — backup, the day boundary, reminders, trash, and the mechanic itself. */

import { useRef, useState, type ReactNode } from 'react';
import { colorOf } from '../types';
import { MOMENTUM_CONFIG, protection } from '../lib/momentum';
import { downloadJson, parseImport } from '../lib/transfer';
import {
  currentDayKey,
  loadDemoData,
  purgeChain,
  replaceState,
  resetEverything,
  restoreChain,
  updateSettings,
  useStore,
} from '../state/store';
import { requestNotificationPermission } from '../hooks/useDayWatcher';
import DangerConfirm from '../components/ui/DangerConfirm';
import { Download, Moon, Sun, Upload } from '../components/ui/Icons';
import { toast } from '../components/ui/Toast';

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.07] py-3 last:border-0 dark:border-white/[0.06]">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-2xs leading-relaxed text-ink/45 dark:text-paper/40">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function Data() {
  const { state } = useStore();
  const todayK = currentDayKey();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingPurge, setPendingPurge] = useState<string | null>(null);
  const trashed = state.chains.filter((c) => c.archived);
  const purgeTarget = state.chains.find((c) => c.id === pendingPurge);

  const onImport = async (file: File) => {
    try {
      const next = parseImport(await file.text());
      replaceState(next);
      toast(`Imported ${next.chains.length} chains`, { tone: 'good' });
    } catch (err) {
      toast(`Import failed: ${(err as Error).message}`, { tone: 'warn', duration: 5000 });
    }
  };

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <p className="eyebrow">Chainwork</p>
        <h1 className="font-display text-[26px] font-extrabold leading-none tracking-tight">Data</h1>
      </header>

      <section className="panel px-4">
        <Row label="Theme">
          <button
            type="button"
            onClick={() => updateSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' })}
            className="btn-ghost"
          >
            {state.settings.theme === 'dark' ? <Moon /> : <Sun />}
            {state.settings.theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </Row>

        <Row
          label="Day starts at"
          hint="A chain ticked off before this hour counts toward the previous day. 4am suits late nights."
        >
          <select
            className="field w-auto py-1.5"
            value={state.settings.dayBoundaryHour}
            onChange={(e) => updateSettings({ dayBoundaryHour: Number(e.target.value) })}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </Row>

        <Row label="Reminders" hint="Browser notifications at each chain's set time. Needs permission.">
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              if (state.settings.remindersEnabled) {
                updateSettings({ remindersEnabled: false });
                return;
              }
              const ok = await requestNotificationPermission();
              updateSettings({ remindersEnabled: ok });
              toast(ok ? 'Reminders on' : 'Notification permission denied', {
                tone: ok ? 'good' : 'warn',
              });
            }}
          >
            {state.settings.remindersEnabled ? 'On' : 'Off'}
          </button>
        </Row>
      </section>

      <section className="panel px-4">
        <Row label="Export backup" hint="Everything as JSON — chains, habits, and 90 days of logs.">
          <button type="button" className="btn-ghost" onClick={() => downloadJson(state)}>
            <Download /> Export
          </button>
        </Row>
        <Row label="Import backup" hint="Replaces all current data.">
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = '';
              }}
            />
            <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
              <Upload /> Import
            </button>
          </>
        </Row>
        <Row label="Load demo data" hint="74 days of generated history, settled by the real engine.">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              loadDemoData();
              toast('Demo data loaded', { tone: 'good' });
            }}
          >
            Load
          </button>
        </Row>
        <Row label="Reset everything" hint="Wipes local storage and restores the starter chains.">
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              void resetEverything();
              toast('Reset to starter chains', { tone: 'warn' });
            }}
          >
            Reset
          </button>
        </Row>
      </section>

      {trashed.length > 0 && (
        <section className="panel px-4">
          <p className="eyebrow pt-3">Trash · {trashed.length}</p>
          {trashed.map((c) => (
            <Row key={c.id} label={c.name} hint={`${c.history.length} logged days retained`}>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    restoreChain(c.id);
                    toast('Restored', { tone: 'good' });
                  }}
                >
                  Restore
                </button>
                <button type="button" className="btn-danger" onClick={() => setPendingPurge(c.id)}>
                  Delete
                </button>
              </div>
            </Row>
          ))}
        </section>
      )}

      <section className="panel p-4 sm:p-5">
        <h2 className="eyebrow">The mechanic</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/70 dark:text-paper/65">
          Momentum decays <em>exponentially</em>, so a fast flywheel sheds more energy than a slow one —
          and it can never go negative.
        </p>
        <pre className="tnum mt-3 overflow-x-auto rounded-sm bg-black/[0.04] p-3 text-2xs leading-relaxed text-ink/70 dark:bg-white/[0.04] dark:text-paper/65">
{`armour = min(${MOMENTUM_CONFIG.protectCap}, R / (R + ${MOMENTUM_CONFIG.protectK}))

λ = 0                     full chain
  = ${MOMENTUM_CONFIG.lambdaPartial} · (1 − armour)   partial
  = ${MOMENTUM_CONFIG.lambdaZero}  · (1 − armour)   skipped

M′ = M·e^(−λ) + ${MOMENTUM_CONFIG.gainMax}·(1 − M/100)^${MOMENTUM_CONFIG.gainCurve}·(1 + ${MOMENTUM_CONFIG.streakGainBonus}·armour)`}
        </pre>
        <p className="mt-3 text-xs leading-relaxed text-ink/55 dark:text-paper/50">
          <strong>R</strong> is resilience: it tracks your streak while you perform and halves for every
          consecutive day you miss. That's why a broken 30-day streak hurts gradually rather than
          detonating, and why a two-week absence leaves you with nothing to fall back on.
        </p>

        {state.chains.filter((c) => !c.archived).length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="eyebrow">Your armour right now</p>
            {state.chains
              .filter((c) => !c.archived)
              .map((c) => {
                const a = protection(c.resilience);
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-ink/60 dark:text-paper/55">{c.name}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.07]">
                      <span
                        className="block h-full rounded-full transition-all duration-500"
                        style={{ width: `${a * 100}%`, background: colorOf(c).hex }}
                      />
                    </span>
                    <span className="tnum w-10 shrink-0 text-right font-display text-xs font-bold">
                      {Math.round(a * 100)}%
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <p className="pb-2 text-center text-2xs text-ink/35 dark:text-paper/30">
        Stored locally in IndexedDB · no account, no server · {todayK}
      </p>

      <DangerConfirm
        open={Boolean(purgeTarget)}
        title="Delete chain and all history"
        body={`This permanently destroys ${purgeTarget?.history.length ?? 0} days of logged data for "${
          purgeTarget?.name ?? ''
        }". It cannot be undone.`}
        confirmPhrase={purgeTarget?.name ?? ''}
        onCancel={() => setPendingPurge(null)}
        onConfirm={() => {
          if (pendingPurge) purgeChain(pendingPurge);
          setPendingPurge(null);
          toast('Chain permanently deleted', { tone: 'warn' });
        }}
      />
    </div>
  );
}
