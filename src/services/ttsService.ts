/**
 * Text-to-Speech Service
 * Uses browser SpeechSynthesis API with divine voice settings
 * Handles iOS audio context requirements
 */

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let onAudioLevelCallback: ((level: number) => void) | null = null;
let isAudioUnlocked = false;
let currentOnEndCallback: (() => void) | null = null;
let speechTimeoutId: number | null = null;
let voiceEnabled = true;

// Always log for debugging TTS issues
function log(...args: unknown[]) {
  console.log('[TTS]', ...args);
}

// Voice settings for divine presence
const VOICE_SETTINGS = {
  rate: 0.88,     // Slower for gravitas
  pitch: 0.92,    // Slightly lower pitch
  volume: 1.0,
};

/**
 * Initialize audio context (must be called on user interaction)
 * This is critical for iOS which requires user gesture to start audio
 */
export function initAudio(): void {
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioContextClass();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      log('Audio context created, state:', audioContext.state);
    } catch (error) {
      log('Failed to create audio context:', error);
    }
  }

  // Resume audio context if suspended (iOS requirement)
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      log('Audio context resumed');
      isAudioUnlocked = true;
    }).catch(err => {
      log('Failed to resume audio context:', err);
    });
  } else if (audioContext) {
    isAudioUnlocked = true;
  }

  // Also unlock SpeechSynthesis on iOS by speaking empty text
  if (!isAudioUnlocked && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    speechSynthesis.speak(utterance);
    isAudioUnlocked = true;
    log('SpeechSynthesis unlocked via silent utterance');
  }
}

// Language to BCP-47 code mapping for TTS
const languageToBCP47: Record<string, string> = {
  en: 'en',
  es: 'es',
  ar: 'ar',
  hi: 'hi',
  pt: 'pt',
  fr: 'fr',
  id: 'id',
  ur: 'ur',
  tr: 'tr',
  de: 'de',
  sw: 'sw',
  zh: 'zh',
  ko: 'ko',
  ja: 'ja',
  tl: 'fil',
  it: 'it',
};

// Preferred voices for each language (premium/high-quality voices)
const preferredVoicesByLanguage: Record<string, string[]> = {
  en: ['Google UK English Male', 'Microsoft David', 'Daniel', 'Google US English', 'Alex', 'Samantha'],
  es: ['Google español', 'Microsoft Pablo', 'Jorge', 'Paulina'],
  ar: ['Google العربية', 'Microsoft Naayf', 'Maged'],
  hi: ['Google हिन्दी', 'Microsoft Hemant', 'Lekha'],
  pt: ['Google português', 'Microsoft Daniel', 'Luciana'],
  fr: ['Google français', 'Microsoft Paul', 'Thomas'],
  id: ['Google Bahasa Indonesia', 'Damayanti'],
  ur: ['Microsoft Asad', 'Google اردو'],
  tr: ['Google Türkçe', 'Microsoft Tolga', 'Yelda'],
  de: ['Google Deutsch', 'Microsoft Stefan', 'Anna'],
  sw: ['Google Kiswahili'],
  zh: ['Google 普通话', 'Microsoft Kangkang', 'Tingting'],
  ko: ['Google 한국의', 'Microsoft Heami', 'Yuna'],
  ja: ['Google 日本語', 'Microsoft Ichiro', 'Kyoko'],
  tl: ['Google Filipino'],
  it: ['Google italiano', 'Microsoft Cosimo', 'Alice'],
};

/**
 * Get the best available voice for divine speech
 */
function getBestVoice(language: string = 'en'): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const langCode = languageToBCP47[language] || 'en';

  // Try preferred voices for this language first
  const preferredVoices = preferredVoicesByLanguage[language] || preferredVoicesByLanguage.en;
  for (const name of preferredVoices) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) {
      log('Found preferred voice:', voice.name);
      return voice;
    }
  }

  // Fall back to any voice matching the language
  const langVoice = voices.find(v => v.lang.startsWith(langCode));
  if (langVoice) {
    log('Found language voice:', langVoice.name);
    return langVoice;
  }

  // Ultimate fallback to any English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  return englishVoice || voices[0] || null;
}

/**
 * Speak text with divine voice
 * Handles iOS audio requirements and provides fallback for errors
 */
export function speak(
  text: string,
  language?: string,
  onEnd?: () => void,
  onAudioLevel?: (level: number) => void
): void {
  log('speak() called with text length:', text.length, 'language:', language, 'voiceEnabled:', voiceEnabled);

  // Clear any previous timeout
  if (speechTimeoutId) {
    clearTimeout(speechTimeoutId);
    speechTimeoutId = null;
  }

  // Cancel any current speech
  stop();

  // Store the onEnd callback so we can ensure it's called
  currentOnEndCallback = onEnd || null;

  // Helper to safely call onEnd only once
  let hasCalledOnEnd = false;
  const safeOnEnd = () => {
    if (hasCalledOnEnd) {
      log('onEnd already called, skipping');
      return;
    }
    hasCalledOnEnd = true;
    log('Calling onEnd callback');
    stopAudioLevelSimulation();
    if (speechTimeoutId) {
      clearTimeout(speechTimeoutId);
      speechTimeoutId = null;
    }
    currentOnEndCallback?.();
    currentOnEndCallback = null;
  };

  if (!text.trim()) {
    log('Empty text, calling onEnd');
    safeOnEnd();
    return;
  }

  // If voice is disabled, just call onEnd immediately
  if (!voiceEnabled) {
    log('Voice disabled, skipping TTS');
    safeOnEnd();
    return;
  }

  // Check if SpeechSynthesis is available
  if (!('speechSynthesis' in window)) {
    log('SpeechSynthesis not available');
    safeOnEnd();
    return;
  }

  // Store callback for audio level updates
  onAudioLevelCallback = onAudioLevel || null;

  // Try to unlock audio if not already done
  if (!isAudioUnlocked) {
    log('Audio not unlocked, attempting unlock...');
    try {
      const unlock = new SpeechSynthesisUtterance('');
      unlock.volume = 0;
      speechSynthesis.speak(unlock);
      isAudioUnlocked = true;
      log('Audio unlocked via silent utterance');
    } catch (e) {
      log('Failed to unlock audio:', e);
    }
  }

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);

  // Apply voice settings
  utterance.rate = VOICE_SETTINGS.rate;
  utterance.pitch = VOICE_SETTINGS.pitch;
  utterance.volume = VOICE_SETTINGS.volume;

  // Set voice (may need to wait for voices to load)
  const lang = language || 'en';
  const setVoice = () => {
    const voice = getBestVoice(lang);
    if (voice) {
      utterance.voice = voice;
      // Also set the utterance lang to help browsers pick fallback
      utterance.lang = voice.lang;
      log('Voice set to:', voice.name, 'lang:', voice.lang);
    } else {
      log('No preferred voice found, using default');
    }
  };

  // Voices may already be loaded or may load asynchronously
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    setVoice();
  } else {
    // Wait for voices to load (needed on some browsers)
    speechSynthesis.onvoiceschanged = () => {
      setVoice();
    };
  }

  // Handle events
  utterance.onstart = () => {
    log('Speech started');
    startAudioLevelSimulation();
  };

  utterance.onend = () => {
    log('Speech ended naturally');
    safeOnEnd();
  };

  utterance.onerror = (event) => {
    log('Speech synthesis error:', event.error);
    safeOnEnd();
  };

  // iOS Safari fix: Resume speechSynthesis if it gets stuck
  // This can happen if the page was backgrounded
  if (speechSynthesis.paused) {
    log('SpeechSynthesis was paused, resuming');
    speechSynthesis.resume();
  }

  try {
    log('Calling speechSynthesis.speak()');
    speechSynthesis.speak(utterance);

    // SAFETY TIMEOUT: Force onEnd after 30 seconds max (or text length * 80ms, whichever is less)
    // This prevents the input from being stuck disabled forever
    const maxDuration = Math.min(30000, Math.max(5000, text.length * 80));
    log('Setting safety timeout for', maxDuration, 'ms');
    speechTimeoutId = window.setTimeout(() => {
      log('Safety timeout reached, forcing onEnd');
      speechSynthesis.cancel();
      safeOnEnd();
    }, maxDuration);

    // Also check for silent failure after 1 second
    setTimeout(() => {
      if (!hasCalledOnEnd && !speechSynthesis.speaking && !speechSynthesis.pending) {
        log('Speech may have failed silently after 1s, forcing onEnd');
        safeOnEnd();
      }
    }, 1000);

  } catch (error) {
    log('Exception in speak():', error);
    safeOnEnd();
  }
}

/**
 * Stop current speech
 */
export function stop(): void {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
  stopAudioLevelSimulation();
  // Clear safety timeout
  if (speechTimeoutId) {
    clearTimeout(speechTimeoutId);
    speechTimeoutId = null;
  }
  // Call any pending onEnd callback
  if (currentOnEndCallback) {
    log('stop() called, triggering pending onEnd');
    const callback = currentOnEndCallback;
    currentOnEndCallback = null;
    callback();
  }
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  return 'speechSynthesis' in window && speechSynthesis.speaking;
}

/**
 * Enable or disable voice output
 */
export function setVoiceEnabled(enabled: boolean): void {
  log('setVoiceEnabled:', enabled);
  voiceEnabled = enabled;
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

// Audio level simulation (since we can't get real audio data from SpeechSynthesis)
let audioLevelInterval: number | null = null;

function startAudioLevelSimulation(): void {
  if (audioLevelInterval) return;

  // Simulate audio levels for lip sync
  audioLevelInterval = window.setInterval(() => {
    if (onAudioLevelCallback && speechSynthesis.speaking) {
      // Generate pseudo-random levels that feel speech-like
      const baseLevel = 0.3;
      const variance = Math.random() * 0.4;
      const level = baseLevel + variance;
      onAudioLevelCallback(level);
    }
  }, 80);
}

function stopAudioLevelSimulation(): void {
  if (audioLevelInterval) {
    clearInterval(audioLevelInterval);
    audioLevelInterval = null;
  }
  onAudioLevelCallback?.(0);
}

/**
 * Speak a queue of sentences with smooth transitions
 */
export function speakSentences(
  sentences: string[],
  onSentenceStart?: (index: number) => void,
  onComplete?: () => void,
  onAudioLevel?: (level: number) => void
): void {
  let currentIndex = 0;

  const speakNext = () => {
    if (currentIndex >= sentences.length) {
      onComplete?.();
      return;
    }

    const sentence = sentences[currentIndex];
    onSentenceStart?.(currentIndex);

    speak(
      sentence,
      undefined,
      () => {
        currentIndex++;
        // Small pause between sentences
        setTimeout(speakNext, 200);
      },
      onAudioLevel
    );
  };

  speakNext();
}
