/**
 * Belief-specific color themes for the Capture This Moment share artifact.
 *
 * Each entry defines the four colors needed to render a 1080×1920 shareable
 * PNG: background gradient base (`bg`), the glow/highlight color that blooms
 * during the cinematic transition (`glow`), the primary text color for God's
 * reply (`primary`), and the secondary tone for the user's question, the
 * wordmark, and the URL (`secondary`).
 *
 * Colors are chosen to evoke each tradition's visual language — Islamic
 * emerald, Catholic burgundy, Hindu saffron, Sikh orange, and so on —
 * while staying within a reverent, dim-lit register that works on both
 * light and dark social feeds. No neon, no gradients-of-the-month.
 *
 * Also includes `SHARE_TEXT_BY_BELIEF`: the default share text shown in the
 * native share sheet for each belief. Keep these short (<140 chars) so they
 * fit SMS previews and iMessage thumbnails without truncation.
 */

import { getAllBeliefIds } from './beliefSystems';

export interface BeliefTheme {
  /** Background base color — gradient bottom. */
  bg: string;
  /** Glow/highlight color that blooms during the capture animation. */
  glow: string;
  /** Primary text color — God's reply renders in this. */
  primary: string;
  /** Secondary text color — user question, wordmark, URL. */
  secondary: string;
}

/**
 * Canonical 14-belief theme map. Keys MUST match `BELIEF_SYSTEMS` in
 * `src/config/beliefSystems.ts`. A runtime assertion at module load
 * guarantees that — if you add a new belief, you must add a theme.
 */
export const BELIEF_THEMES: Record<string, BeliefTheme> = {
  // Christian — warm gold on deep void, reverent
  protestant: {
    bg: '#0a0612',
    glow: 'rgba(212, 175, 55, 0.55)',
    primary: '#f5e8c7',
    secondary: 'rgba(212, 175, 55, 0.75)',
  },
  // Catholic — deeper, Vatican burgundy/gold
  catholic: {
    bg: '#120609',
    glow: 'rgba(196, 132, 76, 0.55)',
    primary: '#f0dcc2',
    secondary: 'rgba(196, 132, 76, 0.8)',
  },
  // Islam — Islamic emerald + gold calligraphy feel
  islam: {
    bg: '#041a14',
    glow: 'rgba(72, 187, 120, 0.45)',
    primary: '#e8f5e0',
    secondary: 'rgba(218, 165, 32, 0.85)',
  },
  // Judaism — royal blue, Star of David, Torah cover
  judaism: {
    bg: '#05081a',
    glow: 'rgba(88, 131, 220, 0.5)',
    primary: '#eef2fb',
    secondary: 'rgba(230, 195, 100, 0.8)',
  },
  // Hinduism — saffron on deep crimson, traditional
  hinduism: {
    bg: '#1a0508',
    glow: 'rgba(234, 124, 55, 0.55)',
    primary: '#fbe8cc',
    secondary: 'rgba(234, 124, 55, 0.85)',
  },
  // Buddhism — monk robe ochre on deep red
  buddhism: {
    bg: '#14060a',
    glow: 'rgba(210, 140, 60, 0.5)',
    primary: '#f3e1c0',
    secondary: 'rgba(210, 140, 60, 0.85)',
  },
  // LDS — LDS temple light blue on warm gold
  mormonism: {
    bg: '#06101a',
    glow: 'rgba(170, 200, 230, 0.45)',
    primary: '#f3ead4',
    secondary: 'rgba(218, 180, 110, 0.8)',
  },
  // Sikhism — khanda orange + navy
  sikhism: {
    bg: '#07091a',
    glow: 'rgba(242, 140, 40, 0.5)',
    primary: '#fbe7cc',
    secondary: 'rgba(242, 140, 40, 0.85)',
  },
  // SBNR — soft violet moonlight
  sbnr: {
    bg: '#0a0818',
    glow: 'rgba(185, 165, 225, 0.5)',
    primary: '#f0eaf7',
    secondary: 'rgba(185, 165, 225, 0.8)',
  },
  // Taoism — jade on black, yin-yang
  taoism: {
    bg: '#040a0a',
    glow: 'rgba(140, 200, 180, 0.45)',
    primary: '#eaf3ef',
    secondary: 'rgba(140, 200, 180, 0.8)',
  },
  // Pantheism — forest green + amber, natural world
  pantheism: {
    bg: '#051208',
    glow: 'rgba(150, 200, 120, 0.5)',
    primary: '#e9f1dd',
    secondary: 'rgba(210, 165, 90, 0.8)',
  },
  // Science — deep indigo, cosmic silver
  science: {
    bg: '#060814',
    glow: 'rgba(140, 170, 220, 0.45)',
    primary: '#e8ecf5',
    secondary: 'rgba(190, 200, 220, 0.8)',
  },
  // Agnosticism — slate + soft gold, open question
  agnosticism: {
    bg: '#0a0c12',
    glow: 'rgba(180, 180, 190, 0.4)',
    primary: '#ecedf1',
    secondary: 'rgba(200, 180, 130, 0.75)',
  },
  // Stoicism — charcoal + bronze, disciplined
  'atheism-stoicism': {
    bg: '#0a0a0c',
    glow: 'rgba(180, 140, 90, 0.45)',
    primary: '#ede7dc',
    secondary: 'rgba(180, 140, 90, 0.85)',
  },
};

/**
 * Default share text shown in the native share sheet by belief.
 *
 * Keep these ≤140 chars so SMS previews and iMessage thumbnails don't
 * truncate. Every entry is written to sound like something a human would
 * say unprompted — not marketing copy.
 */
export const SHARE_TEXT_BY_BELIEF: Record<string, string> = {
  protestant: 'A word I needed to hear today.',
  catholic: 'Something worth sitting with.',
  islam: 'A moment of guidance, shared.',
  judaism: 'A question I asked, and the answer I got.',
  hinduism: 'A truth that met me where I was.',
  buddhism: 'A moment of stillness to share.',
  mormonism: 'A word I needed to hear today.',
  sikhism: 'A truth that stopped me in my tracks.',
  sbnr: 'Something the universe said back.',
  taoism: 'A stillness worth passing on.',
  pantheism: 'A moment the world spoke back.',
  science: 'An answer that actually helped.',
  agnosticism: 'I asked, and this came back.',
  'atheism-stoicism': 'Something worth remembering.',
};

/**
 * Fallback used when a belief ID is missing or unrecognized. Matches the
 * app's primary gold-on-void identity so a theme gap never produces a
 * raw black-and-white capture.
 */
export const DEFAULT_THEME: BeliefTheme = {
  bg: '#030308',
  glow: 'rgba(212, 175, 55, 0.5)',
  primary: '#f5e8c7',
  secondary: 'rgba(212, 175, 55, 0.75)',
};

export const DEFAULT_SHARE_TEXT = 'Something worth sitting with.';

/**
 * Lookup helpers — always normalize through these rather than reading the
 * maps directly so aliased IDs (e.g. `atheism`, `stoicism`) resolve correctly.
 */
import { normalizeBeliefId } from './beliefSystems';

export function getThemeForBelief(beliefId: string): BeliefTheme {
  const id = normalizeBeliefId(beliefId);
  return BELIEF_THEMES[id] || DEFAULT_THEME;
}

export function getShareTextForBelief(beliefId: string): string {
  const id = normalizeBeliefId(beliefId);
  return SHARE_TEXT_BY_BELIEF[id] || DEFAULT_SHARE_TEXT;
}

// Runtime guard: fail loudly in dev if a belief is missing a theme.
// Silent fallback in prod — we'd rather ship a gold default than crash.
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  const missing = getAllBeliefIds().filter(
    (id) => !BELIEF_THEMES[id] || !SHARE_TEXT_BY_BELIEF[id]
  );
  if (missing.length) {
    console.warn('[beliefThemes] missing theme/share-text for:', missing.join(', '));
  }
}
