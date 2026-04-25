/**
 * BackgroundGallery — dev-only preview surface at /dev/backgrounds.
 *
 * Three modes:
 *   1. No params  → 3×7 grid of all Phase 1 variants, tap any to open.
 *   2. ?belief=X  → 7 variants for a single belief, in full-width cards.
 *   3. ?belief=X&variant=N  → single variant, rendered in the real
 *      ConversationScreen flex layout (100dvh, sticky input mock, tonal
 *      overlay) for on-device iPhone QA.
 *
 * This page is dev-only, unlinked from the app, and trivially removable
 * once all 14 beliefs are built in Phase 2.
 */
import { useMemo } from 'react';
import {
  BeliefBackground,
  getAllBackgroundConfigs,
  isBeliefBackgroundSupported,
} from './BeliefBackground';
import { colors, fonts, fontWeights } from '../../styles/designSystem';
import { normalizeBeliefId } from '../../config/beliefSystems';

const PHASE_1_LABELS: Record<string, string> = {
  protestant: 'Christianity',
  islam: 'Islam',
  buddhism: 'Buddhism',
};

interface BackgroundGalleryProps {
  belief: string | null;
  variant: string | null;
}

export function BackgroundGallery({ belief, variant }: BackgroundGalleryProps) {
  const normalizedBelief = belief ? normalizeBeliefId(belief) : null;
  const variantIdx = variant !== null ? parseInt(variant, 10) : null;
  const hasValidSingle =
    normalizedBelief !== null
    && isBeliefBackgroundSupported(normalizedBelief)
    && variantIdx !== null
    && !Number.isNaN(variantIdx)
    && variantIdx >= 0
    && variantIdx <= 6;

  if (hasValidSingle) {
    return <SingleVariantPreview beliefId={normalizedBelief!} variantIndex={variantIdx!} />;
  }

  if (normalizedBelief && isBeliefBackgroundSupported(normalizedBelief)) {
    return <PerBeliefPreview beliefId={normalizedBelief} />;
  }

  return <GridPreview />;
}

// ──────────────────────────────────────────────────────────────
// GRID MODE — 3 beliefs × 7 variants, each a 9:16 tap-through card.
function GridPreview() {
  const configs = useMemo(() => getAllBackgroundConfigs(), []);
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: colors.void,
        color: colors.textPrimary,
        fontFamily: fonts.body,
        padding: '32px 20px 96px',
      }}
    >
      <header style={{ maxWidth: '1120px', margin: '0 auto 24px' }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight: fontWeights.light,
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ color: colors.gold }}>AI</span>
          <span>mighty</span>
          <span style={{ opacity: 0.5, marginLeft: '16px' }}>/ dev / backgrounds</span>
        </div>
        <p style={{ marginTop: '12px', opacity: 0.65, fontSize: '0.9rem', lineHeight: 1.5 }}>
          Phase 1 — per-belief sacred-geometry backgrounds. Three beliefs × seven daily
          variants = 21 compositions. Tap any tile to open that variant in the real
          ConversationScreen layout for on-device review.
        </p>
      </header>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {configs.map(({ beliefId, config }) => (
          <section key={beliefId} style={{ marginBottom: '48px' }}>
            <h2
              style={{
                fontFamily: fonts.display,
                fontWeight: fontWeights.light,
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                letterSpacing: '0.02em',
                color: colors.gold,
                borderBottom: `1px solid ${colors.goldBorder}`,
                paddingBottom: '8px',
                marginBottom: '16px',
              }}
            >
              {PHASE_1_LABELS[beliefId] ?? beliefId}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: '16px',
              }}
            >
              {config.variants.map((v, i) => (
                <a
                  key={v.id}
                  href={`/dev/backgrounds?belief=${beliefId}&variant=${i}`}
                  style={{
                    position: 'relative',
                    aspectRatio: '9 / 16',
                    display: 'block',
                    border: `1px solid ${colors.borderLight}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: colors.textPrimary,
                    background: colors.void,
                    transition: 'border-color 180ms ease, transform 180ms ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = colors.goldBorderActive;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = colors.borderLight;
                  }}
                >
                  <BeliefBackground beliefId={beliefId} forceVariant={i} />
                  {/* Label strip along the bottom */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      padding: '10px 12px',
                      background:
                        'linear-gradient(to top, rgba(3,3,8,0.92) 0%, rgba(3,3,8,0.6) 60%, rgba(3,3,8,0) 100%)',
                      zIndex: 4,
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: fonts.body,
                        fontSize: '0.7rem',
                        fontWeight: fontWeights.medium,
                        color: colors.gold,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      V{i + 1}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: '0.95rem',
                        fontStyle: 'italic',
                        fontWeight: fontWeights.regular,
                        color: colors.textPrimary,
                        marginTop: '2px',
                      }}
                    >
                      {v.name}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PER-BELIEF MODE — all 7 for one belief, side-by-side on wider screens.
function PerBeliefPreview({ beliefId }: { beliefId: string }) {
  const config = useMemo(
    () => getAllBackgroundConfigs().find((c) => c.beliefId === beliefId)?.config,
    [beliefId],
  );
  if (!config) return <GridPreview />;
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: colors.void,
        color: colors.textPrimary,
        fontFamily: fonts.body,
        padding: '32px 20px 96px',
      }}
    >
      <header style={{ maxWidth: '1120px', margin: '0 auto 24px' }}>
        <a
          href="/dev/backgrounds"
          style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '0.85rem' }}
        >
          ← all backgrounds
        </a>
        <h1
          style={{
            fontFamily: fonts.display,
            fontWeight: fontWeights.light,
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
            color: colors.gold,
            marginTop: '8px',
          }}
        >
          {PHASE_1_LABELS[beliefId] ?? beliefId}
        </h1>
      </header>
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {config.variants.map((v, i) => (
          <a
            key={v.id}
            href={`/dev/backgrounds?belief=${beliefId}&variant=${i}`}
            style={{
              position: 'relative',
              aspectRatio: '9 / 16',
              display: 'block',
              border: `1px solid ${colors.borderLight}`,
              borderRadius: '10px',
              overflow: 'hidden',
              textDecoration: 'none',
              color: colors.textPrimary,
              background: colors.void,
            }}
          >
            <BeliefBackground beliefId={beliefId} forceVariant={i} />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '12px 14px',
                background:
                  'linear-gradient(to top, rgba(3,3,8,0.92) 0%, rgba(3,3,8,0) 100%)',
                zIndex: 4,
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: colors.gold, letterSpacing: '0.06em', textTransform: 'uppercase' }}>V{i + 1}</div>
              <div style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: '1rem', marginTop: '2px' }}>{v.name}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// SINGLE VARIANT — renders the actual ConversationScreen flex layout,
// with the variant pinned via `forceVariant`. For real iPhone QA.
function SingleVariantPreview({ beliefId, variantIndex }: { beliefId: string; variantIndex: number }) {
  const config = useMemo(
    () => getAllBackgroundConfigs().find((c) => c.beliefId === beliefId)?.config,
    [beliefId],
  );
  const variantName = config?.variants[variantIndex]?.name ?? '';
  const beliefLabel = PHASE_1_LABELS[beliefId] ?? beliefId;

  return (
    <div
      className="conversation-screen"
      style={{ background: colors.void }}
      role="main"
      aria-label={`Preview: ${beliefLabel} variant ${variantIndex + 1}`}
    >
      {/* Layer 0 — the belief background (matches ConversationScreen wiring). */}
      <div className="conversation-bg" aria-hidden="true">
        <BeliefBackground beliefId={beliefId} forceVariant={variantIndex} />
      </div>
      {/* Layer 1 — the same tonal overlay ConversationScreen uses. */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, ' +
            'rgba(3,3,8,0.78) 0%, ' +
            'rgba(3,3,8,0.55) 10%, ' +
            'rgba(3,3,8,0.25) 20%, ' +
            'rgba(0,0,0,0) 32%, ' +
            'rgba(0,0,0,0.15) 55%, ' +
            'rgba(3,3,8,0.55) 75%, ' +
            'rgba(3,3,8,0.85) 100%)',
          zIndex: 1,
        }}
        aria-hidden="true"
      />
      {/* Header — mock */}
      <header
        className="conversation-header flex items-center justify-between"
        style={{ paddingLeft: '20px', paddingRight: '20px' }}
      >
        <a
          href="/dev/backgrounds"
          style={{
            color: colors.textPrimary,
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontFamily: fonts.body,
            opacity: 0.7,
          }}
        >
          ← gallery
        </a>
        <div
          style={{
            textAlign: 'center',
            fontFamily: fonts.display,
            fontStyle: 'italic',
            fontWeight: fontWeights.light,
            fontSize: '1.1rem',
            color: colors.textPrimary,
          }}
        >
          {beliefLabel}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: '0.7rem',
            color: colors.gold,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          V{variantIndex + 1}
        </div>
      </header>
      {/* Messages region — a single mock God line to judge legibility. */}
      <section
        className="conversation-messages"
        style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            textAlign: 'center',
            fontFamily: fonts.display,
            fontWeight: fontWeights.light,
            fontStyle: 'italic',
            fontSize: 'clamp(1.25rem, 5vw, 1.75rem)',
            lineHeight: 1.45,
            color: colors.textPrimary,
            textShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}
        >
          Peace be with you. Come as you are, and we will talk.
        </div>
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontFamily: fonts.body,
            fontSize: '0.85rem',
            color: colors.textSecondary,
            letterSpacing: '0.05em',
          }}
        >
          {variantName}
        </div>
      </section>
      {/* Input — mock (no wiring) */}
      <div
        className="conversation-input"
        style={{ paddingLeft: '16px', paddingRight: '16px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(3, 3, 8, 0.6)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${colors.goldBorder}`,
            borderRadius: '24px',
            padding: '10px 16px',
          }}
        >
          <div
            style={{
              flex: 1,
              color: colors.textSecondary,
              fontFamily: fonts.body,
              fontSize: '1rem',
              padding: '6px 0',
            }}
          >
            Speak to God…
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: colors.gold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0a0f',
              fontFamily: fonts.body,
              fontWeight: fontWeights.semibold,
            }}
          >
            ●
          </div>
        </div>
      </div>
    </div>
  );
}
