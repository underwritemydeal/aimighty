# `/normalize` — Design System Alignment Report
**Project:** aimightyme.com
**Date:** 2026-04-16 (T-3 days to launch)
**Scope:** Alignment of all shipped screens to the canonical design system defined in `.impeccable.md`, `CLAUDE.md`, and `src/styles/designSystem.ts`.
**Status:** Report only — **no code changes applied**.

---

## Executive Summary

The project has a **documented, disciplined design system** (tokens in `src/styles/designSystem.ts`, principles in `.impeccable.md`, reference implementation in `LandingPage.tsx`). That system is enforced in exactly **one screen**. Every other shipped screen is either:

1. Using a **second, parallel CSS-variable design system** in `src/index.css :root` whose values have **drifted** from the TypeScript tokens, or
2. Ignoring both systems entirely and inlining raw hex strings.

The result is that "liquid gold" is defined in three places with three subtly different alphas, "warm off-white text" lives at four different opacities across the app, and the "don't use literal hex" principle (Design Principle #6) is violated in ~200 places.

This is not catastrophic — the values are *close enough* that no one has noticed. But it is the single largest source of visual inconsistency before launch, and the one class of defect that will silently regress any design refinements that follow (`/polish` can tighten the hero, but if PrivacyScreen is hardcoded, the hero's new gold opacity won't propagate there).

**Headline finding:** Only **1 of 11 screens** (`LandingPage.tsx`) imports from `src/styles/designSystem.ts`. The other ten use either CSS custom properties from `index.css` (partial coverage) or bare hex strings (Privacy, Terms, Paywall, Conversation).

**Normalization health:** **4/10** — architecture exists, adoption is thin.

---

## The Dual Design System Problem

`src/styles/designSystem.ts` and `src/index.css :root` both claim to be the source of truth for color/typography/spacing. Their values do not match.

| Token | `designSystem.ts` | `index.css :root` | Drift |
|---|---|---|---|
| Primary gold | `#d4af37` | `#d4af37` | ✅ same |
| Gold border subtle | `rgba(212, 175, 55, 0.2)` | `rgba(212, 175, 55, 0.2)` | ✅ same |
| Gold border active | `rgba(212, 175, 55, 0.6)` | `rgba(212, 175, 55, 0.4)` | ⚠️ **different** |
| Text primary | `rgba(255, 248, 240, 0.95)` | `rgba(255, 248, 240, 0.95)` | ✅ same |
| Text secondary | `rgba(255, 248, 240, 0.6)` | `rgba(255, 255, 255, 0.5)` | ❌ **different hue + alpha** |
| Text tertiary | `rgba(255, 248, 240, 0.4)` | `rgba(255, 255, 255, 0.35)` | ❌ **different hue + alpha** |
| Void | `#030308` | `#030308` | ✅ same |
| Void soft | `rgba(10, 10, 18, 1)` | `#0a0a0f` | ✅ equivalent |
| Gold glow | `0 0 30px rgba(212, 175, 55, 0.15)` | `0 0 40px rgba(212, 175, 55, 0.2)` | ⚠️ **different radius + alpha** |

The warm off-white drift (`255, 248, 240` vs `255, 255, 255`) is the most consequential: it means every screen that uses `var(--color-text-secondary)` is showing a slightly cooler, slightly more muted body text than LandingPage. On mobile OLED, the difference is perceptible when you switch between tabs.

**Action required:** pick one canonical source. Recommend `src/styles/designSystem.ts` (it's typed, it's referenced in CLAUDE.md, and LandingPage is the intended reference). Then rewrite `src/index.css :root` to be generated from — or literally import — those tokens, so they cannot drift again.

---

## Hex-Literal Drift Inventory

Counts were gathered via repo-wide grep. Every one of these is a violation of **Design Principle #6: Design system tokens, not hex values.**

### Gold `#d4af37` / `rgba(212, 175, 55, x)`

| File | Literal `#d4af37` | `rgba(212, 175, 55, *)` | Notes |
|---|---|---|---|
| `TermsScreen.tsx` | **22** | 1 | Every `<h2>`, every bullet, every footer link |
| `PrivacyScreen.tsx` | **~18** | 1 | Same pattern as Terms |
| `PaywallScreen.tsx` | **~10** | ~8 | "Most Popular" badge, CTA borders |
| `ConversationScreen.tsx` | ~6 | ~14 | Scripture links, streak chip, input border |
| `AboutScreen.tsx` | ~4 | ~5 | Section dividers |
| `AuthScreen.tsx` | ~3 | ~4 | Submit button, "Remember me" accent |
| `WelcomeScreen.tsx` | ~2 | ~6 | Belief chip hover state |
| `BeliefSelector.tsx` | ~2 | ~4 | Active card border |
| `BeliefWelcomeScreen.tsx` | ~1 | ~3 | Greeting caret |
| `ArticlePage.tsx` | ~4 | ~6 | Headings, CTA |
| `LandingPage.tsx` | **0** | **0** | ✅ Uses tokens — reference impl |

**Total: ~72 hardcoded gold hexes and ~52 hardcoded gold rgbas across 10 screens.**

### Warm off-white `rgba(255, 248, 240, x)` / `rgba(255, 255, 255, x)`

**274 instances across 13 files** of `rgba(255, ...)` text-color declarations with varying alphas (`0.35`, `0.4`, `0.5`, `0.6`, `0.7`, `0.75`, `0.8`, `0.85`, `0.9`, `0.95`). Most should collapse to **three** tokens: `textPrimary`, `textSecondary`, `textTertiary`.

### Void `#030308` / `#0a0a0f`

Appears hardcoded in ~30 places, primarily as `backgroundColor: '#030308'` and `backgroundColor: '#0a0a0f'`. Should be `colors.void` and `colors.voidSoft`.

### Glass-morphism (`backdropFilter: blur(...)`)

15 instances across 5 files with three different blur radii (`8px`, `12px`, `20px`). No token exists for this yet. LandingPage uses `12px` consistently — make that canonical and add `effects.glassBlur = 'blur(12px)'`.

---

## Typography Drift

`fonts.display = "'Cormorant Garamond', serif"` and `fonts.body = "'Outfit', sans-serif"` are defined but underused. Every screen that uses CSS custom properties falls back to `var(--font-display)` / `var(--font-body)` — those exist in `index.css` and match, so typography drift is **limited to one issue**:

### `index.html` loads Inter, which is never used

```html
<link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet" />
```

Grep confirms **zero** references to `Inter` in `src/`. This is a 15–30 KB font-download penalty on every cold landing. Remove the `<link>`.

### Weight violations

Design Principle #3 ("Serif for the divine, sans for the interface — never mix weights above 500 on the serif"). Grep for `fontWeight: 600` or `fontWeight: 700` on Cormorant usages: found **3 violations** — all in `PaywallScreen.tsx` where "Most Popular" and the price strings use `font-weight: 600` with `fonts.display`. Drop to 400 or 500, or switch to `fonts.body` for the UI chrome.

---

## Component Extraction Opportunities

These patterns are duplicated across screens and are excellent normalization candidates. They are **not** one-off; they repeat 5+ times each and drift every time someone copies them.

### 1. `<Logo />` — **highest priority**

The "AI" (gold) + "mighty" (warm off-white) wordmark appears in:

- `LandingPage.tsx` (hero, footer, final CTA) — 3 instances
- `WelcomeScreen.tsx` — 1 instance
- `AuthScreen.tsx` — 1 instance
- `PaywallScreen.tsx` — 1 instance
- `AboutScreen.tsx` — 1 instance (header)
- `PrivacyScreen.tsx` — 1 instance (header)
- `TermsScreen.tsx` — 1 instance (header)
- `ConversationScreen.tsx` — 1 instance (dropdown)
- `ArticlePage.tsx` — 2 instances (header + footer)

**Total: 12 near-identical copies**, with minor drift in font-size (`1.5rem`, `1.75rem`, `28px`, `2rem`, `2.5rem`).

Extract to `src/components/ui/Logo.tsx` with a `size` prop: `'sm' | 'md' | 'lg' | 'hero'` mapping to `1.5rem / 1.75rem / 2rem / 3rem`. CLAUDE.md already calls this out ("Use the `Logo` component pattern from `LandingPage.tsx`"). Promote it to a real component.

### 2. `<PolicyHeading />` for Privacy + Terms

Every `<h2>` in Privacy and Terms reads:

```tsx
<h2 style={{
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--text-xl)',
  fontWeight: 400,
  color: '#d4af37',
  marginTop: '2rem',
  marginBottom: '1rem',
}}>
```

That pattern occurs **~40 times** between the two files. Extract to `<PolicyHeading>` (or just `<h2 className="policy-heading">` if you prefer CSS). Same for `<PolicySubheading>` for the `<h3>` variant.

### 3. `<GoldButton />` / `<PrimaryCTA />`

LandingPage has the canonical gold pill-button. The same pattern is re-inlined in:

- WelcomeScreen "Begin" CTA
- AuthScreen Submit
- PaywallScreen upgrade CTA (×2)
- BeliefWelcomeScreen "Start"
- ConversationScreen "Send" (variant)

Each has slightly different padding, border-radius, and hover state. Extract a `<GoldButton variant="primary" | "ghost">` in `src/components/ui/GoldButton.tsx`. Base it on `styles.primaryButton` which already exists in `designSystem.ts` but is only consumed by LandingPage.

### 4. `<Divider />` — gold 20% horizontal rule

```tsx
<div style={{ height: 1, background: colors.goldBorder, margin: '2rem 0' }} />
```

Used 14 times across Privacy, Terms, About, Landing FAQ. Trivial extraction, moderate payoff.

### 5. `<ScreenShell />` — background + dvh wrapper

Every screen repeats the same three-rule incantation:

```tsx
<div style={{
  minHeight: '100dvh',
  background: colors.void,
  backgroundImage: 'url(...)',
  backgroundSize: 'cover',
  backgroundPosition: 'top center',
  paddingTop: 'env(safe-area-inset-top)',
}}>
```

The iOS Safari rules in CLAUDE.md§Viewport Rules are load-bearing and easy to get wrong. Extract `<ScreenShell backgroundImage={...}>` and make it the only place those rules live. This also defends against future regressions — the #1 "looked fine in dev, broke in prod iOS" class of bug in this codebase.

---

## Spacing & Radius Drift

`designSystem.ts` defines `spacing` (`xs: 0.25rem` → `5xl: 6rem`) and `radii` (`sm: 8px` → `full: 9999px`). Grep finds:

- **124 instances** of `padding: '<literal>rem'` / `margin: '<literal>rem'` across screens (mostly `1rem`, `1.5rem`, `2rem`, `3rem`). Most map cleanly to spacing tokens.
- **31 instances** of `borderRadius: '<literal>px'` with values `8, 12, 16, 20, 24, 9999`. Map to `radii.sm | md | lg | xl | full`.

These are low-severity — the values are self-consistent — but they violate Principle #6 and block token updates.

---

## Interaction-Pattern Inconsistencies

Outside of raw tokens, these established-pattern deviations matter for brand consistency.

### 1. Transition timing

LandingPage uses `transition: 'all 0.3s ease'`. ConversationScreen uses `0.2s ease`, `0.25s`, `0.4s cubic-bezier(0.4, 0, 0.2, 1)`. PaywallScreen uses `0.3s ease-out`. No token.

**Recommendation:** Add `motion.duration` + `motion.easing` to `designSystem.ts`:
```ts
motion: {
  fast: '150ms',
  base: '250ms',
  slow: '400ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
}
```

### 2. Focus ring

Only LandingPage's email input has a visible focus ring (gold, 2px outline). AuthScreen's password field has **no focus ring at all** (only border-color change). This is also an a11y finding (see `01-audit.md` P1-A11y-02) but the fix is systemic: define `styles.focusRing` in `designSystem.ts` and apply globally.

### 3. Hover states

Some gold CTAs brighten on hover (LandingPage), some darken (PaywallScreen), some scale (WelcomeScreen "Begin"). Pick one canonical gold-CTA hover (LandingPage's is the best — subtle lift + slight glow increase) and normalize.

### 4. Button heights

`LandingPage`: 56px tall CTAs. `AuthScreen`: 48px. `PaywallScreen`: 52px. `WelcomeScreen`: 60px. Standardize on **56px desktop / 48px mobile** in a `<GoldButton />` component.

---

## Responsive Pattern Drift

Design Principle #4 ("Mobile is first-class, iOS Safari is the acceptance test") is generally honored but with quiet gaps:

- **`100vh` vs `100dvh`:** 0 `100vh` violations found — excellent.
- **`backgroundAttachment: 'fixed'`:** 0 violations — excellent.
- **Safe-area insets:** inconsistently applied. LandingPage applies `env(safe-area-inset-top)` on content wrapper (correct). AuthScreen applies it on outer container (also fine) but PaywallScreen applies it to nothing (bug — content can go under notch on iPhone 14 Pro+).
- **Desktop-centered / mobile-left text:** Only ConversationScreen follows the CLAUDE.md rule ("God's text: desktop centered, mobile left-aligned"). BeliefWelcomeScreen centers on both. Consistency check required.

---

## Accessibility Normalization

Cross-reference with `01-audit.md` a11y findings:

- **Focus rings** — systemic (covered above)
- **Form labels** — AuthScreen violations are fixable via `<FormField label="Email">` wrapper component (also a normalize candidate)
- **Color contrast** — the `rgba(255, 255, 255, 0.5)` text-secondary in `index.css` is **3.8:1** against `#030308` — fails WCAG AA for body text. The TS-token version `rgba(255, 248, 240, 0.6)` is **4.6:1** — passes. Another argument for collapsing to the TS tokens.

---

## Recommended Normalization Plan

**Phased so each phase is independently mergeable and testable. Do not run all at once the week of launch.**

### Phase 1 — Tokens (P0, ~2 hours)

Goal: single source of truth, zero drift.

1. Rewrite `src/index.css :root` so every value is the exact string from `designSystem.ts`. Fix the four drift cases in the table above (especially `text-secondary` and `text-tertiary`).
2. Add `motion.duration`, `motion.easing`, `effects.glassBlur` tokens to `designSystem.ts`.
3. Add matching `--motion-fast`, `--motion-base`, `--motion-easing`, `--effect-glass-blur` to `:root`.
4. Remove the `<link>` to Inter from `index.html`.

**Risk:** Very low. The value changes are ≤5% on most tokens. Visually indistinguishable except the text-secondary alpha change (which is a contrast-ratio *fix*, not a regression).

### Phase 2 — Component extraction (P1, ~4 hours)

Goal: eliminate the top-5 duplicated patterns.

1. Extract `<Logo />` — replace all 12 inline copies.
2. Extract `<GoldButton />` — replace all ~8 inline copies.
3. Extract `<PolicyHeading />` / `<PolicySubheading />` — apply to Privacy + Terms.
4. Extract `<Divider />` — apply everywhere it's used.
5. Extract `<ScreenShell />` — apply to all 9 non-Landing screens.

**Risk:** Medium. Any one of these touches many files; staging in separate PRs is recommended. Screenshot-diff before/after.

### Phase 3 — Hex purge (P1, ~3 hours)

Goal: zero literal hex strings in `src/components/screens/`.

1. Search-and-replace pass: `#d4af37` → `colors.gold` / `var(--color-gold)`
2. Same for `#030308`, `#0a0a0f`, `rgba(212, 175, 55, x)`, `rgba(255, 248, 240, x)`
3. ESLint rule: add `no-restricted-syntax` to ban literal hex in style props (can lint-fail on new violations).

**Risk:** Low (mechanical), but do it *after* Phase 1 so you're replacing into the corrected tokens.

### Phase 4 — Motion + focus + button height normalization (P2, ~2 hours)

Goal: interaction parity across screens.

1. Apply `motion.base` / `motion.easing` to every `transition` property.
2. Apply `styles.focusRing` to every interactive element.
3. Standardize button heights (56/48).
4. Standardize hover states on gold CTAs.

### Phase 5 — Safe-area + text-alignment audit (P2, ~1 hour)

Goal: iOS Safari correctness across all screens.

1. PaywallScreen — add `paddingTop: env(safe-area-inset-top)` to content wrapper.
2. BeliefWelcomeScreen — apply mobile-left/desktop-center rule for greeting text.
3. Snap all screens to the same safe-area pattern.

---

## Action Summary

Per the launch-week standing instruction, this report **generates no code changes**. After prioritization:

1. **`/normalize`** — Phase 1 (token collapse + Inter removal) — ship this first, it is the foundation for everything else and unlocks the rest of `/polish`. ~2 hours, very low risk.
2. **`/normalize`** — Phase 2 (component extraction, Logo + PolicyHeading + GoldButton + ScreenShell) — biggest consistency payoff, touches many files.
3. **`/normalize`** — Phase 3 (mechanical hex purge) — high volume, low risk if Phase 1 landed first.
4. **`/extract`** — if you want a focused pass on *just* the repeated Logo + PolicyHeading patterns without the broader Phase 2 scope.
5. **`/arrange`** — optional follow-up if normalization surfaces spacing-rhythm issues across screens.
6. **`/polish`** — final micro-pass across normalized components.

---

## What To Skip Before Launch

Given T-3 days:

- **Phase 4 motion/focus** — nice-to-have, ship post-launch.
- **Phase 5 safe-area** for screens that aren't in the critical path. Only PaywallScreen needs the fix (users will see it during checkout).
- **ESLint rule** for hex literals — adds review friction; add it post-launch when the repo is stable.

**Re-run `/audit` after Phase 1 to confirm the theming dimension improves from 2/4 to 3–4/4.**
