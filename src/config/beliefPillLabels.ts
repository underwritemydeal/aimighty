/**
 * Belief pill label mapping — figure-aware.
 *
 * The header "belief pill" renders a single figure-aware label
 * (e.g. "God", "Jesus", "Mary", "Guidance", "Adonai", ...) rather
 * than the belief name. The label depends on BOTH the beliefId and
 * the currently-selected character/figure, because Christian
 * traditions and Mary-capable spiritual traditions resolve the label
 * differently per figure.
 *
 * Locked in .stitch/DESIGN.md §5.3.
 */

import type { Character } from './beliefSystems';

export const getBeliefPillLabel = (
  beliefId: string,
  character: Character,
): string => {
  switch (beliefId) {
    case 'protestant':
    case 'catholic':
      if (character === 'jesus') return 'Jesus';
      if (character === 'mary') return 'Mary';
      return 'God';

    case 'mormonism':
      // The 'mary' character slot here renders as the LDS-specific
      // feminine divine — Heavenly Mother — rather than the Catholic
      // figure of Mary. Voice mapping still routes to the Coral
      // feminine voice; only the user-visible label changes.
      if (character === 'jesus') return 'Jesus';
      if (character === 'mary') return 'Heavenly Mother';
      return 'Heavenly Father';

    case 'sbnr':
      // 'mary' character → "Source" for Spiritual But Not Religious
      // (Mary is a Christian figure, not appropriate for SBNR).
      return character === 'mary' ? 'Source' : 'The Universe';

    case 'taoism':
      // 'mary' character → "Divine Feminine" for Taoism (the yin
      // principle has no proper-noun equivalent of Mary).
      return character === 'mary' ? 'Divine Feminine' : 'The Tao';

    case 'pantheism':
      // For pantheism, Gaia IS the feminine earth divinity — pair
      // 'mary' character with "Gaia" and 'god' character with the
      // gender-neutral "The Earth".
      return character === 'mary' ? 'Gaia' : 'The Earth';

    case 'islam':
      return 'Guidance';
    case 'judaism':
      return 'Adonai';
    case 'buddhism':
      return 'Buddha';
    case 'hinduism':
      return 'Brahman';
    case 'sikhism':
      return 'Waheguru';
    case 'science':
      return 'The Cosmos';
    case 'agnosticism':
      return 'The Inner Voice';
    case 'atheism-stoicism':
      return 'Reason';

    default:
      return 'God';
  }
};

/**
 * Returns the set of figure options the user can switch BETWEEN within a
 * belief, in display order (default first). Beliefs not listed return a
 * single-element array — the chip strip should not be rendered for them.
 *
 * Source of truth for the figure chip strip in the switch-belief modal
 * (.stitch/DESIGN.md §5.6). This is curated UX (e.g. Mary not surfaced as a
 * chip on Islam even though the voice mapping permits it), not the raw
 * voice-capability matrix.
 */
export const getAvailableCharacters = (beliefId: string): Character[] => {
  switch (beliefId) {
    case 'protestant':
    case 'catholic':
    case 'mormonism':
      return ['god', 'jesus', 'mary'];
    case 'sbnr':
    case 'taoism':
    case 'pantheism':
      return ['god', 'mary'];
    default:
      return ['god'];
  }
};

export const hasMultipleCharacters = (beliefId: string): boolean =>
  getAvailableCharacters(beliefId).length > 1;
