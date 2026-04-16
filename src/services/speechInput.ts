/**
 * Speech Input Service
 * Uses Web Speech API for voice recognition
 * Supports both standard SpeechRecognition and Safari's webkitSpeechRecognition
 */
import { safeGetItem, safeSetItem, safeRemoveItem } from './safeStorage';

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

// P1-2: speech language is decoupled from UI language. A bilingual user
// can keep the UI in English but speak Spanish — setting en-US on the
// recognizer produces gibberish. Resolution order:
//   1. Explicit user override (aimighty_speech_language) — reserved for a
//      future settings toggle.
//   2. navigator.language, which is already a BCP-47 tag reflecting the
//      user's OS/browser locale (e.g. es-MX, en-GB).
//   3. UI language mapped through languageToBCP47.
//   4. en-US.
const SPEECH_LANGUAGE_KEY = 'aimighty_speech_language';

function resolveSpeechLanguage(uiLanguage: string): string {
  const override = safeGetItem(SPEECH_LANGUAGE_KEY);
  if (override) return override;

  if (typeof navigator !== 'undefined' && navigator.language) {
    const nav = navigator.language;
    // Accept BCP-47 forms like "es", "es-MX", "zh-Hant".
    if (/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i.test(nav)) {
      return nav;
    }
  }

  return languageToBCP47[uiLanguage] || 'en-US';
}

/** Persist an explicit speech-input language override (BCP-47). Pass null to clear. */
export function setSpeechLanguage(bcp47: string | null): void {
  if (bcp47) safeSetItem(SPEECH_LANGUAGE_KEY, bcp47);
  else safeRemoveItem(SPEECH_LANGUAGE_KEY);
}

/** Resolve the BCP-47 language that will be used for recognition. */
export function getSpeechLanguage(uiLanguage: string = 'en'): string {
  return resolveSpeechLanguage(uiLanguage);
}

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

    instance.continuous = true; // Keep listening until user stops
    instance.interimResults = true; // Get partial results for real-time feedback

    // Speech language is resolved from navigator.language first so a
    // bilingual user who kept the UI in English can still be transcribed
    // correctly in their actual spoken language (P1-2).
    const bcp47Code = resolveSpeechLanguage(language);
    instance.lang = bcp47Code;
    log('Speech recognition language:', bcp47Code, '(ui:', language + ')');

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
    // In continuous mode, we need to accumulate ALL results
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    // Combine final and interim for display
    const fullTranscript = (finalTranscript + interimTranscript).trim();
    const hasFinal = finalTranscript.length > 0;

    log('Result - final:', finalTranscript.trim(), 'interim:', interimTranscript, 'full:', fullTranscript);

    // Always send the full accumulated transcript
    // isFinal=true only when there's finalized text (but we're still listening in continuous mode)
    callbacks.onResult?.(fullTranscript, hasFinal);
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

    // Map error codes to user-friendly messages.
    // The permission-denied / device-missing copies explicitly point users
    // to the text fallback so the mic button doesn't look broken (P1-6).
    const errorMessages: Record<string, string> = {
      'no-speech': 'Didn\'t catch that. Try again — or type below.',
      'audio-capture': 'No microphone found. You can still type below.',
      'not-allowed': 'Voice input needs microphone access. You can still type below.',
      'network': 'Network hiccup on voice. You can still type below.',
      'service-not-allowed': 'Voice needs a secure connection. You can still type below.',
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
