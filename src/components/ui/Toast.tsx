/**
 * Minimal toast bus. Module-level so non-React code (keyboard handlers, the
 * reconciler) can raise one without prop drilling.
 */

import { useEffect, useState } from 'react';
import { X } from './Icons';

export interface Toast {
  id: number;
  message: string;
  tone: 'neutral' | 'good' | 'warn';
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  listeners.forEach((l) => l(toasts));
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(
  message: string,
  opts: { tone?: Toast['tone']; actionLabel?: string; onAction?: () => void; duration?: number } = {},
): number {
  const id = nextId++;
  const entry: Toast = {
    id,
    message,
    tone: opts.tone ?? 'neutral',
    actionLabel: opts.actionLabel,
    onAction: opts.onAction,
    duration: opts.duration ?? 3200,
  };
  toasts = [...toasts.slice(-2), entry];
  emit();
  if (entry.duration > 0) {
    setTimeout(() => dismissToast(id), entry.duration);
  }
  return id;
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>(toasts);

  useEffect(() => {
    const listener: Listener = (next) => setItems(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[76px] z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`anim-rise pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-sm border px-3.5 py-2.5 text-sm shadow-lg backdrop-blur ${
            t.tone === 'good'
              ? 'border-patina/40 bg-patina/15 text-patina'
              : t.tone === 'warn'
                ? 'border-ember/40 bg-ember/15 text-ember'
                : 'border-black/10 bg-white/90 text-ink dark:border-white/[0.12] dark:bg-steel/95 dark:text-paper'
          }`}
        >
          <span className="flex-1 leading-snug">{t.message}</span>
          {t.actionLabel && (
            <button
              type="button"
              onClick={() => {
                t.onAction?.();
                dismissToast(t.id);
              }}
              className="font-display text-xs font-bold uppercase tracking-wider underline underline-offset-2"
            >
              {t.actionLabel}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
            className="opacity-50 transition-opacity hover:opacity-100"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
