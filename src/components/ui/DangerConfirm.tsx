/**
 * Typed-name confirmation for irreversible deletes. The ONLY confirmation dialog in
 * the app — marking habits done never gets one.
 */

import { useEffect, useRef, useState } from 'react';

interface DangerConfirmProps {
  open: boolean;
  title: string;
  body: string;
  /** The user must type this exactly. */
  confirmPhrase: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DangerConfirm({
  open,
  title,
  body,
  confirmPhrase,
  confirmLabel = 'Delete permanently',
  onConfirm,
  onCancel,
}: DangerConfirmProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const matches = value.trim() === confirmPhrase;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="anim-rise w-full max-w-sm rounded-sm border border-ember/30 bg-paper p-5 dark:bg-graphite"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold tracking-tight text-ember">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/70 dark:text-paper/65">{body}</p>

        <label className="mt-4 block">
          <span className="eyebrow">
            Type <span className="text-ember">{confirmPhrase}</span> to confirm
          </span>
          <input
            ref={inputRef}
            className="field mt-1.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches) onConfirm();
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn flex-1 bg-ember text-white hover:bg-ember/85"
            disabled={!matches}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
