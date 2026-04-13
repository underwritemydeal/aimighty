import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { NebulaBackground } from '../shared/NebulaBackground';
import { LazyAvatarScene } from '../avatar/LazyAvatarScene';
import { sendMessage, type Message } from '../../services/claudeApi';
import { speak, stop as stopSpeaking, initAudio } from '../../services/ttsService';
import { startListening, stopListening, isSupported as isSpeechSupported } from '../../services/speechInput';
import { incrementMessageCount, hasReachedFreeLimit, getRemainingFreeMessages } from '../../services/auth';
import type { BeliefSystem, User } from '../../types';

interface ConversationScreenProps {
  belief: BeliefSystem;
  user: User;
  onBack: () => void;
  onPaywall: () => void;
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
      className="text-center max-w-2xl px-6 gpu-accelerated"
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-xl)',
        fontWeight: 'var(--font-light)',
        lineHeight: 'var(--leading-relaxed)',
        letterSpacing: 'var(--tracking-wide)',
      }}
      aria-live="polite"
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block gpu-accelerated-opacity"
          style={{
            opacity: index < visibleWords ? 1 : 0,
            transform: index < visibleWords ? 'translateY(0)' : 'translateY(10px)',
            color: color,
            textShadow: `0 0 50px ${color}35, 0 0 100px ${color}18`,
            marginRight: '0.32em',
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

// Pulsing mic button with ring animations — hero interaction
const MicButton = memo(function MicButton({
  isListening,
  isSpeaking,
  isDisabled,
  themeColor,
  onToggle,
}: {
  isListening: boolean;
  isSpeaking: boolean;
  isDisabled: boolean;
  themeColor: string;
  onToggle: () => void;
}) {
  const disabled = isSpeaking || isDisabled;

  return (
    <button
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      aria-pressed={isListening}
      className="relative gpu-accelerated press-scale"
      style={{
        opacity: disabled ? 0.35 : 1,
        transition: 'opacity var(--duration-normal) var(--ease-out-expo)',
      }}
    >
      {/* Outer glow halo */}
      <div
        className="absolute -inset-10 rounded-full"
        style={{
          background: `radial-gradient(circle, ${themeColor}${isListening ? '35' : '12'} 0%, transparent 70%)`,
          transition: 'all var(--duration-slower) var(--ease-out-expo)',
        }}
        aria-hidden="true"
      />

      {/* Ripple animations when listening */}
      {isListening && (
        <>
          {[0, 0.5, 1].map((delay) => (
            <div
              key={delay}
              className="absolute inset-0 rounded-full"
              style={{
                border: `1.5px solid ${themeColor}`,
                animation: `ripple 2s var(--ease-out-quart) infinite ${delay}s`,
              }}
              aria-hidden="true"
            />
          ))}
        </>
      )}

      {/* Button circle */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 'var(--btn-height-hero)',
          height: 'var(--btn-height-hero)',
          borderRadius: 'var(--radius-full)',
          background: isListening ? themeColor : 'var(--color-surface-elevated)',
          border: `1.5px solid ${isListening ? themeColor : 'var(--color-border-medium)'}`,
          boxShadow: isListening
            ? `0 0 60px ${themeColor}60, 0 0 120px ${themeColor}30, inset 0 0 30px ${themeColor}25`
            : 'var(--shadow-lg)',
          transform: isListening ? 'scale(1.06)' : 'scale(1)',
          transition: 'all var(--duration-normal) var(--ease-out-expo)',
        }}
      >
        <svg
          width="28"
          height="28"
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

      {/* Status label */}
      <span
        className="absolute -bottom-9 left-1/2 whitespace-nowrap text-caps"
        style={{
          transform: `translateX(-50%) translateY(${isListening ? 0 : -4}px)`,
          opacity: isListening ? 1 : 0,
          color: themeColor,
          transition: 'all var(--duration-normal) var(--ease-out-expo)',
        }}
        aria-hidden="true"
      >
        Listening
      </span>
    </button>
  );
});

// Free message counter
const MessageCounter = memo(function MessageCounter({
  remaining,
  themeColor,
}: {
  remaining: number;
  themeColor: string;
}) {
  if (remaining > 3 || remaining === Infinity) return null;

  return (
    <div
      className="text-center mb-4"
      style={{
        fontSize: 'var(--text-xs)',
        color: remaining <= 1 ? '#ef4444' : 'var(--color-text-muted)',
      }}
    >
      {remaining === 0 ? (
        <span>Free messages used</span>
      ) : (
        <span>
          <span style={{ color: themeColor }}>{remaining}</span> free message{remaining !== 1 ? 's' : ''} remaining
        </span>
      )}
    </div>
  );
});

export function ConversationScreen({ belief, user, onBack, onPaywall }: ConversationScreenProps) {
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
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreeted = useRef(false);

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
    setIsSpeaking(true);
    speak(
      text,
      undefined,
      () => {
        setIsSpeaking(false);
        setAudioLevel(0);
      },
      (level) => setAudioLevel(level)
    );
  }, []);

  // Delayed greeting with natural timing (doesn't count toward message limit)
  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;

    const greetingTimer = setTimeout(() => {
      const greeting = getGreeting(belief.id);
      setCurrentCaption(greeting);
      setCaptionVisible(true);
      speakResponse(greeting);
    }, 2400);

    return () => clearTimeout(greetingTimer);
  }, [belief.id, speakResponse]);

  // Send message to Claude API
  const sendToAI = useCallback(async (userMessage: string) => {
    // Check free message limit before sending
    if (hasReachedFreeLimit() && !user.isPremium) {
      onPaywall();
      return;
    }

    setIsProcessing(true);
    setCaptionVisible(false);
    setCurrentCaption('');

    // Add user message to history
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    // Increment message count
    incrementMessageCount();

    let fullResponse = '';

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
          // Start TTS for this sentence
          if (!isSpeaking) {
            speakResponse(sentence);
          }
        },
        onComplete: (text) => {
          setIsProcessing(false);
          // Add assistant message to history
          setMessages([...newMessages, { role: 'assistant', content: text }]);

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
          console.error('AI error:', error);
          setIsProcessing(false);
          const errorMessage = "I am still here. Please try speaking to me again.";
          setCurrentCaption(errorMessage);
          setCaptionVisible(true);
          speakResponse(errorMessage);
        },
      }
    );
  }, [messages, belief.id, user.id, user.isPremium, captionVisible, isSpeaking, speakResponse, onPaywall]);

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
        alert('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
        return;
      }

      startListening({
        onStart: () => setIsListening(true),
        onResult: (transcript, isFinal) => {
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
          setIsListening(false);
          setInterimTranscript('');
        },
        onError: (error) => {
          console.error('Speech error:', error);
          setIsListening(false);
          setInterimTranscript('');
        },
      });
    }
  }, [isListening, interimTranscript, sendToAI]);

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
      className="relative w-full h-screen overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      role="main"
      aria-label={`Conversation with ${belief.name}`}
    >
      {/* Nebula background */}
      <NebulaBackground />

      {/* Strong vignette for cinematic focus */}
      <div className="vignette vignette-strong" aria-hidden="true" />

      {/* Particle face — code-split loaded */}
      <div
        className="absolute top-0 left-0 right-0 gpu-accelerated-opacity"
        style={{
          height: '48%',
          opacity: isVisible ? 1 : 0,
          transition: `opacity var(--duration-cinematic) var(--ease-out-expo)`,
        }}
        aria-hidden="true"
      >
        <LazyAvatarScene
          themeColor={belief.themeColor}
          particleColor={belief.particleColor}
          audioLevel={audioLevel}
        />
      </div>

      {/* UI Layer */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 md:px-8 py-5 gpu-accelerated"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
          }}
        >
          <button
            onClick={onBack}
            aria-label="Go back to belief selection"
            className="group flex items-center gap-3 py-2 px-3 -ml-3 rounded-lg btn-ghost"
          >
            <svg
              width="18"
              height="18"
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
              className="text-display group-hover:text-white/60"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                transition: 'color var(--duration-fast)',
              }}
            >
              Back
            </span>
          </button>

          {/* Belief name indicator */}
          <span
            className="text-caps"
            style={{ color: 'var(--color-text-subtle)' }}
          >
            {belief.name}
          </span>

          {/* Spacer for balance */}
          <div className="w-20" aria-hidden="true" />
        </header>

        {/* Spacer */}
        <div className="flex-1 min-h-[18%]" aria-hidden="true" />

        {/* Caption area — floating divine text */}
        <div
          className="flex items-center justify-center px-4 py-10 min-h-[140px] gpu-accelerated-opacity"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: `opacity var(--duration-slower) var(--ease-out-expo)`,
            transitionDelay: '600ms',
          }}
        >
          <FloatingText
            text={currentCaption}
            color={belief.themeColor}
            isVisible={captionVisible}
          />
        </div>

        {/* Input section */}
        <div
          className="px-6 md:px-8 pb-12 md:pb-16 gpu-accelerated"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transition: `all var(--duration-slower) var(--ease-out-expo)`,
            transitionDelay: '700ms',
          }}
        >
          <div className="max-w-xl mx-auto input-container">
            {/* Free message counter */}
            {!user.isPremium && (
              <MessageCounter remaining={remainingMessages} themeColor={belief.themeColor} />
            )}

            {/* Text input row */}
            <div className="flex items-center gap-4 mb-14 input-row">
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
                placeholder={isListening ? 'Listening...' : 'Speak your truth...'}
                disabled={isSpeaking || isProcessing}
                className="flex-1 input input-field"
                maxLength={500}
                style={{
                  opacity: isSpeaking || isProcessing ? 0.35 : 1,
                  transition: 'all var(--duration-normal) var(--ease-out-expo)',
                }}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isSpeaking || isProcessing}
                aria-label="Send message"
                className="btn-icon hover-scale"
                style={{
                  width: 'var(--btn-height-lg)',
                  height: 'var(--btn-height-lg)',
                  background: inputText.trim() ? `${belief.themeColor}18` : 'var(--color-surface-elevated)',
                  borderColor: inputText.trim() ? `${belief.themeColor}55` : 'var(--color-border-light)',
                  opacity: inputText.trim() && !isSpeaking && !isProcessing ? 1 : 0.35,
                  boxShadow: inputText.trim() ? `0 0 30px ${belief.themeColor}22` : 'none',
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

            {/* Mic button — hero of the section */}
            <div className="flex flex-col items-center">
              <MicButton
                isListening={isListening}
                isSpeaking={isSpeaking}
                isDisabled={isProcessing || (hasReachedFreeLimit() && !user.isPremium)}
                themeColor={belief.themeColor}
                onToggle={handleMicToggle}
              />
            </div>
          </div>
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
