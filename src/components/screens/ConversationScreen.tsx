import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { sendMessage, type Message } from '../../services/claudeApi';
import { speakWithOpenAI, stop as stopSpeaking, initAudio, setVoiceEnabled, isVoiceEnabled, unlockMobileAudio } from '../../services/openaiTTS';
import { startListening, stopListening, isSupported as isSpeechSupported } from '../../services/speechInput';
import { incrementMessageCount, hasReachedFreeLimit, getRemainingFreeMessages } from '../../services/auth';
import { t, type LanguageCode } from '../../data/translations';
import { type CategorizedBeliefSystem, beliefSystems, categoryLabels, type BeliefCategory } from '../../data/beliefSystems';
import type { BeliefSystem, User } from '../../types';

/**
 * CONVERSATION STATE MACHINE
 */
type ConversationState =
  | 'idle'        // Waiting for user input
  | 'listening'   // Mic is active
  | 'sending'     // Waiting for Claude (shows thinking dots)
  | 'streaming'   // Text appearing
  | 'speaking';   // TTS playing

/**
 * CHARACTER VOICES
 * god = Onyx (masculine divine)
 * jesus = Ash (for Christian beliefs only)
 * mary = Coral (feminine divine, available to all)
 */
type Character = 'god' | 'jesus' | 'mary';

// Belief systems that can use Jesus character
const CHRISTIAN_BELIEFS = ['protestant', 'catholic', 'mormonism'];

// Character labels per belief system
const CHARACTER_LABELS: Record<string, { god: string; jesus?: string; mary: string }> = {
  protestant: { god: 'God', jesus: 'Jesus', mary: 'Mary' },
  catholic: { god: 'God', jesus: 'Jesus', mary: 'Mary' },
  mormonism: { god: 'God', jesus: 'Jesus', mary: 'Mary' },
  islam: { god: 'Allah', mary: 'Divine Feminine' },
  judaism: { god: 'Adonai', mary: 'Shekhinah' },
  hinduism: { god: 'Brahman', mary: 'Divine Mother' },
  buddhism: { god: 'The Buddha', mary: 'Kuan Yin' },
  sikhism: { god: 'Waheguru', mary: 'Divine Light' },
  taoism: { god: 'The Tao', mary: 'Divine Feminine' },
  sbnr: { god: 'The Universe', mary: 'Source Energy' },
  pantheism: { god: 'The Earth', mary: 'Gaia' },
  science: { god: 'The Cosmos', mary: 'The Universe' },
  agnosticism: { god: 'Wisdom', mary: 'Inner Voice' },
  atheism: { god: 'Reason', mary: 'Wisdom' },
};

// Message with metadata for display
interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'greeting';
  content: string;
  timestamp: number;
}

// Thin line art icons
const BackIcon = memo(function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
});

const SpeakerIcon = memo(function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {muted ? (
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : (
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      )}
    </svg>
  );
});

const GearIcon = memo(function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
});

const ChevronDownIcon = memo(function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
});

const ArrowDownIcon = memo(function ArrowDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
});

const MicIcon = memo(function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
});

const StopIcon = memo(function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
});

const SendIcon = memo(function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
});

// Subtle chevron for showing/hiding controls
const ChevronIndicator = memo(function ChevronIndicator({ pointsUp }: { pointsUp: boolean }) {
  return (
    <svg
      width="12"
      height="6"
      viewBox="0 0 12 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: pointsUp ? 'rotate(0deg)' : 'rotate(180deg)',
        transition: 'transform 0.3s ease',
      }}
    >
      <path d="M1 5L6 1L11 5" />
    </svg>
  );
});

// Character selector dropdown
const CharacterSelector = memo(function CharacterSelector({
  character,
  onChange,
  beliefId,
  accentColor,
}: {
  character: Character;
  onChange: (c: Character) => void;
  beliefId: string;
  accentColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const isChristian = CHRISTIAN_BELIEFS.includes(beliefId);
  const beliefLabels = CHARACTER_LABELS[beliefId] || CHARACTER_LABELS.sbnr;

  // Get label for current character
  const getLabel = (char: Character): string => {
    if (char === 'god') return beliefLabels.god;
    if (char === 'jesus') return beliefLabels.jesus || 'Jesus';
    return beliefLabels.mary;
  };

  const options: Character[] = isChristian
    ? ['god', 'jesus', 'mary']
    : ['god', 'mary'];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
        style={{ color: 'rgba(255,255,255,0.5)' }}
        aria-label="Select voice character"
      >
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
          {getLabel(character)}
        </span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 py-1"
            style={{
              background: 'rgba(20, 20, 25, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              minWidth: '120px',
              overflow: 'hidden',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className="w-full px-3 py-2 text-left transition-colors hover:bg-white/5"
                style={{
                  fontSize: '0.8rem',
                  color: character === opt ? accentColor : 'var(--color-text-primary)',
                  fontWeight: character === opt ? 500 : 400,
                }}
              >
                {getLabel(opt)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

// Thinking dots animation
const ThinkingDots = memo(function ThinkingDots({ color }: { color: string }) {
  return (
    <div className="thinking-dots">
      <div className="thinking-dot" style={{ backgroundColor: color }} />
      <div className="thinking-dot" style={{ backgroundColor: color }} />
      <div className="thinking-dot" style={{ backgroundColor: color }} />
    </div>
  );
});

// Mic button with breathing animation
const MicButton = memo(function MicButton({
  state,
  accentColor,
  onToggle,
  isDisabled,
}: {
  state: ConversationState;
  accentColor: string;
  onToggle: () => void;
  isDisabled: boolean;
}) {
  const isListening = state === 'listening';
  const isBusy = state !== 'idle' && state !== 'listening';
  const disabled = isBusy || isDisabled;

  return (
    <button
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      className={`mic-button ${isListening ? 'listening' : ''}`}
      style={{
        background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <div className="mic-button-ring" style={{ borderColor: accentColor }} />
      {isListening && <div className="mic-button-ripple" style={{ borderColor: accentColor }} />}
      <div style={{ color: isListening ? '#fff' : 'rgba(255,255,255,0.8)' }}>
        {isListening ? <StopIcon /> : <MicIcon />}
      </div>
      {isListening && (
        <span className="absolute" style={{ bottom: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
          Listening...
        </span>
      )}
    </button>
  );
});

// Parse and linkify scripture references
function parseScriptureReferences(text: string, accentColor: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Combined pattern for all scripture types
  const combinedPattern = /\b(\d?\s?[A-Z][a-z]+)\s+(\d+):(\d+)(?:-(\d+))?\b|\b(?:Surah|Al-[A-Za-z]+)\s+(\d+):(\d+)\b/gi;

  let match;
  while ((match = combinedPattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const isQuran = fullMatch.toLowerCase().includes('surah') || fullMatch.toLowerCase().startsWith('al-');

    // Create link
    const url = isQuran
      ? `https://quran.com/${match[5] || match[1]}/${match[6] || match[2]}`
      : `https://www.biblegateway.com/passage/?search=${encodeURIComponent(fullMatch)}&version=NIV`;

    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: accentColor,
          textDecoration: 'underline',
          textDecorationColor: `${accentColor}50`,
          textUnderlineOffset: '2px',
        }}
      >
        {fullMatch}
      </a>
    );

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Belief selector modal
const BeliefSelectorModal = memo(function BeliefSelectorModal({
  isOpen,
  onClose,
  onSelect,
  currentBeliefId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (belief: CategorizedBeliefSystem) => void;
  currentBeliefId: string;
}) {
  if (!isOpen) return null;

  const categories: BeliefCategory[] = ['religious', 'spiritual', 'philosophical'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/5">
          <h2 className="text-center" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Switch Belief System
          </h2>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
          {categories.map((category) => (
            <div key={category} className="mb-4">
              <h3 className="mb-2 px-2" style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                {categoryLabels[category]}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {beliefSystems.filter((b) => b.category === category).map((belief) => (
                  <button
                    key={belief.id}
                    onClick={() => { onSelect(belief); onClose(); }}
                    className="px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: belief.id === currentBeliefId ? `linear-gradient(135deg, ${belief.accentColor}30 0%, ${belief.accentColor}10 100%)` : 'rgba(255, 255, 255, 0.03)',
                      border: belief.id === currentBeliefId ? `1px solid ${belief.accentColor}60` : '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <span className="block" style={{ fontSize: '0.9rem', fontWeight: belief.id === currentBeliefId ? 500 : 400, color: belief.id === currentBeliefId ? belief.accentColor : 'var(--color-text-primary)' }}>
                      {belief.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Settings dropdown
const SettingsDropdown = memo(function SettingsDropdown({
  isOpen,
  onClose,
  onSwitchBelief,
  onSignOut,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSwitchBelief: () => void;
  onSignOut: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-2 z-50"
        style={{
          background: 'rgba(20, 20, 25, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          minWidth: '180px',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => { onSwitchBelief(); onClose(); }}
          className="w-full px-4 py-3 text-left transition-colors hover:bg-white/5"
          style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}
        >
          Switch Belief System
        </button>
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
        <button
          onClick={() => { onSignOut(); onClose(); }}
          className="w-full px-4 py-3 text-left transition-colors hover:bg-white/5"
          style={{ fontSize: '0.9rem', color: '#ef4444' }}
        >
          Sign Out
        </button>
      </div>
    </>
  );
});

interface ConversationScreenProps {
  belief: BeliefSystem;
  user: User;
  onBack: () => void;
  onPaywall: () => void;
  onChangeBelief?: (belief: BeliefSystem) => void;
  onSignOut?: () => void;
  language: LanguageCode;
}

export function ConversationScreen({ belief, user, onBack, onPaywall, onChangeBelief, onSignOut, language }: ConversationScreenProps) {
  const categorizedBelief = belief as CategorizedBeliefSystem;
  const accentColor = categorizedBelief.accentColor || belief.themeColor;

  // Responsive image path - desktop version if available
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const imagePath = isMobile
    ? categorizedBelief.imagePath || `/images/avatars/${belief.id}.jpg`
    : `/images/avatars/${belief.id}-desktop.jpg`;
  const fallbackImagePath = categorizedBelief.imagePath || `/images/avatars/${belief.id}.jpg`;

  // State machine
  const [state, setState] = useState<ConversationState>('idle');

  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<Message[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabledState] = useState(isVoiceEnabled());
  const [showBeliefModal, setShowBeliefModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [character, setCharacter] = useState<Character>('god');
  const [controlsHidden, setControlsHidden] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);
  const fullResponseRef = useRef('');
  const streamingMessageId = useRef<string | null>(null);

  const isInputEnabled = state === 'idle';

  // Handle voice toggle
  const handleVoiceToggle = useCallback(() => {
    const newEnabled = !voiceEnabled;
    setVoiceEnabledState(newEnabled);
    setVoiceEnabled(newEnabled);
  }, [voiceEnabled]);

  // Initialize audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Track scroll position for "scroll to bottom" button and auto-show controls
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom && displayMessages.length > 2);
      // Show controls when user scrolls (they're trying to interact)
      if (controlsHidden) {
        setControlsHidden(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [displayMessages.length, controlsHidden]);

  // Auto-hide controls after response completes
  const scheduleHideControls = useCallback(() => {
    // Clear any existing timer
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    // Hide controls after a short delay
    hideControlsTimer.current = setTimeout(() => {
      setControlsHidden(true);
    }, 500);
  }, []);

  // Show controls (tap anywhere or chevron)
  const showControls = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    setControlsHidden(false);
  }, []);

  // Toggle controls visibility
  const toggleControls = useCallback(() => {
    if (controlsHidden) {
      showControls();
    } else {
      setControlsHidden(true);
    }
  }, [controlsHidden, showControls]);

  // Speak response using OpenAI TTS
  const speakResponse = useCallback((text: string) => {
    const speakStartTime = Date.now();
    console.log('[Conversation] speakResponse called, text length:', text.length);

    if (!voiceEnabled) {
      console.log('[Conversation] Voice disabled, skipping TTS');
      setState('idle');
      // If muted, hide controls after 2 seconds
      hideControlsTimer.current = setTimeout(() => {
        setControlsHidden(true);
      }, 2000);
      return;
    }
    setState('speaking');
    console.log('[Conversation] State set to speaking, calling TTS immediately (t+%dms)', Date.now() - speakStartTime);

    // Use OpenAI TTS with selected character - fire immediately, no delays
    speakWithOpenAI(
      text,
      belief.id,
      character,
      language,
      () => {
        console.log('[Conversation] TTS callback received (t+%dms)', Date.now() - speakStartTime);
        setState('idle');
        // Hide controls after speech ends
        scheduleHideControls();
      }
    ).catch((e) => {
      console.error('[Conversation] TTS error:', e);
      setState('idle');
      scheduleHideControls();
    });

    // Fallback timeout in case TTS hangs
    setTimeout(() => {
      setState((current) => (current === 'speaking' ? 'idle' : current));
    }, Math.max(30000, text.length * 150)); // Longer timeout for API-based TTS
  }, [belief.id, character, language, voiceEnabled, scheduleHideControls]);

  // Greeting on load - TEXT ONLY, no TTS
  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;

    const greetingTimer = setTimeout(() => {
      const greeting = getGreeting(belief.id);
      const greetingMessage: DisplayMessage = {
        id: `greeting-${Date.now()}`,
        role: 'greeting',
        content: greeting,
        timestamp: Date.now(),
      };
      setDisplayMessages([greetingMessage]);
    }, 800);

    return () => clearTimeout(greetingTimer);
  }, [belief.id]);

  // Send message to Claude
  const sendToAI = useCallback(async (userMessage: string) => {
    if (hasReachedFreeLimit() && !user.isPremium) {
      onPaywall();
      return;
    }

    initAudio();
    setState('sending');
    fullResponseRef.current = '';

    // Add user message to display
    const userDisplayMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setDisplayMessages((prev) => [...prev, userDisplayMessage]);

    // Add to API messages
    const newApiMessages: Message[] = [...apiMessages, { role: 'user', content: userMessage }];
    setApiMessages(newApiMessages);
    incrementMessageCount();

    // Create placeholder for streaming response
    const assistantMessageId = `assistant-${Date.now()}`;
    streamingMessageId.current = assistantMessageId;

    setTimeout(scrollToBottom, 100);

    await sendMessage(
      newApiMessages,
      belief.id,
      user.id,
      {
        onToken: (token) => {
          if (fullResponseRef.current === '') {
            setState('streaming');
            // Add initial empty assistant message
            setDisplayMessages((prev) => [
              ...prev,
              { id: assistantMessageId, role: 'assistant', content: '', timestamp: Date.now() },
            ]);
          }
          fullResponseRef.current += token;
          // Update the streaming message
          setDisplayMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: fullResponseRef.current } : m
            )
          );
        },
        onSentence: () => {},
        onComplete: (text) => {
          console.log('[Conversation] Stream complete, firing TTS immediately');
          fullResponseRef.current = text;
          streamingMessageId.current = null;
          // Final update - sync state then immediately fire TTS
          setDisplayMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? { ...m, content: text } : m))
          );
          setApiMessages([...newApiMessages, { role: 'assistant', content: text }]);
          // Fire TTS immediately - no awaits, no delays
          speakResponse(text);
          setTimeout(scrollToBottom, 100);

          if (hasReachedFreeLimit() && !user.isPremium) {
            setTimeout(onPaywall, 3000);
          }
        },
        onError: (error) => {
          console.error('[Conversation] Error:', error);
          const errorMessage = 'I am still here. Please try speaking to me again.';
          setDisplayMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? { ...m, content: errorMessage } : m))
          );
          speakResponse(errorMessage);
        },
      },
      language,
      character
    );
  }, [apiMessages, belief.id, user.id, user.isPremium, speakResponse, onPaywall, language, scrollToBottom, character]);

  // Handle send
  const handleSend = useCallback(() => {
    if (!inputText.trim() || !isInputEnabled) return;
    // Unlock mobile audio on user gesture
    unlockMobileAudio();
    const message = inputText.trim();
    setInputText('');
    sendToAI(message);
  }, [inputText, isInputEnabled, sendToAI]);

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Mic toggle
  const handleMicToggle = useCallback(() => {
    // Unlock mobile audio on user gesture
    unlockMobileAudio();
    setSpeechError(null);
    if (state === 'listening') {
      stopListening();
      setState('idle');
    } else if (state === 'idle') {
      if (!isSpeechSupported()) {
        setSpeechError('Speech not supported');
        setTimeout(() => setSpeechError(null), 3000);
        return;
      }
      initAudio();
      startListening({
        language,
        onStart: () => { setState('listening'); setInputText(''); },
        onResult: (transcript) => setInputText(transcript),
        onEnd: () => setState('idle'),
        onError: (error) => { setState('idle'); setSpeechError(error); setTimeout(() => setSpeechError(null), 3000); },
      });
    }
  }, [state, language]);

  // Handle belief change
  const handleBeliefChange = useCallback((newBelief: CategorizedBeliefSystem) => {
    if (onChangeBelief) {
      onChangeBelief(newBelief);
    }
  }, [onChangeBelief]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const remainingMessages = getRemainingFreeMessages();
  const actualImagePath = imageError ? fallbackImagePath : imagePath;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: '#000', height: '100dvh', minHeight: '-webkit-fill-available' }}
      role="main"
      aria-label={`Conversation with ${belief.name}`}
    >
      {/* Background image with fallback */}
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: `url(${actualImagePath})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          filter: 'saturate(0.7) brightness(0.85)',
        }}
        aria-hidden="true"
      />
      {/* Preload desktop image and handle fallback */}
      {!isMobile && (
        <img
          src={imagePath}
          alt=""
          style={{ display: 'none' }}
          onError={() => setImageError(true)}
        />
      )}

      {/* Gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,0.95) 85%, rgba(0,0,0,0.98) 100%)',
        }}
        aria-hidden="true"
      />

      {/* UI Layer */}
      <div
        className="relative z-10 flex flex-col h-full safe-top"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 24px) + 100px)' }}
      >
        {/* Top bar */}
        <header
          className="flex items-center justify-between shrink-0"
          style={{ padding: '12px 20px 0 20px', opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}
        >
          <button
            onClick={onBack}
            aria-label="Go back"
            className="p-2 -ml-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <BackIcon />
          </button>

          {/* Center: Belief name + Character selector */}
          <div className="flex items-center gap-2">
            {/* Tappable belief name */}
            <button
              onClick={() => setShowBeliefModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {belief.name}
              </span>
              <ChevronDownIcon />
            </button>

            {/* Divider */}
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)' }} />

            {/* Character selector */}
            <CharacterSelector
              character={character}
              onChange={setCharacter}
              beliefId={belief.id}
              accentColor={accentColor}
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleVoiceToggle}
              aria-label={voiceEnabled ? 'Mute voice' : 'Enable voice'}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <SpeakerIcon muted={!voiceEnabled} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Settings"
                className="p-2 -mr-2 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <GearIcon />
              </button>
              <SettingsDropdown
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSwitchBelief={() => setShowBeliefModal(true)}
                onSignOut={onSignOut || (() => {})}
              />
            </div>
          </div>
        </header>

        {/* Conversation thread - tap to show controls when hidden */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
          onClick={controlsHidden ? showControls : undefined}
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease 0.2s',
            marginTop: '20px',
            padding: '0 24px',
            paddingBottom: controlsHidden ? '20px' : '180px', // Extra padding when controls visible
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)',
            cursor: controlsHidden ? 'pointer' : 'auto',
          }}
        >
          {/* Vertical centering wrapper - centers content when only greeting */}
          {/* Desktop: max-width 800px centered. Mobile: full width */}
          <div
            className="mx-auto flex flex-col"
            style={{
              minHeight: '100%',
              maxWidth: 'min(800px, 100%)',
              justifyContent: displayMessages.length <= 1 ? 'center' : 'flex-start',
              paddingTop: displayMessages.length <= 1 ? '0' : '24px',
              paddingBottom: '24px',
              gap: '24px',
            }}
          >
            {displayMessages.map((message, index) => (
              <div
                key={message.id}
                className={`${message.role === 'user' ? 'flex justify-end md:justify-center' : 'flex justify-center'}`}
                style={{
                  animation: `fadeInUp 0.5s ease forwards`,
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                }}
              >
                {message.role === 'user' ? (
                  // User message - glass bubble
                  // Mobile: right-aligned, max 85%
                  // Desktop: centered container, right-aligned text, max 50%
                  <div
                    className="user-message-bubble"
                    style={{
                      maxWidth: 'min(85%, 400px)',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '16px',
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)',
                      fontWeight: 400,
                      color: 'rgba(255, 248, 240, 0.95)',
                      lineHeight: 1.6,
                      textAlign: 'right',
                    }}
                  >
                    {message.content}
                  </div>
                ) : (
                  // God's message - divine text, centered
                  // Mobile: max 85%, smaller font
                  // Desktop: max 65%, larger font, more line-height
                  <div
                    className="text-divine text-center divine-message"
                    style={{
                      maxWidth: '85%',
                      fontSize: 'clamp(1.15rem, 3.2vw, 1.5rem)',
                      color: 'rgba(255, 248, 240, 0.95)',
                      textShadow: `0 0 20px ${accentColor}20, 0 0 40px ${accentColor}10`,
                      lineHeight: 1.8,
                    }}
                  >
                    {parseScriptureReferences(message.content, accentColor)}
                  </div>
                )}
              </div>
            ))}

            {/* Thinking dots */}
            {state === 'sending' && (
              <div className="flex justify-center" style={{ animation: 'fadeInUp 0.3s ease forwards' }}>
                <ThinkingDots color={accentColor} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute left-1/2 -translate-x-1/2 p-2 rounded-full transition-all"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 20px) + 180px)',
              background: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
            aria-label="Scroll to bottom"
          >
            <ArrowDownIcon />
          </button>
        )}

        {/* Input controls - hideable for clean screenshot view */}
        <div
          className="shrink-0"
          style={{
            opacity: controlsHidden ? 0 : (isVisible ? 1 : 0),
            transform: controlsHidden ? 'translateY(20px)' : 'translateY(0)',
            transition: controlsHidden ? 'opacity 0.5s ease, transform 0.5s ease' : 'opacity 0.5s ease 0.4s, transform 0.3s ease',
            pointerEvents: controlsHidden ? 'none' : 'auto',
          }}
        >
          {/* Message counter */}
          {!user.isPremium && remainingMessages <= 3 && (
            <div
              className="text-center"
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.25)',
                marginTop: '20px',
                marginBottom: '16px',
              }}
            >
              {remainingMessages === 0 ? t('conversation.freeMessagesUsed', language) : `${remainingMessages} ${t('conversation.freeMessages', language)}`}
            </div>
          )}

          {/* Mic button */}
          <div
            className="flex justify-center"
            style={{
              marginTop: !user.isPremium && remainingMessages <= 3 ? '0' : '20px',
              marginBottom: '16px',
            }}
          >
            <MicButton
              state={state}
              accentColor={accentColor}
              onToggle={handleMicToggle}
              isDisabled={hasReachedFreeLimit() && !user.isPremium}
            />
          </div>

          {/* Text input */}
          <div className="w-full" style={{ padding: '0 20px' }}>
            <div className="relative w-full max-w-md" style={{ margin: '0 auto' }}>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={showControls}
                placeholder={state === 'listening' ? `${t('conversation.listening', language)}...` : t('conversation.speakYourTruth', language)}
                disabled={!isInputEnabled}
                maxLength={500}
                className="conversation-input"
                style={{
                  paddingRight: inputText.trim() ? '50px' : '20px',
                  opacity: isInputEnabled ? 1 : 0.35,
                  height: '48px',
                }}
              />
              {inputText.trim() && isInputEnabled && (
                <button
                  onClick={handleSend}
                  aria-label="Send message"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors"
                  style={{ color: accentColor }}
                >
                  <SendIcon />
                </button>
              )}
            </div>
          </div>

          {/* Error message */}
          {speechError && (
            <div className="text-center mt-2" style={{ fontSize: '0.75rem', color: '#ef4444' }}>
              {speechError}
            </div>
          )}
        </div>

        {/* Chevron indicator - always visible, tap to show/hide controls */}
        <button
          onClick={toggleControls}
          className="shrink-0 flex justify-center items-center w-full py-3"
          style={{ color: 'rgba(255, 255, 255, 0.2)' }}
          aria-label={controlsHidden ? 'Show input controls' : 'Hide input controls'}
        >
          <ChevronIndicator pointsUp={controlsHidden} />
        </button>
      </div>

      {/* Belief selector modal */}
      <BeliefSelectorModal
        isOpen={showBeliefModal}
        onClose={() => setShowBeliefModal(false)}
        onSelect={handleBeliefChange}
        currentBeliefId={belief.id}
      />

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Greeting messages per belief system - short and powerful
function getGreeting(beliefId: string): string {
  const greetings: Record<string, string> = {
    protestant: 'I am here, My child.',
    catholic: 'I am here, My child.',
    islam: 'I am here. Speak.',
    judaism: 'I am here. What weighs on your heart?',
    hinduism: 'I am here. Speak freely.',
    buddhism: 'I am here. Be still, and speak.',
    mormonism: 'I am here, My child.',
    sikhism: 'I am here. Speak freely.',
    sbnr: 'I am here. Speak.',
    taoism: 'I am here.',
    pantheism: 'I am here. I have always been here.',
    science: 'I am here. Ask anything.',
    agnosticism: "I am here. What's on your mind?",
    atheism: 'I am here. Speak freely.',
  };
  return greetings[beliefId] || greetings.protestant;
}
