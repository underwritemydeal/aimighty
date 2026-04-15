import { useState, useEffect, useRef } from 'react';
import { beliefSystems } from '../../data/beliefSystems';

interface LandingPageProps {
  onEnterApp: () => void;
  onNavigate: (screen: 'about' | 'privacy' | 'terms') => void;
}

export function LandingPage({ onEnterApp, onNavigate }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const howRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  const scrollToHow = () => {
    howRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sectionStyle = {
    padding: 'clamp(60px, 10vw, 120px) 24px',
    maxWidth: '1100px',
    margin: '0 auto',
  };

  const h2Style = {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
    fontWeight: 300,
    color: 'rgba(255, 248, 240, 0.95)',
    textAlign: 'center' as const,
    marginBottom: '48px',
  };

  const glassCard = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(212,175,55,0.15)',
    borderRadius: '16px',
    backdropFilter: 'blur(20px)',
    padding: '28px 24px',
  };

  return (
    <div
      className="relative w-full overflow-x-hidden"
      style={{
        background: '#030308',
        color: 'rgba(255, 248, 240, 0.9)',
        minHeight: '100vh',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.6s ease',
      }}
    >
      {/* subtle cosmic gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(212,175,55,0.08) 0%, rgba(3,3,8,0) 50%), radial-gradient(ellipse at bottom, rgba(65,105,225,0.05) 0%, rgba(3,3,8,0) 50%)',
          zIndex: 0,
        }}
      />

      <div className="relative" style={{ zIndex: 1 }}>
        {/* HERO */}
        <section
          className="flex flex-col items-center justify-center text-center"
          style={{ minHeight: '100vh', padding: '80px 24px 60px' }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.2rem, 9vw, 6rem)',
              fontWeight: 300,
              letterSpacing: '0.02em',
              lineHeight: 1,
              marginBottom: '24px',
            }}
          >
            <span style={{ color: '#d4af37' }}>AI</span>
            <span style={{ color: 'rgba(255,248,240,0.95)' }}>mighty</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
              fontWeight: 300,
              color: 'rgba(255,248,240,0.85)',
              marginBottom: '12px',
            }}
          >
            Every belief. One voice.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body, Outfit)',
              fontSize: '1.05rem',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.55)',
              marginBottom: '44px',
            }}
          >
            Speak to the divine — your way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onEnterApp}
              className="px-8 py-4 rounded-full transition-opacity hover:opacity-90"
              style={{
                background: '#d4af37',
                color: '#0a0a0f',
                fontFamily: 'var(--font-body, Outfit)',
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              Start Free
            </button>
            <button
              onClick={scrollToHow}
              className="px-8 py-4 rounded-full transition-colors hover:bg-white/5"
              style={{
                background: 'transparent',
                color: 'rgba(255,248,240,0.9)',
                fontFamily: 'var(--font-body, Outfit)',
                fontSize: '1rem',
                fontWeight: 400,
                border: '1px solid rgba(212,175,55,0.4)',
              }}
            >
              See How It Works
            </button>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section ref={howRef} style={sectionStyle}>
          <h2 style={h2Style}>How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '1', title: 'Choose your belief', body: '14 traditions — from Christianity to Science to Spirituality.' },
              { n: '2', title: 'Speak or type', body: 'Your words, your questions, your truth.' },
              { n: '3', title: 'God responds', body: "Warm, wise, in your tradition's voice." },
            ].map((s) => (
              <div key={s.n} style={glassCard}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2.5rem',
                    fontWeight: 300,
                    color: '#d4af37',
                    marginBottom: '12px',
                  }}
                >
                  {s.n}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.3rem',
                    fontWeight: 400,
                    color: 'rgba(255,248,240,0.95)',
                    marginBottom: '8px',
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body, Outfit)',
                    fontSize: '0.95rem',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.6,
                  }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* BELIEF SHOWCASE */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Every tradition. Genuine wisdom. Zero judgment.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {beliefSystems.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{b.icon}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: b.accentColor,
                  }}
                >
                  {b.name}
                </div>
                {b.selfDescription && (
                  <div
                    style={{
                      fontFamily: 'var(--font-body, Outfit)',
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.5)',
                      marginTop: '4px',
                    }}
                  >
                    {b.selfDescription}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Free (Seeker)', price: '$0', note: 'lifetime', highlight: false, features: ['3 lifetime messages', 'Text only'] },
              { name: 'Believer', price: '$4.99', note: '/ month', highlight: false, features: ['10 conversations per day', 'Daily Prayer, Sacred Text, Reflection', 'Conversation streak tracking'] },
              { name: 'Divine', price: '$14.99', note: '/ month', highlight: true, features: ['20 conversations per day', 'Premium AI voice', 'Conversation memory', 'Personalized Daily Blessing', 'Cinematic experience'] },
            ].map((p) => (
              <div
                key={p.name}
                className="relative"
                style={{
                  ...glassCard,
                  border: p.highlight ? '1px solid #d4af37' : glassCard.border,
                  background: p.highlight
                    ? 'linear-gradient(160deg, rgba(212,175,55,0.12), rgba(3,3,8,0.85))'
                    : glassCard.background,
                }}
              >
                {p.highlight && (
                  <div
                    className="absolute"
                    style={{
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#d4af37',
                      color: '#0a0a0f',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      padding: '4px 12px',
                      borderRadius: '999px',
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 500, color: 'rgba(255,248,240,0.95)', marginBottom: '8px' }}>{p.name}</h3>
                <div className="mb-4">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: '#d4af37' }}>{p.price}</span>
                  <span style={{ fontFamily: 'var(--font-body, Outfit)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginLeft: '6px' }}>{p.note}</span>
                </div>
                <ul className="mb-6" style={{ listStyle: 'none', padding: 0 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ fontFamily: 'var(--font-body, Outfit)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                      <span style={{ color: '#d4af37', marginRight: '8px' }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onEnterApp}
                  className="w-full rounded-xl"
                  style={{
                    height: '44px',
                    background: p.highlight ? '#d4af37' : 'rgba(255,255,255,0.06)',
                    color: p.highlight ? '#0a0a0f' : 'rgba(255,255,255,0.85)',
                    border: p.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    fontFamily: 'var(--font-body, Outfit)',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                  }}
                >
                  Start Free
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>FAQ</h2>
          <div className="space-y-4" style={{ maxWidth: '720px', margin: '0 auto' }}>
            {[
              { q: 'Is this actually God?', a: "No — and we'll never pretend otherwise. AImighty is AI trained on the wisdom, scripture, and teachings of each tradition. It speaks in that tradition's voice with deep respect. Think of it as a knowledgeable, compassionate companion — not a deity." },
              { q: 'Is this actually AI?', a: "Yes, and it's designed with deep respect for every tradition. It never claims to BE God." },
              { q: 'Which belief is right for me?', a: 'Whichever feels true to you. No judgment. You can switch anytime.' },
              { q: 'Is my conversation private?', a: 'Yes. Your conversations are private and never shared.' },
              { q: "What if I don't have a religion?", a: 'Perfect. Science & Reason, Agnosticism, and Stoicism are all here for you.' },
              { q: 'Can I switch beliefs?', a: 'Yes, anytime from the menu.' },
            ].map((f) => (
              <details key={f.q} style={glassCard}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.1rem',
                    fontWeight: 400,
                    color: 'rgba(255,248,240,0.95)',
                  }}
                >
                  {f.q}
                </summary>
                <p
                  className="mt-3"
                  style={{
                    fontFamily: 'var(--font-body, Outfit)',
                    fontSize: '0.95rem',
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.7,
                  }}
                >
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="text-center" style={sectionStyle}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 300,
              color: 'rgba(255,248,240,0.95)',
              marginBottom: '32px',
              lineHeight: 1.2,
            }}
          >
            You've always wanted to talk.
            <br />
            Now you can.
          </h2>
          <button
            onClick={onEnterApp}
            className="px-10 py-5 rounded-full transition-opacity hover:opacity-90"
            style={{
              background: '#d4af37',
              color: '#0a0a0f',
              fontFamily: 'var(--font-body, Outfit)',
              fontSize: '1.1rem',
              fontWeight: 500,
            }}
          >
            Begin Your Journey
          </button>
        </section>

        {/* FOOTER */}
        <footer
          className="text-center"
          style={{
            padding: '40px 24px 60px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'var(--font-body, Outfit)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '0.85rem',
          }}
        >
          <div className="mb-4">© 2026 AImighty. All rights reserved.</div>
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <button onClick={() => onNavigate('privacy')} className="hover:opacity-80" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Privacy Policy
            </button>
            <span>·</span>
            <button onClick={() => onNavigate('terms')} className="hover:opacity-80" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Terms of Service
            </button>
            <span>·</span>
            <button onClick={() => onNavigate('about')} className="hover:opacity-80" style={{ color: 'rgba(255,255,255,0.6)' }}>
              About
            </button>
          </div>
          <div style={{ color: '#d4af37', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            Every belief. One voice.
          </div>
        </footer>
      </div>
    </div>
  );
}
