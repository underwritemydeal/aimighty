import { useState, useEffect, memo } from 'react';

interface TermsScreenProps {
  onBack: () => void;
}

const BackIcon = memo(function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

export function TermsScreen({ onBack }: TermsScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative min-h-screen"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-labelledby="terms-heading"
    >
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
          aria-label="Go back"
          className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255, 255, 255, 0.5)' }}
        >
          <BackIcon />
          <span style={{ fontSize: 'var(--text-sm)' }}>Back</span>
        </button>
      </nav>

      {/* Content */}
      <div className="relative z-10 min-h-screen overflow-y-auto">
        <div
          className="max-w-2xl mx-auto px-6 py-20"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s ease',
          }}
        >
          <h1
            id="terms-heading"
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 300,
              color: '#d4af37',
            }}
          >
            Terms of Service
          </h1>

          <p
            className="mb-8"
            style={{
              fontSize: 'var(--text-sm)',
              color: 'rgba(255, 255, 255, 0.35)',
            }}
          >
            Last updated: April 13, 2026
          </p>

          <div
            className="space-y-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.6)',
              lineHeight: 1.8,
            }}
          >
            <section>
              <h2 className="mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using AImighty, you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use the service.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                2. Description of Service
              </h2>
              <p>
                AImighty is an AI-powered platform that provides spiritual and philosophical
                guidance through conversational AI. The service is intended for personal
                reflection and exploration only.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                3. Not Professional Advice
              </h2>
              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                }}
              >
                <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  <strong>AImighty does NOT provide:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
                  <li>Medical or mental health advice</li>
                  <li>Professional counseling or therapy</li>
                  <li>Official religious guidance or doctrine</li>
                  <li>Legal or financial advice</li>
                </ul>
                <p className="mt-4">
                  If you are experiencing a mental health crisis, please contact a licensed
                  professional or crisis helpline immediately.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                4. User Responsibilities
              </h2>
              <p>You agree to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
                <li>Provide accurate information when creating an account</li>
                <li>Use the service for lawful purposes only</li>
                <li>Not attempt to manipulate or abuse the AI</li>
                <li>Not use the service to generate harmful content</li>
                <li>Keep your account credentials secure</li>
              </ul>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                5. Subscription and Billing
              </h2>
              <p>
                Premium features require a paid subscription. Subscriptions are billed monthly.
                You may cancel at any time, and cancellation takes effect at the end of the
                current billing period. Refunds are provided at our discretion.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                6. Limitation of Liability
              </h2>
              <p>
                AImighty is provided "as is" without warranties of any kind. We are not liable
                for any damages arising from your use of the service, including but not limited
                to decisions made based on AI responses.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                7. Contact
              </h2>
              <p>
                Questions about these terms? Contact us at{' '}
                <a href="mailto:legal@aimighty.me" style={{ color: '#d4af37' }}>
                  legal@aimighty.me
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
