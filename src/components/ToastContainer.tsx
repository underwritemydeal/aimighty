import { useEffect, useState, useCallback } from 'react';
import { subscribeToast, type ToastEvent } from '../services/toast';
import { colors } from '../styles/designSystem';

/**
 * Stacked toast renderer. Mounted once at the App root. Subscribes to the
 * toast event bus, collects active toasts into local state, auto-dismisses
 * each one after its duration, and lets the user tap the × to dismiss
 * early. Positioned bottom-center on mobile (above the safe-area inset)
 * with a max width so it doesn't stretch edge-to-edge on desktop.
 *
 * Visual language (locked by the design system):
 *   - Dark cosmic card: rgba(10,10,20,0.96) + 20px blur
 *   - 1px gold border for error/info, muted for success
 *   - Gold accent bar on the left
 *   - Cormorant/Outfit typography
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast]);
      if (toast.duration > 0) {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 z-[100] flex flex-col gap-2 pointer-events-none"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '420px',
      }}
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const accentColor =
          t.type === 'error' ? '#ef4444'
          : t.type === 'success' ? colors.gold
          : colors.gold;
        const borderColor =
          t.type === 'error' ? 'rgba(239, 68, 68, 0.5)'
          : 'rgba(212, 184, 130, 0.5)';
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3"
            style={{
              background: 'rgba(10, 10, 20, 0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${borderColor}`,
              borderLeft: `3px solid ${accentColor}`,
              borderRadius: '12px',
              padding: '14px 14px 14px 16px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
              fontFamily: 'var(--font-body, Outfit)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              color: 'rgba(255, 248, 240, 0.92)',
              animation: 'aimightyToastIn 0.28s ease-out',
            }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 p-1 rounded transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '-2px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes aimightyToastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
