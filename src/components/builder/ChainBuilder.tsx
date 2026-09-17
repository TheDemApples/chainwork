/**
 * Chain builder. Drag to reorder (dnd-kit handles touch properly, which hand-rolled
 * pointer maths does not), with arrow buttons as a keyboard/AT fallback.
 *
 * Every edit here is history-safe: habits are soft-archived rather than deleted, and
 * resolved DailyLogs are never recomputed. Reordering is purely cosmetic.
 */

import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CHAIN_COLOR_LIST, Chain, ChainColorId, colorOf, Habit } from '../../types';
import { activeHabits } from '../../lib/selectors';
import {
  addHabit,
  removeHabit,
  renameChain,
  reorderHabits,
  setChainColor,
  setChainReminder,
  updateHabit,
} from '../../state/store';
import { ArrowDown, ArrowUp, Grip, Plus, Trash } from '../ui/Icons';
import { toast } from '../ui/Toast';

function SortableHabit({
  habit,
  index,
  total,
  chainId,
  accent,
  onMove,
}: {
  habit: Habit;
  index: number;
  total: number;
  chainId: string;
  accent: string;
  onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1.5 border-b border-black/[0.07] py-1.5 last:border-0 dark:border-white/[0.06] ${
        isDragging ? 'relative z-10 opacity-90' : ''
      }`}
    >
      <button
        type="button"
        aria-label={`Reorder ${habit.name}`}
        className="shrink-0 cursor-grab touch-none p-2 text-ink/25 active:cursor-grabbing dark:text-paper/25"
        {...attributes}
        {...listeners}
      >
        <Grip />
      </button>

      <input
        value={habit.icon ?? ''}
        onChange={(e) => updateHabit(chainId, habit.id, { icon: e.target.value.slice(0, 2) || undefined })}
        placeholder="·"
        aria-label="Emoji"
        className="h-9 w-9 shrink-0 rounded-sm border border-black/10 bg-transparent text-center text-base outline-none focus:border-brass dark:border-white/10"
      />

      <input
        value={habit.name}
        onChange={(e) => updateHabit(chainId, habit.id, { name: e.target.value })}
        aria-label="Habit name"
        className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-2 py-2 text-[15px] outline-none focus:border-brass/60"
      />

      <div className="flex shrink-0">
        <button
          type="button"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          className="p-1.5 text-ink/30 disabled:opacity-20 dark:text-paper/30"
        >
          <ArrowUp />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          className="p-1.5 text-ink/30 disabled:opacity-20 dark:text-paper/30"
        >
          <ArrowDown />
        </button>
        <button
          type="button"
          aria-label={`Remove ${habit.name}`}
          onClick={() => {
            removeHabit(chainId, habit.id);
            toast(`Removed "${habit.name}". History kept.`, { tone: 'neutral' });
          }}
          className="p-1.5 text-ink/30 transition-colors hover:text-ember dark:text-paper/30"
        >
          <Trash />
        </button>
      </div>
    </li>
  );
}

export default function ChainBuilder({ chain }: { chain: Chain }) {
  const [draft, setDraft] = useState('');
  const habits = activeHabits(chain);
  const color = colorOf(chain);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= habits.length) return;
    reorderHabits(
      chain.id,
      arrayMove(habits, from, to).map((h) => h.id),
    );
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = habits.findIndex((h) => h.id === active.id);
    const to = habits.findIndex((h) => h.id === over.id);
    if (from === -1 || to === -1) return;
    move(from, to);
  };

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    // Split a leading emoji off the front if one was typed.
    const match = /^(\p{Extended_Pictographic}\uFE0F?)\s*(.+)$/u.exec(name);
    if (match) addHabit(chain.id, match[2], match[1]);
    else addHabit(chain.id, name);
    setDraft('');
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="eyebrow" htmlFor={`name-${chain.id}`}>
          Chain name
        </label>
        <input
          id={`name-${chain.id}`}
          className="field mt-1.5 font-display text-base font-semibold"
          value={chain.name}
          onChange={(e) => renameChain(chain.id, e.target.value)}
        />
      </div>

      <div>
        <span className="eyebrow">Colour</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {CHAIN_COLOR_LIST.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={c.id === chain.colorId}
              onClick={() => setChainColor(chain.id, c.id as ChainColorId)}
              className="h-9 w-9 rounded-full transition-transform duration-150 hover:scale-105"
              style={{
                background: c.hex,
                boxShadow: c.id === chain.colorId ? `0 0 0 2px var(--tw-ring-offset-color, transparent), 0 0 0 3px ${c.hex}` : 'none',
                outline: c.id === chain.colorId ? `2px solid ${c.hex}` : 'none',
                outlineOffset: 3,
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Links · {habits.length}</span>
          <span className="text-2xs text-ink/40 dark:text-paper/35">Drag to reorder</span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            <ul className="mt-1.5 list-none">
              {habits.map((h, i) => (
                <SortableHabit
                  key={h.id}
                  habit={h}
                  index={i}
                  total={habits.length}
                  chainId={chain.id}
                  accent={color.hex}
                  onMove={move}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="mt-2 flex gap-2">
          <input
            className="field"
            placeholder="Add a link…  (try: 💧 Drink water)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <button type="button" className="btn-solid shrink-0 px-3" onClick={submit} aria-label="Add habit">
            <Plus />
          </button>
        </div>

        <p className="mt-2 text-2xs leading-relaxed text-ink/45 dark:text-paper/40">
          Links added to an established chain are grandfathered — they start counting tomorrow, so
          adding one now can’t break today’s chain or your streak. On a chain’s first day, everything
          counts straight away.
        </p>
      </div>

      <div>
        <label className="eyebrow" htmlFor={`rem-${chain.id}`}>
          Daily reminder
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={`rem-${chain.id}`}
            type="time"
            className="field"
            value={chain.reminderTime ?? ''}
            onChange={(e) => setChainReminder(chain.id, e.target.value || null)}
          />
          {chain.reminderTime && (
            <button type="button" className="btn-ghost shrink-0" onClick={() => setChainReminder(chain.id, null)}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
