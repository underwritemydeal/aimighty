/**
 * One-line evocative descriptors shown on each belief card in the picker.
 *
 * Voice: native to each tradition. The goal is that a devout member reads
 * their card and feels seen — not that an outsider gets an explainer. Keep
 * these short, confident, and specific. Cormorant Garamond italic 300 at
 * render time.
 *
 * Keys are the 14 canonical belief IDs in `beliefSystems.ts` — NOT the
 * spec's shorthand aliases. `lds` → `mormonism`, `stoicism` → `atheism-stoicism`.
 */

export const BELIEF_DESCRIPTORS: Record<string, string> = {
  protestant:        'God the Father. Jesus. The Holy Spirit.',
  catholic:          'God, Jesus, Mary, and the saints.',
  islam:             "Allah's wisdom, through the words of His scholars.",
  judaism:           'Adonai. The wisdom of the Torah.',
  hinduism:          'Bhagwan. The eternal divine.',
  buddhism:          'The path beyond suffering.',
  mormonism:         'Restored gospel of Jesus.',
  sikhism:           'Waheguru. One God, equality, service.',
  sbnr:              'Open to the divine, not the dogma.',
  taoism:            'Flow with the natural way.',
  pantheism:         'All of nature is sacred.',
  science:           'Truth through evidence.',
  agnosticism:       'The big questions stay open.',
  'atheism-stoicism':'Virtue, reason, inner strength.',
};

const FALLBACK_DESCRIPTOR = 'A tradition to talk through.';

/**
 * Lookup with normalization already applied upstream. Callers should pass
 * the canonical id (run it through `normalizeBeliefId` first if unsure).
 */
export function getDescriptorForBelief(beliefId: string): string {
  return BELIEF_DESCRIPTORS[beliefId] ?? FALLBACK_DESCRIPTOR;
}

// DEV-only sanity check — flags any canonical belief added later that
// forgets to register a descriptor here.
if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
  const canonical = [
    'protestant', 'catholic', 'islam', 'judaism', 'hinduism', 'buddhism',
    'mormonism', 'sikhism', 'sbnr', 'taoism', 'pantheism', 'science',
    'agnosticism', 'atheism-stoicism',
  ];
  const missing = canonical.filter((id) => !BELIEF_DESCRIPTORS[id]);
  if (missing.length) {
    console.warn('[beliefDescriptors] missing descriptors for:', missing);
  }
}
