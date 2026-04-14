import { useState, useEffect, memo } from 'react';

interface AboutScreenProps {
  onBack: () => void;
}

const BackIcon = memo(function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

export function AboutScreen({ onBack }: AboutScreenProps) {
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
      aria-labelledby="about-heading"
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
            id="about-heading"
            className="mb-8"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 300,
              color: '#d4af37',
            }}
          >
            About AImighty
          </h1>

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
            <p>
              AImighty is an AI-powered spiritual guidance platform that allows you to have
              meaningful conversations tailored to your belief system. Whether you follow a
              religious tradition, consider yourself spiritual but not religious, or approach
              life through a philosophical lens, AImighty provides a space for reflection,
              guidance, and exploration.
            </p>

            <h2
              className="mt-10 mb-4"
              style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}
            >
              How It Works
            </h2>
            <p>
              Our AI has been trained on sacred texts, scriptures, philosophical works, and
              spiritual teachings from traditions around the world. When you select a belief
              system, the AI adopts the perspective, wisdom, and tone appropriate to that
              tradition, providing responses that honor and reflect its teachings.
            </p>

            <h2
              className="mt-10 mb-4"
              style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}
            >
              Important Disclaimer
            </h2>
            <div
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
              }}
            >
              <p className="mb-4" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <strong>AImighty is an AI tool, not a replacement for:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Professional religious or spiritual leaders</li>
                <li>Licensed therapists or counselors</li>
                <li>Medical professionals</li>
                <li>Your own community of faith</li>
              </ul>
              <p className="mt-4">
                If you are experiencing a crisis, please reach out to a qualified professional
                or call a crisis helpline in your area.
              </p>
            </div>

            <h2
              className="mt-10 mb-4"
              style={{ fontSize: 'var(--text-xl)', fontWeight: 400, color: '#d4af37' }}
            >
              Contact
            </h2>
            <p>
              Questions or feedback? Reach out to us at{' '}
              <a href="mailto:hello@aimighty.me" style={{ color: '#d4af37' }}>
                hello@aimighty.me
              </a>
            </p>
            <p className="mt-4">
              Follow us on Instagram:{' '}
              <a
                href="https://instagram.com/aimightyapp"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#d4af37' }}
              >
                @aimightyapp
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
