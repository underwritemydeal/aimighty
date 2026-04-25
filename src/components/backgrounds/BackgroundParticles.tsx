/**
 * BackgroundParticles — shared drifting particle field for all beliefs.
 *
 * Each particle is an absolutely-positioned <div> (cheaper than SVG for
 * 20–30 floaters). They drift upward on a slow linear loop with randomized
 * size/start/delay so the field feels alive without ever looking busy.
 * Position math is seeded by belief id + variant, so the same user on the
 * same day sees the same scatter — no re-shuffling on re-render.
 *
 * All visual chrome comes from `backgrounds.css` (keyframes, layout). This
 * module only computes deterministic per-particle CSS custom properties.
 */
import { useMemo } from 'react';

interface BackgroundParticlesProps {
  /** CSS color (e.g. `rgba(212,184,130,0.6)` or `#d4b882`). */
  color: string;
  /** Number of particles. Capped at 30 to stay within the mobile frame budget. */
  count: number;
  /** Seed string — typically `${beliefId}-${variantIndex}`. Stable per render. */
  seed: string;
}

/** Simple xmur3-style string hash → seedable PRNG. */
function makeRng(seed: string): () => number {
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) % 100000) / 100000;
  };
}

export function BackgroundParticles({ color, count, seed }: BackgroundParticlesProps) {
  const particles = useMemo(() => {
    const rng = makeRng(seed);
    const clamped = Math.max(0, Math.min(30, count));
    return Array.from({ length: clamped }, (_, i) => {
      const size = 2 + rng() * 3.5;               // 2–5.5 px
      const leftPct = rng() * 100;                 // 0–100% of container width
      const topPct = 70 + rng() * 50;              // start below/near bottom (70–120%)
      const duration = 18 + rng() * 16;            // 18–34 s
      const delay = -rng() * duration;             // negative = stagger into mid-loop
      const dx = (rng() - 0.5) * 12;               // -6..+6 vw sideways drift
      const opacity = 0.22 + rng() * 0.28;         // 0.22–0.5
      return { i, size, leftPct, topPct, duration, delay, dx, opacity };
    });
  }, [count, seed]);

  return (
    <div className="bb-particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.i}
          className="bb-particle"
          style={{
            left: `${p.leftPct}%`,
            top: `${p.topPct}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
            boxShadow: `0 0 ${Math.round(p.size * 2)}px ${color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            // CSS custom props consumed by @keyframes bb-drift
            ['--bb-p-dx' as string]: `${p.dx}vw`,
            ['--bb-p-dy' as string]: `-${110 + p.topPct - 70}vh`,
            ['--bb-p-opacity' as string]: String(p.opacity),
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
