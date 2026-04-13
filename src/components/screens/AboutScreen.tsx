import { useState, useEffect } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';

interface AboutScreenProps {
  onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
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
      aria-labelledby="about-heading"
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
            id="about-heading"
            className="text-gold mb-8"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-light)',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            About AImighty
          </h1>

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
            <p>
              AImighty is an AI-powered spiritual guidance platform that allows you to have
              meaningful conversations tailored to your belief system. Whether you follow a
              religious tradition, consider yourself spiritual but not religious, or approach
              life through a philosophical lens, AImighty provides a space for reflection,
              guidance, and exploration.
            </p>

            <h2
              className="text-gold mt-10 mb-4"
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-normal)',
              }}
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
              className="text-gold mt-10 mb-4"
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-normal)',
              }}
            >
              Important Disclaimer
            </h2>
            <div
              className="p-4 rounded-xl glass"
              style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}
            >
              <p className="mb-4">
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  AImighty is an AI tool, not a replacement for:
                </strong>
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
              className="text-gold mt-10 mb-4"
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-normal)',
              }}
            >
              Not Affiliated
            </h2>
            <p>
              AImighty is not officially affiliated with, endorsed by, or representative of any
              religion, denomination, spiritual tradition, or philosophical school. The AI's
              responses are generated based on its training and should not be considered
              official doctrine or teaching from any tradition.
            </p>

            <h2
              className="text-gold mt-10 mb-4"
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-normal)',
              }}
            >
              Contact
            </h2>
            <p>
              Questions or feedback? Reach out to us at{' '}
              <a href="mailto:hello@aimighty.me" className="text-gold hover:underline">
                hello@aimighty.me
              </a>
            </p>
            <p className="mt-4">
              Follow us on Instagram:{' '}
              <a
                href="https://instagram.com/aimightyapp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
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
