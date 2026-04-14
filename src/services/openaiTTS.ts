/**
 * OpenAI TTS Service
 * Uses gpt-4o-mini-tts via Cloudflare Worker proxy
 * Falls back to browser SpeechSynthesis on error
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
let currentAudio: HTMLAudioElement | null = null;
let preconnected = false;
let audioUnlocked = false;

/**
 * Unlock mobile audio - MUST be called inside a user gesture (tap/click)
 * This plays a silent audio to unlock the audio context for subsequent playback
 */
export function unlockMobileAudio(): void {
  if (audioUnlocked) return;

  console.log('[TTS Mobile] Attempting audio unlock...');

  // Method 1: Play silent audio
  try {
    const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqpAAAAAAD/+1DEAAAHAAGf9AAAIgAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxBkAAADSAAAAAAAAANIAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==');
    silentAudio.play().then(() => {
      console.log('[TTS Mobile] Silent audio played successfully');
      audioUnlocked = true;
    }).catch((e) => {
      console.log('[TTS Mobile] Silent audio play failed:', e);
    });
  } catch (e) {
    console.log('[TTS Mobile] Silent audio error:', e);
  }

  // Method 2: Resume AudioContext
  try {
    const AudioContextClass = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      ctx.resume().then(() => {
        console.log('[TTS Mobile] AudioContext resumed');
        audioUnlocked = true;
        ctx.close();
      }).catch((e) => {
        console.log('[TTS Mobile] AudioContext resume failed:', e);
      });
    }
  } catch (e) {
    console.log('[TTS Mobile] AudioContext error:', e);
  }
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
  console.log('[TTS] Requesting voice for:', beliefSystem, character, language);
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

    console.log('[TTS] Worker response received (t+%dms), status:', Date.now() - ttsStartTime, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] Worker error response:', errorText);
      throw new Error(`TTS request failed: ${response.status} - ${errorText}`);
    }

    const audioBlob = await response.blob();
    console.log('[TTS] Audio blob ready (t+%dms), size:', Date.now() - ttsStartTime, audioBlob.size, 'bytes');

    if (audioBlob.size < 100) {
      console.error('[TTS] Audio blob too small, likely an error');
      throw new Error('Audio blob too small');
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    currentAudio = audio;

    return new Promise((resolve) => {
      audio.oncanplaythrough = () => {
        console.log('[TTS] Audio canplaythrough (t+%dms)', Date.now() - ttsStartTime);
      };

      audio.onended = () => {
        console.log('[TTS] Audio ended (t+%dms)', Date.now() - ttsStartTime);
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        onEnd?.();
        resolve();
      };

      audio.onerror = (e) => {
        console.error('[TTS] Audio playback error (t+%dms):', Date.now() - ttsStartTime, e);
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        // Fall back to browser TTS
        console.log('[TTS] Falling back to browser TTS');
        fallbackBrowserTTS(text, language).then(() => {
          onEnd?.();
          resolve();
        });
      };

      console.log('[TTS] Calling audio.play() (t+%dms)', Date.now() - ttsStartTime);
      audio.play()
        .then(() => {
          console.log('[TTS] Audio playing! (t+%dms)', Date.now() - ttsStartTime);
        })
        .catch((e) => {
          console.error('[TTS] Play error (t+%dms), likely autoplay blocked:', Date.now() - ttsStartTime, e);
          URL.revokeObjectURL(audioUrl);
          currentAudio = null;
          // Fall back to browser TTS
          console.log('[TTS] Falling back to browser TTS due to play error');
          fallbackBrowserTTS(text, language).then(() => {
            onEnd?.();
            resolve();
          });
        });
    });
  } catch (error) {
    console.error('[TTS] ERROR (t+%dms):', Date.now() - ttsStartTime, error);
    // Fall back to browser SpeechSynthesis
    console.log('[TTS] Falling back to browser TTS due to fetch error');
    await fallbackBrowserTTS(text, language);
    onEnd?.();
  }
}

/**
 * Stop current audio playback
 */
export function stop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
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
  // Preconnect on first interaction
  preconnectWorker();

  // Create a silent audio context to unlock on user interaction
  if (typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)) {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      ctx.close();
      console.log('[TTS] Audio context initialized');
    } catch (e) {
      console.log('[TTS] AudioContext init error:', e);
    }
  }
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

    utterance.onerror = () => {
      console.log('[TTS] Browser TTS error');
      clearTimeout(timeout);
      resolve();
    };

    speechSynthesis.speak(utterance);
  });
}
