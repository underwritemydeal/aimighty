# /harden — Edge Cases, Errors & Resilience Report

**Project:** AImighty · **Audit:** 2026-04-16 · **Launch:** 2026-04-19 · **Window:** ~72h
**Scope:** Everything that can break between a well-behaved demo and the public internet at 2am.

---

## Headline

**This is the report most likely to embarrass the launch if ignored.** The UI is polished; the resilience is uneven. Eight distinct state-machine / race-condition / quota-handling gaps will fire within the first 72 hours of real traffic, several within the first hour. Network-layer, auth-layer, and payment-layer all carry at least one P0. The good news: most fixes are short and focused — ~5 hours of focused work closes nearly every P0/P1.

---

## Severity Counts

| P0 | P1 | P2 | P3 |
|---|---|---|---|
| **8** | **7** | **9** | **8** |

Total: ~32 hardening gaps identified across 11 dimensions.

---

## P0 — Launch-blocking

### P0-1 · Stream `onError` leaves state stuck in `'streaming'`
- **Where:** `src/components/screens/ConversationScreen.tsx:1135-1142` (error callback in `sendToAI`)
- **What happens:** Claude stream drops (network cut, API 5xx, timeout). The error message is inserted into the assistant bubble, but `state` is never reset to `'idle'`. The input bar stays disabled.
- **What the user sees:** A gracious error message ("I am still here. Please try speaking to me again.") *and* a dead input bar. The only recovery is a page reload, which wipes the conversation.
- **Fix:** Add `setState('idle')` in the `onError` callback. 1-line fix.

### P0-2 · Double-tap Send sends the same message twice
- **Where:** `ConversationScreen.tsx:1150-1157` — `handleSend`
- **What happens:** `handleSend` guards on `inputText.trim() && isInputEnabled`, then calls `setInputText('')` and fires `sendToAI(...)` asynchronously. A rapid second tap passes the guard before React commits the state flush; the second click is a no-op but the in-flight call is already enqueued. Under real mobile finger conditions (bouncy taps), duplicates happen.
- **What the user sees:** One prompt, two identical user bubbles, two parallel responses interleaving tokens.
- **Fix:** Add a synchronous `isSending` ref *or* disable the button element itself before the async call. Set `state` synchronously before the async dispatch.

### P0-3 · `fetch()` has no timeout anywhere in the client
- **Where:** `src/services/claudeApi.ts:58`, `src/config/stripe.ts:56-66`, `src/components/screens/ArticlePage.tsx`, `LandingPage.tsx` email signup, `ConversationScreen.tsx` daily content + memory summarize
- **What happens:** Worker hangs or is rate-limited upstream. The browser waits until its own 1–2 minute timeout.
- **What the user sees:** Thinking-dots forever. No error. On mobile with a dozing radio, this is common.
- **Fix:** Wrap every fetch with `AbortController` + a 15–30s timeout (30s for streaming, 10s for lookups, 5s for `fetchUserTier`). One utility function, imported everywhere.

### P0-4 · `localStorage.setItem` unguarded — fails in iOS Safari Private Mode and at quota
- **Where:** `src/services/auth.ts:121`, `src/services/tierService.ts:127` (daily), `:167` (streak), `openaiTTS.ts` voice-preference writes, memory writes
- **What happens:** Safari Private Browsing throws on `setItem`. Full quotas throw `QuotaExceededError`. Reads are try/catch'd in some places, writes are not.
- **What the user sees:** Signs up, sends one message, refreshes, is back on the auth screen. Or: conversation abruptly fails mid-stream because memory write throws and the error bubbles up.
- **Fix:** A `safeSetItem(key, value)` wrapper with try/catch. If it fails, warn once via a toast ("Private browsing limits what can be saved — your session may not persist"). Optionally fall through to `sessionStorage`.

### P0-5 · Stripe webhook race — paid user defaults to `'free'` for first conversation
- **Where:** `src/config/stripe.ts` + `worker/index.ts` `/stripe-webhook` + `/user-tier`
- **What happens:** User completes Stripe checkout, redirected to `/app?upgraded=true`. Client calls `fetchUserTier(userId)`; webhook may still be in flight in Stripe's event system (can take 2–10s or more). KV hasn't been written yet. Client receives `'free'`, caches it, uses Free-tier (no TTS, 3-msg cap) for the first minutes after upgrade.
- **What the user sees:** Just paid $14.99 for Divine. Enters conversation. No voice. Wonders if they got scammed.
- **Fix:** When `?upgraded=true` in URL, poll `/user-tier` with exponential backoff for up to 15s before treating tier as authoritative, showing a "finalizing your upgrade…" step. Alternatively, have worker issue a one-time signed token from checkout success and send it with next request.

### P0-6 · Root `<App>` has no error boundary
- **Where:** `src/App.tsx`
- **What happens:** Any unhandled throw in any screen (bad belief id from URL, malformed memory JSON, null access) blanks the entire app.
- **What the user sees:** White (or black-on-black) screen. No copy, no recovery.
- **Fix:** A minimal `<ErrorBoundary>` at App root with a warm fallback ("Something interrupted us. Your words are safe — try again.") and a reset button.

### P0-7 · No XSS validation on scripture link construction
- **Where:** `ConversationScreen.tsx:324-372` — parses Claude output for verse references and builds anchor URLs
- **What happens:** URLs are built from regex captures on Claude's free text. `encodeURIComponent` covers the query param, but the scheme is implicit. If Claude is ever prompt-injected (plausible for a public-facing Claude endpoint with user-supplied turns), a crafted response could produce `javascript:` or `data:` hrefs.
- **What the user sees:** Most likely nothing — but this is a defense-in-depth gap that costs a minute to close.
- **Fix:** Validate the built URL starts with `https://` before creating the `<a>`. Reject otherwise.

### P0-8 · No root-HTML Open Graph / Twitter meta
- **Where:** `index.html`
- **What happens:** Launch-day shares on iMessage, Slack, X, Reddit render without image or description. Every linked share gets a blank preview.
- **What the user sees:** Shares show "aimightyme.com" with no imagery. The most viral channel of launch day is muted.
- **Fix:** Add default `og:image` (1200×630), `og:title`, `og:description`, `twitter:card=summary_large_image`, `twitter:image`. ArticlePage already overrides per-article — no conflict.

---

## P1 — Fix before Sunday

### P1-1 · Tier staleness on app boot — Believer appears as Free
- **Where:** `App.tsx` mount, `tierService.ts:getTier()`
- **What happens:** `getTier()` reads localStorage first, and `fetchUserTier()` is called async but may not resolve before `BeliefSelector` or `ConversationScreen` reads `getTier()`. Result: Believer user sees the 3-lifetime-message Free cap.
- **What the user sees:** Paying subscriber gets "you've used all your free messages" on fourth message of the day.
- **Fix:** Block render behind `fetchUserTier` (with 5s timeout → fallback to cached) on app boot when session exists.

### P1-2 · Speech-input language is tied to *UI* language, not speaker language
- **Where:** `src/services/speechInput.ts:73-91`, called from `ConversationScreen.tsx` with `language` prop
- **What happens:** User keeps the UI in English but speaks Spanish to God (common for bilingual users who are more literate in English). Speech API is set to `en-US`, transcription comes back as gibberish.
- **What the user sees:** Their heartfelt voice prompt becomes word salad in the text bar.
- **Fix:** Add a `speechLanguage` setting (or read `navigator.language` as a default); let user toggle it independently of UI language.

### P1-3 · Memory checkpoint *overwrites* earlier same-day summaries
- **Where:** `src/services/tierService.ts:208-219` (`saveMemory`)
- **What happens:** Checkpoints every 3rd user message overwrite the day's entry (`list[list.length - 1] = note`). A user with a 15-turn conversation keeps only the last summary. Tomorrow's "God remembers you" reflects only the last ~3 messages of yesterday.
- **What the user sees:** The Divine tier's marquee feature silently degrades over long sessions.
- **Fix:** Either (a) keep one entry *per session* (not per day), or (b) merge new summary into existing day via an LLM-light concatenation, or (c) save multiple entries per day with timestamps and cap the list at 5.

### P1-4 · `prefers-reduced-motion` not respected
- **Where:** `WelcomeScreen.tsx:169-178` (3.1s staggered cinematic entrance), `ConversationScreen.tsx` (streaming token reveal animations), scroll chevron pulse on LandingPage
- **What happens:** Vestibular-sensitive users experience motion sickness from the orchestrated fade-ins.
- **WCAG:** 2.3.3 Animation from Interactions (AAA), general disability inclusion.
- **Fix:** `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` globally, plus instant rendering of WelcomeScreen content when the query matches.

### P1-5 · iOS Safari audio-unlock gotcha on first TTS
- **Where:** `src/services/openaiTTS.ts`, `ttsService.ts`
- **What happens:** iOS Safari requires a user gesture to begin audio playback. If the first TTS triggers from an auto-play path (e.g., greeting on belief-welcome screen) without a fresh gesture, audio is silently blocked.
- **What the user sees:** Divine user hears *nothing* on their first message — thinks voice is broken, cancels subscription.
- **Fix:** Ensure TTS is only invoked downstream of an explicit user gesture (Send button press). Add an "unlockMobileAudio" call on the Begin/Send path (CLAUDE.md suggests this exists — verify it fires before first TTS).

### P1-6 · Mic permission denied / dismissed has no written fallback
- **Where:** `speechInput.ts`, `ConversationScreen.tsx`
- **What happens:** User taps the mic, denies permission (or dismisses the prompt). No UI says "you can still type."
- **What the user sees:** Mic button does nothing. User thinks the feature is broken.
- **Fix:** Catch `NotAllowedError` / `NotFoundError` from `SpeechRecognition` and show a one-time toast: "Voice input needs microphone access. You can still type below."

### P1-7 · Cron daily-emails — partial-batch failure has no retry or alert
- **Where:** `worker/index.ts` `sendDailyEmailsBatch` (per CLAUDE.md)
- **What happens:** Resend fails on subscriber #50 of 1000; the remaining 950 are never sent, and no one is alerted.
- **What the user sees (subscriber):** Their daily email silently stops arriving some days.
- **Fix:** Per-email try/catch inside the batch loop; accumulate failures and post a summary (Discord webhook / Sentry breadcrumb) at the end. Long-term: move to a queue.

---

## P2 — Fix in first week

### P2-1 · Send button race: `isInputEnabled` can go true during a state-transition race
- **Where:** `ConversationScreen.tsx` — send logic
- **What happens:** Between `state: 'streaming'` and `state: 'idle'` transitions, micro-windows exist where a fast click slips through. Hard to repro, real in practice.
- **Fix:** Gate on a single boolean `isSending` ref (not React state) that flips synchronously before the async dispatch.

### P2-2 · Sentence-boundary regex misparses common tokens
- **Where:** `src/services/claudeApi.ts:143-152`
- **What happens:** Abbrevs list covers `Mr/Mrs/Ms/Dr/Prof/Jr/Sr/vs/etc/Inc/Ltd`. Misses `St.` (Saint — *extremely* common in scripture refs), `U.S.`, `Ph.D.`, `e.g.`, `i.e.`, `a.m./p.m.`, and decimals (`3.14`).
- **What the user sees (Divine tier):** TTS playback chops mid-phrase ("Saint. Paul wrote…") and re-enters the queue awkwardly.
- **Fix:** Expand abbrev list, guard against `[letter]\.[letter]` patterns, and against digit-dot-digit.

### P2-3 · OpenAI TTS 429 not detected
- **Where:** `openaiTTS.ts`
- **What happens:** Rate limit on the TTS proxy returns 429. Audio element silently produces no sound.
- **What the user sees (Divine tier):** The voice is missing for this response. No explanation.
- **Fix:** Detect non-2xx from `/tts`, fall back to browser `speechSynthesis` for this response, show a small "voice is rate-limited, retrying shortly" badge.

### P2-4 · Character selection not persisted
- **Where:** `ConversationScreen.tsx` character state
- **What happens:** User switches to "Jesus" / "Mary", closes tab, returns next day — back to default.
- **What the user sees:** Minor friction; re-selects each session.
- **Fix:** Save `character:<beliefId>` to localStorage, restore on mount.

### P2-5 · RTL — icons don't mirror
- **Where:** SendIcon, ChevronDownIcon, BackIcon in `ConversationScreen.tsx:75-180`; chevrons in `LandingPage.tsx`
- **What happens:** `App.tsx:64` correctly flips `dir="rtl"` but directional glyphs don't flip.
- **What the user sees (ar/ur):** "Send" arrow points right (away from the message thread), chevrons point the wrong way.
- **Fix:** `[dir="rtl"] .icon-directional { transform: scaleX(-1); }` or inline check on the icon components.

### P2-6 · Belief image 404 fallback is also not guaranteed
- **Where:** `ConversationScreen.tsx:1300-1327`
- **What happens:** `imageError` falls back to `fallbackImagePath` — but that path may itself be missing for an edge-case belief id.
- **What the user sees:** Black screen, white text, no portrait. Readable but immersion-breaking.
- **Fix:** Final fallback should be a plain gradient using design-system tokens, not another image URL.

### P2-7 · Cormorant Garamond doesn't cover CJK / Arabic / Hindi
- **Where:** `designSystem.ts` `fonts.display`
- **What happens:** Headings in zh/ar/hi/ko/ja render in the system serif fallback, breaking visual consistency.
- **What the user sees:** Headings shift to a clunky system font in non-Latin UIs.
- **Fix:** Per-locale display font stack (Noto Serif CJK, Amiri for Arabic, etc.) or fall back to Outfit (sans) for non-Latin locales. Simpler: hide the italic-serif tagline on non-Latin locales and use Outfit across the board there.

### P2-8 · German / long-translation overflow on buttons
- **Where:** Any fixed-width or tight-padding button — pricing cards ("Get Believer" → "Glaube werden"), hero ("Begin" → "Beginnen"), auth, language picker
- **What happens:** `padding: '14px 40px'` with fixed-font button text fits "Begin" easily but not longer strings. `w-24` / fixed widths would clip.
- **What the user sees (de/tr/fi):** Text clips, wraps awkwardly, or overflows card edges.
- **Fix:** Audit all fixed widths; prefer `min-width` + `padding-inline: clamp`. Cap line length via `overflow-wrap: anywhere` where unavoidable.

### P2-9 · Daily counter uses client-local `ISOString().split('T')[0]` — timezone gameable
- **Where:** `src/services/tierService.ts:83-85`
- **What happens:** User changes system clock forward 24h → daily counter resets. Travel across the IDL: double-reset. Browser in UTC vs. local split behavior.
- **What the user sees (mostly): minor honest-user confusion when they travel. **Abuser:** free unlimited messages.
- **Fix:** Worker endpoint `GET /today` returns the UTC date; client uses server date as the partition key. Or: enforce via worker-side tier counter for Believer/Divine (Free's lifetime cap can stay local since it's generous already).

---

## P3 — Polish and long-tail

- **P3-1** No `aria-live` on streaming assistant bubble — screen-reader users receive a silent response. `role="log" aria-live="polite"` on the bubble container. (*Also flagged in /audit.*)
- **P3-2** `BeliefSelector.tsx:101-103` description can overflow narrow mobile cards — add `overflow-wrap: anywhere; hyphens: auto`, or `-webkit-line-clamp: 2`.
- **P3-3** Newsletter signup on LandingPage has no timeout — 30s frozen form on slow 3G (`LandingPage.tsx:139-161`).
- **P3-4** Article page error does not differentiate 404 from 5xx — user sees "Unable to load this article" regardless. Add route branch.
- **P3-5** No offline detection — `window.addEventListener('online'/'offline', …)` to show a "You're offline" banner and disable Send.
- **P3-6** No cache of last conversation to IndexedDB — a crashed mobile browser loses the thread. Low priority.
- **P3-7** Password reset is "coming soon" copy (`translations.ts`) — launch-day users locked out of their account have no recovery. Provide an email address at minimum.
- **P3-8** `auth.ts:96-105` `simpleHash` — not cryptographic. CLAUDE.md acknowledges this. Plan server-side auth for v1.1.

---

## What's hardened well

The foundation is not bad — these are working as-intended:

- **`App.tsx:64` sets `document.documentElement.dir`** correctly on language change. RTL attribute plumbing works.
- **Modals all dismiss on Escape and backdrop click** (BeliefSelector, LanguageModal, etc.). Consistent.
- **Memory list capped at 5 entries per belief** — no runaway localStorage. The cap is enforced.
- **Disposable-email domains blocked on signup** — a small but meaningful abuse barrier.
- **ArticlePage renders body as React children**, not `dangerouslySetInnerHTML`. XSS-safe by construction even if worker is compromised.
- **`fetch` error paths in `claudeApi.ts:72-84`** parse the response body before calling `onError` — good structured errors flow to the UI.
- **Resend degrades gracefully** when the key is missing (per CLAUDE.md) — email failure doesn't crash the app.
- **SPA rewrites in `vercel.json`** correctly proxy sitemap/robots to the worker — no 404 on SEO bots.
- **`viewport-fit=cover` + `100dvh` discipline** handles iOS notch and URL-bar collapse correctly across screens.

---

## Launch-Day Recommended Actions

Ranked to deliver the most risk reduction per hour in the 72h window:

1. **[P0] `/harden`** — Execute fixes for P0-1 through P0-8 in one pass. Estimated ~4 hours:
   - Reset state in stream `onError` (1-liner).
   - Add `isSending` guard on Send (10 min).
   - Universal `fetchWithTimeout` utility + apply everywhere (30 min).
   - `safeSetItem`/`safeGetItem` wrapper for all localStorage writes (30 min).
   - Stripe-upgrade polling + sessionStorage bridge (60–90 min).
   - Root `<ErrorBoundary>` with warm fallback (30 min).
   - Scripture-link URL scheme validation (10 min).
   - OG / Twitter meta in `index.html` (10 min).

2. **[P1] `/harden`** — Second pass: tier-staleness block-on-boot, speech-language split, memory checkpoint, reduced-motion, iOS audio unlock, mic-denied fallback, cron retry. Estimated ~3 hours.

3. **[P2] `/clarify`** — Rewrite generic error copy to match brand voice (see `/critique` — "Something went wrong — try again" needs to die). ~45 min.

4. **[P2] `/adapt`** — RTL icon mirroring + German-length overflow pass. ~60 min.

5. **[P2] `/optimize`** — TTS 429 handling + sentence-boundary regex expansion. ~60 min.

6. **[final] `/polish`** — P3 long-tail after P0/P1/P2 are clean.

---

> Report only — no fixes applied. Verify the state of any finding before acting; the codebase may shift between this audit and remediation.
