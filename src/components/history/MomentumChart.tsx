/** Momentum over time. Hand-rolled SVG area + line chart. */

import { useMemo } from 'react';
import { Chain, colorOf } from '../../types';
import { SeriesPoint } from '../../lib/selectors';
import { formatKeyShort } from '../../lib/dayKey';

interface MomentumChartProps {
  chain: Chain;
  series: SeriesPoint[];
}

const W = 340;
const H = 132;
const PAD_L = 22;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 16;

export default function MomentumChart({ chain, series }: MomentumChartProps) {
  const color = colorOf(chain);
  const gid = `mc-${chain.id}`;

  const { linePath, areaPath, lastPoint, peak } = useMemo(() => {
    const n = series.length;
    if (n === 0) {
      return { linePath: '', areaPath: '', lastPoint: null as null | { x: number; y: number }, peak: 0 };
    }

    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    const x = (i: number) => PAD_L + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => PAD_T + innerH * (1 - Math.max(0, Math.min(100, v)) / 100);

    let d = '';
    series.forEach((p, i) => {
      d += `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`;
    });

    const area = `${d}L${x(n - 1).toFixed(2)},${(H - PAD_B).toFixed(2)}L${x(0).toFixed(2)},${(H - PAD_B).toFixed(2)}Z`;

    return {
      linePath: d,
      areaPath: area,
      lastPoint: { x: x(n - 1), y: y(series[n - 1].value) },
      peak: series.reduce((m, p) => Math.max(m, p.value), 0),
    };
  }, [series]);

  if (series.length === 0) {
    return <p className="py-6 text-sm text-ink/40 dark:text-paper/35">No momentum recorded yet.</p>;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Momentum over time">
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color.hex} stopOpacity={0.34} />
            <stop offset="100%" stopColor={color.hex} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((v) => {
          const y = PAD_T + (H - PAD_T - PAD_B) * (1 - v / 100);
          return (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                className="stroke-ink dark:stroke-paper"
                strokeOpacity={v === 0 ? 0.16 : 0.07}
                strokeWidth={1}
                strokeDasharray={v === 0 ? undefined : '2 3'}
              />
              <text
                x={0}
                y={y + 3}
                className="fill-ink/35 dark:fill-paper/30 tnum"
                style={{ fontFamily: 'Archivo, sans-serif', fontSize: 8.5, fontWeight: 600 }}
              >
                {v}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gid}-fill)`} />
        <path
          d={linePath}
          fill="none"
          stroke={color.hex}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {lastPoint && (
          <>
            <circle cx={lastPoint.x} cy={lastPoint.y} r={5.5} fill={color.hex} opacity={0.22} />
            <circle cx={lastPoint.x} cy={lastPoint.y} r={2.8} fill={color.hex} />
          </>
        )}

        <text
          x={PAD_L}
          y={H - 3}
          className="fill-ink/35 dark:fill-paper/30"
          style={{ fontFamily: 'Archivo, sans-serif', fontSize: 8.5, fontWeight: 600 }}
        >
          {formatKeyShort(series[0].date).toUpperCase()}
        </text>
        <text
          x={W - PAD_R}
          y={H - 3}
          textAnchor="end"
          className="fill-ink/35 dark:fill-paper/30"
          style={{ fontFamily: 'Archivo, sans-serif', fontSize: 8.5, fontWeight: 600 }}
        >
          TODAY
        </text>
      </svg>

      <div className="mt-1 flex justify-between text-2xs text-ink/45 dark:text-paper/40">
        <span className="tnum">
          Peak <strong className="font-display text-ink/70 dark:text-paper/65">{peak.toFixed(0)}</strong>
        </span>
        <span className="tnum">
          Now{' '}
          <strong className="font-display" style={{ color: color.hex }}>
            {series[series.length - 1].value.toFixed(0)}
          </strong>
        </span>
      </div>
    </div>
  );
}
