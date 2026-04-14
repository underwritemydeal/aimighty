import { useState, useEffect } from 'react';
import { t, type LanguageCode } from '../../data/translations';
import type { BeliefSystem } from '../../types';
import { type CategorizedBeliefSystem } from '../../data/beliefSystems';

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

  // Get accent color from belief (cast to CategorizedBeliefSystem if needed)
  const accentColor = (belief as CategorizedBeliefSystem).accentColor || belief.themeColor;
  const imagePath = (belief as CategorizedBeliefSystem).imagePath || `/images/avatars/${belief.id}.jpg`;

  useEffect(() => {
    // Cinematic reveal sequence
    const timers = [
      setTimeout(() => setPhase(1), 300),    // Background appears
      setTimeout(() => setPhase(2), 1000),   // Message fades in
      setTimeout(() => setPhase(3), 3500),   // Auto-continue after pause
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
        background: '#000',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
      role="main"
      aria-label="Welcome message"
    >
      {/* Full-screen belief image */}
      <div
        className="fixed inset-0 bg-image-cover"
        style={{
          backgroundImage: `url(${imagePath})`,
          backgroundPosition: 'center',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'opacity 1.5s ease-out',
        }}
        aria-hidden="true"
      />

      {/* Radial gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.2) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center h-full"
        style={{
          padding: '32px',
          paddingTop: 'env(safe-area-inset-top, 32px)',
          paddingBottom: 'env(safe-area-inset-bottom, 32px)',
        }}
      >
        {/* Welcome message in Cormorant Garamond */}
        <blockquote
          className="text-center"
          style={{
            maxWidth: '85%',
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(15px)',
            transition: 'all 1s ease-out',
          }}
        >
          <p
            className="text-divine"
            style={{
              fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
              color: 'rgba(255, 248, 240, 0.95)',
              textShadow: `0 0 20px ${accentColor}25, 0 0 40px ${accentColor}15`,
            }}
          >
            {message}
          </p>
        </blockquote>

        {/* Tap to continue hint */}
        <p
          className="absolute text-center"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom, 20px))',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: phase >= 2 ? 0.35 : 0,
            transition: 'opacity 1s ease-out',
            transitionDelay: '0.8s',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            color: 'rgba(255, 255, 255, 0.35)',
            textTransform: 'uppercase',
          }}
        >
          {t('common.continue', language)}
        </p>

        {/* Tap anywhere to skip */}
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
