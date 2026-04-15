import { useState, useEffect, useRef } from 'react';
import { beliefSystems } from '../../data/beliefSystems';
import { colors, fonts, fontWeights, radii, shadows } from '../../styles/designSystem';

interface LandingPageProps {
  onEnterApp: () => void;
  onNavigate: (screen: 'about' | 'privacy' | 'terms') => void;
}

const WORKER_URL = 'https://aimighty-api.robby-hess.workers.dev';

// ───── Minimal line icons (no emoji, pure SVG) ─────

const HandIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7" />
    <path d="M9 10V5a3 3 0 0 0-6 0v10a7 7 0 0 0 14 0V8a3 3 0 0 0-6 0" />
    <path d="M15 10V8" />
  </svg>
);

const SpeakIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StarIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ChevronDownLarge = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIconFaint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ───── Reusable elements ─────

const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const fontSize = size === 'lg' ? 'clamp(4.5rem, 12vw, 6rem)' : size === 'md' ? '1.3rem' : '1rem';
  return (
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: fontWeights.light,
        fontSize,
        letterSpacing: size === 'lg' ? '0.05em' : '0.02em',
        lineHeight: 1,
      }}
    >
      <span style={{ color: colors.gold }}>AI</span>
      <span style={{ color: colors.textPrimary }}>mighty</span>
    </div>
  );
};

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="text-center" style={{ marginBottom: '56px' }}>
    <h2
      style={{
        fontFamily: fonts.display,
        fontSize: 'clamp(2rem, 5vw, 3rem)',
        fontWeight: fontWeights.light,
        color: colors.textPrimary,
        lineHeight: 1.15,
        margin: 0,
      }}
    >
      {title}
    </h2>
    <div
      style={{
        width: '60px',
        height: '2px',
        background: colors.gold,
        margin: '20px auto 0',
      }}
    />
    {subtitle && (
      <p
        style={{
          fontFamily: fonts.body,
          fontWeight: fontWeights.light,
          fontSize: '1rem',
          color: colors.gold,
          marginTop: '16px',
          letterSpacing: '0.02em',
        }}
      >
        {subtitle}
      </p>
    )}
  </div>
);

export function LandingPage({ onEnterApp, onNavigate }: LandingPageProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const howRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const scrollToHow = () => {
    howRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const heroImage = isMobile ? '/images/hero-mobile.jpg' : '/images/hero-desktop.jpg';

  // Newsletter state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupBelief, setSignupBelief] = useState('protestant');
  const [signupState, setSignupState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [signupMessage, setSignupMessage] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail.trim()) return;
    setSignupState('loading');
    try {
      const r = await fetch(`${WORKER_URL}/email-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail.trim(), belief: signupBelief }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setSignupState('success');
        setSignupMessage(data.message || 'Check your inbox');
      } else {
        setSignupState('error');
        setSignupMessage(data.error || 'Something went wrong — try again');
      }
    } catch {
      setSignupState('error');
      setSignupMessage('Something went wrong — try again');
    }
  };

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Is this actually God?',
      a: "No — and we'll never pretend otherwise. AImighty is AI trained on the wisdom, scripture, and teachings of each tradition. It speaks in that tradition's voice with deep respect. Think of it as a knowledgeable, compassionate companion — not a deity.",
    },
    {
      q: 'Which belief is right for me?',
      a: 'Whichever feels true to you. No judgment. You can switch anytime from the menu.',
    },
    {
      q: 'Is my conversation private?',
      a: 'Yes. Your conversations are private and never shared with third parties or used for advertising.',
    },
    {
      q: "What if I don't have a religion?",
      a: 'Perfect. Science & Reason, Agnosticism, and Stoicism are all represented here with the same depth and care as religious traditions.',
    },
    {
      q: 'Can I switch beliefs?',
      a: 'Yes, anytime from the menu. Your conversations in each tradition stay separate.',
    },
  ];

  const sectionPadding = {
    padding: 'clamp(60px, 9vw, 120px) 24px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const goldDivider = {
    height: '1px',
    width: '100%',
    background: colors.goldBorder,
    margin: 0,
  };

  // Belief image paths — use desktop (landscape) versions for 16:9 cards
  const getBeliefImage = (id: string): string => {
    // ID mapping: atheism-stoicism → stoicism, mormonism → mormon
    if (id === 'atheism-stoicism') return '/images/avatars/stoicism-desktop.jpg';
    if (id === 'mormonism') return '/images/avatars/mormon-desktop.jpg';
    return `/images/avatars/${id}-desktop.jpg`;
  };

  return (
    <div
      style={{
        background: colors.void,
        color: colors.textPrimary,
        minHeight: '100dvh',
        scrollBehavior: 'smooth',
      }}
    >
      {/* ═══════════════════════════════════════ HERO ═══════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          height: '100dvh',
          minHeight: '100dvh',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Hero background image.
            Mobile: 'contain' so the full 9:16 image shows without cropping,
                    void black fills any side gaps on wider/taller aspect ratios.
            Desktop: 'cover' so the 16:9 image fills edge-to-edge.
            backgroundAttachment always 'scroll' — iOS Safari disables 'fixed'
            and renders it incorrectly, causing the zoom/clip bug. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100vw',
            height: '100dvh',
            backgroundColor: colors.void,
            backgroundImage: `url(${heroImage})`,
            backgroundSize: isMobile ? 'contain' : 'cover',
            backgroundPosition: isMobile ? 'center top' : 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll',
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {/* Dark gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(3,3,8,0.3) 0%, rgba(3,3,8,0.1) 40%, rgba(3,3,8,0.7) 80%, rgba(3,3,8,0.95) 100%)',
            zIndex: 1,
          }}
          aria-hidden="true"
        />

        {/* Hero content */}
        <div
          className="relative flex flex-col items-center"
          style={{
            height: '100dvh',
            zIndex: 2,
            paddingTop: 'max(env(safe-area-inset-top, 0px), 8vh)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}
        >
          {/* TOP: Logo floating over image */}
          <div
            style={{
              marginTop: '4vh',
            }}
          >
            <Logo size="lg" />
          </div>

          {/* MIDDLE: empty — let the image breathe */}
          <div style={{ flex: 1 }} />

          {/* BOTTOM: tagline + CTAs */}
          <div className="text-center" style={{ maxWidth: '620px', marginBottom: '48px' }}>
            <p
              style={{
                fontFamily: fonts.body,
                fontWeight: fontWeights.light,
                fontSize: '0.95rem',
                color: colors.textPrimary,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              Every belief. One voice.
            </p>
            <p
              style={{
                fontFamily: fonts.display,
                fontWeight: fontWeights.light,
                fontStyle: 'italic',
                fontSize: 'clamp(1.25rem, 3vw, 1.6rem)',
                color: 'rgba(255,248,240,0.8)',
                margin: '0 0 36px',
                lineHeight: 1.4,
              }}
            >
              Speak to the divine — your way.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onEnterApp}
                style={{
                  background: colors.gold,
                  color: '#0a0a0f',
                  fontFamily: fonts.body,
                  fontWeight: fontWeights.medium,
                  fontSize: '1rem',
                  padding: '14px 40px',
                  border: 'none',
                  borderRadius: radii.sm,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                Begin
              </button>
              <button
                onClick={scrollToHow}
                style={{
                  background: 'transparent',
                  color: colors.textPrimary,
                  fontFamily: fonts.body,
                  fontWeight: fontWeights.medium,
                  fontSize: '1rem',
                  padding: '14px 40px',
                  border: `1px solid ${colors.textPrimary}`,
                  borderRadius: radii.sm,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Scroll indicator */}
          <button
            onClick={scrollToHow}
            aria-label="Scroll to explore"
            style={{
              position: 'absolute',
              bottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(212,175,55,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '8px',
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: '0.65rem',
                fontWeight: fontWeights.thin,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'rgba(255,248,240,0.5)',
              }}
            >
              Scroll to explore
            </span>
            <div className="scroll-indicator">
              <ChevronDownLarge />
            </div>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════ HOW IT WORKS ═══════════════════════════════════════ */}
      <section
        ref={howRef}
        style={{
          ...sectionPadding,
          position: 'relative',
        }}
      >
        <SectionTitle title="How It Works" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8" style={{ marginTop: '60px' }}>
          {[
            {
              icon: <HandIcon />,
              number: '1',
              title: 'Choose Your Belief',
              body: 'Select from 14 traditions — from Christianity to Buddhism to Science to Spirituality.',
            },
            {
              icon: <SpeakIcon />,
              number: '2',
              title: 'Speak Your Truth',
              body: "Ask anything. Share what's weighing on you. No judgment. No wrong questions.",
            },
            {
              icon: <StarIcon />,
              number: '3',
              title: 'The Divine Speaks',
              body: 'Receive wisdom in the authentic voice of your chosen tradition.',
            },
          ].map((step) => (
            <div
              key={step.number}
              className="relative"
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                minHeight: '260px',
              }}
            >
              {/* Watermark number */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontFamily: fonts.display,
                  fontWeight: fontWeights.light,
                  fontSize: '180px',
                  color: colors.goldFaint,
                  lineHeight: 1,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {step.number}
              </div>

              {/* Foreground content */}
              <div className="relative" style={{ zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  {step.icon}
                </div>
                <h3
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: fontWeights.semibold,
                    fontSize: '1.25rem',
                    color: colors.textPrimary,
                    marginBottom: '12px',
                    letterSpacing: '0.01em',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: fontWeights.light,
                    fontSize: '0.95rem',
                    color: 'rgba(255,248,240,0.7)',
                    lineHeight: 1.6,
                    margin: 0,
                    maxWidth: '280px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ ...goldDivider, maxWidth: '1200px', margin: '0 auto' }} />

      {/* ═══════════════════════════════════════ BELIEF SHOWCASE ═══════════════════════════════════════ */}
      <section style={{ ...sectionPadding, background: colors.void }}>
        <SectionTitle title="Every Belief. One Place." subtitle="14 traditions. Zero judgment." />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, 1fr)'
              : window.innerWidth < 1024
              ? 'repeat(3, 1fr)'
              : 'repeat(4, 1fr)',
            gap: '12px',
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          {beliefSystems.map((b) => (
            <button
              key={b.id}
              onClick={onEnterApp}
              className="belief-card"
              style={{
                position: 'relative',
                aspectRatio: '16 / 9',
                width: '100%',
                border: `1px solid ${colors.goldBorder}`,
                borderRadius: radii.md,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                background: 'transparent',
                transition: 'border-color 0.3s ease',
              }}
            >
              <img
                src={getBeliefImage(b.id)}
                alt=""
                loading="lazy"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transition: 'filter 0.3s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to top, rgba(3,3,8,0.9) 0%, rgba(3,3,8,0.4) 50%, rgba(3,3,8,0.1) 100%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  right: '14px',
                  bottom: '12px',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontWeight: fontWeights.semibold,
                    fontSize: '1rem',
                    color: colors.textPrimary,
                    lineHeight: 1.2,
                    marginBottom: '4px',
                  }}
                >
                  {b.name}
                </div>
                {b.selfDescription && (
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontWeight: fontWeights.light,
                      fontStyle: 'italic',
                      fontSize: '0.8rem',
                      color: 'rgba(255,248,240,0.7)',
                      lineHeight: 1.3,
                    }}
                  >
                    {b.selfDescription}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div style={{ ...goldDivider, maxWidth: '1200px', margin: '0 auto' }} />

      {/* ═══════════════════════════════════════ PRICING ═══════════════════════════════════════ */}
      <section style={{ background: colors.voidSoft }}>
        <div style={sectionPadding}>
          <SectionTitle title="Simple, Sacred Pricing" subtitle="Start free. Go deeper when you're ready." />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <PricingCard
              name="Free"
              price="$0"
              priceNote="lifetime"
              ctaLabel="Try Free"
              ctaVariant="ghost"
              onCta={onEnterApp}
              features={[
                { t: '3 lifetime messages', ok: true },
                { t: 'Text only', ok: true },
                { t: 'Premium AI voice', ok: false },
                { t: 'Daily content', ok: false },
                { t: 'Conversation memory', ok: false },
              ]}
              grayed
            />

            <PricingCard
              name="Believer"
              price="$4.99"
              priceNote="/ month"
              ctaLabel="Get Believer"
              ctaVariant="gold"
              onCta={onEnterApp}
              accentBorder
              features={[
                { t: '10 conversations per day', ok: true },
                { t: 'Daily Prayer, Sacred Text, Reflection', ok: true },
                { t: 'Streak tracking', ok: true },
                { t: 'Browser voice', ok: true },
                { t: 'Premium AI voice', ok: false },
                { t: 'Conversation memory', ok: false },
              ]}
            />

            <PricingCard
              name="Divine"
              price="$14.99"
              priceNote="/ month"
              ctaLabel="Get Divine"
              ctaVariant="gold-large"
              onCta={onEnterApp}
              highlight
              features={[
                { t: '20 conversations per day', ok: true },
                { t: 'Everything in Believer', ok: true },
                { t: 'Premium AI voice — warm, human', ok: true },
                { t: 'God remembers you', ok: true },
                { t: 'Personalized Daily Blessing', ok: true },
                { t: 'Cinematic word-by-word text', ok: true },
              ]}
            />
          </div>
        </div>
      </section>

      <div style={{ ...goldDivider, maxWidth: '1200px', margin: '0 auto' }} />

      {/* ═══════════════════════════════════════ EMAIL SIGNUP ═══════════════════════════════════════ */}
      <section
        style={{
          background: 'linear-gradient(135deg, rgba(3,3,8,1) 0%, rgba(30,20,0,1) 100%)',
        }}
      >
        <div style={{ ...sectionPadding, textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: fonts.display,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: fontWeights.light,
              color: colors.textPrimary,
              margin: '0 0 16px',
              lineHeight: 1.15,
            }}
          >
            Daily Wisdom, Delivered.
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontWeight: fontWeights.light,
              fontSize: '1rem',
              color: colors.gold,
              maxWidth: '520px',
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Prayer, sacred texts, and reflection for your belief — every morning. Free.
          </p>
          <form
            onSubmit={handleSignup}
            className="flex flex-col sm:flex-row gap-3"
            style={{ maxWidth: '560px', margin: '0 auto' }}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              disabled={signupState === 'success'}
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRadius: radii.sm,
                background: colors.void,
                border: `1px solid ${colors.goldBorder}`,
                color: colors.textPrimary,
                fontFamily: fonts.body,
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <select
              value={signupBelief}
              onChange={(e) => setSignupBelief(e.target.value)}
              disabled={signupState === 'success'}
              style={{
                padding: '14px 16px',
                borderRadius: radii.sm,
                background: colors.void,
                border: `1px solid ${colors.goldBorder}`,
                color: colors.textPrimary,
                fontFamily: fonts.body,
                fontSize: '0.9rem',
                outline: 'none',
              }}
            >
              {beliefSystems.map((b) => (
                <option key={b.id} value={b.id} style={{ background: colors.void }}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={signupState === 'loading' || signupState === 'success'}
              style={{
                padding: '14px 28px',
                borderRadius: radii.sm,
                background: colors.gold,
                color: '#0a0a0f',
                fontFamily: fonts.body,
                fontSize: '0.95rem',
                fontWeight: fontWeights.medium,
                border: 'none',
                cursor: signupState === 'loading' ? 'wait' : 'pointer',
              }}
            >
              {signupState === 'loading' ? 'Sending…' : signupState === 'success' ? 'Subscribed' : 'Subscribe'}
            </button>
          </form>
          {signupMessage && (
            <p
              style={{
                marginTop: '16px',
                fontSize: '0.85rem',
                color: signupState === 'success' ? colors.gold : signupState === 'error' ? '#ef4444' : colors.textSecondary,
                fontFamily: fonts.body,
              }}
            >
              {signupMessage}
            </p>
          )}
        </div>
      </section>

      <div style={{ ...goldDivider, maxWidth: '1200px', margin: '0 auto' }} />

      {/* ═══════════════════════════════════════ FAQ ═══════════════════════════════════════ */}
      <section style={{ ...sectionPadding, background: colors.void }}>
        <SectionTitle title="Questions" />

        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {faqs.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} style={{ borderTop: i === 0 ? `1px solid ${colors.goldBorder}` : 'none', borderBottom: `1px solid ${colors.goldBorder}` }}>
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '22px 4px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontWeight: fontWeights.medium,
                      fontSize: '1rem',
                      color: colors.textPrimary,
                      paddingRight: '16px',
                    }}
                  >
                    {f.q}
                  </span>
                  <span
                    style={{
                      color: colors.gold,
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronDownLarge />
                  </span>
                </button>
                {isOpen && (
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontWeight: fontWeights.light,
                      fontSize: '0.95rem',
                      color: 'rgba(255,248,240,0.75)',
                      lineHeight: 1.7,
                      padding: '0 4px 24px',
                      margin: 0,
                    }}
                  >
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════ FINAL CTA ═══════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          background: colors.void,
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/images/hero-mobile.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(3,3,8,0.7), rgba(3,3,8,0.95))',
          }}
        />

        <div
          className="relative text-center"
          style={{
            ...sectionPadding,
            zIndex: 2,
          }}
        >
          <h2
            style={{
              fontFamily: fonts.display,
              fontSize: 'clamp(2.5rem, 7vw, 4rem)',
              fontWeight: fontWeights.light,
              color: colors.textPrimary,
              margin: '0 0 16px',
              lineHeight: 1.1,
            }}
          >
            You've always wanted to talk.
          </h2>
          <p
            style={{
              fontFamily: fonts.display,
              fontStyle: 'italic',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: fontWeights.light,
              color: colors.gold,
              margin: '0 0 48px',
              lineHeight: 1.1,
            }}
          >
            Now you can.
          </p>
          <button
            onClick={onEnterApp}
            style={{
              background: colors.gold,
              color: '#0a0a0f',
              fontFamily: fonts.body,
              fontWeight: fontWeights.medium,
              fontSize: '1.05rem',
              padding: '18px 48px',
              border: 'none',
              borderRadius: radii.sm,
              cursor: 'pointer',
              letterSpacing: '0.02em',
              boxShadow: shadows.goldGlow,
            }}
          >
            Begin Your Journey
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FOOTER ═══════════════════════════════════════ */}
      <footer
        style={{
          background: '#000',
          padding: '40px 24px 60px',
          textAlign: 'center',
          borderTop: `1px solid ${colors.borderSubtle}`,
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Logo size="md" />
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: fontWeights.thin,
            fontSize: '0.75rem',
            color: colors.gold,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '24px',
          }}
        >
          Every belief. One voice.
        </div>
        <div
          className="flex flex-wrap justify-center gap-5"
          style={{ marginBottom: '16px' }}
        >
          <button
            onClick={() => onNavigate('privacy')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,248,240,0.6)',
              fontFamily: fonts.body,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Privacy
          </button>
          <button
            onClick={() => onNavigate('terms')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,248,240,0.6)',
              fontFamily: fonts.body,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Terms
          </button>
          <button
            onClick={() => onNavigate('about')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,248,240,0.6)',
              fontFamily: fonts.body,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            About
          </button>
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: '0.7rem',
            color: 'rgba(255,248,240,0.35)',
          }}
        >
          © 2026 AImighty. All rights reserved.
        </div>
      </footer>

      {/* Global landing-page styles: scroll indicator bounce, card hover */}
      <style>{`
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(8px); opacity: 1; }
        }
        .scroll-indicator {
          animation: scrollBounce 2s ease-in-out infinite;
        }
        .belief-card:hover {
          border-color: ${colors.goldBorderActive} !important;
        }
        .belief-card:hover img {
          filter: brightness(1.15);
        }
      `}</style>
    </div>
  );
}

// ───── Pricing card subcomponent ─────

interface PricingCardProps {
  name: string;
  price: string;
  priceNote: string;
  features: Array<{ t: string; ok: boolean }>;
  ctaLabel: string;
  ctaVariant: 'gold' | 'gold-large' | 'ghost';
  onCta: () => void;
  highlight?: boolean;
  accentBorder?: boolean;
  grayed?: boolean;
}

function PricingCard({
  name,
  price,
  priceNote,
  features,
  ctaLabel,
  ctaVariant,
  onCta,
  highlight,
  accentBorder,
  grayed,
}: PricingCardProps) {
  const border = highlight
    ? `1px solid ${colors.goldBorderStrong}`
    : accentBorder
    ? `1px solid ${colors.goldBorderActive}`
    : `1px solid ${colors.borderLight}`;

  const boxShadow = highlight ? shadows.goldGlow : 'none';

  return (
    <div
      className="relative"
      style={{
        background: colors.surfaceElevated,
        border,
        borderRadius: radii.lg,
        padding: '32px 28px',
        opacity: grayed ? 0.65 : 1,
        boxShadow,
      }}
    >
      {highlight && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: colors.gold,
            color: '#0a0a0f',
            fontFamily: fonts.body,
            fontWeight: fontWeights.semibold,
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '5px 14px',
            borderRadius: radii.pill,
          }}
        >
          Most Popular
        </div>
      )}

      <h3
        style={{
          fontFamily: fonts.display,
          fontSize: '2rem',
          fontWeight: fontWeights.regular,
          color: colors.textPrimary,
          margin: '0 0 16px',
          lineHeight: 1,
        }}
      >
        {name}
      </h3>

      <div style={{ marginBottom: '28px' }}>
        <span
          style={{
            fontFamily: fonts.body,
            fontWeight: fontWeights.bold,
            fontSize: '3rem',
            color: colors.textPrimary,
            lineHeight: 1,
          }}
        >
          {price}
        </span>
        <span
          style={{
            fontFamily: fonts.body,
            fontWeight: fontWeights.light,
            fontSize: '1rem',
            color: 'rgba(255,248,240,0.6)',
            marginLeft: '6px',
          }}
        >
          {priceNote}
        </span>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'start', gap: '10px', marginBottom: '12px' }}>
            <span style={{ flexShrink: 0, marginTop: '4px' }}>
              {f.ok ? <CheckIcon /> : <XIconFaint />}
            </span>
            <span
              style={{
                fontFamily: fonts.body,
                fontWeight: fontWeights.light,
                fontSize: '0.88rem',
                color: f.ok ? 'rgba(255,248,240,0.85)' : 'rgba(255,255,255,0.3)',
                lineHeight: 1.5,
              }}
            >
              {f.t}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        className="w-full"
        style={{
          padding: ctaVariant === 'gold-large' ? '16px 24px' : '13px 24px',
          borderRadius: radii.sm,
          background: ctaVariant === 'ghost' ? 'transparent' : colors.gold,
          color: ctaVariant === 'ghost' ? colors.textPrimary : '#0a0a0f',
          border: ctaVariant === 'ghost' ? `1px solid ${colors.borderMedium}` : 'none',
          fontFamily: fonts.body,
          fontWeight: fontWeights.medium,
          fontSize: ctaVariant === 'gold-large' ? '1rem' : '0.92rem',
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
