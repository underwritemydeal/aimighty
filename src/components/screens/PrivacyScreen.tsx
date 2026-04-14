import { useState, useEffect, memo } from 'react';

interface PrivacyScreenProps {
  onBack: () => void;
}

const BackIcon = memo(function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

export function PrivacyScreen({ onBack }: PrivacyScreenProps) {
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
      aria-labelledby="privacy-heading"
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
            id="privacy-heading"
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 300,
              color: '#d4af37',
            }}
          >
            Privacy Policy
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
                Information We Collect
              </h2>
              <p>When you use AImighty, we collect the following information:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
                <li>Email address (for account creation and authentication)</li>
                <li>Conversation data (messages you send and receive)</li>
                <li>Usage data (which belief systems you interact with)</li>
                <li>Device information (browser type, operating system)</li>
              </ul>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                How We Use Your Information
              </h2>
              <p>We use your information to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
                <li>Provide and improve our services</li>
                <li>Personalize your experience</li>
                <li>Process payments (if you subscribe)</li>
                <li>Send important updates about the service</li>
                <li>Respond to your inquiries</li>
              </ul>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                Data Security
              </h2>
              <p>
                We implement industry-standard security measures to protect your data.
                Your conversations are encrypted in transit and at rest. We do not sell
                your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                Your Rights
              </h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
                <li>Access your personal data</li>
                <li>Request deletion of your data</li>
                <li>Export your conversation history</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}>
                Contact Us
              </h2>
              <p>
                For privacy-related inquiries, contact us at{' '}
                <a href="mailto:privacy@aimighty.me" style={{ color: '#d4af37' }}>
                  privacy@aimighty.me
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
