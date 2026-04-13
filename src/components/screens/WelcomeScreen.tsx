import { useEffect, useState, useRef, memo } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';

interface WelcomeScreenProps {
  onBegin: () => void;
}

// Cinematic light bloom from bottom — divine presence effect
const LightBloom = memo(function LightBloom({ isVisible }: { isVisible: boolean }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden gpu-accelerated-opacity" aria-hidden="true">
      {/* Main bloom - emanating from below */}
      <div
        className="absolute left-1/2"
        style={{
          bottom: '-20%',
          width: '150%',
          height: '85%',
          transform: `translateX(-50%) scale(${isVisible ? 1 : 0.85})`,
          background: `
            radial-gradient(ellipse 100% 80% at 50% 100%,
              rgba(var(--color-gold-rgb), 0.14) 0%,
              rgba(var(--color-gold-rgb), 0.07) 25%,
              rgba(var(--color-gold-rgb), 0.03) 50%,
              transparent 75%
            )
          `,
          opacity: isVisible ? 1 : 0,
          transition: 'all 3500ms var(--ease-out-expo)',
        }}
      />

      {/* Secondary breathing glow */}
      <div
        className="absolute left-1/2 animate-breathe"
        style={{
          bottom: '-8%',
          width: '90%',
          height: '55%',
          transform: 'translateX(-50%)',
          background: `
            radial-gradient(ellipse 80% 70% at 50% 100%,
              rgba(255, 245, 210, 0.08) 0%,
              rgba(var(--color-gold-rgb), 0.04) 40%,
              transparent 70%
            )
          `,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 4500ms var(--ease-out-expo)',
          transitionDelay: '600ms',
        }}
      />

      {/* Subtle divine rays */}
      <div
        className="absolute left-1/2"
        style={{
          bottom: '0',
          width: '220%',
          height: '100%',
          transform: 'translateX(-50%)',
          background: `
            conic-gradient(
              from 180deg at 50% 100%,
              transparent 0deg,
              rgba(var(--color-gold-rgb), 0.025) 12deg,
              transparent 24deg,
              transparent 48deg,
              rgba(var(--color-gold-rgb), 0.018) 60deg,
              transparent 72deg,
              transparent 96deg,
              rgba(var(--color-gold-rgb), 0.022) 108deg,
              transparent 120deg,
              transparent 144deg,
              rgba(var(--color-gold-rgb), 0.015) 156deg,
              transparent 168deg,
              transparent 180deg
            )
          `,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 5500ms var(--ease-out-expo)',
          transitionDelay: '1200ms',
        }}
      />
    </div>
  );
});

export function WelcomeScreen({ onBegin }: WelcomeScreenProps) {
  const [phase, setPhase] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Cinematic staggered entrance — movie title sequence pacing
    const timers = [
      setTimeout(() => setPhase(1), 350),    // Void lifts
      setTimeout(() => setPhase(2), 1400),   // Light bloom rises
      setTimeout(() => setPhase(3), 2300),   // Logo materializes
      setTimeout(() => setPhase(4), 3200),   // Tagline fades in
      setTimeout(() => setPhase(5), 4100),   // Begin button appears
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onBegin();
    }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-labelledby="welcome-heading"
    >
      {/* Initial void overlay that fades out */}
      <div
        className="fixed inset-0 z-50 pointer-events-none gpu-accelerated-opacity"
        style={{
          background: 'var(--color-void)',
          opacity: phase >= 1 ? 0 : 1,
          transition: 'opacity var(--duration-epic) var(--ease-out-expo)',
        }}
        aria-hidden="true"
      />

      {/* Animated nebula with subtle color shift */}
      <NebulaBackground enableColorShift intensity={phase >= 2 ? 1 : 0.25} />

      {/* Divine light bloom */}
      <LightBloom isVisible={phase >= 2} />

      {/* Vignette for depth */}
      <div className="vignette" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        {/* Logo with divine glow */}
        <div
          className="gpu-accelerated"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0) scale(1)' : 'translateY(35px) scale(0.97)',
            transition: 'all var(--duration-cinematic) var(--ease-out-expo)',
          }}
        >
          <h1
            id="welcome-heading"
            className="flex items-baseline justify-center select-none"
          >
            {/* AI — Gold with strong glow */}
            <span
              className="text-gold animate-text-glow"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-hero)',
                fontWeight: 'var(--font-medium)',
                letterSpacing: 'var(--tracking-wide)',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.8), 0 0 40px rgba(212, 175, 55, 0.6), 0 0 80px rgba(212, 175, 55, 0.4), 0 0 120px rgba(212, 175, 55, 0.2)',
              }}
            >
              AI
            </span>
            {/* mighty — White with golden glow halo */}
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-hero)',
                fontWeight: 'var(--font-thin)',
                letterSpacing: '0.1em',
                color: 'var(--color-text-primary)',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3), 0 0 80px rgba(212, 175, 55, 0.2)',
              }}
            >
              mighty
            </span>
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="mt-10 md:mt-12 text-center text-caps gpu-accelerated-opacity"
          style={{
            opacity: phase >= 4 ? 0.55 : 0,
            transform: phase >= 4 ? 'translateY(0)' : 'translateY(18px)',
            transition: 'all var(--duration-cinematic) var(--ease-out-expo)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Every belief. One voice.
        </p>

        {/* Generous breathing spacer */}
        <div className="h-[20vh] md:h-[24vh]" aria-hidden="true" />

        {/* Begin button — minimal, borderless, divine */}
        <button
          ref={buttonRef}
          onClick={onBegin}
          onKeyDown={handleKeyDown}
          aria-label="Begin your spiritual journey"
          className="group relative gpu-accelerated press-scale"
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transform: phase >= 5 ? 'translateY(0)' : 'translateY(22px)',
            transition: 'all var(--duration-cinematic) var(--ease-out-expo)',
          }}
        >
          {/* Glow halo on hover */}
          <span
            className="absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-[180%] h-[36px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, var(--color-gold-glow-strong) 0%, transparent 70%)',
              filter: 'blur(12px)',
              opacity: 0,
              transition: 'opacity var(--duration-slow) var(--ease-out-expo)',
            }}
            aria-hidden="true"
          />

          {/* Text */}
          <span
            className="relative block"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-normal)',
              letterSpacing: 'var(--tracking-caps)',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
              transition: 'letter-spacing var(--duration-normal) var(--ease-out-expo)',
            }}
          >
            Begin
          </span>

          {/* Underline accent */}
          <span
            className="absolute left-1/2 -translate-x-1/2 bottom-[-12px] h-[1px]"
            style={{
              width: '55%',
              background: 'linear-gradient(90deg, transparent, rgba(var(--color-gold-rgb), 0.55), transparent)',
              opacity: 0.5,
              transition: 'all var(--duration-slow) var(--ease-out-expo)',
            }}
            aria-hidden="true"
          />

          {/* Hover/focus styles via pseudo-class simulation */}
          <style>{`
            .group:hover > span:first-child,
            .group:focus-visible > span:first-child {
              opacity: 1 !important;
            }
            .group:hover > span:nth-child(2),
            .group:focus-visible > span:nth-child(2) {
              letter-spacing: 0.38em !important;
            }
            .group:hover > span:last-child,
            .group:focus-visible > span:last-child {
              width: 100% !important;
              opacity: 1 !important;
            }
          `}</style>
        </button>
      </div>

      {/* Top vignette gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-[28%] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(var(--color-void-rgb), 0.75) 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
