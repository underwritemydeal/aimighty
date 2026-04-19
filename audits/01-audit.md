# /audit — Technical Quality Report

**Project:** AImighty (aimightyme.com) · Voice-AI spiritual guidance across 14 belief systems
**Audit Date:** 2026-04-16 · **Launch:** 2026-04-19 (Sunday) · **Time to launch:** ~72h
**Scope:** React 19 + Vite + TS SPA — 11 screens, 6,981 lines of screen code

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | **2** | Form inputs missing `<label>`, streaming messages not `aria-live`, touch targets < 44px |
| 2 | Performance | **3** | setInterval leak in TTS drain watcher; 500KB+ of unused Three.js in bundle |
| 3 | Theming | **2** | `designSystem.ts` is well-built but ~50+ literal hex values across 10 of 11 screens |
| 4 | Responsive Design | **3** | 100dvh discipline is strong; touch-target sizes are the one weak spot |
| 5 | Anti-Patterns | **3** | Palette and typography are distinctive; glass-stacking is intentional, not slop |
| **Total** |  | **13/20** | **Acceptable — significant work before launch is possible but not all blocking** |

---

## Anti-Patterns Verdict

**PASS.** This does *not* look AI-generated. Key distinguishing signals:

- Palette is cohesive and intentional — obsidian void (`#030308`) + single gold accent (`#d4af37`) + warm off-white text. No generic purple/blue wellness gradients.
- Typography pairing (Cormorant Garamond serif + Outfit sans) is deliberate and rare; not the default Inter/SF stack.
- No gradient text abuse, no "hero metric" cards, no bounce easing, no stock illustrations.
- Belief cards use real Midjourney portraiture with `selfDescription`, explicitly avoiding the emoji-driven card grid.

**Minor watch-outs (not slop, but worth naming):**
- Glass-morphism is stacked in a few places (conversation modals, paywall) — on trend but also a 2023/2024 AI-UI tell. Current implementation is restrained; don't add more.
- A handful of verbose `aria-label`s on belief cards feel auto-generated (redundant with visible subtitle+description).

---

## Executive Summary

- **Audit Health Score: 13/20 — Acceptable (borderline Good).**
- **Total findings:** ~32 discrete issues — **0 P0** · **10 P1** · **15 P2** · **7 P3**
- **Launch-blocking?** No hard blockers, but 5 P1s should be fixed before Sunday.
- **Top 5 critical issues (ordered):**
  1. **Form inputs in `AuthScreen` have no `<label>` or `aria-label`** — WCAG 1.3.1 violation on the login screen, which is the primary conversion path (`AuthScreen.tsx:209-264`).
  2. **Touch targets below 44×44 px** on mute, menu, back, and character-selector buttons throughout `ConversationScreen.tsx` — Apple HIG violation on the core screen.
  3. **Root `index.html` has no Open Graph / Twitter card tags** — any social share of `aimightyme.com` will show a bland preview (tags are only injected by `ArticlePage`).
  4. **Design-system drift** — ~50+ literal hex values across 10 of 11 screens. Only `LandingPage` fully uses `designSystem.ts`. Not launch-blocking; becomes maintenance debt the moment the palette is ever tuned.
  5. **setInterval in TTS drain watcher (`ConversationScreen.tsx:1109-1120`)** clears only when a sentinel is met; on component unmount mid-stream it keeps polling for up to 60s.
- **Recommended next steps:** Run `/harden` next (it will catch the edge/error-state gaps this report flags lightly), then `/normalize` to flush the hex-value debt, and finish on `/polish`.

---

## Detailed Findings by Severity

### P1 — Major (fix before launch)

#### [P1] Form inputs missing accessible labels
- **Location:** `src/components/screens/AuthScreen.tsx:209-264`
- **Category:** Accessibility
- **Impact:** Screen reader users cannot identify the email/password fields. Placeholder text is *not* an accessible name per WCAG. This is the login screen — every paying user must pass it.
- **WCAG:** 1.3.1 Info and Relationships (Level A), 3.3.2 Labels or Instructions (Level A)
- **Recommendation:** Add `<label htmlFor>` or `aria-label="Email"` / `aria-label="Password"`. Keep placeholder for visual users.
- **Suggested command:** `/harden`

#### [P1] Streaming assistant messages not announced to screen readers
- **Location:** `src/components/screens/ConversationScreen.tsx` — message container (~line 1500) and the daily-limit banner (~line 685)
- **Category:** Accessibility
- **Impact:** A blind user using speech input will send a message and hear nothing — the Claude stream updates the DOM but never announces. Same for daily-limit hits.
- **WCAG:** 4.1.3 Status Messages (Level AA)
- **Recommendation:** Wrap the live-streaming assistant bubble in `role="log" aria-live="polite" aria-atomic="false"`. Mark the daily-limit banner `role="alert"`.
- **Suggested command:** `/harden`

#### [P1] Touch targets below 44×44 px
- **Location:** `ConversationScreen.tsx` — mute button (~L1395, 40×40), menu button (~L1407, 40×40), back button (`p-2` ≈ 28px), character selector (`px-2 py-1.5`). Also FAQ chevron on `LandingPage`.
- **Category:** Responsive / Accessibility
- **Impact:** Misfires on narrow iPhones, especially users with larger fingers or motor impairments. Apple HIG minimum is 44×44; WCAG 2.5.5 recommends the same.
- **WCAG:** 2.5.5 Target Size (Level AAA), Apple HIG
- **Recommendation:** Keep the glyph visual size but increase the button hit area to 44×44 with padding (`display:flex; inline-size:44px; block-size:44px`).
- **Suggested command:** `/adapt`

#### [P1] No Open Graph / Twitter meta in root HTML
- **Location:** `index.html` (head)
- **Category:** Anti-pattern / Launch readiness
- **Impact:** Any share of `aimightyme.com` (Reddit, iMessage, X, Slack) produces a bland, imageless preview. Launch day is share-heavy; this is a free credibility multiplier being missed.
- **Recommendation:** Add default `og:title`, `og:description`, `og:image` (1200×630), `og:url`, `twitter:card=summary_large_image`, `twitter:image`. `ArticlePage` already overrides these per-article — no conflict.
- **Suggested command:** `/harden`

#### [P1] No `<h1>` on LandingPage hero
- **Location:** `LandingPage.tsx` — hero (~L275-340). First heading in document is `<h2>` on "How It Works" (~L451).
- **Category:** Accessibility / SEO
- **Impact:** Search engines and screen readers both rely on `<h1>` to identify the primary topic. Missing it hurts SEO on the highest-value URL and confuses screen-reader document outlines.
- **WCAG:** 1.3.1 Info and Relationships
- **Recommendation:** Wrap the hero tagline "Speak to the divine — your way." in an `<h1>` (visually unchanged via styling).
- **Suggested command:** `/typeset`

#### [P1] setInterval TTS drain watcher can leak on unmount
- **Location:** `ConversationScreen.tsx:1109-1120`
- **Category:** Performance
- **Impact:** If a user navigates away mid-stream or the network stalls, the interval polls for up to 60s after the component unmounts. Paid Divine tier users are the hot path; compounding if they re-enter the screen repeatedly.
- **Recommendation:** Hold the interval id in a ref, clear in `useEffect` cleanup. Same for the 60s safety `setTimeout`.
- **Suggested command:** `/harden` (or `/optimize`)

#### [P1] Design-system drift — ~50+ literal hex values
- **Location:** `AuthScreen.tsx`, `ConversationScreen.tsx`, `PaywallScreen.tsx`, `AboutScreen.tsx`, `WelcomeScreen.tsx`, `BeliefSelector.tsx`, `BeliefWelcomeScreen.tsx`, `PrivacyScreen.tsx`, `TermsScreen.tsx`, `ArticlePage.tsx` — only `LandingPage.tsx` is clean.
- **Category:** Theming
- **Impact:** The single source of truth isn't. Any future palette tuning (gold shift, dark-mode variant, seasonal theme) has to be chased through 10 files. Also pollutes code review — reviewers can't grep confidently.
- **Recommendation:** Regex codemod first: `#d4af37` → `colors.gold`, `#030308` → `colors.void`, `rgba(255, 248, 240, 0.95)` → `colors.textPrimary`, `rgba(212, 175, 55, 0.2)` → `colors.goldBorder`, `#ef4444` → `colors.danger`. Then visually diff.
- **Suggested command:** `/normalize`

#### [P1] Unused Three.js stack in bundle
- **Location:** `package.json` — `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three`
- **Category:** Performance
- **Impact:** Tree-shaking helps, but WebGL/Three ship non-trivial code. Not imported anywhere per grep — so this is pure dead weight on first paint.
- **Recommendation:** Remove from dependencies unless planned for a specific post-launch feature. If planned, document the intent in `CLAUDE.md` so the next audit doesn't flag it again.
- **Suggested command:** `/optimize`

#### [P1] Redundant, verbose aria-labels on belief cards
- **Location:** `BeliefSelector.tsx:45` — `aria-label={`Select ${belief.name} - ${belief.subtitle}. ${belief.description}`}`
- **Category:** Accessibility
- **Impact:** Screen reader users hear the full paragraph twice (label + visible text). Makes the selector feel laborious, and is a small AI-generated tell.
- **Recommendation:** `aria-label={`Select ${belief.name}`}` — let the visible `selfDescription` speak for itself.
- **Suggested command:** `/clarify`

#### [P1] `console.log` / `console.error` in production paths
- **Location:** `ConversationScreen.tsx:869, 1071, 1136, 1228, 1266`; `services/claudeApi.ts`, `services/openaiTTS.ts`, `services/speechInput.ts`
- **Category:** Anti-pattern
- **Impact:** Leaks internal prefixes (`[Conversation] ...`) into production DevTools. Users who pop the console see debug prints; attackers see endpoint names and state machine.
- **Recommendation:** Either (a) wrap in `if (import.meta.env.DEV)` guards, or (b) configure Vite's `esbuild.drop: ['console', 'debugger']` in `vite.config.ts`.
- **Suggested command:** `/harden`

### P2 — Minor (next pass)

#### [P2] `textTertiary` (0.4 opacity) and ad-hoc 0.5 whites risk WCAG AA
- **Location:** `ConversationScreen.tsx:658` ("Listening..." @ `rgba(255,255,255,0.5)`), `WelcomeScreen.tsx:262`, `BeliefSelector.tsx:167`
- **Category:** Accessibility
- **Impact:** At 0.4–0.5 opacity on `#030308`, body-size text lands around 3.2–4.0:1 — under WCAG AA's 4.5:1 for normal text. Users with presbyopia or low-light use hit this first.
- **Recommendation:** Raise `textTertiary` to 0.55–0.6 or reserve 0.4 for large text only (≥ 18pt, where 3:1 passes).
- **Suggested command:** `/colorize` or `/clarify`

#### [P2] Backdrop-filter stacks on iOS Safari
- **Location:** `ConversationScreen.tsx:243, 437, 444, 550-551`; `AuthScreen.tsx:129, 173-174`; `BeliefSelector.tsx:243`; `WelcomeScreen.tsx:65`
- **Category:** Performance
- **Impact:** 2–3 blur layers stacked produces scroll jank on iPhone 11 and earlier, and on iPad mini 5. Not catastrophic but noticeable.
- **Recommendation:** Replace the outermost blur with a solid `rgba(3,3,8,0.92)` overlay (token exists: `colors.voidOverlay`). Reserve blur for the single layer closest to content.
- **Suggested command:** `/optimize`

#### [P2] Inline style objects re-created every render
- **Location:** `ConversationScreen.tsx` throughout (e.g. L1502-1514)
- **Category:** Performance
- **Impact:** React 19's compiler often dedupes, but fallback render cost on mid-tier Android is measurable (~2–4ms per render at 50 messages).
- **Recommendation:** Extract static style objects to module scope; use `useMemo` for dynamic ones keyed on `isMobile`, `tier`.
- **Suggested command:** `/optimize`

#### [P2] No error boundary at app root
- **Location:** `App.tsx:350`
- **Category:** Anti-pattern / Resilience
- **Impact:** A single throw in any screen shows a white screen. Paid users mid-conversation lose the thread.
- **Recommendation:** Wrap routes in a React `ErrorBoundary` that logs to the planned error service and shows a warm "Something interrupted us" fallback with a retry.
- **Suggested command:** `/harden`

#### [P2] Missing `aria-expanded` / `aria-controls` on FAQ accordion
- **Location:** `LandingPage.tsx` — FAQ section
- **Category:** Accessibility
- **Impact:** Screen-reader users can't tell whether a FAQ item is open.
- **Recommendation:** On each trigger, add `aria-expanded={isOpen}` and `aria-controls={panelId}`.
- **Suggested command:** `/harden`

#### [P2] No `aria-hidden` on decorative inline SVG icons
- **Location:** `ConversationScreen.tsx:75-192` (icon suite), `LandingPage.tsx` How-It-Works SVGs
- **Category:** Accessibility
- **Impact:** Screen readers announce "image" with no name, adding noise.
- **Recommendation:** Add `aria-hidden="true" focusable="false"` to every purely decorative SVG.
- **Suggested command:** `/polish`

#### [P2] No analytics or error tracking
- **Location:** Entire app
- **Category:** Launch readiness (not a UI finding)
- **Impact:** On launch day you will have zero visibility into funnels, drop-offs, or silent failures. You will be flying blind through the loudest 48 hours of the product's life.
- **Recommendation:** Minimum: Vercel Web Analytics (one-line enable) + Sentry free tier. Track `belief_selected`, `message_sent`, `stripe_checkout_clicked`, `stripe_checkout_success`.
- **Suggested command:** (none — outside skill scope; add as a launch-checklist item)

#### [P2] Inconsistent border-color usage
- **Location:** `ConversationScreen.tsx:445` — `rgba(255,255,255,0.1)` instead of `colors.borderLight` (0.08)
- **Category:** Theming
- **Recommendation:** Fold into the `/normalize` pass.
- **Suggested command:** `/normalize`

#### [P2] Hard-coded `backdropFilter: blur(20px)` values
- **Location:** Multiple
- **Category:** Theming
- **Recommendation:** Add `blur = { glass: '20px', subtle: '10px' }` token to `designSystem.ts` and import.
- **Suggested command:** `/normalize`

#### [P2] Heavy components not `React.memo`-wrapped for future growth
- **Location:** `ConversationScreen.tsx` parent (children are memoized — good)
- **Category:** Performance
- **Impact:** At 2,116 lines and 20+ `useState`s, every state change diffs the full tree. Children are memoed so the blast radius is contained, but future features will feel heavier.
- **Recommendation:** Split ConversationScreen into `ConversationShell` + `MessageList` + `InputBar` when you touch it next.
- **Suggested command:** `/extract`

#### [P2] Opacity magic numbers (0.85, 0.55, 0.3) throughout
- **Location:** Multiple
- **Category:** Theming
- **Recommendation:** Fold into the `/normalize` pass — add `opacity = { overlay: 0.85, scrim: 0.55, wash: 0.3 }`.
- **Suggested command:** `/normalize`

#### [P2] CSS variable vs. JS token mixing
- **Location:** `WelcomeScreen.tsx:118` uses `var(--color-text-primary)`; other screens use JS imports
- **Category:** Theming
- **Recommendation:** Pick one. Recommend JS imports since `designSystem.ts` is authoritative.
- **Suggested command:** `/normalize`

#### [P2] Safe-area insets not universally applied on fixed-position elements
- **Location:** `ConversationScreen.tsx:1696` — chevron button inherits but doesn't declare inset padding
- **Category:** Responsive
- **Impact:** On iPhone 14 Pro (notch + dynamic island), the chevron can sit under the home indicator.
- **Recommendation:** Add explicit `paddingBottom: env(safe-area-inset-bottom, 0px)` or verify the parent carries it.
- **Suggested command:** `/adapt`

#### [P2] Minor duplicated Inter font fetch
- **Location:** `index.html:16` loads Outfit + Inter + Cormorant Garamond, but the design system only references Outfit + Cormorant
- **Category:** Performance
- **Recommendation:** Drop Inter from the Google Fonts URL — saves a request and ~30KB.
- **Suggested command:** `/optimize`

### P3 — Polish (if time permits)

- **[P3]** Belief-card `aria-label` verbosity (see P1 above — tracked there but also qualifies as polish if kept). `/clarify`
- **[P3]** `<meta name="theme-color">` missing — set to `colors.void` (`#030308`) so iOS Safari's URL bar matches the page. `index.html`. `/polish`
- **[P3]** Add `rel="preconnect"` hints for Google Fonts (saves ~100ms on first paint). `index.html`. `/optimize`
- **[P3]** Heading inside modals uses `<h2>` but parent page already has `<h2>` — screen readers get a flat outline. Move modals to `<h2>` / `<h3>` based on context. `/typeset`
- **[P3]** PaywallScreen pricing card nesting — borderline "card inside card". Not triggered here but watch it. `/distill`
- **[P3]** "🙏" emoji in PaywallScreen success state reads as "PERSON WITH FOLDED HANDS" — wrap in `<span aria-hidden="true">`. `/polish`
- **[P3]** Add `lang` attribute updates when translations change (currently static `lang="en"` in `index.html`). `/harden`

---

## Patterns & Systemic Issues

1. **The migration to `designSystem.ts` was started and abandoned.** `LandingPage.tsx` is the clean model; everywhere else is ~50% converted. This is one systemic issue, not 50 — one `/normalize` pass resolves the whole class.

2. **ConversationScreen is carrying too much.** 2,116 lines, ~20 `useState` hooks, inline SVGs, modals, icons, TTS state machine, streaming, memory persistence, daily-limit logic, error handling, all in one file. It's the highest-traffic screen and the single file most likely to regress on any change. Worth an `/extract` pass post-launch.

3. **Accessibility intent is strong but enforcement is uneven.** The foundation (focus-visible, skip link, aria on some elements) shows someone cared. But form labels, live regions for streaming, touch targets, and heading hierarchy suggest no final a11y sweep has been done. A single `/harden` pass closes most of this.

4. **Launch-day observability is zero.** No analytics, no error tracking, no uptime monitoring mentioned anywhere. This is outside the audit skill's scope but is the single biggest launch-readiness gap in the report.

5. **iOS Safari discipline is excellent.** `100dvh`, `viewport-fit=cover`, safe-area insets, avoidance of `background-attachment: fixed`, parallax background using `100vh` intentionally — CLAUDE.md rules are followed consistently. This is the best-executed dimension.

---

## Positive Findings

- **`designSystem.ts` is exemplary** — well-commented, semantic naming (`void`, `voidSoft`, `gold`, `goldFaint`), includes viewport helpers, style presets, spacing scale. Just needs adoption.
- **Typography system is distinctive and well-loaded** — Google Fonts with `display=swap`, real pairing (Cormorant × Outfit) rather than generic Inter-everywhere.
- **`100dvh` discipline is perfect** — every screen root follows the rule. Background parallax correctly uses `100vh` with explanatory comment.
- **Full TypeScript coverage** — `any` grep returned zero hits.
- **No outstanding TODO/FIXME/XXX markers** — code is clean of drift comments.
- **Skip link + focus-visible styling present** in `index.css` — foundational a11y is there.
- **Memory lifecycle handled correctly** — Divine-tier conversation memory saves on unmount + checkpointed mid-conversation.
- **SEO on article pages is strong** — dynamic title, description, OG, Twitter, canonical, JSON-LD `Article` schema all injected by `ArticlePage.tsx`.
- **Safety guardrails baked into prompts**, not retrofitted UI banners.
- **Design taste is distinctive** — this does not read as AI-generated, which is the hardest thing to get right and the easiest thing to fail.

---

## Recommended Actions

In priority order for the 72h launch window:

1. **[P1] `/harden`** — Highest leverage. Fixes form-label gaps, live regions, OG tags, error boundary, console stripping, `aria-expanded` on FAQ, and the `setInterval` cleanup in one pass.
2. **[P1] `/adapt`** — Fixes the 44×44 touch targets across `ConversationScreen` and the FAQ chevron. Short, focused.
3. **[P1] `/normalize`** — Flushes the ~50 hex-literal debt against `designSystem.ts` and adds missing tokens (opacity, blur). One pass closes the entire "theming" score gap.
4. **[P1] `/typeset`** — Adds `<h1>` to the LandingPage hero and fixes modal heading hierarchy. Small but SEO-visible on launch day.
5. **[P2] `/optimize`** — Removes unused Three.js stack, drops Inter from Fonts URL, de-stacks backdrop-filters, memoizes inline styles, adds `rel="preconnect"`.
6. **[P2] `/clarify`** — Trims the verbose `aria-label`s on belief cards.
7. **[P2] `/extract`** — Post-launch: split `ConversationScreen` into shell + message list + input bar.
8. **[final] `/polish`** — Final micro-pass after the above (theme-color meta, emoji aria-hidden, remaining P3s).

---

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/audit` after fixes to see your score improve.
