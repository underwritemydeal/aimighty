/**
 * OpenAI TTS Service
 * Uses gpt-4o-mini-tts via Cloudflare Worker proxy
 *
 * MOBILE AUDIO STRATEGY:
 * iOS Safari requires audio.play() in the same call stack as user gesture.
 * We use a persistent audio element that gets "unlocked" on first tap,
 * then reuse it for all subsequent TTS playback.
 */

import { fetchWithTimeout } from './fetchWithTimeout';
import { safeSetItem, safeGetItem } from './safeStorage';

const WORKER_URL = 'https://aimighty-api.robby-hess.workers.dev';

// Voice enabled state with localStorage persistence
const VOICE_STORAGE_KEY = 'aimighty-voice-enabled';

function getVoiceEnabled(): boolean {
  const stored = safeGetItem(VOICE_STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

function setVoiceEnabledStorage(enabled: boolean): void {
  safeSetItem(VOICE_STORAGE_KEY, String(enabled));
}

let voiceEnabled = getVoiceEnabled();
let preconnected = false;

// MOBILE AUDIO: Persistent audio element that stays "unlocked"
let persistentAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
let pendingAudioUrl: string | null = null;

/**
 * Get or create the persistent audio element
 */
function getPersistentAudio(): HTMLAudioElement {
  if (!persistentAudio) {
    persistentAudio = new Audio();
    persistentAudio.preload = 'auto';
    // iOS needs this attribute
    persistentAudio.setAttribute('playsinline', 'true');
    persistentAudio.setAttribute('webkit-playsinline', 'true');
    console.log('[TTS Mobile] Created persistent audio element');
  }
  return persistentAudio;
}

/**
 * Unlock mobile audio - MUST be called inside a user gesture (tap/click)
 * This plays a tiny silent sound to unlock the audio element for future use.
 * Call this SYNCHRONOUSLY in onClick/onTouchEnd handlers.
 */
export function unlockMobileAudio(): void {
  console.log('[TTS Mobile] unlockMobileAudio called, already unlocked:', audioUnlocked);

  const audio = getPersistentAudio();

  // Tiny silent MP3 (less than 1KB)
  const silentMp3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqpAAAAAAD/+1DEAAAHAAGf9AAAIgAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxBkAAADSAAAAAAAAANIAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';

  // Set source and try to play synchronously
  audio.src = silentMp3;
  audio.volume = 0.01; // Nearly silent

  // The play() call MUST happen in the user gesture call stack
  const playPromise = audio.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log('[TTS Mobile] Audio unlocked successfully!');
        audioUnlocked = true;
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1.0; // Restore volume for real audio

        // If we have pending audio, play it now
        if (pendingAudioUrl) {
          console.log('[TTS Mobile] Playing pending audio');
          playAudioUrl(pendingAudioUrl);
          pendingAudioUrl = null;
        }
      })
      .catch((e) => {
        console.error('[TTS Mobile] Unlock failed:', e);
        // Still mark as attempted so we don't spam
        audioUnlocked = true;
      });
  }

  // Also try AudioContext unlock
  try {
    const AudioContextClass = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      ctx.resume().then(() => {
        console.log('[TTS Mobile] AudioContext resumed');
      });
      // Don't close it - keep it alive
    }
  } catch (e) {
    console.log('[TTS Mobile] AudioContext error:', e);
  }
}

/**
 * Play audio from a blob URL using the persistent audio element
 * @param url - The blob URL of the audio
 * @param revokeOnEnd - If true, revoke the URL after playback (default: false to allow replay)
 */
function playAudioUrl(url: string, revokeOnEnd = false): Promise<void> {
  return new Promise((resolve) => {
    const audio = getPersistentAudio();

    // Clean up previous handlers
    audio.onended = null;
    audio.onerror = null;
    audio.oncanplaythrough = null;

    audio.onended = () => {
      console.log('[TTS] Audio playback ended');
      if (revokeOnEnd) URL.revokeObjectURL(url);
      resolve();
    };

    audio.onerror = (e) => {
      console.error('[TTS] Audio error:', e);
      if (revokeOnEnd) URL.revokeObjectURL(url);
      resolve();
    };

    audio.src = url;
    audio.volume = 1.0;

    console.log('[TTS] Playing audio URL');
    audio.play()
      .then(() => {
        console.log('[TTS] Audio playing!');
      })
      .catch((e) => {
        console.error('[TTS] Play failed:', e);
        if (revokeOnEnd) URL.revokeObjectURL(url);
        resolve();
      });
  });
}

/**
 * Replay audio from a stored blob URL
 * Creates a new Audio element for replay to avoid conflicts with the main playback
 */
export function replayAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve) => {
    console.log('[TTS] Replaying audio from stored URL');
    const audio = new Audio(audioUrl);
    audio.volume = 1.0;

    audio.onended = () => {
      console.log('[TTS] Replay ended');
      resolve();
    };

    audio.onerror = (e) => {
      console.error('[TTS] Replay error:', e);
      resolve();
    };

    audio.play().catch((e) => {
      console.error('[TTS] Replay play failed:', e);
      resolve();
    });
  });
}

/**
 * Preconnect to the worker for faster TTS requests
 */
export function preconnectWorker(): void {
  if (preconnected || typeof document === 'undefined') return;
  preconnected = true;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = WORKER_URL;
  document.head.appendChild(link);

  console.log('[TTS] Preconnected to worker');
}

/**
 * Speak text using OpenAI TTS
 * Returns a promise that resolves with the audio URL when speech ends
 * The audio URL can be stored for replay functionality
 */
export async function speakWithOpenAI(
  text: string,
  beliefSystem: string,
  character: string = 'god',
  language: string = 'en',
  onEnd?: (audioUrl?: string) => void
): Promise<string | undefined> {
  const ttsStartTime = Date.now();
  console.log('[TTS] === TTS REQUEST START ===');
  console.log('[TTS] Audio unlocked:', audioUnlocked);
  console.log('[TTS] Belief:', beliefSystem, 'Character:', character, 'Lang:', language);
  console.log('[TTS] Text length:', text.length, 'chars');

  // Stop any current audio
  stop();

  if (!voiceEnabled) {
    console.log('[TTS] Voice disabled, skipping');
    onEnd?.();
    return undefined;
  }

  if (!text.trim()) {
    console.log('[TTS] Empty text, skipping');
    onEnd?.();
    return undefined;
  }

  try {
    console.log('[TTS] Fetching from worker... (t+%dms)', Date.now() - ttsStartTime);

    // 20s time-to-headers budget. Audio body can stream for any duration.
    const response = await fetchWithTimeout(`${WORKER_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, beliefSystem, character, language }),
    }, 20000);

    console.log('[TTS] Worker responded (t+%dms), status:', Date.now() - ttsStartTime, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] Worker error:', errorText);
      throw new Error(`TTS request failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    console.log('[TTS] Got audio blob (t+%dms), size:', Date.now() - ttsStartTime, audioBlob.size);

    if (audioBlob.size < 100) {
      throw new Error('Audio blob too small');
    }

    const audioUrl = URL.createObjectURL(audioBlob);

    // If audio is unlocked, play directly
    if (audioUnlocked) {
      console.log('[TTS] Audio unlocked, playing directly (t+%dms)', Date.now() - ttsStartTime);
      await playAudioUrl(audioUrl);
      // Return the audioUrl so it can be stored for replay (don't revoke it)
      onEnd?.(audioUrl);
      return audioUrl;
    } else {
      // Store for later - will play when unlocked
      console.log('[TTS] Audio not unlocked, queuing for next interaction');
      pendingAudioUrl = audioUrl;
      // Try fallback browser TTS immediately
      console.log('[TTS] Trying browser TTS as fallback');
      await fallbackBrowserTTS(text, language);
      onEnd?.(audioUrl);
      return audioUrl;
    }
  } catch (error) {
    console.error('[TTS] ERROR (t+%dms):', Date.now() - ttsStartTime, error);
    // Fall back to browser SpeechSynthesis
    console.log('[TTS] Falling back to browser TTS');
    await fallbackBrowserTTS(text, language);
    onEnd?.();
    return undefined;
  }
}

/**
 * Stop current audio playback
 */
export function stop(): void {
  if (persistentAudio) {
    persistentAudio.pause();
    persistentAudio.currentTime = 0;
  }
  // Clear sentence queue
  sentenceQueue.length = 0;
  queuePlaying = false;
  if (persistentAudio) {
    persistentAudio.ontimeupdate = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

// ═══════════════════════════════════════════════════════════════
// SENTENCE-LEVEL STREAMING TTS QUEUE
// Fetches and queues audio per sentence so first sentence plays fast,
// and subsequent sentences play back-to-back with no gap.
// ═══════════════════════════════════════════════════════════════

interface QueuedSentence {
  text: string;
  audioUrl: string | null;   // null = still fetching; '' = fetch failed
  words: string[];
  // P2-3: if the OpenAI TTS proxy 429s (or otherwise fails), we fall
  // back to browser speechSynthesis for this sentence so the user is
  // not met with silence. The language is needed for voice selection.
  language: string;
  fallback: boolean;
  onStart?: (wordCount: number) => void;
  onWord?: (wordIndex: number) => void;
  onEnd?: () => void;
  fetchPromise: Promise<void>;
}

const sentenceQueue: QueuedSentence[] = [];
let queuePlaying = false;

export function clearSentenceQueue(): void {
  sentenceQueue.length = 0;
  queuePlaying = false;
}

/**
 * Enqueue a sentence for TTS. Starts fetching immediately and will play
 * as soon as it's this sentence's turn in the queue.
 */
export function enqueueSentence(
  text: string,
  beliefSystem: string,
  character: string,
  language: string,
  callbacks?: {
    onStart?: (wordCount: number) => void;
    onWord?: (wordIndex: number) => void;
    onEnd?: () => void;
  }
): void {
  if (!voiceEnabled || !text.trim()) {
    callbacks?.onEnd?.();
    return;
  }

  const words = text.trim().split(/\s+/);
  const entry: QueuedSentence = {
    text,
    audioUrl: null,
    words,
    language,
    fallback: false,
    onStart: callbacks?.onStart,
    onWord: callbacks?.onWord,
    onEnd: callbacks?.onEnd,
    fetchPromise: Promise.resolve(),
  };

  const fetchStart = Date.now();
  const snippet = text.slice(0, 32).replace(/\n/g, ' ');
  console.log(`[TTS-TIMING] sentence FIRED (t=0) "${snippet}…" (${text.length}ch)`);

  // 20s time-to-headers budget for per-sentence TTS fetch.
  entry.fetchPromise = fetchWithTimeout(`${WORKER_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, beliefSystem, character, language }),
  }, 20000)
    .then((r) => {
      console.log(`[TTS-TIMING] sentence HEADERS t+${Date.now() - fetchStart}ms status=${r.status} "${snippet}…"`);
      // P2-3: any non-2xx (especially 429 rate limit) -> fall back to browser TTS.
      if (!r.ok) {
        entry.fallback = true;
        return Promise.reject(new Error(`TTS ${r.status}`));
      }
      return r.blob();
    })
    .then((blob) => {
      if (!blob) return;
      console.log(`[TTS-TIMING] sentence BLOB t+${Date.now() - fetchStart}ms (${blob.size}B) "${snippet}…"`);
      if (blob.size < 100) {
        entry.fallback = true;
        throw new Error('Audio too small');
      }
      entry.audioUrl = URL.createObjectURL(blob);
    })
    .catch((e) => {
      console.error('[TTS-Queue] Fetch failed for sentence, will use browser fallback:', e);
      // Leave audioUrl null; playNextInQueue sees fallback=true and routes to speechSynthesis.
      entry.fallback = true;
      entry.audioUrl = '';
    });

  sentenceQueue.push(entry);
  if (!queuePlaying) {
    playNextInQueue();
  }
}

/**
 * Pre-warm the /tts endpoint. Call on conversation screen mount to establish
 * the connection + keep worker warm before the user's first message.
 */
export function prewarmTts(beliefSystem: string, character: string, language: string): void {
  if (typeof window === 'undefined') return;
  console.log('[TTS-TIMING] prewarm firing');
  const t0 = Date.now();
  // 10s budget — prewarm is best-effort, don't hold connections for long.
  fetchWithTimeout(`${WORKER_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Welcome.', beliefSystem, character, language }),
  }, 10000)
    .then((r) => {
      console.log(`[TTS-TIMING] prewarm headers t+${Date.now() - t0}ms status=${r.status}`);
      return r.ok ? r.blob() : null;
    })
    .then((blob) => {
      if (blob) console.log(`[TTS-TIMING] prewarm blob t+${Date.now() - t0}ms (${blob.size}B)`);
    })
    .catch((e) => console.warn('[TTS-TIMING] prewarm failed:', e));
}

async function playNextInQueue(): Promise<void> {
  if (queuePlaying) return;
  const entry = sentenceQueue.shift();
  if (!entry) return;
  queuePlaying = true;

  const waitStart = Date.now();
  await entry.fetchPromise;
  const waitMs = Date.now() - waitStart;
  console.log(`[TTS-TIMING] playNextInQueue waited ${waitMs}ms for fetch "${entry.text.slice(0, 32)}…"`);

  // P2-3: OpenAI TTS failed (e.g. 429). Fall back to browser speechSynthesis
  // so the user still hears the sentence. No word-level highlighting here —
  // browser TTS doesn't expose per-word events reliably cross-platform.
  if (entry.fallback || !entry.audioUrl) {
    if (entry.fallback) {
      console.log('[TTS-Queue] Using browser TTS fallback for sentence');
      entry.onStart?.(entry.words.length);
      await fallbackBrowserTTS(entry.text, entry.language);
    }
    entry.onEnd?.();
    queuePlaying = false;
    playNextInQueue();
    return;
  }

  const audio = getPersistentAudio();
  audio.onended = null;
  audio.onerror = null;
  audio.ontimeupdate = null;
  audio.src = entry.audioUrl;
  audio.volume = 1.0;

  // Word highlighting via time progression
  entry.onStart?.(entry.words.length);

  let lastWordIdx = -1;
  audio.ontimeupdate = () => {
    if (!audio.duration || isNaN(audio.duration)) return;
    const progress = audio.currentTime / audio.duration;
    const idx = Math.min(entry.words.length - 1, Math.floor(progress * entry.words.length));
    if (idx !== lastWordIdx) {
      lastWordIdx = idx;
      entry.onWord?.(idx);
    }
  };

  audio.onended = () => {
    audio.ontimeupdate = null;
    entry.onEnd?.();
    queuePlaying = false;
    playNextInQueue();
  };

  audio.onerror = () => {
    audio.ontimeupdate = null;
    entry.onEnd?.();
    queuePlaying = false;
    playNextInQueue();
  };

  const playStart = Date.now();
  audio.play()
    .then(() => console.log(`[TTS-TIMING] audio PLAYING t+${Date.now() - playStart}ms "${entry.text.slice(0, 32)}…"`))
    .catch((e) => {
    console.error('[TTS-Queue] Play failed:', e);
    queuePlaying = false;
    entry.onEnd?.();
    playNextInQueue();
  });
}

/**
 * Enable or disable voice output
 */
export function setVoiceEnabled(enabled: boolean): void {
  console.log('[TTS] setVoiceEnabled:', enabled);
  voiceEnabled = enabled;
  setVoiceEnabledStorage(enabled);
  if (!enabled) {
    stop();
  }
}

/**
 * Check if voice is enabled
 */
export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}

/**
 * Initialize audio context (for iOS requirements)
 */
export function initAudio(): void {
  preconnectWorker();
  // The actual unlock happens in unlockMobileAudio() on user gesture
}

/**
 * Fallback to browser SpeechSynthesis
 */
function fallbackBrowserTTS(text: string, language: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.log('[TTS] No SpeechSynthesis available');
      resolve();
      return;
    }

    console.log('[TTS] Browser TTS starting...');

    // iOS Safari quirk: need to call getVoices first
    speechSynthesis.getVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.82;
    utterance.pitch = 0.85;

    // Try to set language
    const langMap: Record<string, string> = {
      en: 'en-US', es: 'es-ES', ar: 'ar-SA', hi: 'hi-IN',
      pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
      ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
    };
    utterance.lang = langMap[language] || 'en-US';

    // Timeout fallback
    const timeout = setTimeout(() => {
      console.log('[TTS] Browser TTS timeout');
      speechSynthesis.cancel();
      resolve();
    }, Math.max(10000, text.length * 100));

    utterance.onend = () => {
      console.log('[TTS] Browser TTS ended');
      clearTimeout(timeout);
      resolve();
    };

    utterance.onerror = (e) => {
      console.log('[TTS] Browser TTS error:', e);
      clearTimeout(timeout);
      resolve();
    };

    speechSynthesis.speak(utterance);
  });
}
