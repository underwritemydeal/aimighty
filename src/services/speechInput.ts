/**
 * Speech Input Service
 * Uses Web Speech API for voice recognition
 * Supports both standard SpeechRecognition and Safari's webkitSpeechRecognition
 */

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

let recognition: SpeechRecognition | null = null;
let isListening = false;

// Always log for debugging voice issues
function log(...args: unknown[]) {
  console.log('[SpeechInput]', ...args);
}

export interface SpeechInputCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  language?: string;
}

// BCP-47 language codes for speech recognition
const languageToBCP47: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  ar: 'ar-SA',
  hi: 'hi-IN',
  pt: 'pt-BR',
  fr: 'fr-FR',
  id: 'id-ID',
  ur: 'ur-PK',
  tr: 'tr-TR',
  de: 'de-DE',
  sw: 'sw-KE',
  zh: 'zh-CN',
  ko: 'ko-KR',
  ja: 'ja-JP',
  tl: 'fil-PH',
  it: 'it-IT',
};

/**
 * Check if speech recognition is supported
 * Works with both standard API and Safari's webkit prefix
 */
export function isSupported(): boolean {
  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  log('Speech recognition supported:', supported);
  return supported;
}

/**
 * Initialize speech recognition
 * Handles both standard and webkit-prefixed APIs (for Safari)
 */
function getRecognition(language: string = 'en'): SpeechRecognition | null {
  if (!isSupported()) {
    log('Speech recognition not supported');
    return null;
  }

  try {
    // Safari uses webkitSpeechRecognition, Chrome/Edge use SpeechRecognition
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const instance = new SpeechRecognitionClass();

    instance.continuous = false; // Stop after each utterance
    instance.interimResults = true; // Get partial results for real-time feedback

    // Set language based on user's selected language
    const bcp47Code = languageToBCP47[language] || 'en-US';
    instance.lang = bcp47Code;
    log('Speech recognition language:', bcp47Code);

    log('Speech recognition initialized');
    return instance;
  } catch (error) {
    log('Failed to initialize speech recognition:', error);
    return null;
  }
}

/**
 * Start listening for speech
 * Handles microphone permissions and browser compatibility
 */
export function startListening(callbacks: SpeechInputCallbacks): boolean {
  log('startListening called, isListening:', isListening);

  if (isListening) {
    log('Already listening, returning false');
    return false;
  }

  recognition = getRecognition(callbacks.language);
  if (!recognition) {
    log('No recognition instance available');
    callbacks.onError?.('Speech recognition not supported in this browser');
    return false;
  }

  recognition.onstart = () => {
    log('Recognition started');
    isListening = true;
    callbacks.onStart?.();
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (lastResult) {
      const transcript = lastResult[0].transcript;
      const isFinal = lastResult.isFinal;
      log('Result:', transcript, 'isFinal:', isFinal);
      callbacks.onResult?.(transcript, isFinal);
    }
  };

  // Handle when user stops speaking (Safari specific)
  recognition.onspeechend = () => {
    log('Speech ended');
  };

  recognition.onend = () => {
    log('Recognition ended');
    isListening = false;
    callbacks.onEnd?.();
    recognition = null;
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    log('Recognition error:', event.error);
    isListening = false;

    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not found. Please check your device.',
      'not-allowed': 'Microphone access denied. Please enable microphone permissions.',
      'network': 'Network error. Please check your connection.',
      'service-not-allowed': 'Speech service not allowed. Please use HTTPS.',
      'aborted': '', // User cancelled, no message needed
    };

    const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
    if (message) {
      callbacks.onError?.(message);
    }
    callbacks.onEnd?.();
    recognition = null;
  };

  try {
    log('Calling recognition.start()');
    recognition.start();
    return true;
  } catch (error) {
    log('Failed to start recognition:', error);
    callbacks.onError?.('Failed to start speech recognition. Please try again.');
    return false;
  }
}

/**
 * Stop listening for speech
 */
export function stopListening(): void {
  if (recognition && isListening) {
    recognition.stop();
  }
}

/**
 * Check if currently listening
 */
export function getIsListening(): boolean {
  return isListening;
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately, we just wanted to check permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch {
    return false;
  }
}
