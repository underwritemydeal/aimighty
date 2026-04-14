import { useState, useEffect, memo } from 'react';
import { t, type LanguageCode } from '../../data/translations';

interface PaywallScreenProps {
  onBack: () => void;
  language: LanguageCode;
}

// Back icon
const BackIcon = memo(function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

// Check icon
const CheckIcon = memo(function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
});

export function PaywallScreen({ onBack, language }: PaywallScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleStartTrial = () => {
    alert('Free trial will be available soon. Thank you for your interest!');
  };

  const features = [
    t('paywall.unlimitedConversations', language),
    t('paywall.allBeliefs', language),
    t('paywall.voiceIO', language),
    t('paywall.history', language),
    t('paywall.priority', language),
  ];

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-labelledby="paywall-heading"
    >
      {/* Blurred background */}
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: 'url(/images/avatars/hero-mashup-desktop.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px) brightness(0.3)',
        }}
        aria-hidden="true"
      />

      {/* Dark overlay */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
        aria-hidden="true"
      />

      {/* Back button */}
      <nav
        className="fixed top-4 left-4 z-20"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        <button
          onClick={onBack}
          aria-label={t('common.back', language)}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255, 255, 255, 0.5)' }}
        >
          <BackIcon />
        </button>
      </nav>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s ease',
          }}
        >
          {/* Glass card */}
          <div
            className="glass-card text-center"
            style={{ padding: '40px 32px' }}
          >
            {/* Headline */}
            <h1
              id="paywall-heading"
              className="text-divine mb-3"
              style={{
                fontSize: '1.5rem',
                color: 'rgba(255, 248, 240, 0.9)',
              }}
            >
              {t('paywall.sessionEnded', language)}
            </h1>

            {/* Subtext */}
            <p
              className="mb-8"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.9rem',
                fontWeight: 300,
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {t('paywall.continueJourney', language)}
            </p>

            {/* Pricing */}
            <div className="mb-6">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#d4af37',
                }}
              >
                $4.99
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginLeft: '4px',
                }}
              >
                {t('paywall.perMonth', language)}
              </span>
            </div>

            {/* Yearly option */}
            <p
              className="mb-8"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              or $39.99/year — save 33%
            </p>

            {/* Features */}
            <ul className="space-y-3 mb-8 text-left">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <CheckIcon />
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-sm)',
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleStartTrial}
              className="w-full rounded-2xl transition-all duration-200 hover:opacity-90"
              style={{
                height: '56px',
                background: '#d4af37',
                color: '#0a0a0f',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: 500,
              }}
            >
              {t('paywall.startTrial', language)}
            </button>

            {/* Cancel notice */}
            <p
              className="mt-6"
              style={{
                fontSize: '0.8rem',
                color: 'rgba(255, 255, 255, 0.35)',
              }}
            >
              {t('paywall.cancelAnytime', language)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
