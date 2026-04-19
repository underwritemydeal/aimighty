import type { CSSProperties } from 'react';
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
          color: colors.gold,
          textShadow: haloGlow
            ? '0 0 30px rgba(212,184,130,0.5), 0 0 60px rgba(212,184,130,0.25), 0 0 100px rgba(212,184,130,0.1)'
            : undefined,
        }}
      >
        AI
      </span>
      <span style={{ color: colors.textPrimary }}>mighty</span>
    </span>
  );
}
