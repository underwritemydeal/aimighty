/**
 * Capture This Moment — the cinematic share overlay.
 *
 * When the user taps "Capture this moment" on a God reply, we transform
 * the conversation screen into a shareable artifact. The transition
 * runs in five phases over ~1.6s:
 *
 *   0   – 400ms  Chrome fades out (header, input, messages)
 *   200 – 1000ms Glow bloom from center-top
 *   600 – 1000ms Question + reply reposition into capture layout
 *   1000 – 1600ms Hold — fully composed, no motion
 *   1600 +       Action buttons (Save / Share / Keep talking) fade in
 *
 * Closing the overlay (Keep talking or backdrop tap) plays the animation
 * in reverse so the user's conversation fades back in exactly where it
 * was — the capture feels like a moment you can step out of, not a
 * destination you had to navigate to.
 *
 * The overlay renders an HTML mock of the canvas composition for the
 * on-screen preview, then renders to canvas on demand when the user
 * hits Save or Share. This keeps the animation buttery (DOM is cheap
 * to animate; canvas repaints at 1080×1920 are not) while still producing
 * a pixel-perfect 9:16 PNG.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { BeliefTheme } from '../config/beliefThemes';
import { getThemeForBelief, getShareTextForBelief } from '../config/beliefThemes';
import { renderCaptureBlob, preloadCaptureFonts } from '../utils/captureImage';
import { shareMoment, saveMomentToDevice } from '../utils/shareMoment';
import { track } from '../utils/analytics';

export interface CaptureMomentProps {
  question: string;
  reply: string;
  beliefId: string;
  /** Full divine-background image path from ConversationScreen. Renders
   *  in-place behind the capture composition so the cinematic image is
   *  preserved — no jarring jump to a flat black screen. */
  imagePath: string;
  onClose: () => void;
}

type Phase = 'chrome-fade' | 'glow-bloom' | 'reposition' | 'hold' | 'actions' | 'closing';

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // sunrise-style easing

export function CaptureMoment({ question, reply, beliefId, imagePath, onClose }: CaptureMomentProps) {
  const theme: BeliefTheme = useMemo(() => getThemeForBelief(beliefId), [beliefId]);
  const shareText = useMemo(() => getShareTextForBelief(beliefId), [beliefId]);

  const [phase, setPhase] = useState<Phase>('chrome-fade');
  const [busy, setBusy] = useState<null | 'saving' | 'sharing'>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  // Set to true when the user cancels; used by the phase-advance timers
  // to bail out instead of stepping the animation forward behind a
  // closing overlay (which would cause a flicker as it unmounts).
  const isClosingRef = useRef(false);

  // Blob cache — we only render the canvas once per mount, regardless of
  // whether the user hits Save, Share, or both. Canvas render is ~150ms
  // on a mid-range phone; we don't want to redo it.
  const blobRef = useRef<Blob | null>(null);
  const renderingRef = useRef<Promise<Blob> | null>(null);

  const getBlob = useCallback(async (): Promise<Blob> => {
    if (blobRef.current) return blobRef.current;
    if (renderingRef.current) return renderingRef.current;
    // Ensure fonts are actually ready (preloadCaptureFonts runs at app boot
    // but may not have completed yet on slow connections).
    await preloadCaptureFonts();
    const promise = renderCaptureBlob({ question, reply, theme }).then((blob) => {
      blobRef.current = blob;
      renderingRef.current = null;
      return blob;
    });
    renderingRef.current = promise;
    return promise;
  }, [question, reply, theme]);

  // Phase driver. Timings are absolute from mount to keep the 5 phases
  // aligned with the spec. Cleanup cancels all timers if the overlay
  // unmounts mid-animation (e.g. user navigates away).
  useEffect(() => {
    track('capture_initiated', { belief: beliefId, question_length: question.length, reply_length: reply.length });
    // Each phase-advance bails if the user has cancelled in the meantime,
    // otherwise the overlay visually snaps forward (e.g. chrome-fade →
    // glow-bloom) while the reverse-animation is trying to run, producing
    // a one-frame flicker on slow devices.
    const advance = (next: Phase) => {
      if (isClosingRef.current) return;
      setPhase(next);
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => advance('glow-bloom'), 200));
    timers.push(setTimeout(() => advance('reposition'), 600));
    timers.push(setTimeout(() => advance('hold'), 1000));
    timers.push(setTimeout(() => advance('actions'), 1600));
    timers.push(setTimeout(() => {
      if (isClosingRef.current) return;
      track('capture_completed', { belief: beliefId });
    }, 1600));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close handling — play reverse animation then call the parent's onClose.
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    track('capture_cancelled', { belief: beliefId, stage: phase });
    setPhase('closing');
    setTimeout(() => onClose(), 400);
  }, [phase, beliefId, onClose]);

  const handleSave = useCallback(async () => {
    if (busy) return;
    setBusy('saving');
    try {
      const blob = await getBlob();
      saveMomentToDevice(blob, beliefId);
      // Give the system save dialog a beat, then dismiss the overlay.
      setTimeout(() => handleClose(), 400);
    } catch (e) {
      console.error('[CaptureMoment] save failed:', e);
      setErrorToast('Try again — image couldn’t be created.');
      setBusy(null);
      setTimeout(() => setErrorToast(null), 3000);
    }
  }, [busy, getBlob, beliefId, handleClose]);

  const handleShare = useCallback(async () => {
    if (busy) return;
    setBusy('sharing');
    try {
      const blob = await getBlob();
      const result = await shareMoment({ blob, beliefId, shareText });
      if (result.method === 'cancelled') {
        // User bailed out of the share sheet — keep them on the capture
        // so they can still Save or try again.
        setBusy(null);
        return;
      }
      if (!result.shared) {
        setErrorToast('Try again — sharing didn’t go through.');
        setBusy(null);
        setTimeout(() => setErrorToast(null), 3000);
        return;
      }
      // Successful share — close after a brief hold so the system sheet
      // animation has time to unwind without feeling abrupt.
      setTimeout(() => handleClose(), 400);
    } catch (e) {
      console.error('[CaptureMoment] share failed:', e);
      setErrorToast('Try again — sharing didn’t go through.');
      setBusy(null);
      setTimeout(() => setErrorToast(null), 3000);
    }
  }, [busy, getBlob, beliefId, shareText, handleClose]);

  // ESC key closes the overlay (desktop QA).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  // Background opacity by phase — fades in from 0 then stays fully opaque.
  const bgOpacity = phase === 'chrome-fade' ? 0 : phase === 'closing' ? 0 : 1;

  // Glow scale by phase — starts at 0.3, blooms to 1 during bloom phase,
  // then holds.
  const glowScale =
    phase === 'chrome-fade' ? 0.3 :
    phase === 'glow-bloom' ? 0.8 :
    phase === 'closing' ? 0.3 : 1;

  const glowOpacity =
    phase === 'chrome-fade' ? 0 :
    phase === 'closing' ? 0 : 1;

  // Text opacity — appears during reposition, stays through hold + actions.
  const textOpacity =
    phase === 'chrome-fade' || phase === 'glow-bloom' ? 0 :
    phase === 'closing' ? 0 : 1;
  const textTransform =
    phase === 'chrome-fade' || phase === 'glow-bloom' ? 'translateY(16px)' :
    phase === 'closing' ? 'translateY(16px)' : 'translateY(0)';

  const actionsOpacity = phase === 'actions' ? 1 : 0;
  const actionsTransform = phase === 'actions' ? 'translateY(0)' : 'translateY(12px)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Capture this moment"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        // In-place capture: the divine background image from the
        // conversation screen is preserved behind a dark gradient for
        // readability. This replaces the old flat theme.bg solid color
        // that made the capture feel like a separate black-screen
        // destination instead of a moment captured in place.
        background: `linear-gradient(rgba(3,3,8,0.70), rgba(3,3,8,0.88)), url(${imagePath})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        opacity: bgOpacity,
        transition: `opacity 400ms ${EASE}`,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Glow bloom */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          width: '140vmin',
          height: '140vmin',
          marginLeft: '-70vmin',
          marginTop: '-70vmin',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.glow} 0%, transparent 60%)`,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
          transition: `transform 800ms ${EASE}, opacity 800ms ${EASE}`,
          pointerEvents: 'none',
          filter: 'blur(20px)',
        }}
      />

      {/* Subtle vignette at bottom for wordmark legibility */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 65%, rgba(0,0,0,0.35) 100%)',
          pointerEvents: 'none',
          opacity: textOpacity,
          transition: `opacity 400ms ${EASE}`,
        }}
      />

      {/* Capture composition — matches the canvas layout 1:1 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
          maxWidth: 'min(100vw, calc(100vh * 9 / 16))',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          /* Bottom padding generous enough that the wordmark at the end
             of this composition never visually overlaps the absolute-
             positioned action bar (~50px button + 24px safe-area). */
          padding: 'max(env(safe-area-inset-top), 48px) 28px calc(max(env(safe-area-inset-bottom), 24px) + 96px)',
          boxSizing: 'border-box',
          cursor: 'default',
          opacity: textOpacity,
          transform: textTransform,
          transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}`,
        }}
      >
        {/* Question */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(18px, 4.5vw, 26px)',
            color: theme.secondary,
            opacity: 0.8,
            lineHeight: 1.35,
            marginTop: '4vh',
            paddingLeft: '4%',
            paddingRight: '4%',
          }}
        >
          {question}
        </div>

        {/* God's reply — flex-grows to fill the middle so the canvas render
            math mirrors this visual composition. */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '6vh',
            marginBottom: '6vh',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              fontSize: 'clamp(24px, 6.5vw, 38px)',
              color: theme.primary,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              maxWidth: '100%',
            }}
          >
            {reply}
          </div>
        </div>

        {/* Wordmark + URL */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 500,
              fontSize: 'clamp(22px, 5vw, 30px)',
              letterSpacing: '0.01em',
            }}
          >
            <span style={{ color: theme.secondary }}>AI</span>
            <span style={{ color: theme.primary }}>mighty</span>
          </div>
          <div
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontSize: 'clamp(11px, 2.8vw, 14px)',
              color: theme.secondary,
              opacity: 0.7,
              marginTop: '8px',
              letterSpacing: '0.04em',
            }}
          >
            aimightyme.com
          </div>
        </div>
      </div>

      {/* Action bar — Save / Share / Keep talking */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 'max(env(safe-area-inset-bottom), 24px)',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 'clamp(6px, 2vw, 12px)',
          padding: '0 16px',
          opacity: actionsOpacity,
          transform: actionsTransform,
          transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}`,
          pointerEvents: phase === 'actions' ? 'auto' : 'none',
          cursor: 'default',
        }}
      >
        <ActionButton
          label={busy === 'saving' ? 'Saving…' : 'Save'}
          onClick={handleSave}
          disabled={Boolean(busy)}
          theme={theme}
          variant="secondary"
        />
        <ActionButton
          label={busy === 'sharing' ? 'Sharing…' : 'Share'}
          onClick={handleShare}
          disabled={Boolean(busy)}
          theme={theme}
          variant="primary"
        />
        <ActionButton
          label="Done"
          onClick={handleClose}
          disabled={Boolean(busy)}
          theme={theme}
          variant="ghost"
        />
      </div>

      {errorToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 'max(env(safe-area-inset-top), 40px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30, 10, 10, 0.92)',
            color: '#f5e8c7',
            padding: '10px 18px',
            borderRadius: '999px',
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: '14px',
            letterSpacing: '0.01em',
            border: '1px solid rgba(255, 200, 180, 0.2)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {errorToast}
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  theme: BeliefTheme;
  variant: 'primary' | 'secondary' | 'ghost';
}

function ActionButton({ label, onClick, disabled, theme, variant }: ActionButtonProps) {
  const base = {
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 500,
    // Clamp so buttons tighten on narrow phones (iPhone SE 375px) without
    // shrinking on tablet/desktop where breathing room is fine.
    fontSize: 'clamp(13px, 3.8vw, 15px)',
    letterSpacing: '0.02em',
    padding: 'clamp(10px, 2.6vw, 12px) clamp(14px, 4vw, 22px)',
    borderRadius: '999px',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'opacity 200ms ease, transform 150ms ease',
    opacity: disabled ? 0.5 : 1,
    border: '1px solid transparent',
    whiteSpace: 'nowrap' as const,
  };
  const variantStyles =
    variant === 'primary'
      ? { background: theme.primary, color: theme.bg, boxShadow: `0 4px 20px ${theme.glow}` }
      : variant === 'secondary'
      ? {
          background: 'transparent',
          color: theme.primary,
          borderColor: theme.secondary,
        }
      : {
          background: 'transparent',
          color: theme.secondary,
          borderColor: 'transparent',
        };
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ ...base, ...variantStyles }}>
      {label}
    </button>
  );
}
