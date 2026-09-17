/** Tiny hash router. ~40 lines beats 12kB of react-router, and the Android back button works. */

import { useEffect, useState } from 'react';

export type Route =
  | { name: 'today' }
  | { name: 'chains' }
  | { name: 'chain'; id: string }
  | { name: 'data' };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'today' };
  if (parts[0] === 'chains' && parts[1]) return { name: 'chain', id: parts[1] };
  if (parts[0] === 'chains') return { name: 'chains' };
  if (parts[0] === 'data') return { name: 'data' };
  return { name: 'today' };
}

export function navigate(to: string): void {
  if (window.location.hash === to) return;
  window.location.hash = to;
}

export function back(): void {
  if (window.history.length > 1) window.history.back();
  else navigate('#/chains');
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
