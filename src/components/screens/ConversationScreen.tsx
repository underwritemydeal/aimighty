import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { LazyAvatarScene } from '../avatar/LazyAvatarScene';
import { sendMessage, type Message } from '../../services/claudeApi';
import { speak, stop as stopSpeaking, initAudio, setVoiceEnabled, isVoiceEnabled } from '../../services/ttsService';
import { startListening, stopListening, isSupported as isSpeechSupported } from '../../services/speechInput';
import { incrementMessageCount, hasReachedFreeLimit, getRemainingFreeMessages } from '../../services/auth';
import { t, type LanguageCode } from '../../data/translations';
import type { BeliefSystem, User } from '../../types';

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
      style={{
        color: enabled ? themeColor : 'var(--color-text-muted)',
      }}
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

// Floating text with word-by-word fade animation — divine revelation effect
const FloatingText = memo(function FloatingText({
  text,
  color,
  isVisible,
}: {
  text: string;
  color: string;
  isVisible: boolean;
}) {
  const words = useMemo(() => text.split(' '), [text]);
  const [visibleWords, setVisibleWords] = useState(0);

  useEffect(() => {
    if (!isVisible || !text) {
      setVisibleWords(0);
      return;
    }

    // Stagger word appearance for divine revelation effect
    const wordDelay = 90;
    let currentWord = 0;
    const interval = setInterval(() => {
      currentWord++;
      setVisibleWords(currentWord);
      if (currentWord >= words.length) {
        clearInterval(interval);
      }
    }, wordDelay);

    return () => clearInterval(interval);
  }, [text, isVisible, words.length]);

  if (!text) return null;

  return (
    <p
      className="text-center gpu-accelerated"
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(1rem, 4vw, 1.25rem)',
        fontWeight: 'var(--font-light)',
        lineHeight: 'var(--leading-relaxed)',
        letterSpacing: 'var(--tracking-wide)',
        padding: '0 24px',
        maxWidth: '640px',
        margin: '0 auto',
      }}
      aria-live="polite"
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block gpu-accelerated-opacity"
          style={{
            opacity: index < visibleWords ? 1 : 0,
            transform: index < visibleWords ? 'translateY(0)' : 'translateY(8px)',
            color: color,
            // Golden glow for God's words - divine luminous effect
            textShadow: `0 0 20px ${color}35, 0 0 40px ${color}20, 0 0 60px ${color}10`,
            marginRight: '0.3em',
            transition: `all var(--duration-slow) var(--ease-out-expo)`,
            transitionDelay: `${index * 20}ms`,
          }}
        >
          {word}
        </span>
      ))}
    </p>
  );
});

// Pulsing mic button with ring animations — hero interaction (64px on mobile)
const MicButton = memo(function MicButton({
  isListening,
  isSpeaking,
  isProcessing,
  isDisabled,
  themeColor,
  onToggle,
  listeningLabel,
  processingLabel,
  errorMessage,
}: {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isDisabled: boolean;
  themeColor: string;
  onToggle: () => void;
  listeningLabel: string;
  processingLabel: string;
  errorMessage: string | null;
}) {
  const disabled = isSpeaking || isDisabled || isProcessing;

  // Determine what status to show
  const showStatus = isListening || isProcessing || errorMessage;
  const statusText = errorMessage || (isProcessing ? processingLabel : listeningLabel);
  const statusColor = errorMessage ? '#ef4444' : themeColor;

  return (
    <button
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      aria-pressed={isListening}
      className="relative gpu-accelerated press-scale"
      style={{
        opacity: disabled && !isProcessing ? 0.35 : 1,
        transition: 'opacity var(--duration-normal) var(--ease-out-expo)',
      }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '-20px',
          background: `radial-gradient(circle, ${themeColor}${isListening ? '30' : '10'} 0%, transparent 70%)`,
          transition: 'all var(--duration-slower) var(--ease-out-expo)',
        }}
        aria-hidden="true"
      />

      {/* Ripple animations when listening */}
      {isListening && (
        <>
          {[0, 0.6, 1.2].map((delay) => (
            <div
              key={delay}
              className="absolute rounded-full"
              style={{
                inset: 0,
                border: `1.5px solid ${themeColor}`,
                animation: `ripple 2s var(--ease-out-quart) infinite ${delay}s`,
              }}
              aria-hidden="true"
            />
          ))}
        </>
      )}

      {/* Processing pulse animation */}
      {isProcessing && (
        <div
          className="absolute rounded-full"
          style={{
            inset: '-4px',
            border: `2px solid ${themeColor}`,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
      )}

      {/* Button circle — 64px explicit */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isListening ? themeColor : isProcessing ? `${themeColor}20` : 'var(--color-surface-elevated)',
          border: `1.5px solid ${isListening || isProcessing ? themeColor : 'var(--color-border-medium)'}`,
          boxShadow: isListening
            ? `0 0 50px ${themeColor}50, 0 0 100px ${themeColor}25`
            : isProcessing
            ? `0 0 30px ${themeColor}30`
            : '0 4px 20px rgba(0,0,0,0.3)',
          transform: isListening ? 'scale(1.05)' : 'scale(1)',
          transition: 'all var(--duration-normal) var(--ease-out-expo)',
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isListening ? 'rgba(0,0,0,0.9)' : 'var(--color-text-secondary)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ transition: 'stroke var(--duration-normal)' }}
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>

      {/* Status label - shows for listening, processing, or errors */}
      <span
        className="absolute left-1/2 whitespace-nowrap text-caps"
        style={{
          bottom: '-28px',
          transform: `translateX(-50%)`,
          opacity: showStatus ? 1 : 0,
          color: statusColor,
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          transition: 'opacity var(--duration-normal) var(--ease-out-expo)',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        aria-hidden="true"
      >
        {statusText}
      </span>
    </button>
  );
});

// Free message counter (compact for mobile)
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
  const [isVisible, setIsVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [captionVisible, setCaptionVisible] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabledState] = useState(isVoiceEnabled());
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreeted = useRef(false);
  const safetyTimeoutRef = useRef<number | null>(null);

  // Log input disabled state changes
  const isInputDisabled = isSpeaking || isProcessing;
  useEffect(() => {
    console.log('[ConversationScreen] Input disabled:', isInputDisabled, '(isSpeaking:', isSpeaking, 'isProcessing:', isProcessing, ')');
  }, [isInputDisabled, isSpeaking, isProcessing]);

  // Safety timeout: force re-enable input if stuck for more than 15 seconds
  useEffect(() => {
    if (isInputDisabled) {
      console.log('[ConversationScreen] Starting safety timeout (15s)');
      safetyTimeoutRef.current = window.setTimeout(() => {
        console.log('[ConversationScreen] SAFETY TIMEOUT: Forcing input re-enable');
        setIsSpeaking(false);
        setIsProcessing(false);
      }, 15000);
    } else {
      if (safetyTimeoutRef.current) {
        console.log('[ConversationScreen] Clearing safety timeout');
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    }
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, [isInputDisabled]);

  // Handle voice toggle
  const handleVoiceToggle = useCallback(() => {
    const newEnabled = !voiceEnabled;
    setVoiceEnabledState(newEnabled);
    setVoiceEnabled(newEnabled);
    console.log('[ConversationScreen] Voice toggled:', newEnabled);
  }, [voiceEnabled]);

  // Initialize audio context on first interaction
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

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Speak the response with TTS
  const speakResponse = useCallback((text: string) => {
    console.log('[ConversationScreen] speakResponse called, text length:', text.length);
    setIsSpeaking(true);
    speak(
      text,
      language,
      () => {
        console.log('[ConversationScreen] TTS onEnd callback fired');
        setIsSpeaking(false);
        setAudioLevel(0);
      },
      (level) => setAudioLevel(level)
    );
  }, [language]);

  // Delayed greeting with natural timing (doesn't count toward message limit)
  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;

    console.log('[ConversationScreen] Setting up greeting timer');
    const greetingTimer = setTimeout(() => {
      const greeting = getGreeting(belief.id);
      console.log('[ConversationScreen] Displaying greeting:', greeting.substring(0, 50) + '...');
      setCurrentCaption(greeting);
      setCaptionVisible(true);

      // Initialize audio before speaking (in case user hasn't interacted yet)
      initAudio();
      speakResponse(greeting);
    }, 2400);

    return () => clearTimeout(greetingTimer);
  }, [belief.id, speakResponse]);

  // Send message to Claude API
  const sendToAI = useCallback(async (userMessage: string) => {
    console.log('[ConversationScreen] sendToAI called with:', userMessage.substring(0, 50));

    // Check free message limit before sending
    if (hasReachedFreeLimit() && !user.isPremium) {
      onPaywall();
      return;
    }

    // Initialize audio on user interaction
    initAudio();

    setIsProcessing(true);
    setCaptionVisible(false);
    setCurrentCaption('');

    // Add user message to history
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    // Increment message count
    incrementMessageCount();

    let fullResponse = '';
    let hasSentFirstSentence = false;

    await sendMessage(
      newMessages,
      belief.id,
      user.id,
      {
        onToken: (token) => {
          fullResponse += token;
          setCurrentCaption(fullResponse);
          if (!captionVisible) setCaptionVisible(true);
        },
        onSentence: (sentence) => {
          console.log('[ConversationScreen] onSentence:', sentence.substring(0, 30) + '...');
          // Start TTS for first sentence only (to avoid overlapping speech)
          if (!hasSentFirstSentence) {
            hasSentFirstSentence = true;
            speakResponse(sentence);
          }
        },
        onComplete: (text) => {
          console.log('[ConversationScreen] onComplete, response length:', text.length);
          setIsProcessing(false);
          // Add assistant message to history
          setMessages([...newMessages, { role: 'assistant', content: text }]);

          // If we haven't started speaking yet, speak the full response
          if (!hasSentFirstSentence) {
            console.log('[ConversationScreen] No sentence spoken yet, speaking full response');
            speakResponse(text);
          }

          // Check if user hit the limit after this message
          if (hasReachedFreeLimit() && !user.isPremium) {
            // Show paywall after response finishes speaking
            setTimeout(() => {
              if (!isSpeaking) {
                onPaywall();
              }
            }, 3000);
          }
        },
        onError: (error) => {
          console.error('[ConversationScreen] AI error:', error);
          setIsProcessing(false);
          setIsSpeaking(false); // Make sure to reset speaking state on error
          const errorMessage = "I am still here. Please try speaking to me again.";
          setCurrentCaption(errorMessage);
          setCaptionVisible(true);
          speakResponse(errorMessage);
        },
      },
      language
    );
  }, [messages, belief.id, user.id, user.isPremium, captionVisible, isSpeaking, speakResponse, onPaywall, language]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isSpeaking || isProcessing) return;

    const message = inputText.trim();
    setInputText('');
    sendToAI(message);
  }, [inputText, isSpeaking, isProcessing, sendToAI]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice input handling
  const handleMicToggle = useCallback(() => {
    // Clear any previous error
    setSpeechError(null);

    if (isListening) {
      stopListening();
      setIsListening(false);
      // Send the final transcript
      if (interimTranscript.trim()) {
        setInputText(interimTranscript);
        setInterimTranscript('');
      }
    } else {
      if (!isSpeechSupported()) {
        setSpeechError('Speech not supported');
        setTimeout(() => setSpeechError(null), 3000);
        return;
      }

      console.log('[ConversationScreen] Starting speech recognition...');
      startListening({
        language,
        onStart: () => {
          console.log('[ConversationScreen] Speech recognition started');
          setIsListening(true);
          setSpeechError(null);
        },
        onResult: (transcript, isFinal) => {
          console.log('[ConversationScreen] Speech result:', transcript, 'isFinal:', isFinal);
          if (isFinal) {
            setInputText(transcript);
            setInterimTranscript('');
            setIsListening(false);
            // Auto-send after final result
            setTimeout(() => {
              if (transcript.trim()) {
                sendToAI(transcript.trim());
              }
            }, 300);
          } else {
            setInterimTranscript(transcript);
          }
        },
        onEnd: () => {
          console.log('[ConversationScreen] Speech recognition ended');
          setIsListening(false);
          setInterimTranscript('');
        },
        onError: (error) => {
          console.error('[ConversationScreen] Speech error:', error);
          setIsListening(false);
          setInterimTranscript('');
          // Show error briefly
          setSpeechError(error);
          setTimeout(() => setSpeechError(null), 3000);
        },
      });
    }
  }, [isListening, interimTranscript, sendToAI, language]);

  // Clean up on unmount
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
        height: '100dvh', // Use dynamic viewport height for mobile
        minHeight: '-webkit-fill-available',
      }}
      role="main"
      aria-label={`Conversation with ${belief.name}`}
    >
      {/* Nebula background */}
      <NebulaBackground />

      {/* Strong vignette for cinematic focus */}
      <div className="vignette vignette-strong" aria-hidden="true" />

      {/* UI Layer — explicit vertical layout for mobile */}
      <div
        className="relative z-10 flex flex-col"
        style={{
          height: '100%',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 20px))',
        }}
      >
        {/* Back button row */}
        <header
          className="flex items-center justify-between shrink-0 gpu-accelerated"
          style={{
            padding: '16px 24px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
          }}
        >
          <button
            onClick={onBack}
            aria-label="Go back to belief selection"
            className="group flex items-center gap-2 py-2 px-3 -ml-3 rounded-lg btn-ghost"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:-translate-x-1"
              style={{ color: 'var(--color-text-muted)' }}
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span
              className="text-display hidden sm:inline"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              {t('conversation.back', language)}
            </span>
          </button>

          {/* Belief name indicator */}
          <span
            className="text-caps"
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              color: 'var(--color-text-subtle)',
            }}
          >
            {belief.name}
          </span>

          {/* Voice toggle */}
          <VoiceToggle
            enabled={voiceEnabled}
            onToggle={handleVoiceToggle}
            themeColor={belief.themeColor}
          />
        </header>

        {/* 20px gap after back button */}
        <div style={{ height: '20px' }} aria-hidden="true" />

        {/* Particle face — 35-40% viewport height */}
        <div
          className="shrink-0 gpu-accelerated-opacity"
          style={{
            height: '35vh',
            minHeight: '200px',
            maxHeight: '280px',
            opacity: isVisible ? 1 : 0,
            transition: `opacity var(--duration-cinematic) var(--ease-out-expo)`,
            transitionDelay: '200ms',
          }}
          aria-hidden="true"
        >
          <LazyAvatarScene
            themeColor={belief.themeColor}
            particleColor={belief.particleColor}
            audioLevel={audioLevel}
          />
        </div>

        {/* 24px gap after particle face */}
        <div style={{ height: '24px' }} aria-hidden="true" />

        {/* Caption area — God's response text (takes remaining space) */}
        <div
          className="flex-1 flex items-start justify-center overflow-y-auto gpu-accelerated-opacity"
          style={{
            minHeight: '80px',
            opacity: isVisible ? 1 : 0,
            transition: `opacity var(--duration-slower) var(--ease-out-expo)`,
            transitionDelay: '400ms',
          }}
        >
          <FloatingText
            text={currentCaption}
            color={belief.themeColor}
            isVisible={captionVisible}
          />
        </div>

        {/* 16px gap before message counter */}
        <div style={{ height: '16px' }} aria-hidden="true" />

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

        {/* 12px gap before text input */}
        <div style={{ height: '12px' }} aria-hidden="true" />

        {/* Text input row — 48px height */}
        <div
          className="shrink-0 gpu-accelerated"
          style={{
            padding: '0 24px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
            transitionDelay: '500ms',
          }}
        >
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <label htmlFor="message-input" className="sr-only">
              Type your message
            </label>
            <input
              ref={inputRef}
              id="message-input"
              type="text"
              value={isListening ? interimTranscript || inputText : inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? `${t('conversation.listening', language)}...` : t('conversation.speakYourTruth', language)}
              disabled={isSpeaking || isProcessing}
              maxLength={500}
              style={{
                flex: 1,
                height: '48px',
                padding: '0 16px',
                fontSize: '15px',
                fontFamily: 'var(--font-display)',
                fontWeight: 'var(--font-light)',
                color: 'var(--color-text-primary)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                outline: 'none',
                opacity: isSpeaking || isProcessing ? 0.35 : 1,
                transition: 'all var(--duration-normal) var(--ease-out-expo)',
              }}
            />

            {/* Send button — 48px */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isSpeaking || isProcessing}
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
                opacity: inputText.trim() && !isSpeaking && !isProcessing ? 1 : 0.35,
                cursor: inputText.trim() && !isSpeaking && !isProcessing ? 'pointer' : 'default',
                transition: 'all var(--duration-normal) var(--ease-out-expo)',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={inputText.trim() ? belief.themeColor : 'var(--color-text-muted)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 12px gap before mic button */}
        <div style={{ height: '12px' }} aria-hidden="true" />

        {/* Mic button — 64px, centered */}
        <div
          className="shrink-0 flex justify-center gpu-accelerated"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
            transitionDelay: '600ms',
          }}
        >
          <MicButton
            isListening={isListening}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            isDisabled={hasReachedFreeLimit() && !user.isPremium}
            themeColor={belief.themeColor}
            onToggle={handleMicToggle}
            listeningLabel={t('conversation.listening', language)}
            processingLabel="Processing..."
            errorMessage={speechError}
          />
        </div>
      </div>
    </div>
  );
}

// Greeting messages per belief system (all 14)
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
