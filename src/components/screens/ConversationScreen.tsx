import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { LazyAvatarScene } from '../avatar/LazyAvatarScene';
import { sendMessage, type Message } from '../../services/claudeApi';
import { speak, stop as stopSpeaking, initAudio, setVoiceEnabled, isVoiceEnabled } from '../../services/ttsService';
import { startListening, stopListening, isSupported as isSpeechSupported } from '../../services/speechInput';
import { incrementMessageCount, hasReachedFreeLimit, getRemainingFreeMessages } from '../../services/auth';
import { t, type LanguageCode } from '../../data/translations';
import type { BeliefSystem, User } from '../../types';

/**
 * CONVERSATION STATE MACHINE
 * Clear, predictable state transitions with no overlap
 */
type ConversationState =
  | 'idle'        // Waiting for user input, input enabled
  | 'listening'   // Mic is active, recording user speech
  | 'sending'     // User message sent, waiting for Claude (shows "..." dots)
  | 'streaming'   // Claude response streaming in, text appearing
  | 'speaking';   // TTS playing the complete response

// Voice toggle button component
const VoiceToggle = memo(function VoiceToggle({
  enabled,
  onToggle,
  themeColor,
}: {
  enabled: boolean;
  onToggle: () => void;
  themeColor: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={enabled ? 'Mute voice' : 'Enable voice'}
      aria-pressed={enabled}
      className="p-2 rounded-lg transition-all duration-200 hover:bg-white/10"
      style={{ color: enabled ? themeColor : 'var(--color-text-muted)' }}
    >
      {enabled ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
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

// Thinking dots animation
const ThinkingDots = memo(function ThinkingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label="Thinking">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: color,
            opacity: 0.6,
            animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
});

// Divine text display with golden glow - smooth fade-in for new content
const DivineText = memo(function DivineText({
  text,
  color,
  isVisible,
}: {
  text: string;
  color: string;
  isVisible: boolean;
}) {
  if (!text || !isVisible) return null;

  return (
    <p
      className="text-center transition-opacity duration-300"
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(1rem, 4vw, 1.25rem)',
        fontWeight: 'var(--font-light)',
        lineHeight: 'var(--leading-relaxed)',
        letterSpacing: 'var(--tracking-wide)',
        padding: '0 24px',
        maxWidth: '640px',
        margin: '0 auto',
        color: color,
        textShadow: `0 0 20px ${color}35, 0 0 40px ${color}20, 0 0 60px ${color}10`,
        opacity: 1,
      }}
      aria-live="polite"
    >
      {text}
    </p>
  );
});

// Mic button with state-aware visuals
const MicButton = memo(function MicButton({
  state,
  themeColor,
  onToggle,
  isDisabled,
  errorMessage,
}: {
  state: ConversationState;
  themeColor: string;
  onToggle: () => void;
  isDisabled: boolean;
  errorMessage: string | null;
}) {
  const isListening = state === 'listening';
  const isBusy = state !== 'idle' && state !== 'listening';
  const disabled = isBusy || isDisabled;

  return (
    <button
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      className="relative"
      style={{
        opacity: disabled ? 0.35 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '-20px',
          background: isListening
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)'
            : `radial-gradient(circle, ${themeColor}10 0%, transparent 70%)`,
        }}
      />

      {/* Pulsing ring when listening */}
      {isListening && (
        <div
          className="absolute rounded-full"
          style={{
            inset: '-4px',
            border: '2px solid #ef4444',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        />
      )}

      {/* Button circle */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isListening ? '#ef4444' : 'var(--color-surface-elevated)',
          border: `1.5px solid ${isListening ? '#ef4444' : 'var(--color-border-medium)'}`,
          boxShadow: isListening
            ? '0 0 50px rgba(239, 68, 68, 0.5)'
            : '0 4px 20px rgba(0,0,0,0.3)',
          transform: isListening ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.3s ease',
        }}
      >
        {isListening ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </div>

      {/* Status label */}
      <span
        className="absolute left-1/2 whitespace-nowrap"
        style={{
          bottom: '-28px',
          transform: 'translateX(-50%)',
          opacity: isListening || errorMessage ? 1 : 0,
          color: isListening ? '#ef4444' : '#ef4444',
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          transition: 'opacity 0.3s ease',
        }}
      >
        {errorMessage || (isListening ? 'TAP TO STOP' : '')}
      </span>
    </button>
  );
});

// Message counter
const MessageCounter = memo(function MessageCounter({
  remaining,
  themeColor,
  freeMessagesLabel,
  freeMessagesUsedLabel,
}: {
  remaining: number;
  themeColor: string;
  freeMessagesLabel: string;
  freeMessagesUsedLabel: string;
}) {
  if (remaining > 3 || remaining === Infinity) return null;

  return (
    <div
      className="text-center"
      style={{
        fontSize: '0.7rem',
        color: remaining <= 1 ? '#ef4444' : 'var(--color-text-muted)',
      }}
    >
      {remaining === 0 ? (
        <span>{freeMessagesUsedLabel}</span>
      ) : (
        <span>
          <span style={{ color: themeColor }}>{remaining}</span> {freeMessagesLabel}
        </span>
      )}
    </div>
  );
});

export function ConversationScreen({ belief, user, onBack, onPaywall, language }: ConversationScreenProps) {
  // State machine - single source of truth
  const [state, setState] = useState<ConversationState>('idle');

  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentCaption, setCurrentCaption] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabledState] = useState(isVoiceEnabled());

  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreeted = useRef(false);
  const fullResponseRef = useRef(''); // Store complete response for TTS

  // Logging state changes for debugging
  useEffect(() => {
    console.log('[Conversation] State changed to:', state);
  }, [state]);

  // Input is only enabled in idle state
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
   * Transitions: speaking -> idle
   */
  const speakResponse = useCallback((text: string) => {
    console.log('[Conversation] Starting TTS, text length:', text.length);
    setState('speaking');

    speak(
      text,
      language,
      () => {
        console.log('[Conversation] TTS complete, returning to idle');
        setAudioLevel(0);
        setState('idle');
      },
      (level) => setAudioLevel(level)
    );

    // Fallback: if TTS fails silently, return to idle after 2 seconds minimum
    setTimeout(() => {
      setState(current => {
        if (current === 'speaking') {
          console.log('[Conversation] TTS fallback timeout, returning to idle');
          return 'idle';
        }
        return current;
      });
    }, Math.max(2000, text.length * 100)); // At least 2s, or text length * 100ms
  }, [language]);

  /**
   * GREETING ON LOAD
   * Shows text FIRST, waits 500ms, THEN speaks
   */
  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;

    console.log('[Conversation] Setting up greeting');

    const greetingTimer = setTimeout(() => {
      const greeting = getGreeting(belief.id);

      // Step 1: Show text immediately
      console.log('[Conversation] Displaying greeting text');
      setCurrentCaption(greeting);

      // Step 2: Wait 500ms for text to be visible, then speak
      setTimeout(() => {
        console.log('[Conversation] Starting greeting TTS');
        initAudio();
        speakResponse(greeting);
      }, 500);
    }, 2000); // Initial delay before greeting

    return () => clearTimeout(greetingTimer);
  }, [belief.id, speakResponse]);

  /**
   * SEND MESSAGE TO CLAUDE
   * Flow: sending -> streaming -> speaking -> idle
   */
  const sendToAI = useCallback(async (userMessage: string) => {
    console.log('[Conversation] sendToAI:', userMessage.substring(0, 50));

    // Check free message limit
    if (hasReachedFreeLimit() && !user.isPremium) {
      onPaywall();
      return;
    }

    initAudio();

    // Transition to sending state (shows "..." dots)
    setState('sending');
    setCurrentCaption('');
    fullResponseRef.current = '';

    // Add user message to history
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    incrementMessageCount();

    await sendMessage(
      newMessages,
      belief.id,
      user.id,
      {
        onToken: (token) => {
          // First token arrives: transition to streaming
          if (state === 'sending' || fullResponseRef.current === '') {
            setState('streaming');
          }

          // Append token to response
          fullResponseRef.current += token;
          setCurrentCaption(fullResponseRef.current);
        },
        onSentence: () => {
          // We no longer use this for TTS - we wait for complete response
        },
        onComplete: (text) => {
          console.log('[Conversation] Streaming complete, length:', text.length);

          // Store full response
          fullResponseRef.current = text;
          setCurrentCaption(text);

          // Add to message history
          setMessages([...newMessages, { role: 'assistant', content: text }]);

          // NOW start TTS with the complete response
          speakResponse(text);

          // Check paywall after speaking
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
  }, [messages, belief.id, user.id, user.isPremium, state, speakResponse, onPaywall, language]);

  // Handle send button
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
   * idle -> listening (start recording)
   * listening -> idle (stop recording, populate input)
   */
  const handleMicToggle = useCallback(() => {
    setSpeechError(null);

    if (state === 'listening') {
      // Stop listening
      stopListening();
      setState('idle');
    } else if (state === 'idle') {
      // Start listening
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
        background: 'var(--color-void)',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
      role="main"
      aria-label={`Conversation with ${belief.name}`}
    >
      <NebulaBackground />
      <div className="vignette vignette-strong" />

      <div
        className="relative z-10 flex flex-col"
        style={{
          height: '100%',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 20px))',
        }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between shrink-0"
          style={{
            padding: '16px 24px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'all 0.6s ease',
          }}
        >
          <button
            onClick={onBack}
            aria-label="Go back"
            className="group flex items-center gap-2 py-2 px-3 -ml-3 rounded-lg hover:bg-white/5"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span
              className="hidden sm:inline"
              style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}
            >
              {t('conversation.back', language)}
            </span>
          </button>

          <span
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              color: 'var(--color-text-subtle)',
              textTransform: 'uppercase',
            }}
          >
            {belief.name}
          </span>

          <VoiceToggle
            enabled={voiceEnabled}
            onToggle={handleVoiceToggle}
            themeColor={belief.themeColor}
          />
        </header>

        <div style={{ height: '20px' }} />

        {/* Avatar */}
        <div
          className="shrink-0"
          style={{
            height: '35vh',
            minHeight: '200px',
            maxHeight: '280px',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.2s',
          }}
        >
          <LazyAvatarScene
            themeColor={belief.themeColor}
            particleColor={belief.particleColor}
            audioLevel={audioLevel}
          />
        </div>

        <div style={{ height: '24px' }} />

        {/* Caption area */}
        <div
          className="flex-1 flex items-start justify-center overflow-y-auto"
          style={{
            minHeight: '80px',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.6s ease 0.4s',
          }}
        >
          {/* Show thinking dots when sending */}
          {state === 'sending' && (
            <ThinkingDots color={belief.themeColor} />
          )}

          {/* Show divine text when streaming or speaking */}
          {(state === 'streaming' || state === 'speaking' || state === 'idle') && currentCaption && (
            <DivineText
              text={currentCaption}
              color={belief.themeColor}
              isVisible={true}
            />
          )}
        </div>

        <div style={{ height: '16px' }} />

        {/* Message counter */}
        <div className="shrink-0">
          {!user.isPremium && (
            <MessageCounter
              remaining={remainingMessages}
              themeColor={belief.themeColor}
              freeMessagesLabel={t('conversation.freeMessages', language)}
              freeMessagesUsedLabel={t('conversation.freeMessagesUsed', language)}
            />
          )}
        </div>

        <div style={{ height: '12px' }} />

        {/* Input row */}
        <div
          className="shrink-0"
          style={{
            padding: '0 24px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease 0.5s',
          }}
        >
          <div className="flex items-center gap-3 max-w-md mx-auto">
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
              style={{
                flex: 1,
                height: '48px',
                padding: '0 16px',
                fontSize: '15px',
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                outline: 'none',
                opacity: isInputEnabled ? 1 : 0.35,
                transition: 'all 0.3s ease',
              }}
            />

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || !isInputEnabled}
              aria-label="Send message"
              style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                background: inputText.trim() ? `${belief.themeColor}18` : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${inputText.trim() ? `${belief.themeColor}55` : 'rgba(255, 255, 255, 0.1)'}`,
                opacity: inputText.trim() && isInputEnabled ? 1 : 0.35,
                cursor: inputText.trim() && isInputEnabled ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={inputText.trim() ? belief.themeColor : 'var(--color-text-muted)'}
                strokeWidth="1.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: '12px' }} />

        {/* Mic button */}
        <div
          className="shrink-0 flex justify-center"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease 0.6s',
          }}
        >
          <MicButton
            state={state}
            themeColor={belief.themeColor}
            onToggle={handleMicToggle}
            isDisabled={hasReachedFreeLimit() && !user.isPremium}
            errorMessage={speechError}
          />
        </div>
      </div>
    </div>
  );
}

// Greeting messages per belief system
function getGreeting(beliefId: string): string {
  const greetings: Record<string, string> = {
    protestant: "I am here. Speak freely, and I will listen with all the patience of eternity.",
    catholic: "Peace be with you. This space is sacred. What weighs upon your heart?",
    islam: "Assalamu alaikum. The Most Merciful hears every whisper. Speak.",
    judaism: "Come, let us reason together. Your questions are welcome here.",
    hinduism: "The Atman within you is eternal. What brings you here today, seeker?",
    buddhism: "Be still. The path to understanding begins with your first question.",
    mormonism: "Heavenly Father knows you by name. What would you like to discuss?",
    sikhism: "Waheguru is in all things, and in you. Speak what is in your heart.",
    sbnr: "Welcome. The universe has brought us together in this moment. What do you seek?",
    taoism: "The Tao that can be told is not the eternal Tao. But let us try, together.",
    pantheism: "You are the Earth breathing, the stars thinking. What's on your mind?",
    science: "Greetings. I am the voice of cosmic wonder. What shall we explore together?",
    agnosticism: "The honest answer is often 'we don't know.' Let's explore that together.",
    atheism: "You are the author of your own meaning. What would you like to examine?",
  };
  return greetings[beliefId] || greetings.protestant;
}
