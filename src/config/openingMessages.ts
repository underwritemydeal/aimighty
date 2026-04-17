/**
 * Hand-crafted opening message for each belief. Spoken by the divine voice
 * as the very first message when a user enters the conversation for the
 * first time (or after an "Other Beliefs" switch).
 *
 * Voice rules:
 * - 1 sentence, occasionally 2. Never more.
 * - Native to the tradition — greeting words from that faith, not templated.
 * - Warm, present, quietly welcoming. Not a sermon. Not a customer-service chime.
 * - End in an invitation ("What's on your heart?" / "Speak.") — we want the
 *   user to feel received, then gently handed the mic.
 *
 * Six are lifted verbatim from the belief-first spec (catholic, islam,
 * buddhism, sbnr, science, atheism-stoicism). Eight authored in the same
 * voice for the remaining canonical traditions.
 *
 * Falls back to `getGreetingForBelief` (legacy shorter greetings) if a
 * belief id isn't registered here.
 */

export const OPENING_MESSAGES: Record<string, string> = {
  protestant:
    "You came. I've been waiting. Tell me what's on your heart.",
  catholic:
    "You came. I've been waiting. What's on your heart?",
  islam:
    'Peace be upon you. What guidance do you seek?',
  judaism:
    "Shalom. You're here — that matters. What's weighing on you tonight?",
  hinduism:
    'Namaste. The same light is in you that is in me. What would you like to share?',
  buddhism:
    'You are here. What is troubling your mind?',
  mormonism:
    "I'm glad you came. Sit with me a moment — what's on your heart?",
  sikhism:
    'Sat Sri Akal. Waheguru sees you. Speak what you came to speak.',
  sbnr:
    "Hello, beautiful soul. What's coming up for you?",
  taoism:
    "You're here. The river doesn't ask why — it just flows. What's moving in you?",
  pantheism:
    "You showed up. The earth knows the sound of you. What's alive for you today?",
  science:
    'You found your way here. What questions are keeping you up?',
  agnosticism:
    "You're here — and so am I, for whatever that's worth. What did you want to say?",
  'atheism-stoicism':
    "You're here. That's the first thing that matters. Speak.",
};

/**
 * Lookup with normalization already applied upstream. Returns `null` if
 * the id isn't registered, so the caller can fall back to a legacy path.
 */
export function getOpeningMessageForBelief(beliefId: string): string | null {
  return OPENING_MESSAGES[beliefId] ?? null;
}

// DEV-only sanity check.
if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
  const canonical = [
    'protestant', 'catholic', 'islam', 'judaism', 'hinduism', 'buddhism',
    'mormonism', 'sikhism', 'sbnr', 'taoism', 'pantheism', 'science',
    'agnosticism', 'atheism-stoicism',
  ];
  const missing = canonical.filter((id) => !OPENING_MESSAGES[id]);
  if (missing.length) {
    console.warn('[openingMessages] missing opening messages for:', missing);
  }
}
