/**
 * The flywheel. Momentum is meant to be *felt* here, not read.
 *
 * Three independent channels encode the same number so it reads at a glance and
 * rewards a longer look:
 *   1. rotation speed  — ω = 6 + 90·(M/100)^1.3 deg/s, stalls below M=1.5
 *   2. arc fill        — the brass sweep around the rim
 *   3. heat            — the bloom behind the wheel
 */

import { memo } from 'react';
import { ChainColor } from '../../types';
import { bandFor } from '../../lib/momentum';
import { useFlywheelSpin } from './useFlywheelSpin';

interface FlywheelProps {
  momentum: number;
  color: ChainColor;
  size?: number;
  kick?: number;
  animate?: boolean;
  /** Renders the numeric readout and band label in the hub. */
  showReadout?: boolean;
  streak?: number;
}

const R = 78;
const CIRC = 2 * Math.PI * R;
const TEETH = 30;

function Teeth({ color }: { color: string }) {
  const marks = [];
  for (let i = 0; i < TEETH; i += 1) {
    const major = i % 5 === 0;
    const a = (i / TEETH) * Math.PI * 2;
    const inner = major ? 60 : 66;
    const outer = 71;
    marks.push(
      <line
        key={i}
        x1={100 + Math.cos(a) * inner}
        y1={100 + Math.sin(a) * inner}
        x2={100 + Math.cos(a) * outer}
        y2={100 + Math.sin(a) * outer}
        stroke={color}
        strokeWidth={major ? 3 : 1.5}
        strokeLinecap="butt"
        opacity={major ? 0.95 : 0.45}
      />,
    );
  }
  return <>{marks}</>;
}

function Flywheel({
  momentum,
  color,
  size = 220,
  kick = 0,
  animate = true,
  showReadout = true,
  streak,
}: FlywheelProps) {
  const m = Math.max(0, Math.min(100, momentum));
  const spinRef = useFlywheelSpin(m, kick, animate);
  const band = bandFor(m);
  const heat = Math.pow(m / 100, 1.4);
  const gid = `fw-${color.id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Momentum ${m.toFixed(0)} of 100 — ${band.label}`}
      className="block"
    >
      <defs>
        <radialGradient id={`${gid}-heat`}>
          <stop offset="0%" stopColor={color.hex} stopOpacity={0.5 * heat} />
          <stop offset="55%" stopColor={color.hex} stopOpacity={0.14 * heat} />
          <stop offset="100%" stopColor={color.hex} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${gid}-arc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color.hex} stopOpacity={0.55} />
          <stop offset="100%" stopColor={color.hex} stopOpacity={1} />
        </linearGradient>
      </defs>

      {/* heat bloom */}
      <circle cx="100" cy="100" r="96" fill={`url(#${gid}-heat)`} />

      {/* static outer rim */}
      <circle cx="100" cy="100" r={R} fill="none" stroke={color.dim} strokeWidth="10" opacity={0.55} />

      {/* rotating mass */}
      <g ref={spinRef} transform="rotate(0 100 100)">
        <Teeth color={color.dim} />
        {[0, 120, 240].map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="100"
            x2={100 + Math.cos((deg * Math.PI) / 180) * 58}
            y2={100 + Math.sin((deg * Math.PI) / 180) * 58}
            stroke={color.dim}
            strokeWidth="4"
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}
        {/* counterweight — gives the eye something to track */}
        <circle cx={100 + 58} cy="100" r="6" fill={color.hex} opacity={0.9} />
        <circle cx={100 + 58} cy="100" r="11" fill="none" stroke={color.hex} strokeWidth="1.5" opacity={0.35} />
      </g>

      {/* momentum arc — fill level */}
      <circle
        cx="100"
        cy="100"
        r={R}
        fill="none"
        stroke={`url(#${gid}-arc)`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC * (1 - m / 100)}
        transform="rotate(-90 100 100)"
        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
      />

      {/* hub */}
      <circle
        cx="100"
        cy="100"
        r="47"
        className="fill-paper dark:fill-graphite"
        stroke={color.dim}
        strokeWidth="1.5"
      />

      {showReadout && (
        <>
          <text
            x="100"
            y={streak !== undefined ? 96 : 104}
            textAnchor="middle"
            className="fill-ink dark:fill-paper tnum"
            style={{ fontFamily: 'Archivo, sans-serif', fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            {Math.round(m)}
          </text>
          <text
            x="100"
            y={streak !== undefined ? 114 : 122}
            textAnchor="middle"
            fill={color.hex}
            style={{
              fontFamily: 'Archivo, sans-serif',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.18em',
            }}
          >
            {band.label.toUpperCase()}
          </text>
          {streak !== undefined && (
            <text
              x="100"
              y="131"
              textAnchor="middle"
              className="fill-ink/45 dark:fill-paper/40 tnum"
              style={{ fontFamily: 'Archivo, sans-serif', fontSize: 10, fontWeight: 600 }}
            >
              {streak}d streak
            </text>
          )}
        </>
      )}
    </svg>
  );
}

export default memo(Flywheel);
