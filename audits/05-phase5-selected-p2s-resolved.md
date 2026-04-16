# Phase 5 — Three selected P2s resolved

Three high-ROI P2s pulled forward from `04-optimize.md` and `02-critique.md`. One fix per commit, `npm run build` passed after every change. All other P2/P3 items remain deferred per launch plan.

## Items

| # | Source | Title | Commit | Summary |
|---|--------|-------|--------|---------|
| P2-4 | 04-optimize.md | Character selection not persisted | `4452f65` | `ConversationScreen.tsx` initializes `character` state from `getCharacterForBelief(belief.id)` (new helper in `tierService.ts`). Valid stored values (`god`/`jesus`/`mary`) win; otherwise fall back to existing per-belief default (Mary for `sbnr`/`taoism`/`pantheism`, God elsewhere). `setCharacter` is now a `useCallback` that writes through `setCharacterForBelief`. Key prefix `aimighty_character_<beliefId>` — per-belief, so Jesus-on-protestant never leaks into buddhism. Uses the existing `safeGetItem`/`safeSetItem` wrappers, so private-mode failures silently no-op. |
| P2-3 | 04-optimize.md | Silent TTS failure on OpenAI 429 | `6c16d58` | `openaiTTS.ts` `QueuedSentence` gains a `fallback: boolean` flag. Fetch chain sets `fallback = true` on any non-ok response, on tiny/empty audio blobs, or in `catch`. `playNextInQueue` routes fallback entries through `fallbackBrowserTTS` (existing `speechSynthesis` helper) and still fires `onStart(wordCount)` and `onEnd()` so the caller's UI state advances. No word-level highlight in fallback (browser TTS doesn't expose per-word timing cross-platform) but the user still hears the sentence. Prevents silent dead-air when Divine-tier users hit OpenAI rate limits. |
| /critique P1 | 02-critique.md | Generic "Something went wrong" copy | `7af1ed1` | Replaced literal `'Something went wrong — try again'` fallback in three client-side `catch` blocks with `'The connection is briefly strained. One more breath, then try again.'` — in-voice, calm, non-technical. Touched `AuthScreen.tsx` (signup + signin catches), `PaywallScreen.tsx` (Stripe checkout catch), `LandingPage.tsx` (email signup catch). Server-provided error strings from worker responses still take precedence — only the client-only fallback path changed. |

## Build status

Final production build after `7af1ed1`: clean.
- Main: `dist/assets/index-Cwd5p4VK.js` 215.27 kB / 66.99 kB gzip
- Conversation chunk: `ConversationScreen-DmwgvIdl.js` 51.34 kB / 14.88 kB gzip

No regressions vs. Phase 4 baseline — gzip numbers effectively unchanged (the three fixes are small logic/copy changes, not net-new code paths).

## Out of scope (still deferred)

- All remaining P2/P3 items in `04-optimize.md`, `03-harden.md`, `01-audit.md`, `02-critique.md`, `05-normalize.md`, `06-polish.md`.
- Three.js uninstall — excluded per launch plan.
- Onboarding compression — out of scope.
- Inline-style extraction (P1-2) and backdrop-filter destacking (P1-4) from Phase 4 — deferred.

## Launch readiness

Phases 1–5 shipped:
- Phase 1: 8× P0s (harden) ✅
- Phase 2: 7× P1s (harden) ✅
- Phase 3: a11y P1s ✅ (score 13→15/20)
- Phase 4: perf P0/P1s (excluding Three.js) ✅ (main bundle −52%, images −5 MB, LCP preload + rAF batching)
- Phase 5: three selected P2s (TTS fallback + character persistence + error copy) ✅

Phase 6 (final verification + manual flow test) pending user authorization.
