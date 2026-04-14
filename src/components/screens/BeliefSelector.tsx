import { useState, useEffect, memo } from 'react';
import { beliefSystems, categoryLabels, type BeliefCategory, type CategorizedBeliefSystem } from '../../data/beliefSystems';
import { t, type LanguageCode } from '../../data/translations';
import type { BeliefSystem } from '../../types';

interface BeliefSelectorProps {
  onSelect: (belief: BeliefSystem) => void;
  onBack: () => void;
  language: LanguageCode;
  onSignOut: () => void;
}

// Preload image when card is hovered
function preloadImage(src: string) {
  const img = new Image();
  img.src = src;
}

// Belief card with Midjourney image background
const BeliefCard = memo(function BeliefCard({
  belief,
  index,
  isVisible,
  onSelect,
}: {
  belief: CategorizedBeliefSystem;
  index: number;
  isVisible: boolean;
  onSelect: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isHovered || isFocused;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => {
        setIsHovered(true);
        preloadImage(belief.imagePath);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={`Select ${belief.name} - ${belief.subtitle}. ${belief.description}`}
      className="w-full text-left belief-card"
      style={{
        height: '130px',
        backgroundImage: `url(${belief.imagePath})`,
        borderColor: isActive ? `${belief.accentColor}66` : 'rgba(255, 255, 255, 0.08)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.4s ease`,
        transitionDelay: `${150 + index * 40}ms`,
      }}
    >
      {/* Dark overlay that lightens on hover */}
      <div
        className="absolute inset-0"
        style={{
          background: isActive ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.55)',
          transition: 'background 0.4s ease',
        }}
        aria-hidden="true"
      />

      {/* Card content */}
      <div className="belief-card-content">
        {/* Top row: subtitle label */}
        <div className="flex justify-end">
          <span
            className="text-caps"
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              color: isActive ? belief.accentColor : 'rgba(255, 255, 255, 0.5)',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              transition: 'color 0.3s ease',
            }}
          >
            {belief.subtitle}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom: name and description */}
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#fff',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              marginBottom: '4px',
            }}
          >
            {belief.name}
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.6)',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              lineHeight: 1.4,
            }}
          >
            {belief.description}
          </p>
        </div>
      </div>
    </button>
  );
});

// Category section header
const CategoryHeader = memo(function CategoryHeader({
  category,
  isVisible,
  delay,
  isFirst,
  language,
}: {
  category: BeliefCategory;
  isVisible: boolean;
  delay: number;
  isFirst: boolean;
  language: LanguageCode;
}) {
  const categoryKey = `beliefs.${category}` as const;
  return (
    <div
      style={{
        marginTop: isFirst ? '0' : '32px',
        marginBottom: '16px',
        opacity: isVisible ? 0.4 : 0,
        transition: `opacity 0.5s ease`,
        transitionDelay: `${delay}ms`,
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.7rem',
          fontWeight: 300,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.4)',
          textAlign: 'center',
        }}
      >
        {t(categoryKey, language) || categoryLabels[category]}
      </h2>
    </div>
  );
});

// Thin line art logout icon
const LogoutIcon = memo(function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
});

// Back arrow icon
const BackIcon = memo(function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

export function BeliefSelector({ onSelect, onBack, language, onSignOut }: BeliefSelectorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Group beliefs by category
  const religious = beliefSystems.filter(b => b.category === 'religious');
  const spiritual = beliefSystems.filter(b => b.category === 'spiritual');
  const philosophical = beliefSystems.filter(b => b.category === 'philosophical');

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-labelledby="belief-heading"
    >
      {/* Subtle darkened background */}
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: 'url(/images/avatars/hero-mashup-desktop.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.1,
          filter: 'blur(20px)',
        }}
        aria-hidden="true"
      />

      {/* Dark overlay */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(3, 3, 8, 0.9)' }}
        aria-hidden="true"
      />

      {/* Scrollable content */}
      <div className="relative z-10 min-h-screen overflow-y-auto">
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            padding: '80px 20px 100px 20px',
          }}
        >
          {/* Back button */}
          <nav
            className="fixed top-4 left-4 z-20"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
              transition: `all 0.5s ease`,
            }}
          >
            <button
              onClick={onBack}
              aria-label={t('common.back', language)}
              className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            >
              <BackIcon />
            </button>
          </nav>

          {/* Sign out button */}
          <div
            className="fixed top-4 right-4 z-20"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
              transition: `all 0.5s ease`,
            }}
          >
            <button
              onClick={onSignOut}
              aria-label="Sign out"
              className="py-2 px-3 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255, 255, 255, 0.4)' }}
            >
              <LogoutIcon />
            </button>
          </div>

          {/* Header */}
          <header
            className="text-center"
            style={{
              marginBottom: '12px',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.6s ease`,
            }}
          >
            <h1
              id="belief-heading"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
                fontWeight: 300,
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ color: 'var(--color-text-primary)' }}>{t('beliefs.chooseYour', language)} </span>
              <span
                style={{
                  fontWeight: 500,
                  color: '#d4af37',
                  textShadow: '0 0 30px rgba(212,175,55,0.25), 0 0 60px rgba(212,175,55,0.1)',
                }}
              >
                {t('beliefs.path', language)}
              </span>
            </h1>
          </header>

          {/* Subtitle */}
          <p
            className="text-center"
            style={{
              marginBottom: '32px',
              opacity: isVisible ? 0.6 : 0,
              transition: `opacity 0.6s ease`,
              transitionDelay: '100ms',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              fontWeight: 300,
              letterSpacing: '0.05em',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            {t('beliefs.selectTradition', language)}
          </p>

          {/* Cards */}
          <div>
            {/* Religious Traditions */}
            <section role="region" aria-label={t('beliefs.religious', language)}>
              <CategoryHeader category="religious" isVisible={isVisible} delay={150} isFirst={true} language={language} />
              <div className="flex flex-col gap-3">
                {religious.map((belief, index) => (
                  <BeliefCard
                    key={belief.id}
                    belief={belief}
                    index={index}
                    isVisible={isVisible}
                    onSelect={() => onSelect(belief)}
                  />
                ))}
              </div>
            </section>

            {/* Spiritual Paths */}
            <section role="region" aria-label={t('beliefs.spiritual', language)}>
              <CategoryHeader category="spiritual" isVisible={isVisible} delay={400} isFirst={false} language={language} />
              <div className="flex flex-col gap-3">
                {spiritual.map((belief, index) => (
                  <BeliefCard
                    key={belief.id}
                    belief={belief}
                    index={index + religious.length}
                    isVisible={isVisible}
                    onSelect={() => onSelect(belief)}
                  />
                ))}
              </div>
            </section>

            {/* Philosophical Frameworks */}
            <section role="region" aria-label={t('beliefs.philosophical', language)}>
              <CategoryHeader category="philosophical" isVisible={isVisible} delay={550} isFirst={false} language={language} />
              <div className="flex flex-col gap-3">
                {philosophical.map((belief, index) => (
                  <BeliefCard
                    key={belief.id}
                    belief={belief}
                    index={index + religious.length + spiritual.length}
                    isVisible={isVisible}
                    onSelect={() => onSelect(belief)}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <p
            className="text-center"
            style={{
              marginTop: '32px',
              opacity: isVisible ? 0.3 : 0,
              transition: `opacity 0.6s ease`,
              transitionDelay: '800ms',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            {t('beliefs.trainedOn', language)}
          </p>
        </div>
      </div>
    </div>
  );
}
