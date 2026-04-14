import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { sendMessage, type Message } from '../../services/claudeApi';
import { speak, stop as stopSpeaking, initAudio, setVoiceEnabled, isVoiceEnabled } from '../../services/ttsService';
import { startListening, stopListening, isSupported as isSpeechSupported } from '../../services/speechInput';
import { incrementMessageCount, hasReachedFreeLimit, getRemainingFreeMessages } from '../../services/auth';
import { t, type LanguageCode } from '../../data/translations';
import { type CategorizedBeliefSystem } from '../../data/beliefSystems';
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
      {/* Outer breathing ring */}
      <div
        className="mic-button-ring"
        style={{ borderColor: accentColor }}
      />

      {/* Ripple effect when listening */}
      {isListening && (
        <div
          className="mic-button-ripple"
          style={{ borderColor: accentColor }}
        />
      )}

      {/* Icon */}
      <div style={{ color: isListening ? '#fff' : 'rgba(255,255,255,0.8)' }}>
        {isListening ? <StopIcon /> : <MicIcon />}
      </div>

      {/* Listening label */}
      {isListening && (
        <span
          className="absolute"
          style={{
            bottom: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          Listening...
        </span>
      )}
    </button>
  );
});

interface ConversationScreenProps {
  belief: BeliefSystem;
  user: User;
  onBack: () => void;
  onPaywall: () => void;
  language: LanguageCode;
}

export function ConversationScreen({ belief, user, onBack, onPaywall, language }: ConversationScreenProps) {
  // Get accent color and image path
  const categorizedBelief = belief as CategorizedBeliefSystem;
  const accentColor = categorizedBelief.accentColor || belief.themeColor;
  const imagePath = categorizedBelief.imagePath || `/images/avatars/${belief.id}.jpg`;

  // State machine
  const [state, setState] = useState<ConversationState>('idle');

  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentCaption, setCurrentCaption] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabledState] = useState(isVoiceEnabled());

  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreeted = useRef(false);
  const fullResponseRef = useRef('');

  // Input enabled only in idle state
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

  /**
   * SPEAK THE RESPONSE
   * Called AFTER streaming is complete
   */
  const speakResponse = useCallback((text: string) => {
    setState('speaking');

    speak(
      text,
      language,
      () => {
        setState('idle');
      },
      () => {} // audio level callback - not used with image background
    );

    // Fallback timeout
    setTimeout(() => {
      setState(current => current === 'speaking' ? 'idle' : current);
    }, Math.max(2000, text.length * 100));
  }, [language]);

  /**
   * GREETING ON LOAD
   * Text only — no TTS. User controls voice from there.
   */
  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;

    const greetingTimer = setTimeout(() => {
      const greeting = getGreeting(belief.id);
      setCurrentCaption(greeting);
      // No TTS for greeting — stays silent. User speaks first.
    }, 1500);

    return () => clearTimeout(greetingTimer);
  }, [belief.id]);

  /**
   * SEND MESSAGE TO CLAUDE
   */
  const sendToAI = useCallback(async (userMessage: string) => {
    if (hasReachedFreeLimit() && !user.isPremium) {
      onPaywall();
      return;
    }

    initAudio();
    setState('sending');
    setCurrentCaption('');
    fullResponseRef.current = '';

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    incrementMessageCount();

    await sendMessage(
      newMessages,
      belief.id,
      user.id,
      {
        onToken: (token) => {
          if (fullResponseRef.current === '') {
            setState('streaming');
          }
          fullResponseRef.current += token;
          setCurrentCaption(fullResponseRef.current);
        },
        onSentence: () => {},
        onComplete: (text) => {
          fullResponseRef.current = text;
          setCurrentCaption(text);
          setMessages([...newMessages, { role: 'assistant', content: text }]);
          speakResponse(text);

          if (hasReachedFreeLimit() && !user.isPremium) {
            setTimeout(onPaywall, 3000);
          }
        },
        onError: (error) => {
          console.error('[Conversation] Error:', error);
          const errorMessage = "I am still here. Please try speaking to me again.";
          setCurrentCaption(errorMessage);
          speakResponse(errorMessage);
        },
      },
      language
    );
  }, [messages, belief.id, user.id, user.isPremium, speakResponse, onPaywall, language]);

  // Handle send
  const handleSend = useCallback(() => {
    if (!inputText.trim() || !isInputEnabled) return;
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

  /**
   * MIC TOGGLE
   */
  const handleMicToggle = useCallback(() => {
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
        onStart: () => {
          setState('listening');
          setInputText('');
        },
        onResult: (transcript) => {
          setInputText(transcript);
        },
        onEnd: () => {
          setState('idle');
        },
        onError: (error) => {
          setState('idle');
          setSpeechError(error);
          setTimeout(() => setSpeechError(null), 3000);
        },
      });
    }
  }, [state, language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const remainingMessages = getRemainingFreeMessages();

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: '#000',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
      role="main"
      aria-label={`Conversation with ${belief.name}`}
    >
      {/* Background image */}
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: `url(${imagePath})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden="true"
      />

      {/* Gradient overlay - image shows through at top, dark at bottom */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 90%, rgba(0,0,0,0.97) 100%)',
        }}
        aria-hidden="true"
      />

      {/* UI Layer */}
      <div
        className="relative z-10 flex flex-col h-full safe-top"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)',
        }}
      >
        {/* Top bar - floating, no background */}
        <header
          className="flex items-center justify-between shrink-0"
          style={{
            padding: '16px 20px',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        >
          {/* Back */}
          <button
            onClick={onBack}
            aria-label="Go back"
            className="p-2 -ml-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <BackIcon />
          </button>

          {/* Belief name */}
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              fontWeight: 300,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {belief.name}
          </span>

          {/* Voice toggle */}
          <button
            onClick={handleVoiceToggle}
            aria-label={voiceEnabled ? 'Mute voice' : 'Enable voice'}
            className="p-2 -mr-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <SpeakerIcon muted={!voiceEnabled} />
          </button>
        </header>

        {/* Spacer - push content down */}
        <div className="flex-1" />

        {/* Caption area */}
        <div
          className="shrink-0 flex items-center justify-center px-6"
          style={{
            minHeight: '180px',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease 0.2s',
          }}
        >
          {/* Thinking dots when sending */}
          {state === 'sending' && (
            <ThinkingDots color={accentColor} />
          )}

          {/* God's response text */}
          {(state === 'streaming' || state === 'speaking' || state === 'idle') && currentCaption && (
            <p
              className="text-divine text-center"
              style={{
                maxWidth: '85%',
                fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
                color: 'rgba(255, 248, 240, 0.95)',
                textShadow: `0 0 20px ${accentColor}20, 0 0 40px ${accentColor}10`,
                opacity: state === 'streaming' ? 0.9 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              {currentCaption}
            </p>
          )}
        </div>

        {/* Message counter */}
        {!user.isPremium && remainingMessages <= 3 && (
          <div
            className="shrink-0 text-center mb-3"
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            {remainingMessages === 0
              ? t('conversation.freeMessagesUsed', language)
              : `${remainingMessages} ${t('conversation.freeMessages', language)}`}
          </div>
        )}

        {/* Mic button */}
        <div
          className="shrink-0 flex justify-center mb-4"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease 0.4s',
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
        <div
          className="shrink-0 px-5"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease 0.5s',
          }}
        >
          <div className="relative max-w-md mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                state === 'listening'
                  ? `${t('conversation.listening', language)}...`
                  : t('conversation.speakYourTruth', language)
              }
              disabled={!isInputEnabled}
              maxLength={500}
              className="conversation-input"
              style={{
                paddingRight: inputText.trim() ? '50px' : '20px',
                opacity: isInputEnabled ? 1 : 0.35,
              }}
            />

            {/* Send button - only visible when text is entered */}
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
          <div
            className="text-center mt-2"
            style={{
              fontSize: '0.75rem',
              color: '#ef4444',
            }}
          >
            {speechError}
          </div>
        )}
      </div>
    </div>
  );
}

// Greeting messages per belief system — short and powerful
function getGreeting(beliefId: string): string {
  const greetings: Record<string, string> = {
    protestant: "I am here, My child.",
    catholic: "I am here, My child.",
    islam: "I am here. Speak.",
    judaism: "I am here. What weighs on your heart?",
    hinduism: "I am here. Speak freely.",
    buddhism: "I am here. Be still, and speak.",
    mormonism: "I am here, My child.",
    sikhism: "I am here. Speak freely.",
    sbnr: "I am here. Speak.",
    taoism: "I am here.",
    pantheism: "I am here. I have always been here.",
    science: "I am here. Ask anything.",
    agnosticism: "I am here. What's on your mind?",
    atheism: "I am here. Speak freely.",
  };
  return greetings[beliefId] || greetings.protestant;
}
