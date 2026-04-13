import { useState, useEffect, memo } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { beliefSystems } from '../../data/beliefSystems';
import type { BeliefSystem } from '../../types';

interface BeliefSelectorProps {
  onSelect: (belief: BeliefSystem) => void;
  onBack: () => void;
}

// Premium glass-morphism belief card with container query support
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
    <div className="card-container">
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
          transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: `all var(--duration-slower) var(--ease-out-expo)`,
          transitionDelay: `${450 + index * 120}ms`,
        }}
      >
        <div
          className="card-content relative text-center rounded-2xl glass-interactive"
          style={{
            padding: 'var(--space-7) var(--space-6)',
            background: isActive ? 'var(--glass-bg-hover)' : 'var(--glass-bg)',
            backdropFilter: `blur(var(--glass-blur))`,
            WebkitBackdropFilter: `blur(var(--glass-blur))`,
            border: `1px solid ${isActive ? `${belief.themeColor}55` : 'var(--glass-border)'}`,
            boxShadow: isActive
              ? `0 0 60px ${belief.themeColor}20, 0 0 120px ${belief.themeColor}08, inset 0 1px 0 rgba(255,255,255,0.04)`
              : 'var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.02)',
            transform: isActive ? 'translateY(-8px) scale(1.015)' : 'translateY(0) scale(1)',
            transition: 'all var(--duration-slow) var(--ease-out-expo)',
          }}
        >
          {/* Top glow line on hover */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px]"
            style={{
              width: isActive ? '65%' : '0%',
              background: `linear-gradient(90deg, transparent, ${belief.themeColor}, transparent)`,
              boxShadow: isActive ? `0 0 25px ${belief.themeColor}70` : 'none',
              transition: 'all var(--duration-slow) var(--ease-out-expo)',
            }}
            aria-hidden="true"
          />

          {/* Title */}
          <h3
            className="card-title mb-3 text-display"
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-normal)',
              color: isActive ? 'var(--color-text-primary)' : 'rgba(255,255,255,0.88)',
              letterSpacing: 'var(--tracking-wide)',
              transition: 'color var(--duration-normal)',
            }}
          >
            {belief.name}
          </h3>

          {/* Subtitle */}
          <p
            className="mb-4 text-caps"
            style={{
              fontSize: 'var(--text-xs)',
              color: isActive ? belief.themeColor : 'var(--color-text-muted)',
              transition: 'color var(--duration-normal)',
            }}
          >
            {belief.subtitle}
          </p>

          {/* Description */}
          <p
            className="card-description text-display"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-light)',
              color: isActive ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
              lineHeight: 'var(--leading-relaxed)',
              transition: 'color var(--duration-normal)',
            }}
          >
            {belief.description}
          </p>

          {/* Bottom accent on focus for accessibility */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
            style={{
              width: isFocused ? '45%' : '0%',
              background: belief.themeColor,
              boxShadow: isFocused ? `0 0 10px ${belief.themeColor}` : 'none',
              transition: 'all var(--duration-normal) var(--ease-out-expo)',
            }}
            aria-hidden="true"
          />
        </div>
      </button>
    </div>
  );
});

export function BeliefSelector({ onSelect, onBack }: BeliefSelectorProps) {
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
      aria-labelledby="belief-heading"
    >
      <NebulaBackground />

      {/* Vignette */}
      <div className="vignette" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 py-16 md:py-20">
        {/* Back button */}
        <nav
          className="absolute top-6 left-6 gpu-accelerated"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
            transition: `all var(--duration-slow) var(--ease-out-expo)`,
          }}
        >
          <button
            onClick={onBack}
            aria-label="Go back to welcome screen"
            className="group flex items-center gap-2 py-2 px-3 -ml-3 rounded-lg btn-ghost"
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
              className="text-display group-hover:text-white/60"
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

        {/* Header — matches WelcomeScreen typography */}
        <header
          className="text-center mb-6 gpu-accelerated"
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
              fontSize: 'var(--text-4xl)',
              fontWeight: 'var(--font-light)',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            <span style={{ color: 'var(--color-text-primary)' }}>Choose Your</span>
            <span
              className="text-gold animate-text-glow"
              style={{ fontWeight: 'var(--font-normal)' }}
            >
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
            transitionDelay: '200ms',
          }}
        >
          Select the tradition that speaks to your soul
        </p>

        {/* Horizontal divider */}
        <div
          className="divider-gold w-full max-w-sm mb-14 md:mb-18 gpu-accelerated"
          style={{
            height: '1px',
            opacity: isVisible ? 0.7 : 0,
            transform: isVisible ? 'scaleX(1)' : 'scaleX(0)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
            transitionDelay: '250ms',
          }}
          aria-hidden="true"
        />

        {/* Cards grid */}
        <div className="w-full max-w-4xl" role="list" aria-label="Available belief systems">
          {/* Top row - 2 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            {beliefSystems.slice(0, 2).map((belief, index) => (
              <div key={belief.id} role="listitem">
                <BeliefCard
                  belief={belief}
                  index={index}
                  isVisible={isVisible}
                  onSelect={() => onSelect(belief)}
                />
              </div>
            ))}
          </div>

          {/* Middle row - 2 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            {beliefSystems.slice(2, 4).map((belief, index) => (
              <div key={belief.id} role="listitem">
                <BeliefCard
                  belief={belief}
                  index={index + 2}
                  isVisible={isVisible}
                  onSelect={() => onSelect(belief)}
                />
              </div>
            ))}
          </div>

          {/* Bottom row - 1 card centered */}
          {beliefSystems[4] && (
            <div className="flex justify-center">
              <div className="w-full md:w-1/2" role="listitem">
                <BeliefCard
                  belief={beliefSystems[4]}
                  index={4}
                  isVisible={isVisible}
                  onSelect={() => onSelect(beliefSystems[4])}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer text */}
        <p
          className="text-center mt-18 md:mt-22 max-w-md gpu-accelerated-opacity"
          style={{
            opacity: isVisible ? 0.38 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
            transitionDelay: '900ms',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-sm)',
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
  );
}
