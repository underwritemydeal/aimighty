import type { BeliefSystem } from '../types';

// Categories for organizing belief systems
export type BeliefCategory = 'religious' | 'spiritual' | 'philosophical';

export interface CategorizedBeliefSystem extends BeliefSystem {
  category: BeliefCategory;
  accentColor: string; // For glows, borders, highlights
  imagePath: string;   // Path to Midjourney avatar image
}

export const beliefSystems: CategorizedBeliefSystem[] = [
  // ═══════════════════════════════════════
  // RELIGIOUS TRADITIONS
  // ═══════════════════════════════════════
  {
    id: 'protestant',
    name: 'Christianity',
    subtitle: 'Protestant',
    icon: '✝️',
    description: 'Connect with the God of the Bible',
    themeColor: '#d4af37',
    accentColor: '#d4af37', // gold
    particleColor: '#ffd700',
    backgroundGradient: ['#1a1a0a', '#2a2000'],
    category: 'religious',
    imagePath: '/images/avatars/protestant.jpg',
    selfDescription: 'I believe in God and the Bible',
  },
  {
    id: 'catholic',
    name: 'Catholicism',
    subtitle: 'Catholic',
    icon: '⛪',
    description: 'Speak with the Holy Father',
    themeColor: '#4169E1',
    accentColor: '#4169E1', // royal blue
    particleColor: '#6495ED',
    backgroundGradient: ['#0a0a1a', '#101030'],
    category: 'religious',
    imagePath: '/images/avatars/catholic.jpg',
    selfDescription: "I'm Catholic",
  },
  {
    id: 'islam',
    name: 'Islam',
    subtitle: 'Muslim',
    icon: '☪️',
    description: 'Connect with Allah, the Most Merciful',
    themeColor: '#00A86B',
    accentColor: '#00A86B', // emerald green
    particleColor: '#00ff88',
    backgroundGradient: ['#0a1a0a', '#002000'],
    category: 'religious',
    imagePath: '/images/avatars/islam.jpg',
    selfDescription: "I'm Muslim",
  },
  {
    id: 'judaism',
    name: 'Judaism',
    subtitle: 'Jewish',
    icon: '✡️',
    description: 'Speak with Adonai, the God of Israel',
    themeColor: '#d4af37',
    accentColor: '#d4af37', // gold
    particleColor: '#ffd700',
    backgroundGradient: ['#1a1a0a', '#2a2000'],
    category: 'religious',
    imagePath: '/images/avatars/judaism.jpg',
    selfDescription: "I'm Jewish",
  },
  {
    id: 'hinduism',
    name: 'Hinduism',
    subtitle: 'Hindu',
    icon: '🕉️',
    description: 'Connect with Brahman, the universal soul',
    themeColor: '#FF6B00',
    accentColor: '#FF6B00', // saffron
    particleColor: '#ffaa44',
    backgroundGradient: ['#1a0a00', '#301500'],
    category: 'religious',
    imagePath: '/images/avatars/hinduism.jpg',
    selfDescription: "I'm Hindu",
  },
  {
    id: 'buddhism',
    name: 'Buddhism',
    subtitle: 'Buddhist',
    icon: '☸️',
    description: 'Find wisdom on the path to enlightenment',
    themeColor: '#d4af37',
    accentColor: '#d4af37', // gold
    particleColor: '#fcd34d',
    backgroundGradient: ['#1a1a00', '#282000'],
    category: 'religious',
    imagePath: '/images/avatars/buddhism.jpg',
    selfDescription: 'I practice Buddhism',
  },
  {
    id: 'mormonism',
    name: 'Latter-day Saints',
    subtitle: 'LDS / Mormon',
    icon: '📖',
    description: 'Speak with Heavenly Father',
    themeColor: '#F5F5DC',
    accentColor: '#F5F5DC', // warm white
    particleColor: '#fffef0',
    backgroundGradient: ['#101015', '#181820'],
    category: 'religious',
    imagePath: '/images/avatars/mormon.jpg',
    selfDescription: "I'm Mormon / Latter-day Saint",
  },
  {
    id: 'sikhism',
    name: 'Sikhism',
    subtitle: 'Sikh',
    icon: '🙏',
    description: 'Connect with Waheguru, the Wonderful Teacher',
    themeColor: '#FF8C00',
    accentColor: '#FF8C00', // deep orange
    particleColor: '#fb923c',
    backgroundGradient: ['#1a0800', '#301000'],
    category: 'religious',
    imagePath: '/images/avatars/sikhism.jpg',
    selfDescription: "I'm Sikh",
  },

  // ═══════════════════════════════════════
  // SPIRITUAL PATHS
  // ═══════════════════════════════════════
  {
    id: 'sbnr',
    name: 'Spiritual',
    subtitle: 'Spiritual But Not Religious',
    icon: '✨',
    description: 'Connect with the Universe, Source, and Spirit',
    themeColor: '#9370DB',
    accentColor: '#9370DB', // medium purple
    particleColor: '#cc77ff',
    backgroundGradient: ['#1a0a2a', '#200040'],
    category: 'spiritual',
    imagePath: '/images/avatars/sbnr.jpg',
    selfDescription: "I'm spiritual but not religious",
  },
  {
    id: 'taoism',
    name: 'Taoism',
    subtitle: 'Taoist',
    icon: '☯️',
    description: 'Flow with the Tao, the eternal Way',
    themeColor: '#2E8B57',
    accentColor: '#2E8B57', // sage green
    particleColor: '#34d399',
    backgroundGradient: ['#001510', '#002018'],
    category: 'spiritual',
    imagePath: '/images/avatars/taoism.jpg',
    selfDescription: 'I follow the Tao',
  },
  {
    id: 'pantheism',
    name: 'Pantheism',
    subtitle: 'Earth & Nature',
    icon: '🌍',
    description: 'Speak with the divine in all things',
    themeColor: '#228B22',
    accentColor: '#228B22', // forest green
    particleColor: '#4ade80',
    backgroundGradient: ['#0a1a0a', '#001a00'],
    category: 'spiritual',
    imagePath: '/images/avatars/pantheism.jpg',
    selfDescription: 'I connect with nature as divine',
  },

  // ═══════════════════════════════════════
  // PHILOSOPHICAL FRAMEWORKS
  // ═══════════════════════════════════════
  {
    id: 'science',
    name: 'Science & Reason',
    subtitle: 'The Universe',
    icon: '🔬',
    description: 'Explore meaning through science and wonder',
    themeColor: '#4682B4',
    accentColor: '#4682B4', // steel blue
    particleColor: '#4488ff',
    backgroundGradient: ['#0a0a2a', '#000040'],
    category: 'philosophical',
    imagePath: '/images/avatars/science.jpg',
    selfDescription: 'I believe in science and reason',
  },
  {
    id: 'agnosticism',
    name: 'Agnosticism',
    subtitle: 'The Unknown',
    icon: '❓',
    description: 'Explore the honest uncertainty of existence',
    themeColor: '#B8860B',
    accentColor: '#B8860B', // dark gold
    particleColor: '#daa520',
    backgroundGradient: ['#0a0a10', '#151520'],
    category: 'philosophical',
    imagePath: '/images/avatars/agnosticism.jpg',
    selfDescription: "I'm not sure what I believe",
  },
  {
    id: 'atheism-stoicism',
    name: 'Stoicism',
    subtitle: 'Atheist / Stoic',
    icon: '🏛️',
    description: 'Find meaning through reason and virtue',
    themeColor: '#4682B4',
    accentColor: '#4682B4', // steel blue
    particleColor: '#a8a29e',
    backgroundGradient: ['#0f0f0a', '#1a1a15'],
    category: 'philosophical',
    imagePath: '/images/avatars/stoicism.jpg',
    selfDescription: 'I find meaning through reason',
  },
];

// Helper to get beliefs by category
export function getBeliefsByCategory(category: BeliefCategory): CategorizedBeliefSystem[] {
  return beliefSystems.filter(b => b.category === category);
}

// Category display names
export const categoryLabels: Record<BeliefCategory, string> = {
  religious: 'Religious Traditions',
  spiritual: 'Spiritual Paths',
  philosophical: 'Philosophical Frameworks',
};

// Get belief by ID
export function getBeliefById(id: string): CategorizedBeliefSystem | undefined {
  return beliefSystems.find(b => b.id === id);
}
