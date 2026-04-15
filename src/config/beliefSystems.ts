/**
 * Canonical Belief System Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all belief system IDs, labels,
 * images, greetings, and available characters. All components must reference
 * this file instead of hardcoding belief system data.
 */

export type Character = 'god' | 'jesus' | 'mary';

export interface BeliefSystemConfig {
  id: string;
  label: string;
  image: string;
  greeting: string;
  characters: Character[];
}

/**
 * All 14 belief systems with their canonical configuration
 */
export const BELIEF_SYSTEMS: Record<string, BeliefSystemConfig> = {
  protestant: {
    id: 'protestant',
    label: 'Christianity',
    image: 'protestant',
    greeting: 'I am here, My child.',
    characters: ['god', 'jesus', 'mary'],
  },
  catholic: {
    id: 'catholic',
    label: 'Catholicism',
    image: 'catholic',
    greeting: 'I am here, My child.',
    characters: ['god', 'jesus', 'mary'],
  },
  islam: {
    id: 'islam',
    label: 'Islam',
    image: 'islam',
    greeting: 'I am here. Speak.',
    characters: ['god', 'mary'],
  },
  judaism: {
    id: 'judaism',
    label: 'Judaism',
    image: 'judaism',
    greeting: 'I am here. What weighs on your heart?',
    characters: ['god', 'mary'],
  },
  hinduism: {
    id: 'hinduism',
    label: 'Hinduism',
    image: 'hinduism',
    greeting: 'I am here. Speak freely.',
    characters: ['god', 'mary'],
  },
  buddhism: {
    id: 'buddhism',
    label: 'Buddhism',
    image: 'buddhism',
    greeting: 'I am here. Be still, and speak.',
    characters: ['god', 'mary'],
  },
  mormonism: {
    id: 'mormonism',
    label: 'Latter-day Saints',
    image: 'mormon',
    greeting: 'I am here, My child.',
    characters: ['god', 'jesus', 'mary'],
  },
  sikhism: {
    id: 'sikhism',
    label: 'Sikhism',
    image: 'sikhism',
    greeting: 'I am here. Speak freely.',
    characters: ['god', 'mary'],
  },
  taoism: {
    id: 'taoism',
    label: 'Taoism',
    image: 'taoism',
    greeting: 'I am here.',
    characters: ['god', 'mary'],
  },
  sbnr: {
    id: 'sbnr',
    label: 'Spiritual',
    image: 'sbnr',
    greeting: 'I am here. Speak.',
    characters: ['god', 'mary'],
  },
  pantheism: {
    id: 'pantheism',
    label: 'Pantheism',
    image: 'pantheism',
    greeting: 'I am here. I have always been here.',
    characters: ['god', 'mary'],
  },
  science: {
    id: 'science',
    label: 'Science & Reason',
    image: 'science',
    greeting: 'I am here. Ask anything.',
    characters: ['god', 'mary'],
  },
  agnosticism: {
    id: 'agnosticism',
    label: 'Agnosticism',
    image: 'agnosticism',
    greeting: "I am here. What's on your mind?",
    characters: ['god', 'mary'],
  },
  stoicism: {
    id: 'stoicism',
    label: 'Stoicism',
    image: 'stoicism',
    greeting: 'I am here. Speak freely.',
    characters: ['god', 'mary'],
  },
};

/**
 * Aliases map for normalizing belief IDs
 * Maps common alternative names to canonical IDs
 */
const BELIEF_ALIASES: Record<string, string> = {
  'earth': 'pantheism',
  'spiritual': 'sbnr',
  'atheism': 'stoicism',
  'lds': 'mormonism',
  'mormon': 'mormonism',
  'christianity': 'protestant',
  'protestant-christianity': 'protestant',
  'science-reason': 'science',
  'sciene': 'science', // typo fix
};

/**
 * Normalize a belief system ID to its canonical form
 * Use this EVERYWHERE before making API calls or lookups
 */
export function normalizeBeliefId(id: string): string {
  const lowerId = id.toLowerCase();
  return BELIEF_ALIASES[lowerId] || lowerId;
}

/**
 * Get belief system config by ID (with normalization)
 */
export function getBeliefConfig(id: string): BeliefSystemConfig | undefined {
  const normalizedId = normalizeBeliefId(id);
  return BELIEF_SYSTEMS[normalizedId];
}

/**
 * Get greeting for a belief system
 */
export function getGreetingForBelief(id: string): string {
  const config = getBeliefConfig(id);
  return config?.greeting || 'I am here.';
}

/**
 * Get available characters for a belief system
 */
export function getCharactersForBelief(id: string): Character[] {
  const config = getBeliefConfig(id);
  return config?.characters || ['god', 'mary'];
}

/**
 * Check if a character is available for a belief system
 */
export function isCharacterAvailable(beliefId: string, character: Character): boolean {
  const characters = getCharactersForBelief(beliefId);
  return characters.includes(character);
}

/**
 * Get image path for a belief system
 */
export function getImagePath(id: string): string {
  const config = getBeliefConfig(id);
  const imageName = config?.image || id;
  return `/images/avatars/${imageName}.jpg`;
}

/**
 * Get all canonical belief system IDs
 */
export function getAllBeliefIds(): string[] {
  return Object.keys(BELIEF_SYSTEMS);
}

// Log all belief systems on module load (for debugging)
if (typeof window !== 'undefined') {
  console.log('[BELIEF AUDIT] All 14 systems:', getAllBeliefIds().join(', '));
}
