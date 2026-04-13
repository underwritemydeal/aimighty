import { useState, useEffect } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';

interface PrivacyScreenProps {
  onBack: () => void;
}

export function PrivacyScreen({ onBack }: PrivacyScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-labelledby="privacy-heading"
    >
      <NebulaBackground intensity={0.5} />
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
          aria-label="Go back"
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
          <span
            className="text-display"
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            Back
          </span>
        </button>
      </nav>

      {/* Content */}
      <div className="relative z-10 min-h-screen overflow-y-auto">
        <div
          className="max-w-2xl mx-auto px-6 py-20 gpu-accelerated"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
          }}
        >
          <h1
            id="privacy-heading"
            className="text-gold mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-light)',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            Privacy Policy
          </h1>

          <p
            className="mb-8"
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            Last updated: April 13, 2026
          </p>

          <div
            className="space-y-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-light)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            <section>
              <h2
                className="text-gold mb-4"
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-normal)',
                }}
              >
                Information We Collect
              </h2>
              <p>
                When you use AImighty, we collect the following information:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
                <li>Email address (for account creation and authentication)</li>
                <li>Conversation data (messages you send and receive)</li>
                <li>Usage data (which belief systems you interact with)</li>
                <li>Device information (browser type, operating system)</li>
              </ul>
            </section>

            <section>
              <h2
                className="text-gold mt-10 mb-4"
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-normal)',
                }}
              >
                How We Use Your Information
              </h2>
              <p>
                We use your information to:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
                <li>Provide and improve our services</li>
                <li>Personalize your experience</li>
                <li>Process payments (if you subscribe)</li>
                <li>Send important updates about the service</li>
                <li>Respond to your inquiries</li>
              </ul>
            </section>

            <section>
              <h2
                className="text-gold mt-10 mb-4"
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-normal)',
                }}
              >
                Data Security
              </h2>
              <p>
                We implement industry-standard security measures to protect your data.
                Your conversations are encrypted in transit and at rest. We do not sell
                your personal information to third parties.
              </p>
            </section>

            <section>
              <h2
                className="text-gold mt-10 mb-4"
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-normal)',
                }}
              >
                Your Rights
              </h2>
              <p>
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
                <li>Access your personal data</li>
                <li>Request deletion of your data</li>
                <li>Export your conversation history</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2
                className="text-gold mt-10 mb-4"
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-normal)',
                }}
              >
                Contact Us
              </h2>
              <p>
                For privacy-related inquiries, contact us at{' '}
                <a href="mailto:privacy@aimighty.me" className="text-gold hover:underline">
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
