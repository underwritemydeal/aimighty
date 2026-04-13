import { useState, useEffect } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import type { BeliefSystem } from '../../types';

interface BeliefWelcomeScreenProps {
  belief: BeliefSystem;
  userName?: string;
  onContinue: () => void;
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

export function BeliefWelcomeScreen({ belief, userName: _userName, onContinue }: BeliefWelcomeScreenProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Cinematic reveal sequence
    const timers = [
      setTimeout(() => setPhase(1), 300),    // Background appears
      setTimeout(() => setPhase(2), 1000),   // Message fades in
      setTimeout(() => setPhase(3), 4500),   // Auto-continue after pause
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
      className="relative w-full h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-label="Welcome message"
    >
      {/* Nebula background with belief-specific intensity */}
      <NebulaBackground intensity={phase >= 1 ? 0.8 : 0.2} />

      {/* Strong vignette for focus */}
      <div className="vignette vignette-strong" aria-hidden="true" />

      {/* Glow orb in center */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '300px',
          height: '300px',
          background: `radial-gradient(circle, ${belief.themeColor}25 0%, ${belief.themeColor}08 40%, transparent 70%)`,
          opacity: phase >= 1 ? 1 : 0,
          transform: `translateX(-50%) translateY(-50%) scale(${phase >= 1 ? 1 : 0.5})`,
          transition: 'all 2s var(--ease-out-expo)',
          filter: 'blur(40px)',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
        {/* Welcome message */}
        <blockquote
          className="text-center max-w-2xl gpu-accelerated"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 1.5s var(--ease-out-expo)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-light)',
              lineHeight: 'var(--leading-relaxed)',
              letterSpacing: 'var(--tracking-wide)',
              color: belief.themeColor,
              textShadow: `0 0 60px ${belief.themeColor}40, 0 0 120px ${belief.themeColor}20`,
            }}
          >
            {message}
          </p>
        </blockquote>

        {/* Subtle indicator */}
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2"
          style={{
            opacity: phase >= 2 ? 0.4 : 0,
            transition: 'opacity 1s var(--ease-out-expo)',
            transitionDelay: '1s',
          }}
        >
          <div
            className="w-6 h-6 rounded-full animate-pulse-gentle"
            style={{
              background: `radial-gradient(circle, ${belief.themeColor}40 0%, transparent 70%)`,
            }}
            aria-hidden="true"
          />
        </div>

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
