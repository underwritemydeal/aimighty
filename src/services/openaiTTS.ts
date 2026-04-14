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
  console.log('[OpenAI TTS] Speaking:', text.substring(0, 50) + '...', 'voice enabled:', voiceEnabled);

  // Stop any current audio
  stop();

  if (!voiceEnabled) {
    console.log('[OpenAI TTS] Voice disabled, skipping');
    onEnd?.();
    return;
  }

  if (!text.trim()) {
    console.log('[OpenAI TTS] Empty text, skipping');
    onEnd?.();
    return;
  }

  try {
    console.log('[OpenAI TTS] Fetching from worker...');
    const response = await fetch(`${WORKER_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, beliefSystem, character, language }),
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    console.log('[OpenAI TTS] Audio loaded, playing...');

    return new Promise((resolve) => {
      audio.onended = () => {
        console.log('[OpenAI TTS] Audio ended');
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        onEnd?.();
        resolve();
      };

      audio.onerror = (e) => {
        console.error('[OpenAI TTS] Audio error:', e);
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        // Fall back to browser TTS
        fallbackBrowserTTS(text, language).then(() => {
          onEnd?.();
          resolve();
        });
      };

      audio.play().catch((e) => {
        console.error('[OpenAI TTS] Play error:', e);
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        // Fall back to browser TTS
        fallbackBrowserTTS(text, language).then(() => {
          onEnd?.();
          resolve();
        });
      });
    });
  } catch (error) {
    console.error('[OpenAI TTS] Error:', error);
    // Fall back to browser SpeechSynthesis
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
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

/**
 * Enable or disable voice output
 */
export function setVoiceEnabled(enabled: boolean): void {
  console.log('[OpenAI TTS] setVoiceEnabled:', enabled);
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
  // Create a silent audio context to unlock on user interaction
  if ('AudioContext' in window || 'webkitAudioContext' in window) {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      ctx.close();
    } catch (e) {
      console.log('[OpenAI TTS] AudioContext init error:', e);
    }
  }
}

/**
 * Fallback to browser SpeechSynthesis
 */
function fallbackBrowserTTS(text: string, language: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.log('[OpenAI TTS] No SpeechSynthesis, resolving');
      resolve();
      return;
    }

    console.log('[OpenAI TTS] Falling back to browser TTS');
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

    utterance.onend = () => {
      console.log('[OpenAI TTS] Browser TTS ended');
      resolve();
    };
    utterance.onerror = () => {
      console.log('[OpenAI TTS] Browser TTS error');
      resolve();
    };

    // Timeout fallback
    const timeout = setTimeout(() => {
      speechSynthesis.cancel();
      resolve();
    }, Math.max(10000, text.length * 100));

    utterance.onend = () => {
      clearTimeout(timeout);
      resolve();
    };

    speechSynthesis.speak(utterance);
  });
}
