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
import { useState, useEffect, useMemo, memo, type KeyboardEvent } from 'react';
import { beliefSystems, type CategorizedBeliefSystem } from '../../data/beliefSystems';
import { type LanguageCode } from '../../data/translations';
import { getThemeForBelief } from '../../config/beliefThemes';
import { getDescriptorForBelief } from '../../config/beliefDescriptors';
import { normalizeBeliefId } from '../../config/beliefSystems';
import { colors } from '../../styles/designSystem';
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

// Card is the belief's 16:9 conversation background image with a dark
// overlay for legibility. Selection is signaled by a coloured 1px border
// and glow drawn from the belief's theme color — same palette the user
// will see when they enter the conversation, so the picker previews the
// emotional register of each tradition.
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

  // Reuse the 16:9 horizontal image already shipped for the conversation
  // screen background. Swapping the `.jpg` suffix keeps us correct for
  // the two beliefs whose file stem differs from their id
  // (mormonism → mormon-desktop.jpg, atheism-stoicism → stoicism-desktop.jpg).
  const bgImage = useMemo(() => {
    const cat = belief as CategorizedBeliefSystem;
    const base = cat.imagePath || `/images/avatars/${belief.id}.jpg`;
    return base.replace(/\.jpg$/, '-desktop.jpg');
  }, [belief]);

  const glowStrong = theme.glow.replace(/[\d.]+\)$/, '0.85)');
  const glowSoft = theme.glow.replace(/[\d.]+\)$/, '0.35)');

  // Rendered as <div role="button"> rather than <button> to sidestep two
  // separate iOS Safari quirks: (1) the global `button { background: none }`
  // reset in index.css was stripping backgroundImage even when moved to an
  // inner element, and (2) some iOS builds will not render
  // absolute-positioned <img> descendants of a <button> at all. A div
  // role="button" with keyboard handling for Enter/Space preserves
  // accessibility without those quirks.
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={`${belief.name} — ${descriptor}${isCurrent ? ' (your current tradition)' : ''}`}
      aria-pressed={isStaged}
      style={{
        position: 'relative',
        width: '100%',
        height: '96px',
        padding: 0,
        textAlign: 'left',
        overflow: 'hidden',
        backgroundColor: theme.bg,
        border: `1px solid ${
          isStaged
            ? glowStrong
            : isCurrent
            ? 'rgba(212, 184, 130, 0.55)'
            : isActive
            ? 'rgba(255, 255, 255, 0.20)'
            : 'rgba(255, 255, 255, 0.08)'
        }`,
        borderRadius: '14px',
        cursor: 'pointer',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
        transition:
          `opacity 0.4s ease ${150 + index * 30}ms,` +
          `transform 0.4s ease ${150 + index * 30}ms,` +
          'border-color 180ms ease, box-shadow 220ms ease',
        boxShadow: isStaged
          ? `0 0 0 1px ${glowStrong} inset, 0 0 24px ${glowSoft}, 0 6px 24px rgba(0,0,0,0.45)`
          : '0 2px 14px rgba(0,0,0,0.35)',
      }}
    >
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: isActive
            ? 'linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.62) 60%, rgba(0,0,0,0.50) 100%)'
            : 'linear-gradient(90deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.68) 60%, rgba(0,0,0,0.58) 100%)',
          transition: 'background 180ms ease',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%',
          padding: '0 18px',
          gap: '2px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: '"Outfit", system-ui, sans-serif',
              fontWeight: 500,
              fontSize: '1.0625rem',
              lineHeight: 1.2,
              color: 'rgba(255, 248, 240, 0.98)',
              letterSpacing: '-0.005em',
              textShadow: '0 1px 3px rgba(0,0,0,0.75)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: '0 1 auto',
            }}
          >
            {belief.name}
          </span>
          {isCurrent && (
            <span
              style={{
                fontFamily: '"Outfit", system-ui, sans-serif',
                fontWeight: 400,
                fontSize: '0.65rem',
                color: 'rgba(212, 184, 130, 0.95)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textShadow: '0 1px 3px rgba(0,0,0,0.75)',
                flex: '0 0 auto',
              }}
            >
              Current
            </span>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: '0.95rem',
            color: 'rgba(255, 248, 240, 0.88)',
            lineHeight: 1.3,
            textShadow: '0 1px 3px rgba(0,0,0,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {descriptor}
        </p>
      </div>
    </div>
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
            'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(212, 184, 130, 0.06) 0%, rgba(3,3,8,0) 60%), var(--color-void)',
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
                color: colors.gold,
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
            background: continueEnabled ? '#d4b882' : 'rgba(212, 184, 130, 0.18)',
            color: continueEnabled ? '#0a0a0f' : 'rgba(255,248,240,0.4)',
            cursor: continueEnabled ? 'pointer' : 'not-allowed',
            boxShadow: continueEnabled
              ? '0 10px 40px rgba(212,184,130,0.28), 0 0 0 1px rgba(212,184,130,0.6) inset'
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
