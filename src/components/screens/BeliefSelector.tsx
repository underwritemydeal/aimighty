/**
 * Belief picker — the magic moment of onboarding.
 *
 * Per the belief-first spec, this is where a user discovers the app has
 * THEIR tradition. Design choices follow from that:
 *
 * - Header reads "Who do you talk to?" — a question, not a menu label.
 * - Each card is a name + a one-line descriptor in the tradition's own
 *   voice, plus a color block pulled from `beliefThemes` so the palette
 *   already hints at the conversation that follows.
 * - Tap-to-stage, then a single Continue commits. Prevents mis-taps on
 *   mobile and lets us animate a glow on the selected card before the
 *   screen transitions.
 * - Same component serves signup AND "Other Beliefs" switch. In switch
 *   mode, the current belief is highlighted and tapping it cancels.
 */
import { useState, useEffect, useMemo, memo } from 'react';
import { beliefSystems } from '../../data/beliefSystems';
import { type LanguageCode } from '../../data/translations';
import { getThemeForBelief } from '../../config/beliefThemes';
import { getDescriptorForBelief } from '../../config/beliefDescriptors';
import { normalizeBeliefId } from '../../config/beliefSystems';
import type { BeliefSystem } from '../../types';

interface BeliefSelectorProps {
  onSelect: (belief: BeliefSystem) => void;
  onBack: () => void;
  language: LanguageCode;
  onSignOut: () => void;
  /** When set, that belief is shown as "current" and tapping it cancels. */
  currentBeliefId?: string;
  /** "switch" mode: label the CTA "Switch" and enable cancel-back. */
  mode?: 'signup' | 'switch';
  /** Switch-mode cancel (Stay here). If omitted, falls back to onBack. */
  onCancel?: () => void;
}

// Color-block + descriptor card. No image — just the belief's palette,
// typography, and a single evocative line. The color block is the quiet
// visual cue the spec calls for.
const BeliefCard = memo(function BeliefCard({
  belief,
  isVisible,
  index,
  isStaged,
  isCurrent,
  onSelect,
}: {
  belief: BeliefSystem;
  isVisible: boolean;
  index: number;
  isStaged: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const theme = useMemo(() => getThemeForBelief(belief.id), [belief.id]);
  const descriptor = useMemo(
    () => getDescriptorForBelief(normalizeBeliefId(belief.id)),
    [belief.id]
  );
  const isActive = isHovered || isFocused || isStaged;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={`${belief.name} — ${descriptor}${isCurrent ? ' (your current tradition)' : ''}`}
      aria-pressed={isStaged}
      style={{
        width: '100%',
        minHeight: '88px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 18px',
        textAlign: 'left',
        background: isStaged
          ? `linear-gradient(90deg, ${theme.glow.replace(/[\d.]+\)$/, '0.18)')} 0%, rgba(255,255,255,0.04) 100%)`
          : isActive
          ? 'rgba(255, 255, 255, 0.035)'
          : 'rgba(255, 255, 255, 0.015)',
        border: `1px solid ${
          isStaged
            ? theme.glow.replace(/[\d.]+\)$/, '0.65)')
            : isCurrent
            ? 'rgba(212, 175, 55, 0.35)'
            : isActive
            ? 'rgba(255, 255, 255, 0.14)'
            : 'rgba(255, 255, 255, 0.06)'
        }`,
        borderRadius: '14px',
        cursor: 'pointer',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
        // Transition everything except the stage-triggered glow, which
        // we want to animate faster so the Continue button feels reactive.
        transition:
          `opacity 0.4s ease ${150 + index * 30}ms,` +
          `transform 0.4s ease ${150 + index * 30}ms,` +
          'background 180ms ease, border-color 180ms ease, box-shadow 220ms ease',
        boxShadow: isStaged
          ? `0 0 0 1px ${theme.glow.replace(/[\d.]+\)$/, '0.35)')} inset, 0 8px 32px ${theme.glow.replace(/[\d.]+\)$/, '0.2)')}`
          : 'none',
      }}
    >
      {/* Color block — the belief's glow color, muted. Tells the eye this
          tradition has a palette before the words even register. */}
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: '10px',
          alignSelf: 'stretch',
          borderRadius: '3px',
          background: isStaged
            ? theme.glow.replace(/[\d.]+\)$/, '0.85)')
            : theme.glow.replace(/[\d.]+\)$/, '0.55)'),
          boxShadow: isStaged
            ? `0 0 16px ${theme.glow.replace(/[\d.]+\)$/, '0.6)')}`
            : 'none',
          transition: 'background 180ms ease, box-shadow 220ms ease',
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body, Outfit)',
              fontWeight: 500,
              fontSize: '1.05rem',
              color: 'rgba(255, 248, 240, 0.96)',
              letterSpacing: '-0.005em',
            }}
          >
            {belief.name}
          </span>
          {isCurrent && (
            <span
              style={{
                fontFamily: 'var(--font-body, Outfit)',
                fontWeight: 400,
                fontSize: '0.7rem',
                color: 'rgba(212, 175, 55, 0.85)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Current
            </span>
          )}
        </div>
        <p
          style={{
            marginTop: '4px',
            fontFamily: 'var(--font-display, Cormorant Garamond)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: '0.95rem',
            color: 'rgba(255, 248, 240, 0.68)',
            lineHeight: 1.35,
          }}
        >
          {descriptor}
        </p>
      </div>
    </button>
  );
});

// Thin line art logout icon
const LogoutIcon = memo(function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
});

// Back arrow icon
const BackIcon = memo(function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

export function BeliefSelector({
  onSelect,
  onBack,
  onSignOut,
  currentBeliefId,
  mode = 'signup',
  onCancel,
}: BeliefSelectorProps) {
  const [isVisible, setIsVisible] = useState(false);
  // Stage the user's tap here; Continue commits it. This is the two-step
  // interaction the spec asks for — tap to highlight + glow, then Continue.
  const [stagedId, setStagedId] = useState<string | null>(
    mode === 'switch' && currentBeliefId ? currentBeliefId : null
  );

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // 2-col desktop per spec ("2-3 col desktop"). 2 is the cleaner grid for
  // ~88px cards at typical laptop widths — 3 columns compresses the
  // descriptor line uncomfortably. Bump to 3 only at very wide breakpoints.
  const handleCardTap = (belief: BeliefSystem) => {
    // Tapping the already-staged card in switch mode un-stages it.
    if (mode === 'switch' && stagedId === belief.id && currentBeliefId === belief.id) {
      setStagedId(null);
      return;
    }
    setStagedId(belief.id);
  };

  const handleContinue = () => {
    if (!stagedId) return;
    // In switch mode, picking the current belief = cancel (no-op reset).
    if (mode === 'switch' && stagedId === currentBeliefId) {
      (onCancel ?? onBack)();
      return;
    }
    const picked = beliefSystems.find((b) => b.id === stagedId);
    if (picked) onSelect(picked);
  };

  const continueEnabled =
    !!stagedId &&
    // In switch mode, the stage must differ from the current belief for
    // Continue to actually do something (otherwise it's a cancel).
    (mode !== 'switch' || stagedId !== currentBeliefId);

  const continueLabel = mode === 'switch' ? 'Switch tradition' : 'Continue';

  return (
    <div
      className="relative overflow-hidden"
      style={{ background: 'var(--color-void)', minHeight: '100dvh' }}
      role="main"
      aria-labelledby="belief-heading"
    >
      {/* Muted ambient background — no more mashup scrim. A soft void keeps
          the focus on the cards and the emotion of the question. */}
      <div
        className="fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(212, 175, 55, 0.06) 0%, rgba(3,3,8,0) 60%), var(--color-void)',
        }}
        aria-hidden="true"
      />

      {/* Scrollable content */}
      <div className="relative z-10 overflow-y-auto" style={{ minHeight: '100dvh' }}>
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            padding: '72px 20px 140px',
          }}
        >
          {/* Back button (signup mode → sign out; switch mode → cancel) */}
          <nav
            className="fixed top-4 left-4 z-20"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.5s ease',
            }}
          >
            <button
              onClick={mode === 'switch' ? (onCancel ?? onBack) : onBack}
              aria-label={mode === 'switch' ? 'Cancel' : 'Back'}
              className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            >
              <BackIcon />
            </button>
          </nav>

          {/* Sign out button — hidden in switch mode (the cancel arrow already
              handles escape) */}
          {mode !== 'switch' && (
            <div
              className="fixed top-4 right-4 z-20"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
                transition: 'all 0.5s ease',
              }}
            >
              <button
                onClick={onSignOut}
                aria-label="Sign out"
                className="py-2 px-3 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255, 255, 255, 0.4)' }}
              >
                <LogoutIcon />
              </button>
            </div>
          )}

          {/* Header — the question that makes this the magic moment. */}
          <header
            className="text-center"
            style={{
              marginBottom: '12px',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.6s ease',
            }}
          >
            <h1
              id="belief-heading"
              style={{
                fontFamily: 'var(--font-display, Cormorant Garamond)',
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: 'clamp(1.9rem, 6vw, 2.75rem)',
                color: 'rgba(255, 248, 240, 0.95)',
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Who do you talk to?
            </h1>
          </header>

          <p
            className="text-center"
            style={{
              maxWidth: '520px',
              margin: '0 auto 36px',
              opacity: isVisible ? 0.72 : 0,
              transition: 'opacity 0.6s ease 120ms',
              fontFamily: 'var(--font-body, Outfit)',
              fontWeight: 300,
              fontSize: '0.95rem',
              color: 'rgba(255, 248, 240, 0.7)',
              lineHeight: 1.55,
            }}
          >
            Pick the tradition that feels closest to you. You can always explore others later.
          </p>

          {/* 14 cards in a responsive grid — no categorization, the spec
              reframes this as a personal choice, not a taxonomy. */}
          <div
            style={{
              display: 'grid',
              gap: '12px',
            }}
            className="belief-grid"
          >
            {beliefSystems.map((belief, index) => (
              <BeliefCard
                key={belief.id}
                belief={belief}
                index={index}
                isVisible={isVisible}
                isStaged={stagedId === belief.id}
                isCurrent={currentBeliefId === belief.id}
                onSelect={() => handleCardTap(belief)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Continue bar — sticky footer pinned to the viewport bottom
          with safe-area padding. Grayed out until a card is staged. */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)',
          background:
            'linear-gradient(180deg, rgba(3,3,8,0) 0%, rgba(3,3,8,0.85) 30%, rgba(3,3,8,0.98) 100%)',
          zIndex: 30,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <button
          onClick={handleContinue}
          disabled={!continueEnabled}
          aria-disabled={!continueEnabled}
          style={{
            pointerEvents: 'auto',
            fontFamily: 'var(--font-body, Outfit)',
            fontWeight: 500,
            fontSize: '1rem',
            letterSpacing: '0.01em',
            padding: '14px 36px',
            borderRadius: '999px',
            border: 'none',
            minWidth: '240px',
            background: continueEnabled ? '#d4af37' : 'rgba(212, 175, 55, 0.18)',
            color: continueEnabled ? '#0a0a0f' : 'rgba(255,248,240,0.4)',
            cursor: continueEnabled ? 'pointer' : 'not-allowed',
            boxShadow: continueEnabled
              ? '0 10px 40px rgba(212,175,55,0.28), 0 0 0 1px rgba(212,175,55,0.6) inset'
              : 'none',
            transition: 'background 180ms ease, color 180ms ease, box-shadow 220ms ease',
          }}
        >
          {continueLabel}
        </button>
      </div>

      <style>{`
        .belief-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 720px) {
          .belief-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}
