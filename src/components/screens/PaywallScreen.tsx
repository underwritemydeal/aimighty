import { useState, useEffect } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { t, type LanguageCode } from '../../data/translations';

interface PaywallScreenProps {
  onBack: () => void;
  language: LanguageCode;
}

export function PaywallScreen({ onBack, language }: PaywallScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleStartTrial = () => {
    // Non-functional placeholder - will wire Stripe in Phase 2
    alert('Free trial will be available soon. Thank you for your interest!');
  };

  const handleSubscribe = () => {
    // Non-functional placeholder - will wire Stripe in Phase 2
    alert('Subscription will be available soon. Thank you for your interest!');
  };

  // Get translated features
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
      <NebulaBackground intensity={0.6} />
      <div className="vignette" aria-hidden="true" />

      {/* Back button */}
      <nav
        className="fixed top-4 left-4 z-20 gpu-accelerated"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `opacity var(--duration-slow) var(--ease-out-expo)`,
        }}
      >
        <button
          onClick={onBack}
          aria-label={t('common.back', language)}
          className="group flex items-center gap-2 py-2 px-3 rounded-lg btn-ghost glass"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:-translate-x-1"
            style={{ color: 'var(--color-text-muted)' }}
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </nav>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md text-center gpu-accelerated"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
          }}
        >
          {/* Icon */}
          <div
            className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--color-gold-glow)',
              boxShadow: 'var(--shadow-glow-gold)',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          {/* Heading */}
          <h1
            id="paywall-heading"
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-light)',
              color: 'var(--color-text-primary)',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            {t('paywall.sessionEnded', language)}
          </h1>

          {/* Description */}
          <p
            className="mb-10"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-light)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            {t('paywall.continueJourney', language)}
          </p>

          {/* Pricing card */}
          <div
            className="glass rounded-2xl p-6 mb-6"
            style={{ boxShadow: 'var(--glass-shadow)' }}
          >
            {/* Price */}
            <div className="mb-6">
              <span
                className="text-gold"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-4xl)',
                  fontWeight: 'var(--font-medium)',
                }}
              >
                $4.99
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {t('paywall.perMonth', language)}
              </span>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8 text-left">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-gold)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="space-y-3">
              <button
                onClick={handleStartTrial}
                className="w-full py-4 rounded-xl hover-scale press-scale"
                style={{
                  background: 'var(--color-gold)',
                  color: 'var(--color-void)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  letterSpacing: 'var(--tracking-wider)',
                  transition: 'all var(--duration-normal) var(--ease-out-expo)',
                }}
              >
                {t('paywall.startTrial', language)}
              </button>

              <button
                onClick={handleSubscribe}
                className="w-full py-3 rounded-xl glass glass-interactive"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-normal)',
                  color: 'var(--color-text-secondary)',
                  transition: 'all var(--duration-normal) var(--ease-out-expo)',
                }}
              >
                {t('paywall.subscribe', language)}
              </button>
            </div>
          </div>

          {/* Cancel anytime notice */}
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            {t('paywall.cancelAnytime', language)}
          </p>
        </div>
      </div>
    </div>
  );
}
