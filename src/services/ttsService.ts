/**
 * Text-to-Speech Service
 * Uses browser SpeechSynthesis API with divine voice settings
 * Handles iOS audio context requirements
 */

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let onAudioLevelCallback: ((level: number) => void) | null = null;
let isAudioUnlocked = false;

// Debug logging
const DEBUG = import.meta.env.DEV;
function log(...args: unknown[]) {
  if (DEBUG) console.log('[TTS]', ...args);
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
  log('speak() called with text length:', text.length, 'language:', language);

  // Cancel any current speech
  stop();

  if (!text.trim()) {
    log('Empty text, calling onEnd');
    onEnd?.();
    return;
  }

  // Check if SpeechSynthesis is available
  if (!('speechSynthesis' in window)) {
    log('SpeechSynthesis not available');
    onEnd?.();
    return;
  }

  // Store callback for audio level updates
  onAudioLevelCallback = onAudioLevel || null;

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
    log('Speech ended');
    stopAudioLevelSimulation();
    onEnd?.();
  };

  utterance.onerror = (event) => {
    log('Speech synthesis error:', event.error);

    // Common iOS errors - fail silently and just show text
    if (event.error === 'not-allowed' || event.error === 'interrupted') {
      log('Audio not allowed or interrupted - showing text only');
    }

    stopAudioLevelSimulation();
    onEnd?.();
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

    // iOS fix: speechSynthesis can get stuck, check after a delay
    setTimeout(() => {
      if (speechSynthesis.speaking === false && speechSynthesis.pending === false) {
        log('Speech may have failed silently, triggering onEnd');
        // Speech may have failed silently on iOS
        stopAudioLevelSimulation();
        // Don't call onEnd here as it may have already been called
      }
    }, 500);
  } catch (error) {
    log('Exception in speak():', error);
    onEnd?.();
  }
}

/**
 * Stop current speech
 */
export function stop(): void {
  speechSynthesis.cancel();
  stopAudioLevelSimulation();
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
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
