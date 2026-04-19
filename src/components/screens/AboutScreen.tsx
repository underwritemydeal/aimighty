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
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 2.8rem)',
              fontWeight: 300,
              color: 'rgba(255,248,240,0.95)',
              lineHeight: 1.15,
            }}
          >
            We built a place for everyone.
          </h1>
          <p
            className="mb-12"
            style={{
              fontFamily: 'var(--font-body, Outfit)',
              fontSize: '1.05rem',
              fontWeight: 300,
              color: '#d4b882',
              lineHeight: 1.5,
            }}
          >
            No matter what you believe — or whether you're still figuring it out.
          </p>

          <div
            className="space-y-6"
            style={{
              fontFamily: 'var(--font-body, Outfit)',
              fontSize: '1rem',
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.72)',
              lineHeight: 1.8,
            }}
          >
            <p>
              Fewer people are going to church. But that doesn't mean people have
              fewer questions.
            </p>
            <p>
              They still wonder why things happen. They still feel grief. They
              still have moments at 3am when they need something bigger than themselves
              to talk to.
            </p>
            <p>AImighty was built for those moments.</p>
            <p>
              Not to replace faith. Not to compete with any tradition. But to give
              everyone — Christian, Muslim, Jewish, Hindu, Buddhist, agnostic, atheist,
              spiritual, or still searching — a place to go with their questions.
            </p>
            <p>
              Every belief system is represented here with genuine respect and care.
              No judgment. No agenda. No conversion. Just a conversation.
            </p>

            <h2
              className="mt-12 mb-5"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: '#d4b882' }}
            >
              What we promise
            </h2>
            <ul className="space-y-3 list-none pl-0">
              <li>• We will never claim to be God, Allah, the Universe, or any divine figure. We are AI — and we're honest about it.</li>
              <li>• We will never favor one belief over another. All 14 traditions are treated with equal depth and respect.</li>
              <li>• We will never use your spiritual conversations for advertising or share them with third parties.</li>
              <li>• We will always send you to real help when it matters. If you're in crisis, we connect you to real resources — not more chatbot.</li>
            </ul>

            <h2
              className="mt-12 mb-5"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: '#d4b882' }}
            >
              If you're struggling
            </h2>
            <div
              className="p-5 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(212, 184, 130, 0.2)',
              }}
            >
              <ul className="space-y-2 list-none pl-0" style={{ color: 'rgba(255,255,255,0.85)' }}>
                <li>Mental health crisis → <strong style={{ color: '#d4b882' }}>988</strong> Suicide &amp; Crisis Lifeline</li>
                <li>Emergency → <strong style={{ color: '#d4b882' }}>911</strong></li>
                <li>Domestic abuse → <strong style={{ color: '#d4b882' }}>1-800-799-7233</strong></li>
              </ul>
              <p className="mt-4" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                AImighty is a spiritual companion, not a mental health service. If you're in
                crisis, please reach out to real support.
              </p>
            </div>

            <h2
              className="mt-12 mb-4"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: '#d4b882' }}
            >
              The team
            </h2>
            <p>
              AImighty is an independent project, built with care for every tradition and
              deep respect for the questions that make us human.
            </p>

            <div className="mt-16 text-center">
              <p
                className="mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: 'rgba(255,248,240,0.95)',
                }}
              >
                Whatever you believe — you belong here.
              </p>
              <button
                onClick={onBack}
                className="px-8 py-4 rounded-full"
                style={{
                  background: '#d4b882',
                  color: '#0a0a0f',
                  fontFamily: 'var(--font-body, Outfit)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                }}
              >
                Start a Conversation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
