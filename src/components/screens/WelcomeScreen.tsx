import { useEffect, useState, useRef, memo, useCallback } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { languages, t, type LanguageCode, getLanguage } from '../../data/translations';

interface WelcomeScreenProps {
  onBegin: () => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
}

// Cinematic light bloom from bottom — divine presence effect
const LightBloom = memo(function LightBloom({ isVisible }: { isVisible: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden gpu-accelerated-opacity" aria-hidden="true">
      {/* Main bloom - emanating from below */}
      <div
        className="absolute left-1/2"
        style={{
          bottom: '-20%',
          width: '150%',
          height: '85%',
          transform: `translateX(-50%) scale(${isVisible ? 1 : 0.85})`,
          background: `
            radial-gradient(ellipse 100% 80% at 50% 100%,
              rgba(var(--color-gold-rgb), 0.14) 0%,
              rgba(var(--color-gold-rgb), 0.07) 25%,
              rgba(var(--color-gold-rgb), 0.03) 50%,
              transparent 75%
            )
          `,
          opacity: isVisible ? 1 : 0,
          transition: 'all 3500ms var(--ease-out-expo)',
        }}
      />

      {/* Secondary breathing glow */}
      <div
        className="absolute left-1/2 animate-breathe"
        style={{
          bottom: '-8%',
          width: '90%',
          height: '55%',
          transform: 'translateX(-50%)',
          background: `
            radial-gradient(ellipse 80% 70% at 50% 100%,
              rgba(255, 245, 210, 0.08) 0%,
              rgba(var(--color-gold-rgb), 0.04) 40%,
              transparent 70%
            )
          `,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 4500ms var(--ease-out-expo)',
          transitionDelay: '600ms',
        }}
      />

      {/* Subtle divine rays */}
      <div
        className="absolute left-1/2"
        style={{
          bottom: '0',
          width: '220%',
          height: '100%',
          transform: 'translateX(-50%)',
          background: `
            conic-gradient(
              from 180deg at 50% 100%,
              transparent 0deg,
              rgba(var(--color-gold-rgb), 0.025) 12deg,
              transparent 24deg,
              transparent 48deg,
              rgba(var(--color-gold-rgb), 0.018) 60deg,
              transparent 72deg,
              transparent 96deg,
              rgba(var(--color-gold-rgb), 0.022) 108deg,
              transparent 120deg,
              transparent 144deg,
              rgba(var(--color-gold-rgb), 0.015) 156deg,
              transparent 168deg,
              transparent 180deg
            )
          `,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 5500ms var(--ease-out-expo)',
          transitionDelay: '1200ms',
        }}
      />
    </div>
  );
});

// Globe icon SVG
const GlobeIcon = memo(function GlobeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
});

// Language selector modal
const LanguageModal = memo(function LanguageModal({
  isOpen,
  onClose,
  currentLanguage,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 35, 0.98) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 175, 55, 0.08)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5">
          <h2
            id="language-modal-title"
            className="text-center"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-medium)',
              color: 'var(--color-text-primary)',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            {t('welcome.selectLanguage', currentLanguage)}
          </h2>
        </div>

        {/* Language grid */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
          <div className="grid grid-cols-2 gap-2">
            {languages.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    onSelect(lang.code);
                    onClose();
                  }}
                  className="relative px-4 py-3 rounded-xl text-left transition-all duration-200 hover:bg-white/[0.06] hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.08) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected
                      ? '1px solid rgba(212, 175, 55, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                  dir={lang.rtl ? 'rtl' : 'ltr'}
                >
                  {/* Native name */}
                  <span
                    className="block"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-base)',
                      fontWeight: isSelected ? 'var(--font-medium)' : 'var(--font-normal)',
                      color: isSelected ? 'var(--color-gold)' : 'var(--color-text-primary)',
                    }}
                  >
                    {lang.nativeName}
                  </span>
                  {/* English name below */}
                  <span
                    className="block mt-0.5"
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {lang.name}
                  </span>
                  {/* Selected checkmark */}
                  {isSelected && (
                    <span
                      className="absolute top-3 right-3"
                      style={{ color: 'var(--color-gold)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export function WelcomeScreen({ onBegin, language, onLanguageChange }: WelcomeScreenProps) {
  const [phase, setPhase] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpenLanguageModal = useCallback(() => setShowLanguageModal(true), []);
  const handleCloseLanguageModal = useCallback(() => setShowLanguageModal(false), []);

  useEffect(() => {
    // Cinematic staggered entrance — movie title sequence pacing
    const timers = [
      setTimeout(() => setPhase(1), 350),    // Void lifts
      setTimeout(() => setPhase(2), 1400),   // Light bloom rises
      setTimeout(() => setPhase(3), 2300),   // Logo materializes
      setTimeout(() => setPhase(4), 3200),   // Tagline fades in
      setTimeout(() => setPhase(5), 4100),   // Begin button appears
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onBegin();
    }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-labelledby="welcome-heading"
    >
      {/* Initial void overlay that fades out */}
      <div
        className="fixed inset-0 z-50 pointer-events-none gpu-accelerated-opacity"
        style={{
          background: 'var(--color-void)',
          opacity: phase >= 1 ? 0 : 1,
          transition: 'opacity var(--duration-epic) var(--ease-out-expo)',
        }}
        aria-hidden="true"
      />

      {/* Animated nebula with subtle color shift */}
      <NebulaBackground enableColorShift intensity={phase >= 2 ? 1 : 0.25} />

      {/* Divine light bloom */}
      <LightBloom isVisible={phase >= 2} />

      {/* Vignette for depth */}
      <div className="vignette" aria-hidden="true" />

      {/* Language selector button — top right */}
      <button
        onClick={handleOpenLanguageModal}
        className="absolute z-20 flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 hover:bg-white/10 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        style={{
          top: 'max(env(safe-area-inset-top, 16px), 16px)',
          right: 'max(env(safe-area-inset-right, 16px), 16px)',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'var(--color-text-secondary)',
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(-10px)',
        }}
        aria-label={t('welcome.selectLanguage', language)}
      >
        <GlobeIcon />
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-medium)',
            letterSpacing: '0.02em',
          }}
        >
          {getLanguage(language).nativeName}
        </span>
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        {/* Logo with divine glow */}
        <div
          className="gpu-accelerated"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0) scale(1)' : 'translateY(35px) scale(0.97)',
            transition: 'all var(--duration-cinematic) var(--ease-out-expo)',
          }}
        >
          <h1
            id="welcome-heading"
            className="flex items-baseline justify-center select-none"
          >
            {/* AI — Gold with strong glow */}
            <span
              className="text-gold animate-text-glow"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-hero)',
                fontWeight: 'var(--font-medium)',
                letterSpacing: 'var(--tracking-wide)',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.8), 0 0 40px rgba(212, 175, 55, 0.6), 0 0 80px rgba(212, 175, 55, 0.4), 0 0 120px rgba(212, 175, 55, 0.2)',
              }}
            >
              AI
            </span>
            {/* mighty — White with golden glow halo */}
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-hero)',
                fontWeight: 'var(--font-thin)',
                letterSpacing: '0.1em',
                color: 'var(--color-text-primary)',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3), 0 0 80px rgba(212, 175, 55, 0.2)',
              }}
            >
              mighty
            </span>
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="mt-10 md:mt-12 text-center text-caps gpu-accelerated-opacity"
          style={{
            opacity: phase >= 4 ? 0.55 : 0,
            transform: phase >= 4 ? 'translateY(0)' : 'translateY(18px)',
            transition: 'all var(--duration-cinematic) var(--ease-out-expo)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('welcome.tagline', language)}
        </p>

        {/* Generous breathing spacer */}
        <div className="h-[20vh] md:h-[24vh]" aria-hidden="true" />

        {/* Begin button — minimal, borderless, divine */}
        <button
          ref={buttonRef}
          onClick={onBegin}
          onKeyDown={handleKeyDown}
          aria-label="Begin your spiritual journey"
          className="group relative gpu-accelerated press-scale"
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transform: phase >= 5 ? 'translateY(0)' : 'translateY(22px)',
            transition: 'all var(--duration-cinematic) var(--ease-out-expo)',
          }}
        >
          {/* Glow halo on hover */}
          <span
            className="absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-[180%] h-[36px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, var(--color-gold-glow-strong) 0%, transparent 70%)',
              filter: 'blur(12px)',
              opacity: 0,
              transition: 'opacity var(--duration-slow) var(--ease-out-expo)',
            }}
            aria-hidden="true"
          />

          {/* Text */}
          <span
            className="relative block"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-normal)',
              letterSpacing: 'var(--tracking-caps)',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
              transition: 'letter-spacing var(--duration-normal) var(--ease-out-expo)',
            }}
          >
            {t('welcome.begin', language)}
          </span>

          {/* Underline accent */}
          <span
            className="absolute left-1/2 -translate-x-1/2 bottom-[-12px] h-[1px]"
            style={{
              width: '55%',
              background: 'linear-gradient(90deg, transparent, rgba(var(--color-gold-rgb), 0.55), transparent)',
              opacity: 0.5,
              transition: 'all var(--duration-slow) var(--ease-out-expo)',
            }}
            aria-hidden="true"
          />

          {/* Hover/focus styles via pseudo-class simulation */}
          <style>{`
            .group:hover > span:first-child,
            .group:focus-visible > span:first-child {
              opacity: 1 !important;
            }
            .group:hover > span:nth-child(2),
            .group:focus-visible > span:nth-child(2) {
              letter-spacing: 0.38em !important;
            }
            .group:hover > span:last-child,
            .group:focus-visible > span:last-child {
              width: 100% !important;
              opacity: 1 !important;
            }
          `}</style>
        </button>
      </div>

      {/* Top vignette gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-[28%] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(var(--color-void-rgb), 0.75) 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Language selector modal */}
      <LanguageModal
        isOpen={showLanguageModal}
        onClose={handleCloseLanguageModal}
        currentLanguage={language}
        onSelect={onLanguageChange}
      />
    </div>
  );
}
