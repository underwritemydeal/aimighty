import { useId, type CSSProperties } from 'react';
import { colors, fonts, fontWeights } from '../styles/designSystem';

export type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl';

interface WordmarkProps {
  size?: WordmarkSize;
  /** Adds a soft gold bloom behind the letters — use for the hero only. */
  haloGlow?: boolean;
  style?: CSSProperties;
  className?: string;
}

const sizeMap: Record<WordmarkSize, { fontSize: string; letterSpacing: string }> = {
  sm: { fontSize: '1.05rem', letterSpacing: '0.05em' },
  md: { fontSize: '1.3rem', letterSpacing: '0.02em' },
  lg: { fontSize: 'clamp(2.5rem, 7vw, 4rem)', letterSpacing: '0.08em' },
  xl: { fontSize: 'clamp(4.5rem, 12vw, 6rem)', letterSpacing: '0.05em' },
};

export function Wordmark({ size = 'md', haloGlow = false, style, className }: WordmarkProps) {
  const { fontSize, letterSpacing } = sizeMap[size];
  const rawId = useId().replace(/:/g, '');
  const ringId = `wm-ring-${rawId}`;
  const glowId = `wm-glow-${rawId}`;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: fonts.display,
        fontWeight: fontWeights.medium,
        fontSize,
        letterSpacing,
        lineHeight: 1,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          color: colors.gold,
          textShadow: haloGlow
            ? '0 0 30px rgba(212,184,130,0.5), 0 0 60px rgba(212,184,130,0.25), 0 0 100px rgba(212,184,130,0.1)'
            : undefined,
        }}
      >
        <Halo ringId={ringId} glowId={glowId} />
        AI
      </span>
      <span style={{ color: colors.textPrimary }}>mighty</span>
    </span>
  );
}

function Halo({ ringId, glowId }: { ringId: string; glowId: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      aria-hidden="true"
      focusable="false"
      style={{
        position: 'absolute',
        left: '52%',
        top: '-0.55em',
        transform: 'translateX(-50%)',
        width: '1.55em',
        height: 'auto',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <linearGradient id={ringId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fff5dc" stopOpacity="1" />
          <stop offset="18%" stopColor="#e2c899" stopOpacity="0.95" />
          <stop offset="38%" stopColor="#d4b882" stopOpacity="0.8" />
          <stop offset="55%" stopColor="#bfa067" stopOpacity="0.6" />
          <stop offset="72%" stopColor="#d4b882" stopOpacity="0.85" />
          <stop offset="90%" stopColor="#fff5dc" stopOpacity="1" />
          <stop offset="100%" stopColor="#e2c899" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e2c899" stopOpacity="0.42" />
          <stop offset="50%" stopColor="#d4b882" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#bfa067" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(100 72) rotate(-17)">
        <ellipse cx="0" cy="0" rx="92" ry="48" fill={`url(#${glowId})`} />
        <path
          d="M -84 0 A 84 44 0 0 0 84 0"
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M -84 0 A 84 44 0 0 0 84 0"
          fill="none"
          stroke="#fff5dc"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M -84 0 A 84 44 0 0 1 84 0"
          fill="none"
          stroke="#bfa067"
          strokeWidth="0.9"
          opacity="0.55"
        />
      </g>
    </svg>
  );
}
