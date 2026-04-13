import { useState, useEffect, memo } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { beliefSystems, categoryLabels, type BeliefCategory } from '../../data/beliefSystems';
import type { BeliefSystem } from '../../types';

interface BeliefSelectorProps {
  onSelect: (belief: BeliefSystem) => void;
  onBack: () => void;
}

// Compact belief card for the grid
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
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `all var(--duration-slow) var(--ease-out-expo)`,
        transitionDelay: `${200 + index * 60}ms`,
      }}
    >
      <div
        className="relative text-center py-6 px-5 rounded-xl"
        style={{
          background: isActive ? 'var(--glass-bg-hover)' : 'var(--glass-bg)',
          backdropFilter: `blur(var(--glass-blur))`,
          WebkitBackdropFilter: `blur(var(--glass-blur))`,
          border: `1px solid ${isActive ? `${belief.themeColor}50` : 'var(--glass-border)'}`,
          boxShadow: isActive
            ? `0 0 40px ${belief.themeColor}18, inset 0 1px 0 rgba(255,255,255,0.04)`
            : 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.02)',
          transform: isActive ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
          transition: 'all var(--duration-normal) var(--ease-out-expo)',
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px]"
          style={{
            width: isActive ? '60%' : '0%',
            background: `linear-gradient(90deg, transparent, ${belief.themeColor}, transparent)`,
            boxShadow: isActive ? `0 0 15px ${belief.themeColor}60` : 'none',
            transition: 'all var(--duration-normal) var(--ease-out-expo)',
          }}
          aria-hidden="true"
        />

        {/* Title */}
        <h3
          className="mb-1 text-display"
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-normal)',
            color: isActive ? 'var(--color-text-primary)' : 'rgba(255,255,255,0.88)',
            letterSpacing: 'var(--tracking-wide)',
            transition: 'color var(--duration-fast)',
          }}
        >
          {belief.name}
        </h3>

        {/* Subtitle */}
        <p
          className="text-caps"
          style={{
            fontSize: '0.6rem',
            color: isActive ? belief.themeColor : 'var(--color-text-muted)',
            transition: 'color var(--duration-fast)',
          }}
        >
          {belief.subtitle}
        </p>

        {/* Focus indicator */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
          style={{
            width: isFocused ? '40%' : '0%',
            background: belief.themeColor,
            transition: 'all var(--duration-fast) var(--ease-out-expo)',
          }}
          aria-hidden="true"
        />
      </div>
    </button>
  );
});

// Category section header
const CategoryHeader = memo(function CategoryHeader({
  category,
  isVisible,
  delay,
}: {
  category: BeliefCategory;
  isVisible: boolean;
  delay: number;
}) {
  return (
    <div
      className="mb-4 gpu-accelerated-opacity"
      style={{
        opacity: isVisible ? 0.6 : 0,
        transition: `opacity var(--duration-slow) var(--ease-out-expo)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      <h2
        className="text-caps text-center"
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.25em',
        }}
      >
        {categoryLabels[category]}
      </h2>
    </div>
  );
});

export function BeliefSelector({ onSelect, onBack }: BeliefSelectorProps) {
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
        <div className="flex flex-col items-center px-4 md:px-6 py-12 md:py-16">
          {/* Back button */}
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
              aria-label="Go back to welcome screen"
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
                className="text-display group-hover:text-white/60 hidden sm:inline"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                  transition: 'color var(--duration-fast)',
                }}
              >
                Back
              </span>
            </button>
          </nav>

          {/* Header */}
          <header
            className="text-center mb-4 mt-8 gpu-accelerated"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
              transition: `all var(--duration-slower) var(--ease-out-expo)`,
            }}
          >
            <h1
              id="belief-heading"
              className="flex flex-wrap items-baseline justify-center gap-3 text-display"
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 'var(--font-light)',
                letterSpacing: 'var(--tracking-wide)',
              }}
            >
              <span style={{ color: 'var(--color-text-primary)' }}>Choose Your</span>
              <span className="text-gold" style={{ fontWeight: 'var(--font-normal)' }}>
                Path
              </span>
            </h1>
          </header>

          {/* Tagline */}
          <p
            className="text-center mb-8 text-caps gpu-accelerated-opacity"
            style={{
              opacity: isVisible ? 0.5 : 0,
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              transition: `opacity var(--duration-slower) var(--ease-out-expo)`,
              transitionDelay: '150ms',
            }}
          >
            Select the tradition that speaks to your soul
          </p>

          {/* Cards container */}
          <div className="w-full max-w-5xl">
            {/* Religious Traditions */}
            <section className="mb-10" role="region" aria-label="Religious Traditions">
              <CategoryHeader category="religious" isVisible={isVisible} delay={200} />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
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
            <section className="mb-10" role="region" aria-label="Spiritual Paths">
              <CategoryHeader category="spiritual" isVisible={isVisible} delay={500} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 max-w-2xl mx-auto">
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
            <section className="mb-8" role="region" aria-label="Philosophical Frameworks">
              <CategoryHeader category="philosophical" isVisible={isVisible} delay={700} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 max-w-2xl mx-auto">
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
            className="text-center mt-8 max-w-md gpu-accelerated-opacity"
            style={{
              opacity: isVisible ? 0.35 : 0,
              transition: `opacity var(--duration-slower) var(--ease-out-expo)`,
              transitionDelay: '1000ms',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-light)',
              color: 'var(--color-text-muted)',
              lineHeight: 'var(--leading-relaxed)',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            Trained on every sacred text, scripture, and tradition — available whenever you need guidance.
          </p>
        </div>
      </div>
    </div>
  );
}
