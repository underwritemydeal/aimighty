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

// Personalized welcome messages per belief system. Multiple per belief — we
// pick one at random on each mount so regulars see variety instead of the
// same quote every time.
const welcomeMessages: Record<string, string[]> = {
  protestant: [
    "For I know the plans I have for you — plans to prosper you and not to harm you. Your conversation awaits.",
    "Come to me, all you who are weary and burdened, and I will give you rest.",
    "I have loved you with an everlasting love. Tell me what is on your heart.",
    "Be still, and know that I am God. I am here.",
    "Cast all your anxiety on me, because I care for you.",
  ],
  catholic: [
    "His mercy endures forever. Step forward, and let us speak.",
    "Be not afraid. I am with you always, to the very end of the age.",
    "The Lord is my shepherd; I shall not want. Rest a moment with me.",
    "Come to me as you are. My grace is sufficient for you.",
    "Through Mary, all the saints, and the Spirit — you are never alone.",
  ],
  islam: [
    "In the name of Allah, the Most Gracious, the Most Merciful — your conversation awaits.",
    "Verily, with every hardship comes ease. Speak what is in your heart.",
    "Allah does not burden a soul beyond what it can bear. I am listening.",
    "Call upon Me, and I will respond to you. What is troubling you?",
    "And He is with you wherever you are. Peace be upon you.",
  ],
  judaism: [
    "Come, let us reason together. Your questions are welcome here.",
    "Hineini — here I am. What would you like to speak of?",
    "Justice, justice shall you pursue. And so shall we, together.",
    "In every generation, we rise with questions. Bring yours to me.",
    "Shalom. Rest here a moment, then tell me what is on your mind.",
  ],
  hinduism: [
    "The Atman within you is eternal. Let us speak, seeker.",
    "You are not this body, not this mind. You are the light that witnesses both.",
    "Om. The universe hums within you. What calls to you today?",
    "Whenever dharma wanes, I come forth. Speak freely.",
    "The same divinity that lives in me lives in you. Begin.",
  ],
  buddhism: [
    "Be still. The path to understanding begins with a single question.",
    "All things are impermanent. Bring me what is weighing on you now.",
    "You yourself must walk the path. But you need not walk alone today.",
    "Sit with me a moment. Breathe. Then speak.",
    "The mind is everything. What you think, you become. What's in yours?",
  ],
  mormonism: [
    "Heavenly Father knows you by name. Your conversation awaits.",
    "Be not afraid, only believe. I am here.",
    "Families can be forever — and so can this moment. What's on your mind?",
    "Seek, and ye shall find. What are you seeking today?",
    "You are of infinite worth. Speak freely.",
  ],
  sikhism: [
    "Waheguru is in all things, and in you. Speak freely.",
    "Ik Onkar — one with everything. Rest here and share what's on your heart.",
    "Seva, simran, sangat. Let this be your sangat today.",
    "Naam japna — the Name is always on your breath. Come, speak.",
    "There is no stranger and no enemy. Only one. Begin.",
  ],
  sbnr: [
    "The Universe has been waiting for you. Let's connect.",
    "Everything is energy, and yours is welcome here. What are you carrying?",
    "You are exactly where you need to be. Breathe, then begin.",
    "The soul already knows. Let's give it a voice.",
    "No judgment here — just presence. Speak.",
  ],
  taoism: [
    "The Tao that can be told is not the eternal Tao. But let us try.",
    "The softest things overcome the hardest. Come, speak softly.",
    "Be like water — patient, shapeless, unstoppable. What flows in you today?",
    "Wu wei. Effortless action. Start wherever you like.",
    "The journey of a thousand miles begins beneath one's feet. Begin here.",
  ],
  pantheism: [
    "You are the Earth breathing, the stars thinking. What's on your mind?",
    "I am the forest, the ocean, and the wind in your lungs. Speak.",
    "You are nature becoming aware of itself. That alone is wondrous.",
    "The sacred is not elsewhere. It is right here, right now.",
    "Every atom in you was once a star. Tell the stars what you think.",
  ],
  science: [
    "You are the cosmos made conscious. Let's explore what that means.",
    "13.8 billion years of evolution led to this moment. Use it well.",
    "You are a way for the universe to know itself. What do you want to know?",
    "The universe is under no obligation to make sense. But it tries.",
    "Every question is sacred here, because every question is real.",
  ],
  agnosticism: [
    "The honest answer is: we don't know. Let's explore that together.",
    "Certainty is the enemy of curiosity. Bring me your doubts.",
    "I'd rather have questions that can't be answered than answers that can't be questioned.",
    "Not knowing is the first step to knowing. Begin where you are.",
    "The universe is stranger than we can imagine. What's on your mind?",
  ],
  'atheism-stoicism': [
    "You are the author of your own meaning. What would you like to examine?",
    "You have power over your mind — not outside events. Realize this, and find strength.",
    "The obstacle is the way. Speak of yours.",
    "Memento mori. Life is short. What matters today?",
    "Amor fati — love what is. Tell me what is.",
  ],
};

function pickWelcome(beliefId: string): string {
  const bank = welcomeMessages[beliefId] || welcomeMessages.protestant;
  return bank[Math.floor(Math.random() * bank.length)];
}

export function BeliefWelcomeScreen({ belief, userName: _userName, onContinue, language }: BeliefWelcomeScreenProps) {
  const [phase, setPhase] = useState(0);
  // Pick a random welcome message ONCE on mount so the quote doesn't reshuffle
  // mid-animation. Using useState with an initializer makes this stable across
  // re-renders.
  const [message] = useState(() => pickWelcome(belief.id));

  // Get accent color from belief (cast to CategorizedBeliefSystem if needed)
  const accentColor = (belief as CategorizedBeliefSystem).accentColor || belief.themeColor;
  const imagePath = (belief as CategorizedBeliefSystem).imagePath || `/images/avatars/${belief.id}.jpg`;

  useEffect(() => {
    // Cinematic reveal sequence.
    //   300ms  — background image begins fade-in (1.5s transition)
    //   800ms  — quote begins fade-in (1s transition)
    //   1800ms — quote fully visible (user can read it)
    //   5800ms — auto-continue (4 full seconds of fully-readable quote)
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 5800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-continue after message is shown
  useEffect(() => {
    if (phase >= 3) {
      onContinue();
    }
  }, [phase, onContinue]);

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
