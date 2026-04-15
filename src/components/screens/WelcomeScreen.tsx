import { useEffect, useState, useRef, memo, useCallback } from 'react';
import { languages, t, type LanguageCode, getLanguage } from '../../data/translations';

interface WelcomeScreenProps {
  onBegin: () => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onNavigate?: (screen: 'terms' | 'privacy') => void;
}

// Globe icon - thin elegant line art
const GlobeIcon = memo(function GlobeIcon() {
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

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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
        className="relative w-full max-w-md max-h-[80vh] overflow-hidden glass-card"
      >
        <div className="px-6 py-5 border-b border-white/5">
          <h2
            id="language-modal-title"
            className="text-center"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-medium)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('welcome.selectLanguage', currentLanguage)}
          </h2>
        </div>

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
                  className="relative px-4 py-3 rounded-xl text-left transition-all duration-200"
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
                  <span
                    className="block"
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: isSelected ? 'var(--font-medium)' : 'var(--font-normal)',
                      color: isSelected ? 'var(--color-gold)' : 'var(--color-text-primary)',
                    }}
                  >
                    {lang.nativeName}
                  </span>
                  <span
                    className="block mt-0.5"
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {lang.name}
                  </span>
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

export function WelcomeScreen({ onBegin, language, onLanguageChange, onNavigate }: WelcomeScreenProps) {
  const [phase, setPhase] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const handleOpenLanguageModal = useCallback(() => setShowLanguageModal(true), []);
  const handleCloseLanguageModal = useCallback(() => setShowLanguageModal(false), []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cinematic staggered entrance
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),    // Start fade in
      setTimeout(() => setPhase(2), 1600),   // Image visible
      setTimeout(() => setPhase(3), 2100),   // Logo appears
      setTimeout(() => setPhase(4), 2600),   // Tagline fades in
      setTimeout(() => setPhase(5), 3100),   // BEGIN button appears
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onBegin();
    }
  };

  // Background image based on viewport
  const bgImage = isMobile
    ? '/images/avatars/hero-mashup-mobile.jpg'
    : '/images/avatars/hero-mashup-desktop.jpg';

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: '#000' }}
      role="main"
      aria-labelledby="welcome-heading"
    >
      {/* Initial black overlay that fades out */}
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          background: '#000',
          opacity: phase >= 1 ? 0 : 1,
          transition: 'opacity 1.5s ease-out',
        }}
        aria-hidden="true"
      />

      {/* Hero background image */}
      <div
        className="fixed inset-0 bg-image-cover"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundPosition: 'center',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 1.5s ease-out',
        }}
        aria-hidden="true"
      />

      {/* Gradient overlay - darker at top/bottom for text, clear in middle for divine figure */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: isMobile
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 75%, rgba(0,0,0,0.7) 100%)'
            : 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.15) 80%, rgba(0,0,0,0.6) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Language selector button */}
      <button
        onClick={handleOpenLanguageModal}
        className="absolute z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300"
        style={{
          top: 'max(env(safe-area-inset-top, 16px), 16px)',
          right: 'max(env(safe-area-inset-right, 16px), 16px)',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.5)',
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'all 0.5s ease-out',
        }}
        aria-label={t('welcome.selectLanguage', language)}
      >
        <GlobeIcon />
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
          {getLanguage(language).code.toUpperCase()}
        </span>
      </button>

      {/* Content container - logo at top, BEGIN at bottom, middle clear for divine figure */}
      <div
        className="relative z-10 flex flex-col items-center justify-between h-full px-6"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
        }}
      >
        {/* TOP SECTION: Logo and tagline (top 20%) */}
        <div className="flex flex-col items-center pt-8">
          {/* Decorative line above logo */}
          <div
            style={{
              width: '80px',
              height: '1px',
              background: 'rgba(212, 175, 55, 0.3)',
              marginBottom: '16px',
              opacity: phase >= 3 ? 1 : 0,
              transition: 'opacity 0.8s ease-out',
            }}
            aria-hidden="true"
          />

          {/* Logo */}
          <div
            style={{
              opacity: phase >= 3 ? 1 : 0,
              transform: phase >= 3 ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.8s ease-out',
            }}
          >
            <h1
              id="welcome-heading"
              className="flex items-baseline justify-center select-none"
              style={{ letterSpacing: '0.08em' }}
            >
              {/* AI — Gold with glow */}
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 7vw, 4rem)',
                  fontWeight: 700,
                  color: '#d4af37',
                  textShadow: '0 0 30px rgba(212,175,55,0.5), 0 0 60px rgba(212,175,55,0.25), 0 0 100px rgba(212,175,55,0.1)',
                }}
              >
                AI
              </span>
              {/* mighty — Warm white */}
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 7vw, 4rem)',
                  fontWeight: 300,
                  color: 'rgba(255, 248, 240, 0.95)',
                }}
              >
                mighty
              </span>
            </h1>
          </div>

          {/* Tagline */}
          <p
            className="mt-3"
            style={{
              opacity: phase >= 4 ? 0.7 : 0,
              transform: phase >= 4 ? 'translateY(0)' : 'translateY(15px)',
              transition: 'all 0.6s ease-out',
              fontFamily: 'var(--font-display)',
              fontSize: '0.8rem',
              fontWeight: 300,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            {t('welcome.tagline', language)}
          </p>

          {/* Decorative line below tagline */}
          <div
            style={{
              width: '80px',
              height: '1px',
              background: 'rgba(212, 175, 55, 0.3)',
              marginTop: '12px',
              opacity: phase >= 4 ? 1 : 0,
              transition: 'opacity 0.6s ease-out',
            }}
            aria-hidden="true"
          />
        </div>

        {/* MIDDLE SECTION: Sacred space - divine figure visible (60%) */}
        <div className="flex-1" aria-hidden="true" />

        {/* BOTTOM SECTION: BEGIN button (at least 80px from bottom) */}
        <div style={{ paddingBottom: 'max(80px, env(safe-area-inset-bottom, 80px))' }}>
          <button
            onClick={onBegin}
            onKeyDown={handleKeyDown}
            aria-label="Begin your spiritual journey"
            className="group relative"
            style={{
              opacity: phase >= 5 ? 1 : 0,
              transform: phase >= 5 ? 'translateY(0)' : 'translateY(15px)',
              transition: 'all 0.6s ease-out',
            }}
          >
            {/* Text */}
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 400,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#d4af37',
                transition: 'letter-spacing 0.3s ease',
              }}
            >
              {t('welcome.begin', language)}
            </span>

            {/* Underline */}
            <span
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                bottom: '-8px',
                width: '120px',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)',
                transition: 'all 0.3s ease',
              }}
              aria-hidden="true"
            />

            {/* Hover effect via CSS */}
            <style>{`
              .group:hover span:first-child {
                letter-spacing: 0.38em;
              }
              .group:hover span:last-child {
                background: linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent);
              }
            `}</style>
          </button>

          {/* Terms and Privacy footer */}
          <div
            className="flex justify-center gap-4 mt-6"
            style={{
              opacity: phase >= 5 ? 0.4 : 0,
              transition: 'opacity 0.6s ease-out',
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
            }}
          >
            <button
              onClick={() => onNavigate?.('terms')}
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Terms
            </button>
            <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>·</span>
            <button
              onClick={() => onNavigate?.('privacy')}
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Privacy
            </button>
          </div>
        </div>
      </div>

      {/* Language modal */}
      <LanguageModal
        isOpen={showLanguageModal}
        onClose={handleCloseLanguageModal}
        currentLanguage={language}
        onSelect={onLanguageChange}
      />
    </div>
  );
}
