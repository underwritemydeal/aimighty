import { useState, useEffect, memo } from 'react';
import { t, type LanguageCode } from '../../data/translations';
import { STRIPE_PRICE_IDS, startCheckout, isStripeConfigured } from '../../config/stripe';
import { getCurrentUser } from '../../services/auth';

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

export function PaywallScreen({ onBack, language }: PaywallScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const stripeReady = isStripeConfigured();

  const handleUpgrade = (tier: 'believer' | 'divine') => {
    if (!stripeReady) {
      alert('Payment coming soon. Sign up for the free newsletter in the meantime.');
      return;
    }
    const user = getCurrentUser();
    const userId = user?.id || '';
    const email = user?.email || '';
    const priceId =
      tier === 'believer'
        ? (billingCycle === 'annual' ? STRIPE_PRICE_IDS.believerAnnual : STRIPE_PRICE_IDS.believerMonthly)
        : (billingCycle === 'annual' ? STRIPE_PRICE_IDS.divineAnnual : STRIPE_PRICE_IDS.divineMonthly);
    startCheckout(priceId, userId, email);
  };

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterState('loading');
    try {
      const r = await fetch('https://aimighty-api.robby-hess.workers.dev/email-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      setNewsletterState(r.ok ? 'success' : 'error');
    } catch {
      setNewsletterState('error');
    }
  };

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
      <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-12 overflow-y-auto">
        <div
          className="w-full"
          style={{
            maxWidth: '920px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s ease',
          }}
        >
          <h1
            id="paywall-heading"
            className="text-center text-divine mb-2"
            style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: 'rgba(255,248,240,0.95)' }}
          >
            {t('paywall.sessionEnded', language)}
          </h1>
          <p
            className="text-center mb-10"
            style={{
              fontFamily: 'var(--font-body, Outfit)',
              fontSize: '0.95rem',
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            {t('paywall.continueJourney', language)}
          </p>

          {/* Monthly / Annual toggle */}
          <div className="flex justify-center mb-8">
            <div
              className="inline-flex rounded-full p-1"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {(['monthly', 'annual'] as const).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '999px',
                    background: billingCycle === cycle ? '#d4af37' : 'transparent',
                    color: billingCycle === cycle ? '#0a0a0f' : 'rgba(255,255,255,0.7)',
                    fontFamily: 'var(--font-body, Outfit)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Annual · Save 2 months'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* FREE */}
            <TierCard
              name="Free (Seeker)"
              price="$0"
              priceNote="lifetime"
              grayed
              features={[
                { t: '3 lifetime messages', ok: true },
                { t: 'Text only', ok: true },
                { t: 'No voice, no daily content', ok: false },
              ]}
              ctaLabel="Current"
              onCta={() => {}}
            />

            {/* BELIEVER */}
            <TierCard
              name="Believer"
              price={billingCycle === 'annual' ? '$47' : '$4.99'}
              priceNote={billingCycle === 'annual' ? '/ year' : '/ month'}
              features={[
                { t: '10 conversations per day', ok: true },
                { t: 'Daily Prayer, Sacred Text, Reflection', ok: true },
                { t: 'Conversation streak tracking', ok: true },
                { t: 'Text conversations (browser voice)', ok: true },
                { t: 'No premium AI voice', ok: false },
                { t: 'No conversation memory', ok: false },
              ]}
              ctaLabel={stripeReady ? 'Upgrade' : 'Coming Soon'}
              onCta={() => handleUpgrade('believer')}
            />

            {/* DIVINE */}
            <TierCard
              name="Divine"
              price={billingCycle === 'annual' ? '$119' : '$14.99'}
              priceNote={billingCycle === 'annual' ? '/ year' : '/ month'}
              highlight
              features={[
                { t: '20 conversations per day', ok: true },
                { t: 'Everything in Believer', ok: true },
                { t: 'Premium AI voice — warm, human, moving', ok: true },
                { t: 'God remembers your past conversations', ok: true },
                { t: 'Personalized Daily Blessing', ok: true },
                { t: 'Word-by-word text sync with voice', ok: true },
                { t: 'Cinematic full-screen experience', ok: true },
              ]}
              ctaLabel={stripeReady ? 'Upgrade' : 'Coming Soon'}
              onCta={() => handleUpgrade('divine')}
            />
          </div>

          {/* Newsletter fallback */}
          <div
            className="mt-12 text-center"
            style={{
              maxWidth: '560px',
              margin: '48px auto 0',
              padding: '24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                fontWeight: 400,
                color: 'rgba(255,248,240,0.9)',
                marginBottom: '8px',
              }}
            >
              Not ready to upgrade?
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body, Outfit)',
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.55)',
                marginBottom: '16px',
              }}
            >
              Get free daily wisdom in your inbox instead.
            </p>
            <form onSubmit={handleNewsletterSignup} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={newsletterState === 'success'}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,248,240,0.9)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={newsletterState === 'loading' || newsletterState === 'success'}
                style={{
                  padding: '12px 24px',
                  borderRadius: '999px',
                  background: '#d4af37',
                  color: '#0a0a0f',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  border: 'none',
                }}
              >
                {newsletterState === 'loading' ? 'Sending…' : newsletterState === 'success' ? 'Subscribed 🙏' : 'Subscribe'}
              </button>
            </form>
            {newsletterState === 'error' && (
              <p style={{ marginTop: '8px', fontSize: '0.75rem', color: '#ef4444' }}>
                Something went wrong — try again
              </p>
            )}
          </div>

          <p
            className="text-center mt-10"
            style={{
              fontFamily: 'var(--font-body, Outfit)',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.4)',
              lineHeight: 1.6,
              maxWidth: '620px',
              margin: '40px auto 0',
            }}
          >
            AImighty is an AI-powered spiritual companion. It is not affiliated with any
            religious institution and does not claim divine authority.
          </p>
        </div>
      </div>
    </div>
  );
}

interface TierFeature { t: string; ok: boolean }
interface TierCardProps {
  name: string;
  price: string;
  priceNote: string;
  features: TierFeature[];
  ctaLabel: string;
  onCta: () => void;
  highlight?: boolean;
  grayed?: boolean;
}
function TierCard({ name, price, priceNote, features, ctaLabel, onCta, highlight, grayed }: TierCardProps) {
  return (
    <div
      className="glass-card relative"
      style={{
        padding: '28px 24px',
        opacity: grayed ? 0.6 : 1,
        border: highlight ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.08)',
        background: highlight
          ? 'linear-gradient(160deg, rgba(212,175,55,0.12), rgba(3,3,8,0.85))'
          : 'rgba(3,3,8,0.7)',
      }}
    >
      {highlight && (
        <div
          className="absolute"
          style={{
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#d4af37',
            color: '#0a0a0f',
            fontFamily: 'var(--font-body, Outfit)',
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
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.2rem',
          fontWeight: 500,
          color: 'rgba(255,248,240,0.95)',
          marginBottom: '8px',
        }}
      >
        {name}
      </h3>
      <div className="mb-4">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: '#d4af37' }}>{price}</span>
        <span style={{ fontFamily: 'var(--font-body, Outfit)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginLeft: '6px' }}>{priceNote}</span>
      </div>
      <ul className="mb-6" style={{ listStyle: 'none', padding: 0 }}>
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2" style={{ marginBottom: '10px' }}>
            <span style={{ color: f.ok ? '#d4af37' : 'rgba(255,255,255,0.35)', fontSize: '0.9rem', lineHeight: 1.3 }}>
              {f.ok ? '✓' : '✕'}
            </span>
            <span style={{ fontFamily: 'var(--font-body, Outfit)', fontSize: '0.82rem', color: f.ok ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>
              {f.t}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCta}
        className="w-full rounded-xl transition-opacity"
        style={{
          height: '44px',
          background: highlight ? '#d4af37' : 'rgba(255,255,255,0.06)',
          color: highlight ? '#0a0a0f' : 'rgba(255,255,255,0.85)',
          border: highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
          fontFamily: 'var(--font-body, Outfit)',
          fontSize: '0.88rem',
          fontWeight: 500,
          opacity: grayed ? 0.6 : 1,
          cursor: grayed ? 'default' : 'pointer',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
