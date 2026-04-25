import { useState, useEffect, useRef, memo, useCallback } from 'react';

// localStorage flag: once the user has granted mic permission on this
// device, we skip the pre-flight getUserMedia() probe on subsequent mic
// taps. The cached SpeechRecognition instance in speechInput.ts already
// avoids per-instance re-prompts; this flag additionally avoids the
// permission-probe round-trip entirely after first grant.
const MIC_GRANTED_KEY = 'aimighty_mic_granted';
import { sendMessage, summarizeConversation, type Message } from '../../services/claudeApi';
import { speakWithOpenAI, stop as stopSpeaking, initAudio, setVoiceEnabled, isVoiceEnabled, unlockMobileAudio, replayAudio, enqueueSentence, clearSentenceQueue, prewarmTts, resumeAudio, isAudioPaused } from '../../services/openaiTTS';
import { startListening, stopListening, isSupported as isSpeechSupported, requestMicrophonePermission } from '../../services/speechInput';
import { showToast } from '../../services/toast';
import { incrementMessageCount, hasReachedFreeLimit, getRemainingFreeMessages } from '../../services/auth';
import {
  getTier,
  hasReachedDailyLimit,
  incrementDailyCount,
  bumpStreak,
  getStreak,
  streakMilestone,
  saveMemory,
  formatMemoryContext,
  getCharacterForBelief,
  setCharacterForBelief,
} from '../../services/tierService';
import { t, type LanguageCode } from '../../data/translations';
import { type CategorizedBeliefSystem, beliefSystems, categoryLabels, type BeliefCategory } from '../../data/beliefSystems';
import { normalizeBeliefId, getGreetingForBelief } from '../../config/beliefSystems';
import { getBeliefPillLabel, getAvailableCharacters, hasMultipleCharacters } from '../../config/beliefPillLabels';
import { getDescriptorForBelief } from '../../config/beliefDescriptors';
import { getOpeningMessageForBelief } from '../../config/openingMessages';
import { fetchWithTimeout } from '../../services/fetchWithTimeout';
import { openBillingPortal, isStripeConfigured } from '../../config/stripe';
import { CaptureMoment } from '../CaptureMoment';
import { DailyBeliefStudy } from '../DailyBeliefStudy';
import { track } from '../../utils/analytics';
import { colors } from '../../styles/designSystem';
import { BeliefBackground, isBeliefBackgroundSupported } from '../backgrounds/BeliefBackground';
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
// Padlock icon rendered next to menu items that are locked for the
// current tier. Keeps the dropdown's affordance explicit rather than
// relying on opacity alone.
const LockIcon = memo(function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

// Header share glyph — triggers Capture This Moment for the latest
// {user question, God reply} pair. Arrow-up-from-square style, lives
// next to the speaker/menu icons.
const HeaderShareIcon = memo(function HeaderShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
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

// Belief selector modal — redesigned per Task 5. Fills 80% of the
// viewport height, single-column list with 56px minimum touch targets
// (Apple HIG 44px floor with headroom), gold section headers, white
// belief names, descriptors from src/config/beliefDescriptors.ts, gold
// ✓ checkmark on the active belief, subtle gold dividers between
// categories, X close in the top-right corner.
const BeliefSelectorModal = memo(function BeliefSelectorModal({
  isOpen,
  onClose,
  onSelect,
  currentBeliefId,
  currentCharacter,
  onSelectCharacter,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (belief: CategorizedBeliefSystem) => void;
  currentBeliefId: string;
  currentCharacter: Character;
  onSelectCharacter: (character: Character) => void;
}) {
  if (!isOpen) return null;

  const categories: BeliefCategory[] = ['religious', 'spiritual', 'philosophical'];
  const canonicalId = normalizeBeliefId(currentBeliefId);
  const availableCharacters = getAvailableCharacters(canonicalId);
  const showFigureStrip = hasMultipleCharacters(canonicalId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Switch belief system"
    >
      <div
        className="w-full"
        style={{
          maxWidth: '520px',
          height: '80vh',
          background: 'rgba(12, 12, 22, 0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${colors.gold}30`,
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(212, 184, 130, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            padding: '20px 24px 16px 24px',
            borderBottom: `1px solid ${colors.gold}1a`,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.375rem',
              fontWeight: 400,
              color: 'rgba(255, 248, 240, 0.95)',
              letterSpacing: '0',
              lineHeight: 1.25,
            }}
          >
            Who do you want to talk to?
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center rounded-lg hover:bg-white/5"
            style={{ width: '40px', height: '40px', color: 'rgba(255,255,255,0.55)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Figure chip strip — primary action when the active belief
            supports 2+ figures (Christian beliefs + spiritual traditions
            with Mary). For single-figure beliefs the strip is omitted
            and the modal opens straight to the belief list. Spec:
            .stitch/DESIGN.md §5.6. */}
        {showFigureStrip && (
          <div className="figure-strip-section">
            <div className="figure-strip-eyebrow">Currently speaking with</div>
            <div className="figure-strip-row">
              {availableCharacters.map((char) => {
                const isActive = char === currentCharacter;
                const label = getBeliefPillLabel(canonicalId, char);
                return (
                  <button
                    key={char}
                    onClick={() => { onSelectCharacter(char); onClose(); }}
                    className={`figure-chip${isActive ? ' figure-chip-active' : ''}`}
                    aria-pressed={isActive}
                    aria-label={`Speak with ${label}`}
                  >
                    {label}
                    {isActive && (
                      <svg className="figure-chip-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="figure-strip-divider" aria-hidden="true" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto" style={{ padding: '8px 12px 24px 12px' }}>
          {categories.map((category, catIdx) => {
            const items = beliefSystems.filter((b) => b.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                {catIdx > 0 && (
                  <div
                    aria-hidden
                    style={{
                      height: '1px',
                      margin: '12px 12px',
                      background: `${colors.gold}33`,
                    }}
                  />
                )}
                <h3
                  style={{
                    margin: 0,
                    padding: '14px 12px 10px 12px',
                    fontSize: '0.72rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: colors.gold,
                    fontFamily: 'var(--font-body, Outfit)',
                    fontWeight: 500,
                  }}
                >
                  {categoryLabels[category]}
                </h3>
                <div className="flex flex-col" style={{ gap: '6px' }}>
                  {items.map((b) => {
                    const isActive = normalizeBeliefId(b.id) === canonicalId;
                    return (
                      <button
                        key={b.id}
                        onClick={() => { onSelect(b); onClose(); }}
                        className="flex items-center justify-between transition-all text-left"
                        style={{
                          minHeight: '56px',
                          padding: '10px 14px',
                          borderRadius: '14px',
                          background: isActive ? `${b.accentColor}1a` : 'transparent',
                          border: isActive ? `1px solid ${b.accentColor}99` : '1px solid transparent',
                          boxShadow: isActive ? `0 0 24px ${b.accentColor}20` : 'none',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        <div className="flex flex-col" style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-body, Outfit)',
                              fontSize: '1rem',
                              fontWeight: isActive ? 500 : 400,
                              color: 'rgba(255, 248, 240, 0.95)',
                              lineHeight: 1.25,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {b.name}
                          </span>
                          <span
                            style={{
                              marginTop: '3px',
                              fontFamily: "'Cormorant Garamond', Georgia, serif",
                              fontStyle: 'italic',
                              fontSize: '0.88rem',
                              color: 'rgba(255, 248, 240, 0.55)',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {getDescriptorForBelief(normalizeBeliefId(b.id))}
                          </span>
                        </div>
                        {isActive && (
                          <span
                            aria-label="Currently selected"
                            style={{ color: colors.gold, flexShrink: 0 }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
  onDailyBeliefStudy,
  onDailyPrayer,
  onSacredText,
  onSignOut,
  onNavigate,
  onManageSubscription,
  onAboutAI,
  tier,
  streakDays,
  onUpgrade,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSwitchBelief: () => void;
  onDailyBeliefStudy: () => void;
  onDailyPrayer: () => void;
  onSacredText: () => void;
  onSignOut: () => void;
  onNavigate?: (screen: 'terms' | 'privacy') => void;
  onManageSubscription: () => void;
  onAboutAI: () => void;
  tier: 'free' | 'believer' | 'divine';
  streakDays: number;
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

  // Locked items show at 60% opacity with a padlock SVG on the right.
  // Tap routes to the paywall (onUpgrade) instead of the item's action.
  // `locked` is derived from the tier gate: anything requiring a paid tier
  // is locked for free users.
  const item = (label: string, action: () => void, locked = false) => {
    const isLocked = locked || isFree;
    return (
      <button
        onClick={() => { if (isLocked) { onUpgrade(); onClose(); return; } action(); onClose(); }}
        className="menu-item"
        style={{
          ...baseItemStyle,
          opacity: isLocked ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span>{label}</span>
        {isLocked && (
          <span style={{ color: 'rgba(255,255,255,0.65)', display: 'inline-flex', alignItems: 'center' }}>
            <LockIcon />
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-2 z-50"
        style={{
          background: 'rgba(14, 14, 22, 0.78)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          border: '1px solid rgba(212, 184, 130, 0.20)',
          borderRadius: '18px',
          minWidth: '240px',
          padding: '8px 0',
          overflow: 'hidden',
          boxShadow: '0 1px 0 0 rgba(255, 255, 255, 0.06) inset, 0 20px 60px -20px rgba(0, 0, 0, 0.6)',
          transformOrigin: 'top right',
          animation: 'menuDropdownEnter 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Daily content. "Reflection" was removed and its role is now
            filled by Daily Belief Study (a live 3-question conversational
            flow). The LandingPage + PaywallScreen market DBS as a Believer
            feature (Divine gets the "- Interactive" variant with memory
            recall), so Believer tier has access here too — only free users
            see the padlock. Marketing and product stay in sync. */}
        {item('Daily Prayer', onDailyPrayer)}
        {item('Sacred Text', onSacredText)}
        {item('Daily Belief Study', onDailyBeliefStudy)}

        <div style={{ height: '1px', margin: '8px 16px', background: 'rgba(212, 184, 130, 0.2)' }} />

        {/* Streak row — gold-bordered "Day N" pill, replaces the 🔥 emoji
            that used to come through from formatStreak(). Read-only row,
            not tappable. */}
        <div
          className="flex items-center justify-between"
          style={{
            ...baseItemStyle,
            padding: '12px 20px',
            cursor: 'default',
          }}
        >
          <span>Streak</span>
          <span
            style={{
              display: 'inline-block',
              border: `1px solid ${colors.gold}`,
              borderRadius: '999px',
              padding: '3px 10px',
              fontSize: '12px',
              fontWeight: 500,
              color: colors.gold,
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}
          >
            Day {streakDays}
          </span>
        </div>

        <div style={{ height: '1px', margin: '8px 16px', background: 'rgba(212, 184, 130, 0.2)' }} />

        <button
          onClick={() => { onSwitchBelief(); onClose(); }}
          className="menu-item"
          style={baseItemStyle}
        >
          Other Beliefs
        </button>

        {/* Manage Subscription is now always visible. The label flips to
            "Upgrade Plan" for free users, and the tap handler in the parent
            routes appropriately (paywall / billing portal / unavailable
            modal) based on tier + isStripeConfigured(). */}
        <button
          onClick={() => { onManageSubscription(); onClose(); }}
          className="menu-item"
          style={baseItemStyle}
        >
          {isFree ? 'Upgrade Plan' : 'Manage Subscription'}
        </button>

        <div style={{ height: '1px', margin: '8px 16px', background: 'rgba(212, 184, 130, 0.2)' }} />

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
            paddingBottom: '10px',
          }}
        >
          Privacy Policy
        </button>

        {/* About this AI — relocated from the conversation view per
            DESIGN.md §5.8. Opens a glass modal explaining the AI nature
            of the experience without breaking the reverent atmosphere
            of the active conversation. */}
        <button
          onClick={() => { onAboutAI(); onClose(); }}
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
          About this AI
        </button>

        <div style={{ height: '1px', margin: '8px 16px', background: 'rgba(212, 184, 130, 0.2)' }} />

        <button
          onClick={() => { onSignOut(); onClose(); }}
          className="menu-item"
          style={{
            ...baseItemStyle,
            color: '#ef4444',
          }}
        >
          Sign Out
        </button>

        <style>{`
          .menu-item:hover {
            background: rgba(255, 255, 255, 0.05) !important;
            border-left-color: transparent !important;
          }
          .menu-item:active {
            background: rgba(255, 255, 255, 0.09) !important;
          }
          @keyframes menuDropdownEnter {
            from {
              opacity: 0;
              transform: translateY(-4px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
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
  // Shown when a paid user taps Manage Subscription but isStripeConfigured()
  // is false (price IDs haven't been wired up yet). This prevents the raw
  // "Invalid request body" iOS system alert that used to appear when
  // openBillingPortal was called against an unconfigured worker.
  const [showSubscriptionUnavailable, setShowSubscriptionUnavailable] = useState(false);

  // About-this-AI modal — opened from the hamburger menu's "About this AI"
  // item. Replaces the per-conversation AI disclosure line that used to
  // run under the divine greeting. Spec: .stitch/DESIGN.md §5.8.
  const [showAboutAI, setShowAboutAI] = useState(false);
  interface DailyContent {
    belief: string;
    date: string;
    prayer: string;
    sacredText: { reference: string; text: string; reflection: string };
    reflectionPrompt: string;
  }
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null);
  // (Old /daily-article fetching was tied to the in-app article reader
  // that the Daily Belief Study 3-question flow replaces. The public
  // /[belief]/[slug] SEO route still consumes /daily-article via
  // ArticlePage.tsx.)
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [imageError, setImageError] = useState(false);
  // Default character per belief: sbnr/taoism/pantheism speak with the Divine Feminine (mary/coral).
  // P2-4: restore persisted character if the user previously chose one for this belief.
  const [character, setCharacterState] = useState<Character>(() => {
    const stored = getCharacterForBelief(belief.id);
    if (stored === 'god' || stored === 'jesus' || stored === 'mary') return stored;
    return ['sbnr', 'taoism', 'pantheism'].includes(belief.id) ? 'mary' : 'god';
  });
  // Persist character choice per belief so "switch to Jesus" survives tab close.
  const setCharacter = useCallback((next: Character) => {
    setCharacterState(next);
    setCharacterForBelief(belief.id, next);
  }, [belief.id]);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [replayingMessageId, setReplayingMessageId] = useState<string | null>(null);
  // Capture This Moment overlay state — holds the exact {question, reply}
  // pair the user wants to turn into a shareable. Null means no overlay.
  const [capturing, setCapturing] = useState<{ question: string; reply: string } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);
  const fullResponseRef = useRef('');
  const streamingMessageId = useRef<string | null>(null);
  const apiMessagesAtUnmountRef = useRef<Message[] | null>(null);
  // P1 perf: track TTS drain watcher timers so we can clear on unmount
  // to prevent setInterval/setTimeout from firing setState on an unmounted
  // component (causes React warning + slow leak if user navigates mid-TTS).
  const drainWatcherRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drainSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // P1 perf: batch token-stream renders into rAF. Claude can emit 150-300
  // tokens/s; without batching each token triggers a setState -> reconcile
  // on a potentially long message list. rAF caps it at the display's
  // refresh rate (~60 Hz) for the same visual fidelity with far less work.
  const pendingRafRef = useRef<number | null>(null);
  // Synchronous send guard — prevents double-tap on mobile from firing two
  // parallel requests before React commits the state flush (P0-2).
  const isSendingRef = useRef(false);
  // Stable per-conversation id so Divine memory checkpoints from the SAME
  // session overwrite each other but a new session adds a new entry even
  // on the same calendar day (closes P1-3).
  const sessionIdRef = useRef<string>(
    `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  );

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

  // Initialize audio on first interaction.
  // P1-5: initAudio() only preconnects — it does NOT satisfy iOS Safari's
  // gesture-unlock requirement. Without calling unlockMobileAudio() here,
  // the very first TTS sentence (Divine greeting) can arrive outside the
  // user-gesture window and be silently blocked. Run the silent-MP3
  // unlock synchronously inside the first tap/touch so subsequent
  // programmatic audio.play() calls are permitted.
  useEffect(() => {
    const handleInteraction = () => {
      unlockMobileAudio();
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
          // Batch into rAF so we re-render at frame rate, not token rate.
          if (pendingRafRef.current !== null) return;
          pendingRafRef.current = requestAnimationFrame(() => {
            pendingRafRef.current = null;
            const snapshot = fullResponseRef.current;
            setDisplayMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...m, content: snapshot } : m
              )
            );
          });
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
          // Cancel any pending token-batch rAF so its stale snapshot
          // cannot overwrite the final committed text.
          if (pendingRafRef.current !== null) {
            cancelAnimationFrame(pendingRafRef.current);
            pendingRafRef.current = null;
          }
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
                    sessionId: sessionIdRef.current,
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
            // Clear any previous watcher before starting a new one.
            if (drainWatcherRef.current) clearInterval(drainWatcherRef.current);
            if (drainSafetyRef.current) clearTimeout(drainSafetyRef.current);
            const drainWatcher = setInterval(() => {
              setDisplayMessages((prev) => {
                const msg = prev.find((m) => m.id === assistantMessageId);
                if (msg && msg.activeSentenceIdx === -1) {
                  clearInterval(drainWatcher);
                  if (drainWatcherRef.current === drainWatcher) drainWatcherRef.current = null;
                  setState('idle');
                  scheduleHideControls();
                }
                return prev;
              });
            }, 400);
            drainWatcherRef.current = drainWatcher;
            // Safety timeout
            drainSafetyRef.current = setTimeout(() => {
              clearInterval(drainWatcher);
              if (drainWatcherRef.current === drainWatcher) drainWatcherRef.current = null;
              drainSafetyRef.current = null;
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
    // Height resets automatically via the auto-grow useEffect below —
    // it fires on every inputText change including this clear.
    sendToAI(message);
  }, [inputText, isInputEnabled, sendToAI]);

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Mic toggle — permission-aware.
  //   1. First tap: pre-flight getUserMedia() so the system permission dialog
  //      appears ONCE. On grant, localStorage[MIC_GRANTED_KEY] = '1' and we
  //      skip the probe on every subsequent tap. On denial, we route a
  //      friendly notice through the global toast bus (no jarring iOS alert,
  //      no red inline text dangling below the input).
  //   2. Subsequent taps: skip the probe entirely — the cached
  //      SpeechRecognition instance in speechInput.ts avoids per-instance
  //      re-prompts, and the granted flag avoids even the getUserMedia probe.
  //   3. Runtime errors from recognition.onerror (network, not-allowed mid-
  //      session, audio-capture device missing) also route through showToast.
  const startRecognizer = useCallback(() => {
    initAudio();
    startListening({
      language,
      onStart: () => { setState('listening'); setInputText(''); },
      onResult: (transcript) => setInputText(transcript),
      onEnd: () => setState('idle'),
      onError: (error) => {
        setState('idle');
        // Route permission/device errors through the global toast.
        // speechInput.ts already normalizes codes to friendly strings;
        // we suppress the empty 'aborted' case it emits on user cancel.
        if (error) showToast(error, { type: 'error' });
      },
    });
  }, [language]);

  const handleMicToggle = useCallback(async () => {
    // Unlock mobile audio on user gesture
    unlockMobileAudio();
    if (state === 'listening') {
      stopListening();
      setState('idle');
      return;
    }
    if (state !== 'idle') return;

    if (!isSpeechSupported()) {
      showToast('Voice input isn’t supported in this browser. You can still type below.', { type: 'error' });
      return;
    }

    // Skip probe if we've already been granted on this device.
    const alreadyGranted = (() => {
      try { return localStorage.getItem(MIC_GRANTED_KEY) === '1'; } catch { return false; }
    })();

    if (alreadyGranted) {
      startRecognizer();
      return;
    }

    // First-time probe — single getUserMedia() so the system dialog fires
    // once, here, inside a user gesture. On grant we persist the flag and
    // start the recognizer.
    const granted = await requestMicrophonePermission();
    if (!granted) {
      showToast('Voice input needs microphone access. You can still type below.', { type: 'error' });
      return;
    }
    try { localStorage.setItem(MIC_GRANTED_KEY, '1'); } catch { /* quota / private mode — proceed anyway */ }
    startRecognizer();
  }, [state, startRecognizer]);

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

  // Fetch daily content (prayer / sacred text) on demand
  useEffect(() => {
    if (!showPrayerModal && !showSacredTextModal) return;
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
  }, [showPrayerModal, showSacredTextModal, belief.id, dailyContent]);

  // Clear any in-flight TTS drain watcher on unmount so setInterval
  // doesn't keep firing setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (drainWatcherRef.current) {
        clearInterval(drainWatcherRef.current);
        drainWatcherRef.current = null;
      }
      if (drainSafetyRef.current) {
        clearTimeout(drainSafetyRef.current);
        drainSafetyRef.current = null;
      }
      if (pendingRafRef.current !== null) {
        cancelAnimationFrame(pendingRafRef.current);
        pendingRafRef.current = null;
      }
    };
  }, []);

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
              sessionId: sessionIdRef.current,
            });
          }
        })
        .catch(() => {});
    };
  }, [belief.id]);

  // (Old daily-article fetch + in-app reader were replaced by the new
  // 3-question Daily Belief Study flow — see <DailyBeliefStudy/>. The
  // worker's /daily-article endpoint is still used by ArticlePage.tsx
  // for SEO routes and by the public /[belief]/[slug] pages.)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  // iOS keyboard architecture (rebuilt 2026-04-22):
  //
  // The previous --vvh + visualViewport-listener + --kb-offset approach
  // was REMOVED. It was overcomplicated and caused the bugs it was meant
  // to prevent (input hovering above the keyboard, ghost region below
  // the input, layout instability during URL-bar chrome animations).
  //
  // The new architecture is declarative, CSS-only:
  //   1. index.html sets `interactive-widget=resizes-content` so iOS
  //      Safari 16.4+ resizes the layout viewport when the keyboard
  //      opens (instead of overlaying the keyboard on top of the page).
  //   2. .conversation-screen is `height: 100dvh` (dynamic viewport)
  //      which shrinks with that viewport change.
  //   3. .conversation-messages is `flex: 1` so it shrinks to fit,
  //      and .conversation-input is `position: sticky; bottom: 0;
  //      flex-shrink: 0` — it rides the bottom of the now-shorter
  //      flex container, naturally sitting just above the keyboard.
  //
  // No JavaScript keyboard math. No focus/blur CSS-variable writes.
  // The focus handler just calls showControls() so the input section
  // reveals itself if it was auto-hidden mid-TTS.
  const handleInputFocus = useCallback(() => {
    showControls();
  }, [showControls]);

  // Auto-grow the textarea on any value change — covers typing AND
  // external sources (mic onResult, Stripe handoff, daily-prompt primer
  // that sets inputText via setInputText). A plain onChange handler
  // misses the mic path because React doesn't synthesize onChange for
  // setState-driven value updates; relying on that was the source of the
  // stale-height "distortion" bug after a voice-to-text dictation.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputText]);

  const remainingMessages = getRemainingFreeMessages();
  const actualImagePath = imageError ? fallbackImagePath : imagePath;

  // Handle any tap on the screen.
  //   1. Unlock mobile audio (no-op after first unlock — MUST early-return
  //      inside unlockMobileAudio or this kills playing audio).
  //   2. If audio is currently paused (e.g. iOS backgrounding, tab switch,
  //      or manual pause), resume from where it left off. Tap-to-resume.
  //   3. Never stop playing audio — uninterrupted divine voice.
  const handleScreenTap = useCallback(() => {
    unlockMobileAudio();
    if (isAudioPaused()) {
      resumeAudio();
    }
  }, []);

  // Header share handler — walks backwards from the end of the thread to
  // find the latest {user question, God reply} pair and opens the Capture
  // This Moment overlay for it. If there isn't a completed pair yet
  // (fresh conversation, only greeting), the icon no-ops silently.
  const handleHeaderShare = useCallback(() => {
    if (streamingMessageId.current) return; // don't capture mid-stream
    for (let i = displayMessages.length - 1; i >= 1; i--) {
      const msg = displayMessages[i];
      const prev = displayMessages[i - 1];
      if (msg.role === 'assistant' && prev.role === 'user' && msg.content.trim().length > 0) {
        track('capture_button_tapped', { belief: belief.id, message_id: msg.id, source: 'header' });
        setCapturing({ question: prev.content, reply: msg.content });
        return;
      }
    }
  }, [displayMessages, belief.id]);

  return (
    <div
      className="conversation-screen"
      style={{ background: '#030308' }}
      role="main"
      aria-label={`Conversation with ${belief.name}`}
      onClick={handleScreenTap}
      onTouchStart={handleScreenTap}
    >
      {/* Layer 0 — background.
          Phase 1 (2026-04-23): supported beliefs (christianity/islam/buddhism)
          render the per-belief sacred-geometry `<BeliefBackground>` system
          inside `.conversation-bg`. All other beliefs retain the existing
          figure-image background until Phase 2 extends the system to them.
          `.conversation-bg` itself stays `position:fixed; inset:0; z:0` —
          layout is untouched; only what paints inside it changes. */}
      {isBeliefBackgroundSupported(normalizeBeliefId(belief.id)) ? (
        <div className="conversation-bg" aria-hidden="true">
          <BeliefBackground beliefId={normalizeBeliefId(belief.id)} />
        </div>
      ) : (
        <div
          className="conversation-bg"
          style={{
            backgroundImage: `url(${actualImagePath})`,
            /* scale + translateY pushes the face out of the header/status-bar
               zone down to ~45% of the viewport on iPhone 16. On 9:16 source
               images cover-fit to 9:19.5 viewports would otherwise pin the
               face to the top third. Transform-origin at center-top keeps the
               top edge anchored so there's no visible gap above the image. */
            transform: 'scale(1.18) translateY(8%)',
            transformOrigin: 'center top',
            filter: 'saturate(0.7) brightness(0.85)',
          }}
          aria-hidden="true"
        />
      )}
      {!isMobile && (
        <img
          src={imagePath}
          alt=""
          style={{ display: 'none' }}
          onError={() => setImageError(true)}
        />
      )}

      {/* Layer 1 — gradient overlay.
          Deepened top stops give God's face ≥80px of tonal separation
          from the header bar (spec: "figure's face not touching the
          title bar"). On iPhone 16 (393×852) the header bottom edge is
          at ~13% of viewport height; the gradient holds 0.55+ opacity
          through the first 20% of viewport, which recedes the face
          behind a visible-but-tonal veil until the messages region
          starts. Bottom ramp unchanged — readability for the textarea. */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, ' +
            'rgba(3,3,8,0.78) 0%, ' +
            'rgba(3,3,8,0.55) 10%, ' +
            'rgba(3,3,8,0.25) 20%, ' +
            'rgba(0,0,0,0) 32%, ' +
            'rgba(0,0,0,0.15) 55%, ' +
            'rgba(3,3,8,0.55) 75%, ' +
            'rgba(3,3,8,0.85) 100%)',
          zIndex: 1,
        }}
        aria-hidden="true"
      />

      {/* The rest of the flex children — header, messages, input — sit
          directly under .conversation-screen. No intermediate flex
          wrapper. The conversation-screen itself is the flex column;
          100dvh shrinks when the iOS keyboard opens (thanks to
          interactive-widget=resizes-content in index.html) and the
          sticky input rides the bottom of that shrinking container. */}

      {/* Top bar */}
      <header
        className="conversation-header flex items-center justify-between"
        style={{ paddingLeft: '20px', paddingRight: '20px', opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}
      >
          <button
            onClick={onBack}
            aria-label="Go back"
            className="flex items-center justify-center -ml-2 rounded-lg transition-colors hover:bg-white/5"
            style={{
              // WCAG 2.5.5 / Apple HIG: 44x44 minimum hit area.
              // Icon glyph is unchanged; padding grows the tap target.
              width: '44px',
              height: '44px',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <BackIcon />
          </button>

          {/* Center: Merged belief pill (figure-aware). Tap opens the
              switch-belief modal. Figure switching via the modal's chip
              strip arrives in Step 5 — until then, figure changes require
              switching belief. Label mapping in beliefPillLabels.ts.
              Spec: .stitch/DESIGN.md §5.3. */}
          <button
            onClick={() => setShowBeliefModal(true)}
            className="belief-pill"
            aria-label={`Switch belief. Currently speaking with ${getBeliefPillLabel(belief.id, character)}`}
          >
            <span className="belief-pill-eyebrow">Talking to</span>
            <span className="belief-pill-name">
              {getBeliefPillLabel(belief.id, character)}
              <ChevronDownIcon />
            </span>
          </button>

          {/* Right controls — share + mute + menu icons, generous gap */}
          <div className="flex items-center" style={{ gap: '16px' }}>
            {/* Capture This Moment — captures the latest {user, reply}
                pair. Greyed out when no pair exists yet (only greeting)
                or during streaming. Styled to match the other header
                glyphs so it reads as part of the icon row, not a CTA. */}
            <button
              onClick={handleHeaderShare}
              aria-label="Capture this moment"
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/5 active:bg-white/10"
              style={{
                width: '44px',
                height: '44px',
                color: colors.gold,
                opacity: displayMessages.some((m, i) => i > 0 && m.role === 'assistant' && displayMessages[i - 1].role === 'user' && m.content.trim().length > 0) ? 0.9 : 0.35,
              }}
            >
              <HeaderShareIcon />
            </button>
            <button
              onClick={handleVoiceToggle}
              aria-label={voiceEnabled ? 'Mute voice' : 'Enable voice'}
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/5 active:bg-white/10"
              style={{
                width: '44px',
                height: '44px',
                color: voiceEnabled ? 'rgba(255,255,255,0.7)' : '#d4b882',
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
                  width: '44px',
                  height: '44px',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <MenuIcon />
              </button>
              <SettingsDropdown
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSwitchBelief={() => { onSwitchBelief?.(); }}
                onDailyBeliefStudy={() => setShowDailyWisdom(true)}
                onDailyPrayer={() => setShowPrayerModal(true)}
                onSacredText={() => setShowSacredTextModal(true)}
                onSignOut={onSignOut || (() => {})}
                onNavigate={onNavigate}
                onManageSubscription={() => {
                  // Tier- and config-aware routing per Task 4 spec:
                  //   free                → paywall
                  //   paid + Stripe wired → billing portal
                  //   paid + Stripe empty → styled in-app modal (no raw alert)
                  if (tier === 'free') {
                    onPaywall();
                    return;
                  }
                  if (!isStripeConfigured()) {
                    setShowSubscriptionUnavailable(true);
                    return;
                  }
                  void openBillingPortal(user.id);
                }}
                onAboutAI={() => setShowAboutAI(true)}
                tier={tier}
                streakDays={streak.currentStreak}
                onUpgrade={onPaywall}
              />
            </div>
          </div>
        </header>

        {/* Conversation thread — flex:1, the only part that scrolls.
            Class .conversation-messages handles flex/overflow/z-index. */}
        <div
          ref={messagesContainerRef}
          className="conversation-messages"
          onClick={controlsHidden ? showControls : undefined}
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease 0.2s',
            marginTop: '20px',
            padding: '0 24px',
            paddingBottom: '20px',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%)',
            cursor: controlsHidden ? 'pointer' : 'auto',
          }}
        >
          {/* Vertical centering wrapper - centers content when only greeting */}
          {/* Desktop: max-width 800px centered. Mobile: full width */}
          {/* a11y: role=log + aria-live=polite announces new/streaming
              assistant text to screen-reader users. aria-atomic=false so
              each token update is read incrementally rather than re-reading
              the entire thread on every mutation. */}
          <div
            className="mx-auto flex flex-col"
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-relevant="additions text"
            style={{
              minHeight: '100%',
              maxWidth: 'min(800px, 100%)',
              justifyContent: displayMessages.length <= 1 ? 'center' : 'flex-start',
              paddingTop: displayMessages.length <= 1 ? '0' : '24px',
              paddingBottom: '24px',
              gap: '24px',
            }}
          >
            {displayMessages.map((message, index) => {
              // Capture-this-moment is now triggered from the header share
              // icon (captures the latest {user, reply} pair). The old
              // per-reply inline affordance was moved out of the message
              // body because it broke conversation flow.
              return (
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
                  // God's message - divine text, centered on both mobile and
                  // desktop. The cinematic spoken-word feel only works because
                  // responses are hard-capped at 1-2 sentences / 60 words in
                  // the Worker (max_tokens: 120) and system prompt. Long
                  // centered prose wraps awkwardly — do not relax the cap.
                  <div
                    className="text-divine relative group"
                    style={{
                      maxWidth: isMobile ? 'calc(100% - 24px)' : '65%',
                      textAlign: 'center',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    {renderDivineContent(message, accentColor)}
                    {/* Capture This Moment trigger moved to the header
                        share icon (see top bar). The inline button under
                        each reply broke conversation flow. */}
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
              );
            })}

            {/* Thinking dots */}
            {state === 'sending' && (
              <div className="flex justify-center" style={{ animation: 'fadeInUp 0.3s ease forwards' }}>
                <ThinkingDots color={accentColor} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* AI disclosure removed from the conversation view 2026-04-24 —
            relocated to hamburger menu "About this AI" item per
            .stitch/DESIGN.md §5.8. Repeating disclosure on every session
            broke the reverent atmosphere. Users see disclosure on
            LandingPage, BeliefWelcomeScreen onboarding, and PaywallScreen
            footer; the menu item is the persistent in-app reference. */}

      {/* Input bar — sticky bottom of the flex column.
          Class .conversation-input handles position:sticky, z-index,
          safe-area bottom padding. When the iOS keyboard opens and
          100dvh shrinks, .conversation-messages (flex:1) absorbs the
          reduction and this sticky input rides up with the container's
          new bottom edge — no JS math required.

          Order inside (top → bottom): chevron (hide/show toggle) → mic
          button → textarea. Previously the chevron was below the textarea
          which pushed the textarea well above the safe-area bottom; on
          iPhone that made the input feel "floating mid-screen." Keeping
          chevron at the top means the textarea sits one safe-area-inset
          above the home indicator with no other element between them. */}
      <div className="conversation-input">
        {/* Chevron indicator — always visible at the TOP of the input
            container. Tapping toggles the mic + textarea visibility. When
            controls are hidden, only the chevron remains pinned at this
            spot above the home-indicator safe area. */}
        <button
          onClick={toggleControls}
          className="flex justify-center items-center w-full"
          style={{
            color: 'rgba(255, 255, 255, 0.2)',
            paddingTop: '4px',
            paddingBottom: '4px',
          }}
          aria-label={controlsHidden ? 'Show input controls' : 'Hide input controls'}
        >
          <ChevronIndicator pointsUp={controlsHidden} />
        </button>

        <div
          style={{
            maxHeight: controlsHidden ? '0' : '260px',
            overflow: 'hidden',
            opacity: controlsHidden ? 0 : (isVisible ? 1 : 0),
            transition: 'max-height 0.35s ease, opacity 0.3s ease',
            pointerEvents: controlsHidden ? 'none' : 'auto',
            background: 'linear-gradient(to top, rgba(3,3,8,0.92) 0%, rgba(3,3,8,0.7) 60%, rgba(3,3,8,0) 100%)',
            position: 'relative',
          }}
        >
          {/* Scroll-to-bottom button — sits just above the input section,
              floats over the gradient background. Only shown when the
              messages list has been scrolled off the bottom. */}
          {showScrollButton && (
            <button
              onClick={() => scrollToBottom()}
              className="scroll-bead"
              aria-label="Scroll to latest message"
            >
              <ArrowDownIcon />
            </button>
          )}

          <div style={{ paddingTop: '6px' }}>
            {/* Message counter */}
            {!user.isPremium && remainingMessages <= 3 && (
              <div
                className="text-center"
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.25)',
                  marginTop: '4px',
                  marginBottom: '6px',
                }}
              >
                {remainingMessages === 0 ? t('conversation.freeMessagesUsed', language) : `${remainingMessages} ${t('conversation.freeMessages', language)}`}
              </div>
            )}

            {/* Composer pill — single glass card on a flex row that
                contains [mic | textarea | send] in left-to-right order.
                Spec: .stitch/DESIGN.md §5.5. The .composer-card class
                draws the glass + gold hairline; the textarea inside is
                transparent and structural-only. font-size 16px on the
                textarea is REQUIRED on iOS to prevent auto-zoom on
                focus. Enter = send, Shift+Enter = newline. */}
            <div className="w-full" style={{ padding: '0 16px', marginTop: '4px' }}>
              <div className="composer-card">
                <MicButton
                  state={state}
                  accentColor={accentColor}
                  onToggle={handleMicToggle}
                  isDisabled={hasReachedFreeLimit() && !user.isPremium}
                />
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  placeholder={state === 'listening' ? `${t('conversation.listening', language)}...` : t('conversation.speakYourTruth', language)}
                  disabled={!isInputEnabled}
                  maxLength={500}
                  enterKeyHint="send"
                  className="conversation-textarea"
                  style={{
                    opacity: isInputEnabled ? 1 : 0.35,
                    // touch-action: manipulation kills Safari's 300ms
                    // double-tap-to-zoom gesture on the textarea, which
                    // was the source of the visible distortion on first
                    // tap. scrollMarginBottom gives iOS a bottom cushion
                    // when scrollIntoView centers the field, so the
                    // keyboard dismiss never clips the field.
                    touchAction: 'manipulation',
                    scrollMarginBottom: '20px',
                    // Promote to its own compositor layer so the height
                    // transition (auto-grow) doesn't force a reflow of
                    // the message list above.
                    transform: 'translateZ(0)',
                  }}
                />
                <button
                  onClick={inputText.trim() && isInputEnabled ? handleSend : undefined}
                  aria-label="Send message"
                  disabled={!(inputText.trim() && isInputEnabled)}
                  className={`composer-send${inputText.trim() && isInputEnabled ? ' is-ready' : ''}`}
                >
                  <SendIcon />
                </button>
              </div>
            </div>

            {/* Mic/speech errors route through the global toast bus
                (see handleMicToggle). No inline error rendering here. */}
          </div>
        </div>
      </div>

      {/* Subscription-unavailable modal — shown when a paid user taps
          Manage Subscription but Stripe price IDs aren't wired up yet.
          Dark cosmic bg + gold border per the design system; dismissable
          by the "Got it" button, the X icon, or tapping the backdrop. */}
      {showSubscriptionUnavailable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(3, 3, 8, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '16px',
          }}
          onClick={() => setShowSubscriptionUnavailable(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-unavailable-title"
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '400px',
              background: 'rgba(10, 10, 20, 0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${colors.gold}`,
              borderRadius: '20px',
              padding: '32px 28px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(212, 184, 130, 0.15)',
            }}
          >
            <button
              onClick={() => setShowSubscriptionUnavailable(false)}
              aria-label="Close"
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3
              id="subscription-unavailable-title"
              style={{
                margin: 0,
                marginBottom: '16px',
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
                fontWeight: 400,
                color: colors.gold,
                textAlign: 'center',
                letterSpacing: '0.01em',
              }}
            >
              Subscription management
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: '24px',
                fontFamily: 'var(--font-body, Outfit)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'rgba(255, 248, 240, 0.8)',
                textAlign: 'center',
              }}
            >
              We're finalizing our billing system. To update, pause, or cancel your subscription right now, please email{' '}
              <a
                href="mailto:support@aimightyme.com"
                style={{ color: colors.gold, textDecoration: 'underline' }}
              >
                support@aimightyme.com
              </a>
              {' '}and we'll take care of it within 24 hours.
            </p>
            <button
              onClick={() => setShowSubscriptionUnavailable(false)}
              className="w-full transition-all duration-200"
              style={{
                height: '48px',
                background: colors.gold,
                color: '#0a0a0f',
                borderRadius: '12px',
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Daily content modals (prayer / sacred text) — the old
          Reflection modal was removed; its role is now filled by the
          Daily Belief Study 3-question flow rendered below. */}
      {(showPrayerModal || showSacredTextModal) && (
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
                  : `${dailyContent?.sacredText?.reference}\n${dailyContent?.sacredText?.text}`;
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
          role="alert"
          aria-live="assertive"
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
              border: '1px solid rgba(212,184,130,0.35)',
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
                  background: '#d4b882',
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
          role="alert"
          aria-live="assertive"
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

      {/* Daily Belief Study — Divine-tier 3-question conversational flow.
          Replaced the old in-app /daily-article reader; the SEO-facing
          /[belief]/[slug] route still renders articles via ArticlePage.tsx. */}
      {showDailyWisdom && (
        <DailyBeliefStudy
          belief={belief}
          user={user}
          imagePath={actualImagePath}
          language={language}
          onClose={() => setShowDailyWisdom(false)}
        />
      )}

      {/* Belief / figure selector modal — pill tap opens this. Figure
          chip strip is the primary action when the active belief has
          2+ figure options; belief list below is the secondary action.
          Spec: .stitch/DESIGN.md §5.6. */}
      <BeliefSelectorModal
        isOpen={showBeliefModal}
        onClose={() => setShowBeliefModal(false)}
        onSelect={handleBeliefChange}
        currentBeliefId={belief.id}
        currentCharacter={character}
        onSelectCharacter={setCharacter}
      />

      {/* About this AI — opened from hamburger menu. Replaces the per-
          conversation AI disclosure line. Spec: .stitch/DESIGN.md §5.8. */}
      {showAboutAI && (
        <div
          className="about-ai-scrim"
          onClick={() => setShowAboutAI(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-ai-title"
        >
          <div
            className="about-ai-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="about-ai-title" className="about-ai-title">About this AI</h2>
            <p className="about-ai-body">
              AImighty is an AI-powered spiritual companion. It is not affiliated with any religious institution and does not claim divine authority. The responses are generated by a large language model trained on public text — including sacred texts, theological writing, and philosophical works — with deep respect for every tradition it speaks from.
            </p>
            <p className="about-ai-body">
              If you ever ask directly whether you're talking to God or AI, the voice will answer honestly.
            </p>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Capture This Moment overlay — rendered at the root so the
          conversation-screen click handlers don't intercept its taps. */}
      {capturing && (
        <CaptureMoment
          question={capturing.question}
          reply={capturing.reply}
          beliefId={belief.id}
          imagePath={actualImagePath}
          onClose={() => setCapturing(null)}
        />
      )}
    </div>
  );
}

// Greeting messages.
// Per the belief-first spec, each tradition now has a hand-crafted opening
// message that sounds native to that belief. We prefer those over the
// legacy shorter greetings. The legacy `getGreetingForBelief` path remains
// as a fallback so an unregistered belief id still gets a warm line.
function getGreeting(beliefId: string): string {
  const canonical = normalizeBeliefId(beliefId);
  return getOpeningMessageForBelief(canonical) ?? getGreetingForBelief(canonical);
}
