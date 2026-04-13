import type { BeliefSystem } from '../types';

// Categories for organizing belief systems
export type BeliefCategory = 'religious' | 'spiritual' | 'philosophical';

export interface CategorizedBeliefSystem extends BeliefSystem {
  category: BeliefCategory;
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
    particleColor: '#ffd700',
    backgroundGradient: ['#1a1a0a', '#2a2000'],
    category: 'religious',
  },
  {
    id: 'catholic',
    name: 'Catholicism',
    subtitle: 'Catholic',
    icon: '⛪',
    description: 'Speak with the Holy Father',
    themeColor: '#8b0000',
    particleColor: '#ff4444',
    backgroundGradient: ['#1a0a0a', '#200000'],
    category: 'religious',
  },
  {
    id: 'islam',
    name: 'Islam',
    subtitle: 'Muslim',
    icon: '☪️',
    description: 'Connect with Allah, the Most Merciful',
    themeColor: '#006400',
    particleColor: '#00ff88',
    backgroundGradient: ['#0a1a0a', '#002000'],
    category: 'religious',
  },
  {
    id: 'judaism',
    name: 'Judaism',
    subtitle: 'Jewish',
    icon: '✡️',
    description: 'Speak with Adonai, the God of Israel',
    themeColor: '#1e3a8a',
    particleColor: '#60a5fa',
    backgroundGradient: ['#0a0a1a', '#001040'],
    category: 'religious',
  },
  {
    id: 'hinduism',
    name: 'Hinduism',
    subtitle: 'Hindu',
    icon: '🕉️',
    description: 'Connect with Brahman, the universal soul',
    themeColor: '#ff6b00',
    particleColor: '#ffaa44',
    backgroundGradient: ['#1a0a00', '#301500'],
    category: 'religious',
  },
  {
    id: 'buddhism',
    name: 'Buddhism',
    subtitle: 'Buddhist',
    icon: '☸️',
    description: 'Find wisdom on the path to enlightenment',
    themeColor: '#eab308',
    particleColor: '#fcd34d',
    backgroundGradient: ['#1a1a00', '#282000'],
    category: 'religious',
  },
  {
    id: 'mormonism',
    name: 'Latter-day Saints',
    subtitle: 'LDS / Mormon',
    icon: '📖',
    description: 'Speak with Heavenly Father',
    themeColor: '#0369a1',
    particleColor: '#38bdf8',
    backgroundGradient: ['#001520', '#002030'],
    category: 'religious',
  },
  {
    id: 'sikhism',
    name: 'Sikhism',
    subtitle: 'Sikh',
    icon: '🙏',
    description: 'Connect with Waheguru, the Wonderful Teacher',
    themeColor: '#f97316',
    particleColor: '#fb923c',
    backgroundGradient: ['#1a0800', '#301000'],
    category: 'religious',
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
    themeColor: '#7b2d8e',
    particleColor: '#cc77ff',
    backgroundGradient: ['#1a0a2a', '#200040'],
    category: 'spiritual',
  },
  {
    id: 'taoism',
    name: 'Taoism',
    subtitle: 'Taoist',
    icon: '☯️',
    description: 'Flow with the Tao, the eternal Way',
    themeColor: '#059669',
    particleColor: '#34d399',
    backgroundGradient: ['#001510', '#002018'],
    category: 'spiritual',
  },
  {
    id: 'pantheism',
    name: 'Pantheism',
    subtitle: 'Earth & Nature',
    icon: '🌍',
    description: 'Speak with the divine in all things',
    themeColor: '#16a34a',
    particleColor: '#4ade80',
    backgroundGradient: ['#0a1a0a', '#001a00'],
    category: 'spiritual',
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
    themeColor: '#1e90ff',
    particleColor: '#4488ff',
    backgroundGradient: ['#0a0a2a', '#000040'],
    category: 'philosophical',
  },
  {
    id: 'agnosticism',
    name: 'Agnosticism',
    subtitle: 'The Unknown',
    icon: '❓',
    description: 'Explore the honest uncertainty of existence',
    themeColor: '#6b7280',
    particleColor: '#9ca3af',
    backgroundGradient: ['#0a0a10', '#151520'],
    category: 'philosophical',
  },
  {
    id: 'atheism',
    name: 'Stoicism',
    subtitle: 'Atheist / Stoic',
    icon: '🏛️',
    description: 'Find meaning through reason and virtue',
    themeColor: '#78716c',
    particleColor: '#a8a29e',
    backgroundGradient: ['#0f0f0a', '#1a1a15'],
    category: 'philosophical',
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
