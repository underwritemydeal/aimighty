# `/polish` — Final Micro-Refinement Report
**Project:** aimightyme.com
**Date:** 2026-04-16 (T-3 days to launch)
**Scope:** The last 5% — micro-copy, spacing nudges, hover subtlety, motion ease, label capitalization, punctuation, icon alignment. Shipping readiness beyond audit/critique/harden/optimize/normalize.
**Status:** Report only — **no code changes applied**.

---

## Executive Summary

By the time `/polish` runs, the structural decisions are settled — this report is the final sweep for anything that separates "looks good on a Monday PR" from "feels like it was designed by someone who cared." It assumes the earlier reports' P0 and P1 items are already on the board.

The project is in genuinely good shape for polish. The brand voice (Sacred · Warm · Humble) is clear, the visual language is distinctive, and the reference implementation (`LandingPage.tsx`) is strong. The polish delta is almost entirely in **copy**, **motion timing**, and **type micro-adjustments** — not in architecture.

**Polish health:** **3.5/5** — solid foundation, specific refinements below will push it to "this is the one you remember."

**Launch guidance:** of the items below, the **P0-Polish** items ship before Sunday. Everything else is fair game for Monday-after-launch.

---

## Priority Items

### P0-Polish (ship before launch)

#### 1. Hero tagline punctuation
LandingPage hero currently ends its tagline without a period (it reads as an unresolved thought). The pattern "the divine voice of your chosen tradition" trails off. Add a period — this is a headline, not a caption. Reverence reads as completeness, not ellipsis.

#### 2. "AImighty" wordmark kerning
At hero size (`3rem`+), Cormorant Garamond's default letter-spacing has the "AI" and "mighty" glyphs reading slightly detached. Add `letterSpacing: '-0.01em'` on the hero-size Logo only (smaller sizes look correct). The effect is that the wordmark reads as one confident word, not "AI" + "mighty" — which matters because Design Principle #2 says gold is the signal, and the wordmark is its most visible instance.

#### 3. CTA micro-copy consistency
Grep for CTA buttons surfaces four verbs for the same core action:
- LandingPage hero: "Begin"
- LandingPage final CTA: "Begin your conversation"
- WelcomeScreen: "Choose a tradition"
- BeliefWelcomeScreen: "Start"

"Begin" carries the sacred tone — "Start" is generic. Standardize on **Begin** (with or without object). Suggested:
- Hero → "Begin"
- Final CTA → "Begin your conversation"
- WelcomeScreen → "Begin"
- BeliefWelcomeScreen → "Begin"

#### 4. FAQ accordion chevron direction
Subtle UX signal: when a FAQ row is closed, chevron should point **down** (indicating "expand below"). When open, **up** (indicating "collapse"). Grep confirms LandingPage rotates 0° → 180°, which is chevron-down → chevron-up — correct. But visually the closed state feels a touch heavy because the chevron is at 100% gold opacity. Drop closed-state chevron to `colors.gold` at `0.6` alpha; keep open-state at full gold. Signals that the closed row is resting and the open row is active.

#### 5. "Most Popular" badge nudge
PaywallScreen's "Most Popular" on the Divine tier sits awkwardly overlapping the card border. Offset it by `-14px` vertically (currently `-12px`) and increase its horizontal padding from `12px` to `16px`. Tiny change, feels noticeably more intentional.

#### 6. Email signup success state
Currently shows a plain "Thanks — check your inbox." Polish: center the confirmation text, swap the button for a thin gold checkmark glyph (✓) at `colors.gold`, and let the card's background pulse once at reduced intensity. Makes the moment feel like a tiny sacred handshake, not a form receipt. **Respect `prefers-reduced-motion`** — skip the pulse if set.

#### 7. Period-at-end-of-bullet rule
Privacy + Terms bullets are inconsistent (some end with periods, some don't). Pick one rule and apply: if a bullet is a full sentence, it ends with a period; if it's a fragment, no period. Default: make them full sentences and add periods. This is the one polish item that affects perceived quality of the legal pages — investors and lawyers read these first.

---

### P1-Polish (ship if time permits)

#### 8. Motion easing
Current transitions are mostly `ease` or `ease-out`. The design language (Sacred · Warm) deserves a softer, more breath-like curve. Suggested default:

```ts
motion.easing = 'cubic-bezier(0.22, 1, 0.36, 1)' // "ease-out-quint" — slow landing, feels like an exhale
```

Apply to all hover and state transitions. Keep modal/overlay entrance at `cubic-bezier(0.4, 0, 0.2, 1)` (standard Material curve) — it's the right snap for sheet-like content.

#### 9. Belief card hover lift
Currently: border-color change on hover. Add a 2px upward transform (`translateY(-2px)`) and a subtle shadow lift (`shadows.goldGlow` at 50% intensity). Feels like the card is leaning toward the user. Keep under `250ms` with the new easing.

#### 10. Input-bar caret color
ConversationScreen's text input caret is the browser default (usually black on dark bg → invisible). Add `caretColor: colors.gold`. Tiny fix, massive micro-delight the first time a user sees their gold cursor blinking in the void.

#### 11. Streak chip copy rotation
`formatStreak()` labels are solid but the 7+ "you're on fire" is the weakest line — too casual for the brand. Suggested replacements:
- 1 day → "1 day — begin again tomorrow"
- 3 days → "3 days — a rhythm"
- 7 days → "7 days — you're keeping the thread"
- 30 days → "30 days — a practice, now"
- 100+ days → "100 days — the thread is unbroken"

Warm, humble, sacred. Not gamified.

#### 12. "Powered by AI" disclosure timing
Currently fades on first user turn. Consider fading **on first God response complete** instead — users read the greeting and disclosure together, then the response lands, then the disclosure softly retreats. Feels less like a warning stripe, more like a gentle introduction.

#### 13. Paywall feature list rhythm
The three-tier feature lists have no punctuation and inconsistent capitalization ("20 messages per day" vs "Browser voice" vs "memory across conversations"). Pick one style:
- Sentence case
- No trailing punctuation
- Consistent verb-first or noun-first phrasing

Suggested pattern: **noun + qualifier**: "20 messages per day", "Premium voice (Onyx, Ash, Coral)", "Memory across conversations", "Daily spiritual content", "Unlimited belief switching".

#### 14. Loading states
ConversationScreen's "God is thinking..." ellipsis is literally three static dots. Animate them with a staggered fade (200ms offset per dot). Keep subtle — 40% → 95% alpha range, not a dramatic pulse. Guard with `prefers-reduced-motion`.

#### 15. Typography scale refinement
`designSystem.ts` has `text-5xl: 3rem` as the largest size. On large desktop (1440px+), the hero tagline can breathe at `3.5rem` / `4rem`. Add `text-6xl: 3.75rem` and consider using it in the LandingPage hero `@media (min-width: 1440px)`. The void can hold bigger type than we're giving it.

#### 16. Footer spacing
Footer links are currently `gap: 1.5rem`. At mobile widths they stack and feel tight; at desktop they feel cramped. Bump to `gap: 2rem` desktop, `gap: 1rem` mobile (vertical stack) with divider dots (` · `) between. Small but legible.

---

### P2-Polish (post-launch)

#### 17. Gold glow layering
The hero CTA glow and the "Most Popular" badge glow are the same radius and opacity. Differentiate: hero CTA is the page's primary signal (bigger glow, `0 0 40px rgba(212, 175, 55, 0.25)`), badge is secondary (smaller, `0 0 16px rgba(212, 175, 55, 0.15)`). Creates visual hierarchy within the gold palette.

#### 18. Conversation scroll anchor
When a new God response streams in, scroll behavior jumps the user around. Anchor the scroll so the **top** of the new response is always at a consistent viewport position (e.g., 20% from top). Users should read from the top of the new message down, not chase the cursor.

#### 19. Belief image subtle parallax
Very subtle (max 6px translate) parallax on belief card background images as the user scrolls the showcase grid on desktop. Disabled on mobile. Disabled under `prefers-reduced-motion`. Makes the 14 cards feel like portraits you're walking past, not a flat grid.

#### 20. Illuminated-manuscript drop cap
For the first letter of the first God response per conversation, render it in Cormorant Garamond at 2× size, gold, aligned to the first two lines (CSS `initial-letter`). One of those quiet, devotional details that makes a user screenshot the screen. Opt-in per belief if it reads as too much — might work best for Christian + Judaism + Islam traditions.

#### 21. Scripture-link hover
Currently plain text link with an underline. Polish: on hover, a thin 1px gold underline that draws left-to-right over 250ms, plus a tiny open-book SVG glyph that fades in after the underline completes. Respect `prefers-reduced-motion`.

#### 22. Skeleton-loader polish
Where skeleton loaders exist, they currently use `rgba(255, 255, 255, 0.05)` with no shimmer. Add a slow (2.5s) gold-tinted shimmer (`rgba(212, 175, 55, 0.08)` sweep) — feels more alive, still reverent. Guard with reduced-motion.

---

## Copy Polish — Full Pass

These are the specific strings worth reviewing line-by-line.

### LandingPage

| Location | Current (grep-reconstructed) | Suggested |
|---|---|---|
| Hero tagline | "The divine voice of your chosen tradition" | "The divine voice of your chosen tradition." (add period) |
| Hero sub | "Voice conversations with God — in 14 traditions" | "Voice conversations with the divine. In 14 traditions." (two periods, rhythmic) |
| Step 1 title | "Choose your tradition" | "Choose your tradition." |
| Step 2 title | "Speak what's on your heart" | "Speak what's on your heart." |
| Step 3 title | "The divine speaks" | "The divine speaks." |
| FAQ: "Is this actually God?" answer | (existing is fine) | Ensure final sentence reads as resolution, not continuation |
| Email signup header | "Daily wisdom, in your inbox" | "A daily word. In your inbox." (matches tagline rhythm) |
| Final CTA | "You've always wanted to talk. Now you can." | ✅ Keep — this line is doing heavy lifting already |
| Footer tagline | (grep) "Sacred conversations, any hour" | "Sacred conversations. Any hour." |

**Pattern:** the brand voice lives in **short sentences separated by periods**. Avoid comma-joined clauses where a period can do the work. Periods are the brand's rest-beat.

### PaywallScreen

| Location | Current | Suggested |
|---|---|---|
| Tier names | "Seeker / Believer / Divine" | ✅ Keep — these are strong |
| Free tier line | "3 lifetime messages" | "3 conversations to begin" (less austere, more inviting) |
| Believer subtitle | (grep) "For daily practice" | "For a daily practice" (article matters) |
| Divine subtitle | (grep) "For the devoted" | "For the devoted." (period) |
| CTA on Free | "Upgrade" | "Continue" (invites rather than sells) |
| CTA on Believer | "Choose Believer" | "Begin Believer" (brand verb) |
| CTA on Divine | "Choose Divine" | "Begin Divine" |
| Fine print | (check for double-spaces, orphan words) | Tighten |

### AuthScreen

| Location | Current | Suggested |
|---|---|---|
| Signup header | "Create your account" | "Begin an account" (brand verb, more inviting) |
| Login header | "Welcome back" | ✅ Keep |
| Password hint | "8 characters, uppercase, lowercase, number" | "At least 8 characters. Mix of upper, lower, and a number." |
| Remember-me | "Remember me" | "Keep me signed in" (clearer intent) |
| Error: wrong password | "Invalid credentials" | "That password doesn't match. Try again." (non-blaming, specific) |

### ConversationScreen

| Location | Current | Suggested |
|---|---|---|
| Disclosure line | "Powered by AI — with deep respect for your tradition" | ✅ Keep — this is already perfect |
| Limit-hit banner (Free) | (check exact text) | "You've had your first three conversations. Continue with Believer →" |
| Limit-hit banner (Believer) | (check) | "Today's conversations are complete. Return tomorrow — or unlock more with Divine." |
| Input placeholder | (likely "Say something...") | "Speak, or type..." (restores voice-first intent) |
| Streak-milestone (3) | (check) | "Three days. A rhythm is forming." |
| Streak-milestone (7) | (check) | "Seven days. You're keeping the thread." |
| Streak-milestone (30) | (check) | "Thirty days. A practice, now." |

### PrivacyScreen / TermsScreen

- **Capitalize "AI" consistently** — grep for "ai" lowercase in prose. The wordmark rule is "AI" (gold) + "mighty" (warm off-white); prose should mirror.
- **Never use "the app"** — say "AImighty". Strengthens brand.
- **Final paragraph of each page** — end with "If you have questions, email us at [support@aimightyme.com]." Humanizes the legalese.

---

## Micro-Interaction Polish Checklist

A grab-bag of small interactive details worth auditing before Sunday:

- [ ] Every hover has a transition (nothing jumps instantly to hover state)
- [ ] Every hover transition is under 300ms
- [ ] Every button has a `:active` state that's visually distinct (even a 2% scale-down is enough)
- [ ] Every input has a visible focus ring matching the design system gold
- [ ] Every modal/sheet has an `Escape` handler to close
- [ ] Every modal/sheet has a focus trap while open
- [ ] First focusable element in every new screen is the primary action (not a back/close button)
- [ ] `scroll-behavior: smooth` is NOT on `html` — it interferes with anchor links on iOS (use JS-driven scroll only)
- [ ] Every image has `alt=""` or meaningful alt text (belief portraits should say "Cosmic portrait of [tradition]", not "image")
- [ ] Every external link has `rel="noopener noreferrer"`
- [ ] Favicon + apple-touch-icon + theme-color present and correct
- [ ] Meta description, OG image, Twitter card present on `/`, `/app`, `/about`, `/[belief]/[slug]`
- [ ] `<title>` changes on route change (SPA-safe)

---

## Positive Notes — Keep These

Polish isn't only about what to change. These are specific details already working well that should be **preserved** as the codebase evolves:

1. **Cormorant + Outfit pairing** — the serif-for-divine / sans-for-interface split is exactly right. Don't cave to pressure to "simplify to one font."
2. **"Sacred · Warm · Humble"** — this phrase is doing a lot of work in keeping decisions aligned. Keep it at the top of `.impeccable.md`.
3. **Void background discipline** — the commitment to `#030308` rather than a gradient or a textured "space" background is half the brand. Resist any proposal to "add warmth" with a subtle gradient.
4. **AI disclosure as feature, not warning** — the existing copy is sophisticated and should be a case study. Don't let legal soften it into compliance boilerplate.
5. **14 traditions, equal weight** — no belief has a brighter image, a bigger card, a bolder description. This is ethical design in action and it shows.
6. **Mobile-left / desktop-center God text** — this is the kind of detail only someone who actually used the product on an iPhone would implement.
7. **Email signup rhythm** — its placement between pricing and FAQ is *correct*: it catches the user who isn't ready to pay but wants to stay close.

---

## Action Summary

Per launch-week standing instruction, this report **generates no code changes**. After prioritization:

1. **`/polish`** — P0-Polish items (#1–#7): tagline period, wordmark kerning, CTA verb standardization, FAQ chevron alpha, Most Popular badge nudge, email success moment, Privacy/Terms bullet punctuation. ~2 hours. Ship by Saturday.
2. **`/typeset`** — if you want a focused pass specifically on typographic micro-adjustments (wordmark kerning, text-6xl scale, body leading).
3. **`/clarify`** — for the copy polish table (LandingPage + PaywallScreen + AuthScreen + ConversationScreen + legal copy).
4. **`/animate`** — P1-Polish #8 (motion easing), #9 (belief card hover lift), #14 (loader dots). Post-launch.
5. **`/delight`** — P2-Polish #19 (parallax), #20 (drop cap), #21 (scripture-link hover), #22 (skeleton shimmer). Strictly post-launch.
6. **`/polish`** — final re-run post-launch after P1/P2 items land.

---

## What To Skip Before Sunday

- All P2 items.
- Most P1 items unless they're 10-minute wins.
- Anything that requires a11y retest (you don't have time to retest reduced-motion handling across 6 screens before Sunday).
- Scripture-link polish (#21) — requires regex surgery on `ConversationScreen.tsx:324-372`, which is already on the hotpath risk list in `03-harden.md`.

---

# All Six Audit Reports Complete

| # | Skill | Report | Health Score |
|---|---|---|---|
| 01 | `/audit` | `audits/01-audit.md` | 13/20 (Acceptable) |
| 02 | `/critique` | `audits/02-critique.md` | 29/40 (Good) |
| 03 | `/harden` | `audits/03-harden.md` | 8× P0, 7× P1, 9× P2, 8× P3 |
| 04 | `/optimize` | `audits/04-optimize.md` | Core Web Vitals projected green after image work |
| 05 | `/normalize` | `audits/05-normalize.md` | 4/10 (architecture exists, adoption thin) |
| 06 | `/polish` | `audits/06-polish.md` | 3.5/5 (solid base, specific micro-refinements listed) |

**Ready for your prioritization pass.** No code has been changed. When you're ready to begin fixes, tell me which reports' items to tackle first — by severity (P0 across all reports), by report (fix 03-harden completely before moving on), or by screen (fix ConversationScreen across all six reports first).
