/**
 * Speech Input Service
 * Uses Web Speech API for voice recognition
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

export interface SpeechInputCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/**
 * Check if speech recognition is supported
 */
export function isSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Initialize speech recognition
 */
function getRecognition(): SpeechRecognition | null {
  if (!isSupported()) return null;

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  const instance = new SpeechRecognitionClass();

  instance.continuous = false; // Stop after each utterance
  instance.interimResults = true; // Get partial results
  instance.lang = 'en-US';

  return instance;
}

/**
 * Start listening for speech
 */
export function startListening(callbacks: SpeechInputCallbacks): boolean {
  if (isListening) {
    return false;
  }

  recognition = getRecognition();
  if (!recognition) {
    callbacks.onError?.('Speech recognition not supported in this browser');
    return false;
  }

  recognition.onstart = () => {
    isListening = true;
    callbacks.onStart?.();
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (lastResult) {
      const transcript = lastResult[0].transcript;
      const isFinal = lastResult.isFinal;
      callbacks.onResult?.(transcript, isFinal);
    }
  };

  recognition.onend = () => {
    isListening = false;
    callbacks.onEnd?.();
    recognition = null;
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    isListening = false;

    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not found. Please check your device.',
      'not-allowed': 'Microphone access denied. Please enable microphone permissions.',
      'network': 'Network error. Please check your connection.',
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
    recognition.start();
    return true;
  } catch (error) {
    callbacks.onError?.('Failed to start speech recognition');
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
