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
        <Halo glowId={glowId} />
        AI
      </span>
      <span style={{ color: colors.textPrimary }}>mighty</span>
    </span>
  );
}

function Halo({ glowId }: { glowId: string }) {
  return (
    <svg
      viewBox="0 0 100 50"
      aria-hidden="true"
      focusable="false"
      style={{
        position: 'absolute',
        left: '72%',
        top: '-0.65em',
        transform: 'translateX(-50%)',
        width: '1.2em',
        height: 'auto',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <g transform="rotate(-8 50 30)">
        <ellipse
          cx="50"
          cy="30"
          rx="42"
          ry="20"
          fill="none"
          stroke="#d4b882"
          strokeWidth="6"
          opacity="0.4"
          filter={`url(#${glowId})`}
        />
        <ellipse
          cx="50"
          cy="30"
          rx="42"
          ry="20"
          fill="none"
          stroke="#d4b882"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}
