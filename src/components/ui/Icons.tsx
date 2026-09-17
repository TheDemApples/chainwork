/** Hand-rolled inline icons — no icon library, no extra bytes. */

import type { CSSProperties } from 'react';

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const Check = ({ className, size = 20, strokeWidth = 3, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
);

export const Plus = ({ className, size = 20, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Trash = ({ className, size = 18, strokeWidth = 1.8, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
);

export const Grip = ({ className, size = 18, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const ChevronRight = ({ className, size = 18, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ChevronLeft = ({ className, size = 18, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const ArrowUp = ({ className, size = 16, strokeWidth = 2.2, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const ArrowDown = ({ className, size = 16, strokeWidth = 2.2, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

export const Undo = ({ className, size = 18, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
);

export const Bolt = ({ className, size = 18, strokeWidth = 1.8, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);

export const Sun = ({ className, size = 18, strokeWidth = 1.9, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
  </svg>
);

export const Moon = ({ className, size = 18, strokeWidth = 1.9, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

export const Download = ({ className, size = 18, strokeWidth = 1.9, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16" />
  </svg>
);

export const Upload = ({ className, size = 18, strokeWidth = 1.9, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M4 20h16" />
  </svg>
);

export const Gear = ({ className, size = 20, strokeWidth = 1.8, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </svg>
);

export const Links = ({ className, size = 20, strokeWidth = 1.9, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M9.5 14.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1 1" />
    <path d="M14.5 9.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1-1" />
  </svg>
);

export const Flame = ({ className, size = 16, strokeWidth = 1.8, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M12 22a6 6 0 0 0 6-6c0-4-3-5-3-9 0 0-3 1.5-3 5 0-2-1.5-3-1.5-3S6 11 6 16a6 6 0 0 0 6 6Z" />
  </svg>
);

export const X = ({ className, size = 18, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} className={className} style={style}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
