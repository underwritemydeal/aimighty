# Desktop Claude Code handoff — apply new gold palette site-wide

Paste the entire "PROMPT TO CLAUDE CODE" block below into your desktop Claude
Code session. That instance is working on the same repo and has no memory of
this design session, so the prompt is self-contained.

---

## PROMPT TO CLAUDE CODE

We're rebranding the AImighty gold palette. The old trophy-yellow gold
(`#D4AF37`) is out; the new muted/aged **champagne gold** is in. Brand assets
already exist at `public/brand-assets/` — see `public/brand-assets/README.md`
for the full spec.

### Palette migration

Update `src/styles/designSystem.ts` `colors` block. Replace the current gold
values (keep the same token names so import sites don't have to change):

```ts
gold:             '#d4b882',                     // was #d4af37
goldLight:        '#e2c899',                     // was #e8c84a
goldDark:         '#bfa067',                     // was #b8962e
goldFaint:        'rgba(212, 184, 130, 0.15)',   // was 212,175,55
goldBorder:       'rgba(212, 184, 130, 0.2)',    // was 212,175,55
goldBorderActive: 'rgba(212, 184, 130, 0.6)',    // was 212,175,55
goldBorderStrong: 'rgba(212, 184, 130, 0.8)',    // was 212,175,55
```

Add one new token (used by brand-asset rendering and anywhere we want a bright
warm-white highlight — e.g. halo core lines):

```ts
goldCore: '#fff5dc',   // NEW — warm-white core for halo/bright highlights
```

Update `shadows` in the same file:

```ts
goldGlow:       '0 0 30px rgba(212, 184, 130, 0.15)',   // was 212,175,55
goldGlowStrong: '0 0 40px rgba(212, 184, 130, 0.25)',   // was 212,175,55
```

### Hardcoded hex cleanup

~166 occurrences of the old palette exist across 15 files (grep for
`#d4af37`, `#e8c84a`, `#b8962e`, and `212, 175, 55`). Files to hit:

```
src/index.css
src/styles/designSystem.ts            (covered above)
src/utils/constants.ts
src/components/ErrorBoundary.tsx
src/data/beliefSystems.ts
src/components/screens/LandingPage.tsx
src/components/screens/WelcomeScreen.tsx
src/components/screens/BeliefSelector.tsx
src/components/screens/ConversationScreen.tsx
src/components/screens/AuthScreen.tsx
src/components/screens/PaywallScreen.tsx
src/components/screens/AboutScreen.tsx
src/components/screens/PrivacyScreen.tsx
src/components/screens/TermsScreen.tsx
src/components/screens/ArticlePage.tsx
```

Replacement map:

| Old                                 | New                                 |
| ----------------------------------- | ----------------------------------- |
| `#d4af37`                           | `#d4b882`                           |
| `#e8c84a`                           | `#e2c899`                           |
| `#b8962e`                           | `#bfa067`                           |
| `rgba(212, 175, 55, X)`             | `rgba(212, 184, 130, X)`            |

Where a component imports `colors.gold` already, no change is needed — the
token update propagates automatically. Where a component has literal hex
(which CLAUDE.md flags as tech debt to migrate on touch), prefer refactoring
the literal to `colors.gold` / `colors.goldLight` / etc. from
`src/styles/designSystem.ts` rather than leaving another hardcoded value.

### Font system

**No font changes needed.** The stack is already correct:
- `fonts.display` = Cormorant Garamond (serif — logo, headings, sacred text)
- `fonts.body` = Outfit (sans — UI, buttons, body text)

Both are loaded via the Google Fonts `<link>` in `index.html`. If the link is
missing Cormorant Garamond's `500` and `600` weights, add them — they're used
for the "AImighty" wordmark and will be used more heavily now.

### Logo wordmark treatment

The "AImighty" wordmark ("AI" in gold + "mighty" in warm white, Cormorant
Garamond 500) is the brand lockup across every screen. It already exists in
`designSystem.ts` as `styles.logoGold` / `styles.logoWhite`. Audit these
screens to confirm the wordmark is used consistently (per CLAUDE.md §"Logo
wordmark (standardized)"):

- `LandingPage.tsx` (reference implementation — don't regress it)
- `WelcomeScreen.tsx`
- `BeliefSelector.tsx` header
- `ConversationScreen.tsx` header
- `AuthScreen.tsx`
- `PaywallScreen.tsx`
- `AboutScreen.tsx`, `PrivacyScreen.tsx`, `TermsScreen.tsx`
- `ArticlePage.tsx`

If any screen uses a different color or weight for the wordmark, align it to
`fontWeight: 500`, `fontFamily: fonts.display`, with "AI" at `colors.gold` and
"mighty" at `colors.textPrimary`.

### New brand assets available

Already committed at `public/brand-assets/`:

- `mark.svg` — master AI+halo logomark (vector, embedded font — use anywhere
  you need the symbol alone)
- `profile-1080.png`, `social-banner-1500x500.png`, `launch-vertical-1080x1920.png`,
  `launch-square-1080.png`, `end-card-1080x1920.png` — launch day PNGs

You do NOT need to touch these. But if you want to surface the new `mark.svg`
as a React icon (e.g. favicon or loading splash), prefer importing the SVG
file over inlining — keeps the design-system source of truth in the asset.

Replace the current favicon (`public/favicon.svg`) with `mark.svg` as the
primary favicon:

```html
<!-- index.html -->
<link rel="icon" type="image/svg+xml" href="/brand-assets/mark.svg" />
<link rel="apple-touch-icon" href="/brand-assets/profile-1080.png" />
```

### Do not touch

- Worker code (`worker/*`)
- Auth, tier, Stripe, Claude API integration logic
- Belief system prompts or data
- Copy / tagline changes (the asset files already use "Every belief. One
  voice." — align marketing copy to match only if currently mismatched)

### Test plan

1. `npm run build` — must pass clean
2. `npm run dev` — open each screen listed above. Gold should read **muted,
   aged, warm** — not yellow or bright. On black bg and on cosmic bg.
3. iOS Safari check at `100dvh` — confirm no regressions on mobile safe-area
4. Check profile pic / banner display at small sizes (40×40 avatar, 44×44
   favicon) for legibility

### Commit strategy

Make one focused commit: `brand(tokens): migrate gold palette to muted
champagne (#d4b882)`. List the files touched in the body. Do not mix in
unrelated refactors.

### Where this came from

This migration is the site-code half of a rebrand. The brand-asset half
(social PNGs, master SVG, preview pages) was built in a separate session on
branch `brand-assets-preview` — see `public/brand-assets/README.md` and the
Vercel preview at
`aimighty-git-brand-assets-preview-underwrite-my-deals-projects.vercel.app/brand-assets/preview.html`.

---

## END PROMPT
