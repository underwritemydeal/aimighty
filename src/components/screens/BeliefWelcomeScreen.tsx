import { useState, useEffect } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { t, type LanguageCode } from '../../data/translations';
import type { BeliefSystem } from '../../types';

interface BeliefWelcomeScreenProps {
  belief: BeliefSystem;
  userName?: string;
  onContinue: () => void;
  language: LanguageCode;
}

// Personalized welcome messages per belief system
const welcomeMessages: Record<string, string> = {
  protestant: "For I know the plans I have for you — plans to prosper you and not to harm you. Your conversation awaits.",
  catholic: "His mercy endures forever. Step forward, and let us speak.",
  islam: "In the name of Allah, the Most Gracious, the Most Merciful — your conversation awaits.",
  judaism: "Come, let us reason together. Your questions are welcome here.",
  hinduism: "The Atman within you is eternal. Let us speak, seeker.",
  buddhism: "Be still. The path to understanding begins with a single question.",
  mormonism: "Heavenly Father knows you by name. Your conversation awaits.",
  sikhism: "Waheguru is in all things, and in you. Speak freely.",
  sbnr: "The Universe has been waiting for you. Let's connect.",
  taoism: "The Tao that can be told is not the eternal Tao. But let us try.",
  pantheism: "You are the Earth breathing, the stars thinking. What's on your mind?",
  science: "You are the cosmos made conscious. Let's explore what that means.",
  agnosticism: "The honest answer is: we don't know. Let's explore that together.",
  atheism: "You are the author of your own meaning. What would you like to examine?",
};

export function BeliefWelcomeScreen({ belief, userName: _userName, onContinue, language }: BeliefWelcomeScreenProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Cinematic reveal sequence — 2-3 second pause
    const timers = [
      setTimeout(() => setPhase(1), 300),    // Background appears
      setTimeout(() => setPhase(2), 800),    // Message fades in
      setTimeout(() => setPhase(3), 3500),   // Auto-continue after 2.7s pause
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-continue after message is shown
  useEffect(() => {
    if (phase >= 3) {
      onContinue();
    }
  }, [phase, onContinue]);

  const message = welcomeMessages[belief.id] || welcomeMessages.protestant;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: 'var(--color-void)',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
      role="main"
      aria-label="Welcome message"
    >
      {/* Nebula background with belief-specific intensity */}
      <NebulaBackground intensity={phase >= 1 ? 0.8 : 0.2} />

      {/* Strong vignette for focus */}
      <div className="vignette vignette-strong" aria-hidden="true" />

      {/* Glow orb in center */}
      <div
        className="absolute left-1/2"
        style={{
          top: '35%',
          width: '280px',
          height: '280px',
          background: `radial-gradient(circle, ${belief.themeColor}30 0%, ${belief.themeColor}10 40%, transparent 70%)`,
          opacity: phase >= 1 ? 1 : 0,
          transform: `translateX(-50%) translateY(-50%) scale(${phase >= 1 ? 1 : 0.5})`,
          transition: 'all 2s var(--ease-out-expo)',
          filter: 'blur(50px)',
        }}
        aria-hidden="true"
      />

      {/* Content — centered with generous padding */}
      <div
        className="relative z-10 flex flex-col items-center justify-center h-full"
        style={{
          padding: '32px',
          paddingTop: 'env(safe-area-inset-top, 32px)',
          paddingBottom: 'env(safe-area-inset-bottom, 32px)',
        }}
      >
        {/* Welcome message — centered, belief accent color */}
        <blockquote
          className="text-center gpu-accelerated"
          style={{
            maxWidth: '540px',
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 1.2s var(--ease-out-expo)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 5vw, 1.75rem)',
              fontWeight: 'var(--font-light)',
              lineHeight: '1.6',
              letterSpacing: 'var(--tracking-wide)',
              color: belief.themeColor,
              textShadow: `0 0 40px ${belief.themeColor}35, 0 0 80px ${belief.themeColor}20`,
            }}
          >
            {message}
          </p>
        </blockquote>

        {/* Tap to skip hint */}
        <p
          className="absolute text-center"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom, 20px))',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: phase >= 2 ? 0.35 : 0,
            transition: 'opacity 1s var(--ease-out-expo)',
            transitionDelay: '0.8s',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {t('common.continue', language)}
        </p>

        {/* Skip button (tap anywhere) */}
        <button
          onClick={onContinue}
          className="absolute inset-0 cursor-pointer"
          aria-label="Continue to conversation"
        >
          <span className="sr-only">Tap to continue</span>
        </button>
      </div>
    </div>
  );
}
