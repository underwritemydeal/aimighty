/**
 * OpenAI TTS Service
 * Uses gpt-4o-mini-tts via Cloudflare Worker proxy
 *
 * MOBILE AUDIO STRATEGY:
 * iOS Safari requires audio.play() in the same call stack as user gesture.
 * We use a persistent audio element that gets "unlocked" on first tap,
 * then reuse it for all subsequent TTS playback.
 */

const WORKER_URL = 'https://aimighty-api.robby-hess.workers.dev';

// Voice enabled state with localStorage persistence
const VOICE_STORAGE_KEY = 'aimighty-voice-enabled';

function getVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(VOICE_STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

function setVoiceEnabledStorage(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(VOICE_STORAGE_KEY, String(enabled));
  }
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
 */
function playAudioUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = getPersistentAudio();

    // Clean up previous handlers
    audio.onended = null;
    audio.onerror = null;
    audio.oncanplaythrough = null;

    audio.onended = () => {
      console.log('[TTS] Audio playback ended');
      URL.revokeObjectURL(url);
      resolve();
    };

    audio.onerror = (e) => {
      console.error('[TTS] Audio error:', e);
      URL.revokeObjectURL(url);
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
        URL.revokeObjectURL(url);
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
 * Returns a promise that resolves when speech ends
 */
export async function speakWithOpenAI(
  text: string,
  beliefSystem: string,
  character: string = 'god',
  language: string = 'en',
  onEnd?: () => void
): Promise<void> {
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
    return;
  }

  if (!text.trim()) {
    console.log('[TTS] Empty text, skipping');
    onEnd?.();
    return;
  }

  try {
    console.log('[TTS] Fetching from worker... (t+%dms)', Date.now() - ttsStartTime);

    const response = await fetch(`${WORKER_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, beliefSystem, character, language }),
    });

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
      onEnd?.();
    } else {
      // Store for later - will play when unlocked
      console.log('[TTS] Audio not unlocked, queuing for next interaction');
      pendingAudioUrl = audioUrl;
      // Try fallback browser TTS immediately
      console.log('[TTS] Trying browser TTS as fallback');
      await fallbackBrowserTTS(text, language);
      onEnd?.();
    }
  } catch (error) {
    console.error('[TTS] ERROR (t+%dms):', Date.now() - ttsStartTime, error);
    // Fall back to browser SpeechSynthesis
    console.log('[TTS] Falling back to browser TTS');
    await fallbackBrowserTTS(text, language);
    onEnd?.();
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
  // Also stop browser speech synthesis if active
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
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
