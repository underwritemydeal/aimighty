/**
 * BeliefBackground — photographic backdrop for the conversation screen.
 *
 * 14 beliefs × 7 cinematic photographs each = 98 backgrounds total.
 * Variant selection is deterministic: `dayOfYear(today) % 7`. Same user
 * on the same day sees the same backdrop; at local midnight it rotates.
 * The dev gallery can force a specific variant via `forceVariant`.
 *
 * Photos live at `/images/backgrounds/{beliefId}/v1.jpg .. v7.jpg`. All
 * 14 beliefs are supported — there is no SVG/Three.js/gradient fallback
 * branch anymore. The previous geometric "space and clouds" system was
 * removed 2026-04-24 in favour of editorial cathedral / mosque / temple /
 * landscape photography (see .stitch/DESIGN.md Phase 1 backgrounds).
 */
import { useMemo } from 'react';

const SUPPORTED_BELIEFS = new Set([
  'protestant',
  'catholic',
  'mormonism',
  'islam',
  'judaism',
  'hinduism',
  'buddhism',
  'sikhism',
  'sbnr',
  'taoism',
  'pantheism',
  'science',
  'agnosticism',
  'atheism-stoicism',
]);

export function isBeliefBackgroundSupported(beliefId: string): boolean {
  return SUPPORTED_BELIEFS.has(beliefId);
}

/** Day-of-year (1..366), local time. */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

interface BeliefBackgroundProps {
  /** Canonical belief id — call `normalizeBeliefId(id)` upstream. */
  beliefId: string;
  /**
   * Force a specific variant index (0..6). Used by the dev gallery for
   * per-variant preview. In production the variant auto-selects by
   * day-of-year.
   */
  forceVariant?: number;
}

export function BeliefBackground({ beliefId, forceVariant }: BeliefBackgroundProps) {
  // Day-of-year is captured once per mount — not every render. Re-mounts at
  // midnight via the parent conversation session boundary.
  const todayVariantIndex = useMemo(() => dayOfYear(new Date()) % 7, []);

  if (!SUPPORTED_BELIEFS.has(beliefId)) return null;

  const variantIndex =
    typeof forceVariant === 'number'
      ? ((forceVariant % 7) + 7) % 7
      : todayVariantIndex;

  // 1-indexed file naming: v1.jpg .. v7.jpg
  const src = `/images/backgrounds/${beliefId}/v${variantIndex + 1}.jpg`;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'top center',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
      draggable={false}
    />
  );
}

/** Dev-gallery helper — returns every (belief, variant) pair so the
 *  gallery can preview all 98 photographs without importing each path. */
export function getAllBackgroundConfigs(): Array<{
  beliefId: string;
  variantIndex: number;
  src: string;
}> {
  const out: Array<{ beliefId: string; variantIndex: number; src: string }> = [];
  for (const beliefId of SUPPORTED_BELIEFS) {
    for (let i = 0; i < 7; i++) {
      out.push({
        beliefId,
        variantIndex: i,
        src: `/images/backgrounds/${beliefId}/v${i + 1}.jpg`,
      });
    }
  }
  return out;
}
