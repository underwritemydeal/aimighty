/**
 * Text-to-Speech Service
 * Uses browser SpeechSynthesis API with divine voice settings
 * Handles iOS audio context requirements
 *
 * TODO: Replace with Azure Neural TTS or ElevenLabs for production.
 * Browser SpeechSynthesis is MVP placeholder only.
 * Azure: "en-US-GuyNeural" - warm, authoritative, ~$0.01/conversation, includes viseme data
 * ElevenLabs: Custom cloned voice, ~$0.03-0.05/conversation, most human-sounding
 */

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let onAudioLevelCallback: ((level: number) => void) | null = null;
let isAudioUnlocked = false;
let currentOnEndCallback: (() => void) | null = null;
let speechTimeoutId: number | null = null;
let voiceEnabled = true;
let hasTestedTTS = false;

// Always log for debugging TTS issues
function log(...args: unknown[]) {
  console.log('[TTS]', ...args);
}

// Voice settings for divine presence - warm, deep, authoritative
const VOICE_SETTINGS = {
  rate: 0.82,     // Slower = more gravitas
  pitch: 0.85,    // Lower = deeper, more authoritative
  volume: 1.0,
};

// Preferred voices in order of quality (most natural sounding first)
const PREFERRED_VOICES = [
  'Google UK English Male',   // Chrome desktop - best free option
  'Daniel',                   // Safari/iOS - very natural British male
  'Aaron',                    // macOS - good quality
  'Google US English',        // Chrome fallback
  'Microsoft David',          // Windows Edge
  'Microsoft Mark',           // Windows
  'Alex',                     // macOS fallback
  'Samantha',                 // Last resort - female but high quality
];

/**
 * Run TTS diagnostics on module load
 */
function runTTSDiagnostics() {
  if (typeof window === 'undefined' || hasTestedTTS) return;
  hasTestedTTS = true;

  log('=== TTS DIAGNOSTICS ===');
  log('speechSynthesis available:', 'speechSynthesis' in window);

  if ('speechSynthesis' in window) {
    const voices = speechSynthesis.getVoices();
    log('Initial voices count:', voices.length);

    if (voices.length === 0) {
      log('No voices yet, waiting for voiceschanged event...');
      const handleVoicesChanged = () => {
        const loadedVoices = speechSynthesis.getVoices();
        log('voiceschanged fired, voices count:', loadedVoices.length);
        if (loadedVoices.length > 0) {
          logSelectedVoice(loadedVoices);
          voicesLoaded = true;
        }
      };
      speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

      // Polling backup
      let pollCount = 0;
      const pollForVoices = () => {
        pollCount++;
        const polledVoices = speechSynthesis.getVoices();
        if (polledVoices.length > 0) {
          log('Voices loaded via polling (attempt', pollCount, '):', polledVoices.length);
          logSelectedVoice(polledVoices);
          voicesLoaded = true;
        } else if (pollCount < 10) {
          setTimeout(pollForVoices, 200);
        }
      };
      setTimeout(pollForVoices, 100);
    } else {
      logSelectedVoice(voices);
      voicesLoaded = true;
    }
  }
}

function logSelectedVoice(voices: SpeechSynthesisVoice[]) {
  const bestVoice = selectBestVoice(voices, 'en');
  if (bestVoice) {
    log('Selected voice:', bestVoice.name, '(', bestVoice.lang, ')');
  }
  log('Available voices sample:', voices.slice(0, 5).map(v => v.name).join(', '));
}

// Run diagnostics when module loads
if (typeof window !== 'undefined') {
  setTimeout(runTTSDiagnostics, 100);
}

/**
 * Initialize audio context (must be called on user interaction)
 * This is critical for iOS which requires user gesture to start audio
 */
export function initAudio(): void {
  log('initAudio() called, isAudioUnlocked:', isAudioUnlocked);

  // Create AudioContext if needed
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

  // Resume audio context if suspended
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      log('Audio context resumed successfully');
      isAudioUnlocked = true;
    }).catch(err => {
      log('Failed to resume audio context:', err);
    });
  } else if (audioContext) {
    isAudioUnlocked = true;
  }

  // Unlock SpeechSynthesis on user gesture (iOS/Safari requirement)
  if ('speechSynthesis' in window) {
    try {
      speechSynthesis.cancel();
      const unlockUtterance = new SpeechSynthesisUtterance(' ');
      unlockUtterance.volume = 0.01;
      unlockUtterance.rate = 10;
      speechSynthesis.speak(unlockUtterance);
      isAudioUnlocked = true;
      log('SpeechSynthesis unlock attempted');
    } catch (e) {
      log('Failed to unlock SpeechSynthesis:', e);
    }

    // Ensure voices are loaded
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0 && !voicesLoaded) {
      speechSynthesis.getVoices();
    }
  }
}

// Language to BCP-47 code mapping
const languageToBCP47: Record<string, string> = {
  en: 'en', es: 'es', ar: 'ar', hi: 'hi', pt: 'pt', fr: 'fr',
  id: 'id', ur: 'ur', tr: 'tr', de: 'de', sw: 'sw', zh: 'zh',
  ko: 'ko', ja: 'ja', tl: 'fil', it: 'it',
};

// Preferred voices by language
const preferredVoicesByLanguage: Record<string, string[]> = {
  en: PREFERRED_VOICES,
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

let voicesLoaded = false;
let voicesLoadedPromise: Promise<void> | null = null;

/**
 * Wait for voices to be loaded
 */
function waitForVoices(): Promise<void> {
  if (voicesLoaded) return Promise.resolve();
  if (voicesLoadedPromise) return voicesLoadedPromise;

  voicesLoadedPromise = new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve();
      return;
    }

    const onVoicesChanged = () => {
      const loadedVoices = speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        voicesLoaded = true;
        speechSynthesis.onvoiceschanged = null;
        resolve();
      }
    };
    speechSynthesis.onvoiceschanged = onVoicesChanged;

    setTimeout(() => {
      const fallbackVoices = speechSynthesis.getVoices();
      if (fallbackVoices.length > 0) voicesLoaded = true;
      resolve();
    }, 3000);
  });

  return voicesLoadedPromise;
}

/**
 * Select the best voice based on preference order
 */
function selectBestVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | null {
  const langCode = languageToBCP47[language] || 'en';
  const preferredVoices = preferredVoicesByLanguage[language] || PREFERRED_VOICES;

  // Try preferred voices in order
  for (const name of preferredVoices) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }

  // Try any male voice for the language
  const maleVoice = voices.find(v =>
    v.lang.startsWith(langCode) &&
    (v.name.toLowerCase().includes('male') ||
     v.name.includes('Daniel') ||
     v.name.includes('David') ||
     v.name.includes('James') ||
     v.name.includes('Aaron'))
  );
  if (maleVoice) return maleVoice;

  // Any voice matching the language
  const langVoice = voices.find(v => v.lang.startsWith(langCode));
  if (langVoice) return langVoice;

  // Ultimate fallback
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

/**
 * Calculate dynamic timeout based on text length
 * Formula: length × 100ms per character, min 15s, max 120s
 */
function calculateTimeout(text: string): number {
  const msPerChar = 100;
  const minTimeout = 15000;
  const maxTimeout = 120000;
  const calculated = text.length * msPerChar;
  return Math.min(maxTimeout, Math.max(minTimeout, calculated));
}

/**
 * Speak text with divine voice
 * Returns a promise that resolves when speech ends or fails
 */
export function speak(
  text: string,
  language?: string,
  onEnd?: () => void,
  onAudioLevel?: (level: number) => void
): void {
  log('speak() called, text length:', text.length, 'voiceEnabled:', voiceEnabled);

  // Clear any previous timeout
  if (speechTimeoutId) {
    clearTimeout(speechTimeoutId);
    speechTimeoutId = null;
  }

  // Cancel any current speech
  stop();

  currentOnEndCallback = onEnd || null;

  // Helper to safely call onEnd only once
  let hasCalledOnEnd = false;
  const safeOnEnd = () => {
    if (hasCalledOnEnd) return;
    hasCalledOnEnd = true;
    log('TTS complete, calling onEnd');
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

  if (!voiceEnabled) {
    log('Voice disabled, skipping TTS');
    safeOnEnd();
    return;
  }

  if (!('speechSynthesis' in window)) {
    log('SpeechSynthesis not available');
    safeOnEnd();
    return;
  }

  onAudioLevelCallback = onAudioLevel || null;

  // Try to unlock audio if needed
  if (!isAudioUnlocked) {
    try {
      const unlock = new SpeechSynthesisUtterance('');
      unlock.volume = 0;
      speechSynthesis.speak(unlock);
      isAudioUnlocked = true;
    } catch (e) {
      log('Failed to unlock audio:', e);
    }
  }

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = VOICE_SETTINGS.rate;
  utterance.pitch = VOICE_SETTINGS.pitch;
  utterance.volume = VOICE_SETTINGS.volume;

  // Set voice
  const lang = language || 'en';
  const voices = speechSynthesis.getVoices();
  const voice = selectBestVoice(voices, lang);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
    log('Using voice:', voice.name, 'rate:', VOICE_SETTINGS.rate, 'pitch:', VOICE_SETTINGS.pitch);
  } else {
    log('No voice available, using browser default');
    utterance.lang = languageToBCP47[lang] || 'en-US';
  }

  // Event handlers
  utterance.onstart = () => {
    log('Speech started');
    startAudioLevelSimulation();
  };

  utterance.onend = () => {
    log('Speech ended naturally (onend event fired)');
    safeOnEnd();
  };

  utterance.onerror = (event) => {
    log('Speech error:', event.error);
    safeOnEnd();
  };

  // Resume if paused (iOS Safari fix)
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
  }

  try {
    speechSynthesis.speak(utterance);

    // Dynamic timeout based on text length
    const timeout = calculateTimeout(text);
    log('Setting dynamic timeout:', timeout, 'ms for', text.length, 'chars');
    speechTimeoutId = window.setTimeout(() => {
      log('Timeout reached after', timeout, 'ms, forcing end');
      speechSynthesis.cancel();
      safeOnEnd();
    }, timeout);

    // Check for silent failure after 2 seconds
    setTimeout(() => {
      if (!hasCalledOnEnd && !speechSynthesis.speaking && !speechSynthesis.pending) {
        log('Speech failed silently, forcing end');
        safeOnEnd();
      }
    }, 2000);

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
  if (speechTimeoutId) {
    clearTimeout(speechTimeoutId);
    speechTimeoutId = null;
  }
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
  if (!enabled) stop();
}

/**
 * Check if voice is enabled
 */
export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}

// Audio level simulation
let audioLevelInterval: number | null = null;

function startAudioLevelSimulation(): void {
  if (audioLevelInterval) return;

  audioLevelInterval = window.setInterval(() => {
    if (onAudioLevelCallback && speechSynthesis.speaking) {
      const baseLevel = 0.3;
      const variance = Math.random() * 0.4;
      onAudioLevelCallback(baseLevel + variance);
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
 * Test TTS availability
 */
export async function testTTS(): Promise<boolean> {
  if (!('speechSynthesis' in window)) return false;
  await waitForVoices();
  return speechSynthesis.getVoices().length > 0;
}
