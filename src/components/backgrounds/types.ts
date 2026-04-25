/**
 * Shared types for per-belief sacred-geometry backgrounds.
 *
 * Each belief module (christianity.tsx, islam.tsx, etc.) exports a
 * BeliefBackgroundConfig with exactly 7 variants. BeliefBackground.tsx
 * picks the variant for today via `dayOfYear % 7`.
 */
import type { FC } from 'react';

export interface VariantRenderProps {
  /**
   * Halt CSS rotation/drift animations when the user has
   * `prefers-reduced-motion: reduce` set. Variants should render
   * statically in that case — no other visual change.
   */
  reducedMotion: boolean;
}

export interface BackgroundVariant {
  /** Stable id used for deterministic lookup in the dev gallery. */
  id: string;
  /** Short human label shown in the dev gallery, e.g. "Calvary Scene". */
  name: string;
  /**
   * How the symbol layer animates. Default `'slow'` = 90s linear rotation
   * (spec: "almost imperceptible motion"). `'none'` disables rotation for
   * compositions whose orientation is load-bearing (landscape crosses,
   * ground-line references). Still freezes under `prefers-reduced-motion`.
   */
  rotate?: 'slow' | 'none';
  /** Renders the symbol layer SVG. Sized 70vmin × 70vmin, centered. */
  SymbolLayer: FC<VariantRenderProps>;
}

export interface BeliefBackgroundConfig {
  /**
   * CSS `background` string for the base gradient layer. Deep, tinted,
   * non-black (per-belief). Renders full-bleed behind the symbol.
   */
  gradient: string;
  /** Accent color used by the symbol SVG strokes/fills. */
  accent: string;
  /** Secondary accent color — used sparingly (e.g. gold on emerald). */
  accentSecondary?: string;
  /** Color used for drifting particles. */
  particleColor: string;
  /** Particle count. Spec caps at 30; use 20–28 in practice. */
  particleCount: number;
  /** 7 distinct compositional variants for this belief. */
  variants: BackgroundVariant[];
}
