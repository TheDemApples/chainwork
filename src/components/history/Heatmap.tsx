/**
 * 90-day contribution-style heatmap. Hand-rolled SVG — a chart library would cost
 * more bytes than the whole component and give less control over the palette.
 *
 * Encoding: full days are solid chain colour, partial days fade with their ratio,
 * missed days are a faint neutral, and pre-history is void (not a miss).
 */

import { Chain, colorOf } from '../../types';
import { HeatCell } from '../../lib/selectors';
import { formatKeyLong, weekdayOf } from '../../lib/dayKey';

interface HeatmapProps {
  chain: Chain;
  cells: HeatCell[];
}

const SIZE = 11;
const GAP = 3;
const STEP = SIZE + GAP;
const TOP = 16;
const LEFT = 18;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Heatmap({ chain, cells }: HeatmapProps) {
  const color = colorOf(chain);
  if (cells.length === 0) return null;

  // Pad so the first column begins on a Sunday.
  const lead = weekdayOf(cells[0].date);
  const slots: (HeatCell | null)[] = [...Array<null>(lead).fill(null), ...cells];
  const weeks = Math.ceil(slots.length / 7);

  const width = LEFT + weeks * STEP;
  const height = TOP + 7 * STEP;

  const monthLabels: Array<{ x: number; label: string }> = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w += 1) {
    const cell = slots[w * 7] ?? slots[w * 7 + 1];
    if (!cell) continue;
    const month = Number(cell.date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      monthLabels.push({ x: LEFT + w * STEP, label: MONTHS[month] });
      lastMonth = month;
    }
  }

  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
      <svg width={width} height={height} className="block" role="img" aria-label="Completion heatmap">
        {monthLabels.map((m) => (
          <text
            key={`${m.label}-${m.x}`}
            x={m.x}
            y={10}
            className="fill-ink/40 dark:fill-paper/35"
            style={{ fontFamily: 'Archivo, sans-serif', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em' }}
          >
            {m.label.toUpperCase()}
          </text>
        ))}

        {['M', 'W', 'F'].map((d, i) => (
          <text
            key={d}
            x={0}
            y={TOP + (i * 2 + 1) * STEP + SIZE - 2}
            className="fill-ink/30 dark:fill-paper/25"
            style={{ fontFamily: 'Archivo, sans-serif', fontSize: 8, fontWeight: 600 }}
          >
            {d}
          </text>
        ))}

        {slots.map((cell, i) => {
          if (!cell) return null;
          const col = Math.floor(i / 7);
          const row = i % 7;
          const x = LEFT + col * STEP;
          const y = TOP + row * STEP;

          let fill = 'currentColor';
          let opacity = 0.06;
          if (cell.preHistory) {
            opacity = 0.025;
          } else if (cell.outcome === 'full') {
            fill = color.hex;
            opacity = 1;
          } else if (cell.outcome === 'partial') {
            fill = color.hex;
            opacity = 0.2 + 0.45 * cell.ratio;
          } else if (cell.outcome === 'neutral') {
            opacity = 0.05;
          }

          const label = cell.preHistory
            ? `${formatKeyLong(cell.date)} — before this chain existed`
            : `${formatKeyLong(cell.date)} — ${
                cell.outcome === 'full'
                  ? 'complete'
                  : cell.outcome === 'partial'
                    ? `partial (${Math.round(cell.ratio * 100)}%)`
                    : cell.outcome === 'neutral'
                      ? 'nothing required'
                      : 'missed'
              }`;

          return (
            <g key={cell.date}>
              <rect
                x={x}
                y={y}
                width={SIZE}
                height={SIZE}
                rx={2}
                fill={fill}
                opacity={opacity}
                className={fill === 'currentColor' ? 'text-ink dark:text-paper' : undefined}
              />
              {cell.isToday && (
                <rect
                  x={x - 1}
                  y={y - 1}
                  width={SIZE + 2}
                  height={SIZE + 2}
                  rx={3}
                  fill="none"
                  stroke={color.hex}
                  strokeWidth={1.4}
                  opacity={0.9}
                />
              )}
              <title>{label}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
