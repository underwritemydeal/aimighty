import { useState, useEffect, memo } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { beliefSystems, categoryLabels, type BeliefCategory } from '../../data/beliefSystems';
import { t, type LanguageCode } from '../../data/translations';
import type { BeliefSystem } from '../../types';

interface BeliefSelectorProps {
  onSelect: (belief: BeliefSystem) => void;
  onBack: () => void;
  language: LanguageCode;
  onSignOut: () => void;
}

// Belief card with glass morphism effect
const BeliefCard = memo(function BeliefCard({
  belief,
  index,
  isVisible,
  onSelect,
}: {
  belief: BeliefSystem;
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={`Select ${belief.name} - ${belief.subtitle}. ${belief.description}`}
      className="w-full text-left gpu-accelerated"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all var(--duration-slow) var(--ease-out-expo)`,
        transitionDelay: `${150 + index * 40}ms`,
      }}
    >
      <div
        className="relative"
        style={{
          padding: '20px',
          borderRadius: '16px',
          background: isActive ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${isActive ? `${belief.themeColor}60` : 'rgba(255, 255, 255, 0.08)'}`,
          boxShadow: isActive
            ? `0 0 30px ${belief.themeColor}15, inset 0 1px 0 rgba(255,255,255,0.05)`
            : 'inset 0 1px 0 rgba(255,255,255,0.03)',
          transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'all var(--duration-normal) var(--ease-out-expo)',
        }}
      >
        {/* Top glow line on active */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: isActive ? '50%' : '0%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${belief.themeColor}, transparent)`,
            boxShadow: isActive ? `0 0 10px ${belief.themeColor}` : 'none',
            transition: 'all var(--duration-normal) var(--ease-out-expo)',
          }}
          aria-hidden="true"
        />

        {/* Title and subtitle row */}
        <div className="flex items-baseline justify-between gap-3">
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-normal)',
              color: isActive ? 'var(--color-text-primary)' : 'rgba(255,255,255,0.85)',
              letterSpacing: 'var(--tracking-wide)',
              transition: 'color var(--duration-fast)',
            }}
          >
            {belief.name}
          </h3>
          <span
            className="text-caps shrink-0"
            style={{
              fontSize: '0.6rem',
              color: isActive ? belief.themeColor : 'var(--color-text-muted)',
              transition: 'color var(--duration-fast)',
            }}
          >
            {belief.subtitle}
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            marginTop: '8px',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-light)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          {belief.description}
        </p>

        {/* Focus indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: isFocused ? '30%' : '0%',
            height: '2px',
            borderRadius: '2px',
            background: belief.themeColor,
            transition: 'all var(--duration-fast) var(--ease-out-expo)',
          }}
          aria-hidden="true"
        />
      </div>
    </button>
  );
});

// Category section header - subtle divider style
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
      className="gpu-accelerated-opacity"
      style={{
        marginTop: isFirst ? '0' : '32px',
        marginBottom: '16px',
        opacity: isVisible ? 0.5 : 0,
        transition: `opacity var(--duration-slow) var(--ease-out-expo)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      <h2
        className="text-caps text-center"
        style={{
          fontSize: '0.65rem',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.2em',
        }}
      >
        {t(categoryKey, language) || categoryLabels[category]}
      </h2>
    </div>
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
      <NebulaBackground />
      <div className="vignette" aria-hidden="true" />

      {/* Scrollable content */}
      <div className="relative z-10 min-h-screen overflow-y-auto">
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            padding: '80px 24px 120px 24px',
          }}
        >
          {/* Back button - fixed */}
          <nav
            className="fixed top-4 left-4 z-20 gpu-accelerated"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
              transition: `all var(--duration-slow) var(--ease-out-expo)`,
            }}
          >
            <button
              onClick={onBack}
              aria-label={t('common.back', language)}
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
                className="text-display hidden sm:inline"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {t('common.back', language)}
              </span>
            </button>
          </nav>

          {/* Sign out button - fixed top right */}
          <div
            className="fixed top-4 right-4 z-20 gpu-accelerated"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
              transition: `all var(--duration-slow) var(--ease-out-expo)`,
            }}
          >
            <button
              onClick={onSignOut}
              aria-label="Sign out"
              className="py-2 px-3 rounded-lg btn-ghost glass"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
              }}
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
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>

          {/* Header */}
          <header
            className="text-center gpu-accelerated"
            style={{
              marginBottom: '12px',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: `all var(--duration-slower) var(--ease-out-expo)`,
            }}
          >
            <h1
              id="belief-heading"
              className="text-display"
              style={{
                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                fontWeight: 'var(--font-light)',
                letterSpacing: 'var(--tracking-wide)',
              }}
            >
              <span style={{ color: 'var(--color-text-primary)' }}>{t('beliefs.chooseYour', language)} </span>
              <span className="text-gold" style={{ fontWeight: 'var(--font-normal)' }}>
                {t('beliefs.path', language)}
              </span>
            </h1>
          </header>

          {/* Tagline */}
          <p
            className="text-center text-caps gpu-accelerated-opacity"
            style={{
              marginBottom: '32px',
              opacity: isVisible ? 0.4 : 0,
              fontSize: '0.65rem',
              color: 'var(--color-text-muted)',
              transition: `opacity var(--duration-slower) var(--ease-out-expo)`,
              transitionDelay: '100ms',
            }}
          >
            {t('beliefs.selectTradition', language)}
          </p>

          {/* Cards - single column on mobile, grid on tablet+ */}
          <div>
            {/* Religious Traditions */}
            <section role="region" aria-label={t('beliefs.religious', language)}>
              <CategoryHeader category="religious" isVisible={isVisible} delay={150} isFirst={true} language={language} />
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                }}
              >
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
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                }}
              >
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
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                }}
              >
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

          {/* Footer text */}
          <p
            className="text-center gpu-accelerated-opacity"
            style={{
              marginTop: '32px',
              opacity: isVisible ? 0.3 : 0,
              transition: `opacity var(--duration-slower) var(--ease-out-expo)`,
              transitionDelay: '800ms',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-light)',
              color: 'var(--color-text-muted)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            {t('beliefs.trainedOn', language)}
          </p>
        </div>
      </div>
    </div>
  );
}
