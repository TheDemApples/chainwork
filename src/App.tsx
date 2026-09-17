import { useEffect } from 'react';
import { initStore, useStore } from './state/store';
import { useDayWatcher, useReminders } from './hooks/useDayWatcher';
import { navigate, useRoute } from './router';
import Today from './screens/Today';
import Chains from './screens/Chains';
import ChainDetail from './screens/ChainDetail';
import Data from './screens/Data';
import { Toaster } from './components/ui/Toast';
import { Bolt, Gear, Links } from './components/ui/Icons';

const TABS = [
  { hash: '#/', label: 'Today', match: ['today'], Icon: Bolt },
  { hash: '#/chains', label: 'Chains', match: ['chains', 'chain'], Icon: Links },
  { hash: '#/data', label: 'Data', match: ['data'], Icon: Gear },
] as const;

export default function App() {
  const { state, hydrated } = useStore();
  const route = useRoute();

  useEffect(() => {
    void initStore();
  }, []);

  // Theme is applied to <html> so the CSS `dark:` variants and color-scheme both follow.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', state.settings.theme === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', state.settings.theme === 'dark' ? '#0B0C0E' : '#F2EDE4');
  }, [state.settings.theme]);

  useDayWatcher(state.settings.dayBoundaryHour);
  useReminders(state.chains, state.settings.remindersEnabled);

  if (!hydrated) {
    return (
      <div className="grid min-h-full place-items-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brass border-t-transparent" />
          <span className="eyebrow">Chainwork</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <main className="safe-t mx-auto w-full max-w-2xl px-4 pb-28">
        {route.name === 'today' && <Today />}
        {route.name === 'chains' && <Chains />}
        {route.name === 'chain' && <ChainDetail chainId={route.id} />}
        {route.name === 'data' && <Data />}
      </main>

      <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-paper/85 backdrop-blur-md dark:border-white/[0.07] dark:bg-ink/85">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map(({ hash, label, match, Icon }) => {
            const active = (match as readonly string[]).includes(route.name);
            return (
              <button
                key={hash}
                type="button"
                onClick={() => navigate(hash)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                  active ? 'text-brass' : 'text-ink/40 dark:text-paper/35'
                }`}
              >
                <Icon size={21} />
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Toaster />
    </div>
  );
}
