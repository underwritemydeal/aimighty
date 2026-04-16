import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { sendMessage, summarizeConversation, type Message } from '../../services/claudeApi';
import { speakWithOpenAI, stop as stopSpeaking, initAudio, setVoiceEnabled, isVoiceEnabled, unlockMobileAudio, replayAudio, enqueueSentence, clearSentenceQueue, prewarmTts } from '../../services/openaiTTS';
import { startListening, stopListening, isSupported as isSpeechSupported } from '../../services/speechInput';
import { incrementMessageCount, hasReachedFreeLimit, getRemainingFreeMessages } from '../../services/auth';
import {
  getTier,
  hasReachedDailyLimit,
  incrementDailyCount,
  bumpStreak,
  getStreak,
  formatStreak,
  streakMilestone,
  saveMemory,
  formatMemoryContext,
} from '../../services/tierService';
import { t, type LanguageCode } from '../../data/translations';
import { type CategorizedBeliefSystem, beliefSystems, categoryLabels, type BeliefCategory } from '../../data/beliefSystems';
import { normalizeBeliefId, getGreetingForBelief } from '../../config/beliefSystems';
import { fetchWithTimeout } from '../../services/fetchWithTimeout';
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
  'atheism-stoicism': { god: 'Reason', mary: 'Wisdom' },
};

// Message with metadata for display
interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'greeting';
  content: string;
  timestamp: number;
  audioUrl?: string; // ObjectURL for TTS audio blob (for replay)
  // Sentence-level TTS tracking for word highlighting
  sentences?: string[];
  activeSentenceIdx?: number; // -1 = not playing, else current sentence
  activeWordIdx?: number; // word index within active sentence
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

// Elegant three-line hamburger — replaces the gear icon for a more spiritual feel
const MenuIcon = memo(function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="14" x2="20" y2="14" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  );
});
// Gold flame SVG for the streak row — replaces the 🔥 emoji
const FlameIcon = memo(function FlameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
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

// Small replay speaker icon for assistant messages
const ReplaySpeakerIcon = memo(function ReplaySpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
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

    // Defense-in-depth: only ever render an <a> if the constructed URL
    // is plain https://. The prefix is hardcoded above, but a future
    // refactor (or a Claude response ever feeding into this path) should
    // not be able to produce a javascript:/data:/file: href. Closes P0-7.
    if (/^https:\/\//i.test(url)) {
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
    } else {
      // Not a safe URL — render as plain text.
      parts.push(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Render divine message content.
// If the message has sentences + an active sentence/word, render word-by-word highlight.
// Otherwise fall back to scripture link parsing.
function renderDivineContent(
  message: DisplayMessage,
  accentColor: string
): React.ReactNode {
  const activeIdx = message.activeSentenceIdx ?? -1;
  const sentences = message.sentences;
  if (!sentences || sentences.length === 0 || activeIdx < 0) {
    return parseScriptureReferences(message.content, accentColor);
  }
  const activeWordIdx = message.activeWordIdx ?? -1;
  return (
    <>
      {sentences.map((sent, sIdx) => {
        const isActive = sIdx === activeIdx;
        const words = sent.split(/\s+/);
        return (
          <span key={sIdx}>
            {words.map((word, wIdx) => {
              const highlighted = isActive && wIdx === activeWordIdx;
              return (
                <span
                  key={wIdx}
                  style={{
                    color: highlighted ? accentColor : 'inherit',
                    fontWeight: highlighted ? 400 : 300,
                    transition: 'color 120ms ease',
                  }}
                >
                  {word}
                  {wIdx < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
            {sIdx < sentences.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </>
  );
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

// Menu dropdown — full tier-aware menu with daily content + streak
const SettingsDropdown = memo(function SettingsDropdown({
  isOpen,
  onClose,
  onSwitchBelief,
  onDailyWisdom,
  onDailyPrayer,
  onSacredText,
  onReflection,
  onSignOut,
  onNavigate,
  tier,
  streakText,
  onUpgrade,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSwitchBelief: () => void;
  onDailyWisdom: () => void;
  onDailyPrayer: () => void;
  onSacredText: () => void;
  onReflection: () => void;
  onSignOut: () => void;
  onNavigate?: (screen: 'terms' | 'privacy') => void;
  tier: 'free' | 'believer' | 'divine';
  streakText: string;
  onUpgrade: () => void;
}) {
  if (!isOpen) return null;

  const isFree = tier === 'free';

  const baseItemStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body, Outfit)',
    fontWeight: 400,
    fontSize: '15px',
    color: 'rgba(255,255,255,0.95)',
    padding: '12px 20px',
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    borderLeft: '2px solid transparent',
    cursor: 'pointer',
    transition: 'background 0.15s ease, border-color 0.15s ease',
  };

  const item = (label: string, action: () => void, locked = false) => (
    <button
      onClick={() => { if (locked || isFree) { onUpgrade(); onClose(); return; } action(); onClose(); }}
      className="menu-item"
      style={{ ...baseItemStyle, opacity: locked || isFree ? 0.45 : 1 }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-2 z-50"
        style={{
          background: 'rgba(8, 8, 16, 0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '16px',
          minWidth: '220px',
          padding: '8px 0',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {item('Daily Wisdom', onDailyWisdom)}
        {item('Daily Prayer', onDailyPrayer)}
        {item('Sacred Text', onSacredText)}
        {item('Reflection', onReflection)}

        <div style={{ height: '1px', margin: '8px 16px', background: 'rgba(212, 175, 55, 0.2)' }} />

        <div
          className="flex items-center gap-2"
          style={{
            ...baseItemStyle,
            padding: '12px 20px',
            opacity: 0.9,
            cursor: 'default',
          }}
        >
          <FlameIcon />
          <span>{streakText}</span>
        </div>

        <button
          onClick={() => { onSwitchBelief(); onClose(); }}
          className="menu-item"
          style={baseItemStyle}
        >
          Switch Belief
        </button>

        <div style={{ height: '1px', margin: '8px 16px', background: 'rgba(212, 175, 55, 0.2)' }} />

        <button
          onClick={() => { onNavigate?.('terms'); onClose(); }}
          className="menu-item"
          style={{
            ...baseItemStyle,
            fontWeight: 300,
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            paddingTop: '14px',
            paddingBottom: '10px',
          }}
        >
          Terms of Service
        </button>
        <button
          onClick={() => { onNavigate?.('privacy'); onClose(); }}
          className="menu-item"
          style={{
            ...baseItemStyle,
            fontWeight: 300,
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            paddingTop: '10px',
            paddingBottom: '14px',
          }}
        >
          Privacy Policy
        </button>

        <div style={{ height: '1px', margin: '8px 16px', background: 'rgba(212, 175, 55, 0.2)' }} />

        <button
          onClick={() => { onSignOut(); onClose(); }}
          className="menu-item"
          style={{
            ...baseItemStyle,
            color: 'rgba(220, 60, 60, 0.85)',
          }}
        >
          Sign Out
        </button>

        <style>{`
          .menu-item:hover {
            background: rgba(212, 175, 55, 0.08) !important;
            border-left-color: #d4af37 !important;
          }
        `}</style>
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
  onSwitchBelief?: () => void; // exit to BeliefSelector, clears last-belief memory
  onSignOut?: () => void;
  onNavigate?: (screen: 'terms' | 'privacy') => void;
  language: LanguageCode;
}

export function ConversationScreen({ belief, user, onBack, onPaywall, onChangeBelief, onSwitchBelief, onSignOut, onNavigate, language }: ConversationScreenProps) {
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
  const [showDailyWisdom, setShowDailyWisdom] = useState(false);
  const [dailyLimitMessage, setDailyLimitMessage] = useState<string | null>(null);
  const [showFreeLimitBanner, setShowFreeLimitBanner] = useState(false);
  const [streakMilestoneText, setStreakMilestoneText] = useState<string | null>(null);
  const [tier] = useState(() => getTier());
  const [streak] = useState(() => getStreak());
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showSacredTextModal, setShowSacredTextModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  interface DailyContent {
    belief: string;
    date: string;
    prayer: string;
    sacredText: { reference: string; text: string; reflection: string };
    reflectionPrompt: string;
  }
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null);
  interface DailyArticle {
    title: string;
    metaDescription: string;
    slug: string;
    belief: string;
    topic: string;
    topicDisplay: string;
    date: string;
    body: {
      intro: string;
      sections: Array<{ heading: string; body: string }>;
      closing: string;
      cta: string;
    };
    url: string;
  }
  const [dailyArticle, setDailyArticle] = useState<DailyArticle | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [imageError, setImageError] = useState(false);
  // Default character per belief: sbnr/taoism/pantheism speak with the Divine Feminine (mary/coral)
  const [character, setCharacter] = useState<Character>(() => {
    return ['sbnr', 'taoism', 'pantheism'].includes(belief.id) ? 'mary' : 'god';
  });
  const [controlsHidden, setControlsHidden] = useState(false);
  const [replayingMessageId, setReplayingMessageId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);
  const fullResponseRef = useRef('');
  const streamingMessageId = useRef<string | null>(null);
  const apiMessagesAtUnmountRef = useRef<Message[] | null>(null);
  // Synchronous send guard — prevents double-tap on mobile from firing two
  // parallel requests before React commits the state flush (P0-2).
  const isSendingRef = useRef(false);

  const isInputEnabled = state === 'idle';

  // Keep ref updated so the unmount memory hook can access latest messages
  useEffect(() => {
    apiMessagesAtUnmountRef.current = apiMessages;
  }, [apiMessages]);

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

  // Pre-warm the /tts endpoint so the first real sentence doesn't pay
  // cold-start latency. Only Divine tier uses OpenAI TTS.
  useEffect(() => {
    if (getTier() === 'divine' && isVoiceEnabled()) {
      prewarmTts(normalizeBeliefId(belief.id), character, language);
    }
  }, [belief.id, character, language]);

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
    // Unlock mobile audio on any tap
    unlockMobileAudio();
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    setControlsHidden(false);
  }, []);

  // Toggle controls visibility
  const toggleControls = useCallback(() => {
    // Unlock mobile audio on any tap
    unlockMobileAudio();
    if (controlsHidden) {
      showControls();
    } else {
      setControlsHidden(true);
    }
  }, [controlsHidden, showControls]);

  // Speak response — tier-routed.
  //   Divine → OpenAI /tts (already sentence-queued via onSentence)
  //   Believer → browser SpeechSynthesis (no /tts calls, no word highlight)
  //   Free → no TTS at all
  const speakResponse = useCallback((text: string, messageId?: string) => {
    const tier = getTier();

    if (!voiceEnabled || tier === 'free') {
      setState('idle');
      hideControlsTimer.current = setTimeout(() => setControlsHidden(true), 2000);
      return;
    }

    if (tier === 'divine') {
      // Divine path: OpenAI TTS fallback (for the full-response path; normally the
      // sentence-queue in onSentence handles playback). Kept here for onError fallback.
      setState('speaking');
      setControlsHidden(true);
      speakWithOpenAI(
        text,
        normalizeBeliefId(belief.id),
        character,
        language,
        (audioUrl?: string) => {
          setState('idle');
          if (audioUrl && messageId) {
            setDisplayMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, audioUrl } : m))
            );
          }
          scheduleHideControls();
        }
      ).catch((e) => {
        console.error('[Conversation] TTS error:', e);
        setState('idle');
        scheduleHideControls();
      });
      setTimeout(() => {
        setState((current) => (current === 'speaking' ? 'idle' : current));
      }, Math.max(30000, text.length * 150));
      return;
    }

    // Believer path: browser SpeechSynthesis only — never /tts
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('idle');
      scheduleHideControls();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.92;
      utter.pitch = 0.95;
      utter.lang = language || 'en-US';
      setState('speaking');
      setControlsHidden(true);
      utter.onend = () => {
        setState('idle');
        scheduleHideControls();
      };
      utter.onerror = () => {
        setState('idle');
        scheduleHideControls();
      };
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.error('[Conversation] Browser TTS error:', e);
      setState('idle');
      scheduleHideControls();
    }
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
    const tier = getTier();

    // Free: hard paywall on lifetime limit
    if (tier === 'free' && hasReachedFreeLimit() && !user.isPremium) {
      onPaywall();
      return;
    }

    // Believer / Divine: inline daily limit (no redirect)
    if ((tier === 'believer' || tier === 'divine') && hasReachedDailyLimit()) {
      setDailyLimitMessage(
        tier === 'believer'
          ? "You've reached your daily limit. Come back tomorrow, or upgrade to Divine for 20 messages/day."
          : "You've reached your daily limit. Come back tomorrow."
      );
      return;
    }

    initAudio();
    setState('sending');
    fullResponseRef.current = '';
    clearSentenceQueue();

    // Streak: only user messages count (not greetings)
    const updated = bumpStreak();
    const ms = streakMilestone(updated.currentStreak);
    if (ms) {
      setStreakMilestoneText(ms);
      setTimeout(() => setStreakMilestoneText(null), 4500);
    }

    // Divine-only: inject memory context into apiMessages as a priming system-ish hint
    // We fold it into the first user message if memory exists and it's the first user turn.
    let userContent = userMessage;
    if (tier === 'divine' && apiMessages.length === 0) {
      const memCtx = formatMemoryContext(belief.id);
      if (memCtx) {
        userContent = `${memCtx}\n\n---\n\n${userMessage}`;
      }
    }

    // Add user message to display
    const userDisplayMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setDisplayMessages((prev) => [...prev, userDisplayMessage]);

    // Add to API messages (use userContent so memory context is injected on first turn)
    const newApiMessages: Message[] = [...apiMessages, { role: 'user', content: userContent }];
    setApiMessages(newApiMessages);
    incrementMessageCount();
    incrementDailyCount();

    // Create placeholder for streaming response
    const assistantMessageId = `assistant-${Date.now()}`;
    streamingMessageId.current = assistantMessageId;

    setTimeout(scrollToBottom, 100);

    // Normalize belief ID before API call
    await sendMessage(
      newApiMessages,
      normalizeBeliefId(belief.id),
      user.id,
      {
        onToken: (token) => {
          if (fullResponseRef.current === '') {
            setState('streaming');
            // Hide input controls the moment God starts speaking
            setControlsHidden(true);
            setDisplayMessages((prev) => [
              ...prev,
              {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                sentences: [],
                activeSentenceIdx: -1,
                activeWordIdx: -1,
              },
            ]);
          }
          fullResponseRef.current += token;
          setDisplayMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: fullResponseRef.current } : m
            )
          );
        },
        onSentence: (sentence) => {
          if (!voiceEnabled) return;
          // Only Divine tier gets the streaming OpenAI sentence-queue TTS.
          // Believer uses browser SpeechSynthesis (fired once, in speakResponse/onComplete).
          if (getTier() !== 'divine') return;
          // Append to sentence list and enqueue TTS immediately
          let sentenceIdx = 0;
          setDisplayMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantMessageId) return m;
              const sentences = [...(m.sentences || []), sentence];
              sentenceIdx = sentences.length - 1;
              return { ...m, sentences };
            })
          );

          enqueueSentence(sentence, normalizeBeliefId(belief.id), character, language, {
            onStart: () => {
              setState('speaking');
              setDisplayMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, activeSentenceIdx: sentenceIdx, activeWordIdx: 0 }
                    : m
                )
              );
            },
            onWord: (wordIdx) => {
              setDisplayMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId && m.activeSentenceIdx === sentenceIdx
                    ? { ...m, activeWordIdx: wordIdx }
                    : m
                )
              );
            },
            onEnd: () => {
              setDisplayMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId && m.activeSentenceIdx === sentenceIdx
                    ? { ...m, activeSentenceIdx: -1, activeWordIdx: -1 }
                    : m
                )
              );
            },
          });
        },
        onComplete: (text) => {
          console.log('[Conversation] Stream complete');
          // Release send guard — safe to send the next message (P0-2).
          isSendingRef.current = false;
          fullResponseRef.current = text;
          streamingMessageId.current = null;
          setDisplayMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? { ...m, content: text } : m))
          );
          const finalApiMessages: Message[] = [...newApiMessages, { role: 'assistant', content: text }];
          setApiMessages(finalApiMessages);

          // Divine memory checkpoint: every 3 user turns, save a summary
          const userTurnCount = finalApiMessages.filter((m) => m.role === 'user').length;
          if (getTier() === 'divine' && userTurnCount > 0 && userTurnCount % 3 === 0) {
            summarizeConversation(finalApiMessages, normalizeBeliefId(belief.id))
              .then((note) => {
                if (note && note.summary) {
                  saveMemory(belief.id, {
                    date: new Date().toISOString().split('T')[0],
                    summary: note.summary,
                    mood: note.mood,
                    topics: note.topics || [],
                    followUp: note.followUp || '',
                  });
                }
              })
              .catch(() => {});
          }

          const currentTier = getTier();
          // Free: no voice
          if (!voiceEnabled || currentTier === 'free') {
            setState('idle');
            scheduleHideControls();
          } else if (currentTier === 'believer') {
            // Believer: browser SpeechSynthesis, fire once here
            speakResponse(text, assistantMessageId);
          } else {
            // Divine: TTS is already queued sentence-by-sentence via onSentence.
            // Wait for queue to drain, then return to idle.
            const drainWatcher = setInterval(() => {
              setDisplayMessages((prev) => {
                const msg = prev.find((m) => m.id === assistantMessageId);
                if (msg && msg.activeSentenceIdx === -1) {
                  clearInterval(drainWatcher);
                  setState('idle');
                  scheduleHideControls();
                }
                return prev;
              });
            }, 400);
            // Safety timeout
            setTimeout(() => {
              clearInterval(drainWatcher);
              setState((cur) => cur === 'speaking' || cur === 'streaming' ? 'idle' : cur);
            }, 60000);
          }
          setTimeout(scrollToBottom, 100);

          // Paywall timing fix: never cut God off mid-response. After the free
          // user's 3rd response completes, show an inline banner and let them
          // dismiss or upgrade. The 4th send attempt is the hard redirect.
          if (getTier() === 'free' && hasReachedFreeLimit() && !user.isPremium) {
            setShowFreeLimitBanner(true);
          }
        },
        onError: (error) => {
          console.error('[Conversation] Error:', error);
          // Release send guard (P0-2).
          isSendingRef.current = false;
          const errorMessage = 'I am still here. Please try speaking to me again.';
          setDisplayMessages((prev) =>
            prev.map((m) => (m.id === assistantMessageId ? { ...m, content: errorMessage } : m))
          );
          // Reset state so the input bar re-enables. Without this, the UI sits in
          // 'streaming' forever after any network/API failure (P0-1 / 03-harden.md).
          setState('idle');
          scheduleHideControls();
          speakResponse(errorMessage, assistantMessageId);
        },
      },
      language,
      character
    );
  }, [apiMessages, belief.id, user.id, user.isPremium, speakResponse, onPaywall, language, scrollToBottom, character, voiceEnabled, scheduleHideControls]);

  // Handle send
  const handleSend = useCallback(() => {
    // Synchronous guard against double-tap (P0-2). React state flushes are
    // not synchronous; isInputEnabled alone can let a bouncy second tap slip
    // through before 'streaming' is committed.
    if (!inputText.trim() || !isInputEnabled || isSendingRef.current) return;
    isSendingRef.current = true;
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

  // Handle replay of a message's audio
  const handleReplayAudio = useCallback(async (messageId: string, audioUrl: string) => {
    // Don't replay if already replaying or speaking
    if (replayingMessageId || state === 'speaking') return;

    setReplayingMessageId(messageId);
    try {
      await replayAudio(audioUrl);
    } finally {
      setReplayingMessageId(null);
    }
  }, [replayingMessageId, state]);

  // Fetch daily content (prayer / sacred text / reflection) on demand
  useEffect(() => {
    if (!showPrayerModal && !showSacredTextModal && !showReflectionModal) return;
    if (dailyContent && dailyContent.belief === belief.id) return;
    const key = `daily-content-${belief.id}-${new Date().toISOString().split('T')[0]}`;
    const cached = sessionStorage.getItem(key);
    if (cached) {
      try { setDailyContent(JSON.parse(cached)); return; } catch { /* fall through */ }
    }
    const workerUrl = 'https://aimighty-api.robby-hess.workers.dev';
    // 10s budget for daily-content JSON.
    fetchWithTimeout(`${workerUrl}/daily-content?belief=${encodeURIComponent(belief.id)}`, {}, 10000)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('failed')))
      .then((data: DailyContent) => {
        setDailyContent(data);
        sessionStorage.setItem(key, JSON.stringify(data));
      })
      .catch((e) => console.error('[Conversation] daily-content fetch failed:', e));
  }, [showPrayerModal, showSacredTextModal, showReflectionModal, belief.id, dailyContent]);

  // Divine: save memory checkpoint on unmount (conversation end)
  useEffect(() => {
    return () => {
      if (getTier() !== 'divine') return;
      // Snapshot messages ref via state at time of unmount
      // We rely on apiMessagesRef for the latest list
      const msgs = apiMessagesAtUnmountRef.current;
      if (!msgs || msgs.length < 2) return;
      summarizeConversation(msgs, normalizeBeliefId(belief.id))
        .then((note) => {
          if (note && note.summary) {
            saveMemory(belief.id, {
              date: new Date().toISOString().split('T')[0],
              summary: note.summary,
              mood: note.mood,
              topics: note.topics || [],
              followUp: note.followUp || '',
            });
          }
        })
        .catch(() => {});
    };
  }, [belief.id]);

  // Fetch full daily wisdom article for current belief
  useEffect(() => {
    if (!showDailyWisdom) return;
    if (dailyArticle && dailyArticle.belief === belief.id) return;
    setArticleLoading(true);
    setDailyArticle(null);
    const workerUrl = 'https://aimighty-api.robby-hess.workers.dev';
    // 15s budget for article JSON — larger payload, but bounded.
    fetchWithTimeout(`${workerUrl}/daily-article?belief=${encodeURIComponent(belief.id)}`, {}, 15000)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)))
      .then((data: DailyArticle) => setDailyArticle(data))
      .catch((e) => {
        console.error('[Conversation] daily-article fetch failed:', e);
        setDailyArticle(null);
      })
      .finally(() => setArticleLoading(false));
  }, [showDailyWisdom, belief.id, dailyArticle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const remainingMessages = getRemainingFreeMessages();
  const actualImagePath = imageError ? fallbackImagePath : imagePath;

  // Handle any tap on the screen to unlock audio
  const handleScreenTap = useCallback(() => {
    unlockMobileAudio();
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: '#030308', height: '100dvh', minHeight: '100dvh' }}
      role="main"
      aria-label={`Conversation with ${belief.name}`}
      onClick={handleScreenTap}
      onTouchStart={handleScreenTap}
    >
      {/* Background image — uses 100vh (large viewport) so the image bleeds
          behind iOS status bar AND Safari browser chrome — no black bars.
          The overlaying content uses 100dvh so it tracks the visible area. */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          backgroundImage: `url(${actualImagePath})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'scroll',
          transform: 'scale(1.02)',
          transformOrigin: 'center top',
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

      {/* Gradient overlay - transparent top, dark bottom for text readability */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 40%, rgba(3,3,8,0.55) 70%, rgba(3,3,8,0.85) 100%)',
          zIndex: 1,
        }}
        aria-hidden="true"
      />

      {/* UI Layer — dvh-sized so it matches the background, not 100vh */}
      <div
        className="relative z-10 flex flex-col"
        style={{
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
        }}
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

          {/* Right controls — mute + menu icons, generous gap */}
          <div className="flex items-center" style={{ gap: '16px' }}>
            <button
              onClick={handleVoiceToggle}
              aria-label={voiceEnabled ? 'Mute voice' : 'Enable voice'}
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/5 active:bg-white/10"
              style={{
                width: '40px',
                height: '40px',
                color: voiceEnabled ? 'rgba(255,255,255,0.7)' : '#d4af37',
              }}
            >
              <SpeakerIcon muted={!voiceEnabled} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Menu"
                className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/5 active:bg-white/10"
                style={{
                  width: '40px',
                  height: '40px',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <MenuIcon />
              </button>
              <SettingsDropdown
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSwitchBelief={() => { onSwitchBelief?.(); }}
                onDailyWisdom={() => setShowDailyWisdom(true)}
                onDailyPrayer={() => setShowPrayerModal(true)}
                onSacredText={() => setShowSacredTextModal(true)}
                onReflection={() => setShowReflectionModal(true)}
                onSignOut={onSignOut || (() => {})}
                onNavigate={onNavigate}
                tier={tier}
                streakText={formatStreak(streak)}
                onUpgrade={onPaywall}
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
                className="flex"
                style={{
                  justifyContent: message.role === 'user' ? 'flex-end' : 'center',
                  animation: `fadeInUp 0.5s ease forwards`,
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                }}
              >
                {message.role === 'user' ? (
                  // User message - glass bubble
                  // Mobile: right-aligned, max 85%
                  // Desktop: max 50%, positioned to the right
                  <div
                    style={{
                      maxWidth: isMobile ? '85%' : '50%',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '16px',
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)',
                      fontWeight: 400,
                      color: 'rgba(255, 248, 240, 0.95)',
                      lineHeight: 1.6,
                      textAlign: 'center',
                      marginLeft: isMobile ? 'auto' : 'auto',
                      marginRight: isMobile ? '0' : '10%',
                    }}
                  >
                    {message.content}
                  </div>
                ) : (
                  // God's message - divine text, centered
                  // Mobile: max 85%, smaller font
                  // Desktop: max 65%, larger font, more line-height, centered
                  <div
                    className="text-divine relative group"
                    style={{
                      maxWidth: isMobile ? '90%' : '65%',
                      fontSize: isMobile ? 'clamp(1.15rem, 3.2vw, 1.5rem)' : 'clamp(1.3rem, 2.5vw, 1.8rem)',
                      color: 'rgba(255, 248, 240, 0.95)',
                      textShadow: `0 0 20px ${accentColor}20, 0 0 40px ${accentColor}10`,
                      lineHeight: isMobile ? 1.8 : 1.9,
                      // Desktop: center text. Mobile: left-align for easier reading.
                      textAlign: isMobile ? 'left' : 'center',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    {renderDivineContent(message, accentColor)}
                    {/* Replay speaker icon - only show if message has audioUrl */}
                    {message.audioUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplayAudio(message.id, message.audioUrl!);
                        }}
                        aria-label="Replay audio"
                        className="absolute transition-all duration-200"
                        style={{
                          bottom: '-24px',
                          right: '0',
                          padding: '4px',
                          borderRadius: '50%',
                          color: replayingMessageId === message.id ? accentColor : 'rgba(255, 255, 255, 0.3)',
                          opacity: isMobile ? 1 : 0,
                          animation: replayingMessageId === message.id ? 'pulse 1.5s ease-in-out infinite' : 'none',
                        }}
                      >
                        <ReplaySpeakerIcon />
                        <style>{`
                          .group:hover button { opacity: 1 !important; }
                          button:hover { color: ${accentColor} !important; }
                          @keyframes pulse {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.5; }
                          }
                        `}</style>
                      </button>
                    )}
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

        {/* AI disclosure — fades out after first user message. Sits above the input bar. */}
        {displayMessages.length === 1 && displayMessages[0].role === 'greeting' && !controlsHidden && (
          <div
            className="text-center"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 158px)',
              zIndex: 19,
              fontFamily: 'var(--font-body, Outfit)',
              fontSize: '11px',
              fontWeight: 200,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.05em',
              pointerEvents: 'none',
              animation: 'fadeInUp 0.8s ease 0.5s both',
            }}
          >
            Powered by AI — with deep respect for your tradition
          </div>
        )}

        {/* Input controls - fixed at bottom, slides off during TTS for clean cinematic view */}
        <div
          className="shrink-0"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            paddingTop: '12px',
            background: 'linear-gradient(to top, rgba(3,3,8,0.92) 0%, rgba(3,3,8,0.7) 60%, rgba(3,3,8,0) 100%)',
            opacity: controlsHidden ? 0 : (isVisible ? 1 : 0),
            transform: controlsHidden ? 'translateY(100%)' : 'translateY(0)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
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

      {/* Daily content modals (prayer / sacred text / reflection) */}
      {(showPrayerModal || showSacredTextModal || showReflectionModal) && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: `linear-gradient(rgba(3,3,8,0.82), rgba(3,3,8,0.94)), url(${actualImagePath})`,
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <button
              onClick={() => {
                setShowPrayerModal(false);
                setShowSacredTextModal(false);
                setShowReflectionModal(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}
            >
              <BackIcon /> Back
            </button>
            <button
              onClick={() => {
                const text = showPrayerModal
                  ? dailyContent?.prayer || ''
                  : showSacredTextModal
                  ? `${dailyContent?.sacredText?.reference}\n${dailyContent?.sacredText?.text}`
                  : dailyContent?.reflectionPrompt || '';
                navigator.clipboard?.writeText(text);
              }}
              className="px-3 py-2 rounded-lg hover:bg-white/5"
              style={{ color: accentColor, fontSize: '0.85rem' }}
            >
              Share
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-12">
            <div className="mx-auto" style={{ maxWidth: '640px', textAlign: 'center', paddingTop: '40px' }}>
              {!dailyContent && (
                <p style={{ color: 'rgba(255,248,240,0.6)', fontFamily: 'var(--font-body, Outfit)' }}>
                  Gathering today's wisdom…
                </p>
              )}
              {dailyContent && showPrayerModal && (
                <>
                  <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accentColor, marginBottom: '20px' }}>
                    Daily Prayer · {belief.name}
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.3rem, 3.2vw, 1.8rem)',
                      fontWeight: 300,
                      lineHeight: 1.7,
                      color: 'rgba(255,248,240,0.95)',
                      marginBottom: '40px',
                    }}
                  >
                    {dailyContent.prayer}
                  </p>
                  <button
                    onClick={() => {
                      setShowPrayerModal(false);
                      setInputText(`Pray with me: ${dailyContent.prayer}`);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className="px-6 py-3 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                      border: `1px solid ${accentColor}60`,
                      color: accentColor,
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    Pray with God
                  </button>
                </>
              )}
              {dailyContent && showSacredTextModal && (
                <>
                  <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accentColor, marginBottom: '20px' }}>
                    Sacred Text · {belief.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      letterSpacing: '0.05em',
                      color: accentColor,
                      marginBottom: '16px',
                    }}
                  >
                    {dailyContent.sacredText.reference}
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.4rem, 3.4vw, 2rem)',
                      fontWeight: 300,
                      lineHeight: 1.5,
                      color: 'rgba(255,248,240,0.95)',
                      marginBottom: '32px',
                    }}
                  >
                    &ldquo;{dailyContent.sacredText.text}&rdquo;
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body, Outfit)',
                      fontSize: '0.95rem',
                      lineHeight: 1.7,
                      color: 'rgba(255,248,240,0.75)',
                    }}
                  >
                    {dailyContent.sacredText.reflection}
                  </p>
                </>
              )}
              {dailyContent && showReflectionModal && (
                <>
                  <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: accentColor, marginBottom: '20px' }}>
                    Reflection · {belief.name}
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
                      fontWeight: 300,
                      lineHeight: 1.5,
                      color: 'rgba(255,248,240,0.95)',
                      marginBottom: '40px',
                    }}
                  >
                    {dailyContent.reflectionPrompt}
                  </p>
                  <button
                    onClick={() => {
                      setShowReflectionModal(false);
                      setInputText(dailyContent.reflectionPrompt);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className="px-6 py-3 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                      border: `1px solid ${accentColor}60`,
                      color: accentColor,
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    Reflect with God
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Streak milestone overlay */}
      {streakMilestoneText && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              color: accentColor,
              textAlign: 'center',
              padding: '0 24px',
              animation: 'fadeInUp 0.6s ease forwards',
            }}
          >
            {streakMilestoneText}
          </div>
        </div>
      )}

      {/* Free-limit banner — shown after God's 3rd response completes.
          Next send attempt triggers the real paywall. */}
      {showFreeLimitBanner && (
        <div
          className="fixed left-0 right-0 z-40 px-6"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 180px)' }}
        >
          <div
            className="mx-auto text-center"
            style={{
              maxWidth: '520px',
              padding: '18px 24px',
              background: 'rgba(8,8,16,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(212,175,55,0.35)',
              borderRadius: '16px',
              color: 'rgba(255,248,240,0.95)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-body, Outfit)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
            }}
          >
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              You've used your 3 free messages. Upgrade to continue the conversation.
            </p>
            <div className="flex justify-center" style={{ gap: '12px', marginTop: '14px' }}>
              <button
                onClick={() => { setShowFreeLimitBanner(false); onPaywall(); }}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: '#d4af37',
                  color: '#0a0a0f',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Upgrade
              </button>
              <button
                onClick={() => setShowFreeLimitBanner(false)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '0.85rem',
                  fontWeight: 400,
                  border: '1px solid rgba(255,255,255,0.18)',
                  cursor: 'pointer',
                }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily limit inline banner */}
      {dailyLimitMessage && (
        <div
          className="fixed left-0 right-0 z-40 px-6"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}
        >
          <div
            className="mx-auto text-center"
            style={{
              maxWidth: '520px',
              padding: '14px 20px',
              background: 'rgba(3,3,8,0.92)',
              border: `1px solid ${accentColor}40`,
              borderRadius: '14px',
              color: 'rgba(255,248,240,0.9)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-body, Outfit)',
            }}
          >
            {dailyLimitMessage}
            <button
              onClick={() => setDailyLimitMessage(null)}
              className="ml-3"
              style={{ color: accentColor, fontSize: '0.8rem' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Daily Wisdom reader */}
      {showDailyWisdom && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: `linear-gradient(rgba(3,3,8,0.75), rgba(3,3,8,0.92)), url(${actualImagePath})`,
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <button
              onClick={() => setShowDailyWisdom(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}
            >
              <BackIcon /> Back to Conversation
            </button>
            <button
              onClick={() => {
                const url = `https://aimightyme.com/wisdom/${belief.id}/${dailyArticle?.topic || 'today'}`;
                if (navigator.share) {
                  navigator.share({ title: dailyArticle?.topicDisplay || 'Daily Wisdom', url }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(url);
                }
              }}
              className="px-3 py-2 rounded-lg hover:bg-white/5"
              style={{ color: accentColor, fontSize: '0.85rem' }}
            >
              Share
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-12">
            <div className="mx-auto" style={{ maxWidth: '720px' }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: accentColor,
                  marginBottom: '12px',
                }}
              >
                {dailyArticle?.date || new Date().toISOString().split('T')[0]} · {belief.name}
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
                  fontWeight: 300,
                  color: 'rgba(255,248,240,0.98)',
                  lineHeight: 1.2,
                  marginBottom: '24px',
                }}
              >
                {articleLoading ? 'Gathering wisdom…' : (dailyArticle?.title || 'Daily Wisdom')}
              </h1>
              {articleLoading && (
                <p style={{ fontFamily: 'var(--font-body, Outfit)', fontSize: '1rem', color: 'rgba(255,248,240,0.6)' }}>
                  Generating today's reflection for {belief.name}…
                </p>
              )}
              {dailyArticle && !articleLoading && (
                <div style={{ fontFamily: 'var(--font-body, Outfit)', color: 'rgba(255,248,240,0.85)' }}>
                  <p style={{ fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '28px', fontStyle: 'italic' }}>
                    {dailyArticle.body.intro}
                  </p>
                  {dailyArticle.body.sections?.map((s, i) => (
                    <div key={i} style={{ marginBottom: '28px' }}>
                      <h2
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.4rem',
                          fontWeight: 400,
                          color: accentColor,
                          marginBottom: '10px',
                        }}
                      >
                        {s.heading}
                      </h2>
                      <p style={{ fontSize: '1rem', lineHeight: 1.8 }}>{s.body}</p>
                    </div>
                  ))}
                  {dailyArticle.body.closing && (
                    <p style={{ fontSize: '1rem', lineHeight: 1.8, marginBottom: '24px' }}>
                      {dailyArticle.body.closing}
                    </p>
                  )}
                  {dailyArticle.body.cta && (
                    <button
                      onClick={() => setShowDailyWisdom(false)}
                      className="w-full text-center py-4 px-6 rounded-xl mt-4"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                        border: `1px solid ${accentColor}60`,
                        color: accentColor,
                        fontSize: '0.95rem',
                        fontWeight: 500,
                      }}
                    >
                      {dailyArticle.body.cta}
                    </button>
                  )}
                </div>
              )}
              {!dailyArticle && !articleLoading && (
                <p style={{ fontFamily: 'var(--font-body, Outfit)', fontSize: '1rem', color: 'rgba(255,248,240,0.6)' }}>
                  Unable to load today's reflection. Please try again later.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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

// Greeting messages - uses canonical config with normalization
function getGreeting(beliefId: string): string {
  return getGreetingForBelief(normalizeBeliefId(beliefId));
}
