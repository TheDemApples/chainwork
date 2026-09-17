/**
 * Time-awareness hooks: settling elapsed days, and firing reminders.
 */

import { useEffect } from 'react';
import { Chain } from '../types';
import { msUntilLocalTime, msUntilNextBoundary } from '../lib/dayKey';
import { reconcileNow } from '../state/store';

/**
 * Keeps the app honest about what day it is.
 *
 * Reconciles on mount, on tab focus, once a minute, and precisely at the logical-day
 * boundary. A phone left open overnight will roll over without a refresh.
 */
export function useDayWatcher(boundaryHour: number): void {
  useEffect(() => {
    reconcileNow();

    const onWake = () => reconcileNow();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    const interval = setInterval(reconcileNow, 60_000);

    let boundaryTimer: ReturnType<typeof setTimeout>;
    const armBoundary = () => {
      boundaryTimer = setTimeout(() => {
        reconcileNow();
        armBoundary();
      }, msUntilNextBoundary(boundaryHour) + 2_000);
    };
    armBoundary();

    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      clearInterval(interval);
      clearTimeout(boundaryTimer);
    };
  }, [boundaryHour]);
}

export function useReminders(chains: Chain[], enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const timers: Array<ReturnType<typeof setTimeout>> = [];

    chains
      .filter((c) => !c.archived && c.reminderTime)
      .forEach((chain) => {
        const arm = () => {
          const ms = msUntilLocalTime(chain.reminderTime as string);
          if (ms === null) return;
          const t = setTimeout(() => {
            try {
              new Notification(`${chain.name}`, {
                body:
                  chain.currentStreak > 0
                    ? `${chain.currentStreak}-day streak on the line. Close the chain.`
                    : 'Time to close the chain.',
                tag: `chainwork-${chain.id}`,
              });
            } catch {
              /* notification blocked mid-session */
            }
            arm(); // re-arm for tomorrow
          }, ms);
          timers.push(t);
        };
        arm();
      });

    return () => timers.forEach(clearTimeout);
  }, [chains, enabled]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
