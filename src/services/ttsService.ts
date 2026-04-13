/**
 * Text-to-Speech Service
 * Uses browser SpeechSynthesis API with divine voice settings
 */

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let onAudioLevelCallback: ((level: number) => void) | null = null;

// Voice settings for divine presence
const VOICE_SETTINGS = {
  rate: 0.88,     // Slower for gravitas
  pitch: 0.92,    // Slightly lower pitch
  volume: 1.0,
};

/**
 * Initialize audio context (must be called on user interaction)
 */
export function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
  }
}

/**
 * Get the best available voice for divine speech
 */
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();

  // Prefer deep, authoritative voices
  const preferredVoices = [
    // English premium voices
    'Google UK English Male',
    'Microsoft David',
    'Daniel',
    'Google US English',
    'Alex',
    'Samantha',
  ];

  for (const name of preferredVoices) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }

  // Fall back to any English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  return englishVoice || voices[0] || null;
}

/**
 * Speak text with divine voice
 */
export function speak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onAudioLevel?: (level: number) => void
): void {
  // Cancel any current speech
  stop();

  if (!text.trim()) {
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
  const setVoice = () => {
    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }
  };

  if (speechSynthesis.getVoices().length > 0) {
    setVoice();
  } else {
    speechSynthesis.onvoiceschanged = setVoice;
  }

  // Handle events
  utterance.onstart = () => {
    onStart?.();
    startAudioLevelSimulation();
  };

  utterance.onend = () => {
    stopAudioLevelSimulation();
    onEnd?.();
  };

  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event.error);
    stopAudioLevelSimulation();
    onEnd?.();
  };

  // Speak
  speechSynthesis.speak(utterance);
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
