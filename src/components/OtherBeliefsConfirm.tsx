/**
 * Other Beliefs — confirmation step.
 *
 * Sits between the hamburger-menu tap and the belief picker. The spec is
 * explicit that switching clears the prior conversation, so we surface
 * that consequence before the user commits, framed warmly. "Quiet door,
 * not a billboard" — no confetti, no celebration, just a gentle gate.
 *
 * Analytics:
 *   - Mounting fires `other_beliefs_opened` in the parent (at the moment
 *     the user taps the menu item, not here, so a cancel still counts).
 *   - Tapping "Yes, explore" fires `belief_switch_confirmed` in the parent
 *     after the user picks the new belief in the subsequent screen.
 *   - Tapping "Stay here" fires `belief_switch_cancelled` in the parent.
 */
import { memo } from 'react';
import type { BeliefSystem } from '../types';

interface OtherBeliefsConfirmProps {
  currentBelief: BeliefSystem;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OtherBeliefsConfirm = memo(function OtherBeliefsConfirm({
  currentBelief,
  onConfirm,
  onCancel,
}: OtherBeliefsConfirmProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="other-beliefs-title"
      style={{
        minHeight: '100dvh',
        background: 'var(--color-void)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px calc(env(safe-area-inset-bottom, 0px) + 32px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle ambient glow behind the text — same radial the picker uses,
          so the two screens feel like one continuous moment. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(212,175,55,0.05) 0%, rgba(3,3,8,0) 60%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1
          id="other-beliefs-title"
          style={{
            fontFamily: 'var(--font-display, Cormorant Garamond)',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(1.8rem, 5.5vw, 2.5rem)',
            color: 'rgba(255, 248, 240, 0.96)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            margin: '0 0 20px',
          }}
        >
          Explore another tradition?
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body, Outfit)',
            fontWeight: 300,
            fontSize: '1rem',
            color: 'rgba(255, 248, 240, 0.72)',
            lineHeight: 1.6,
            margin: '0 0 40px',
          }}
        >
          Your conversations in the {currentBelief.name} tradition will be
          cleared if you switch. You can always come back — but they'll
          start fresh.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'stretch',
          }}
        >
          <button
            onClick={onConfirm}
            style={{
              fontFamily: 'var(--font-body, Outfit)',
              fontWeight: 500,
              fontSize: '1rem',
              letterSpacing: '0.01em',
              padding: '15px 28px',
              borderRadius: '999px',
              border: 'none',
              background: '#d4af37',
              color: '#0a0a0f',
              cursor: 'pointer',
              boxShadow:
                '0 10px 40px rgba(212,175,55,0.25), 0 0 0 1px rgba(212,175,55,0.5) inset',
              transition: 'transform 120ms ease, box-shadow 220ms ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Yes, explore
          </button>
          <button
            onClick={onCancel}
            style={{
              fontFamily: 'var(--font-body, Outfit)',
              fontWeight: 400,
              fontSize: '0.95rem',
              letterSpacing: '0.01em',
              padding: '14px 28px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 248, 240, 0.18)',
              background: 'transparent',
              color: 'rgba(255, 248, 240, 0.72)',
              cursor: 'pointer',
              transition: 'background 180ms ease, border-color 180ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 248, 240, 0.32)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(255, 248, 240, 0.18)';
            }}
          >
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
});
