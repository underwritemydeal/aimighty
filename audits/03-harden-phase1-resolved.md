# Phase 1 — P0 Hardening Resolution Log

All 8 P0s from `audits/03-harden.md` landed on `master`. Every fix was
built to green before commit; cumulative build is stable.

| # | P0 | Commit | Verified by |
|---|----|--------|-------------|
| P0-1 | State reset in stream `onError` | earlier in session | `setState('idle')` + `scheduleHideControls()` before `speakResponse` in `ConversationScreen.tsx` stream error path |
| P0-2 | `isSending` ref guard | earlier in session | `isSendingRef` flips synchronously in `handleSend`, released on both `onComplete` and `onError` |
| P0-3 | `fetchWithTimeout` everywhere | 778d84b, da21813, 67073cb, 9601641, 4f832a6, bd3ec8d, bb7fa8b, 0e88c22 | Every `fetch()` call in `claudeApi.ts`, `stripe.ts`, `openaiTTS.ts`, `ConversationScreen.tsx`, `ArticlePage.tsx`, `LandingPage.tsx`, `PaywallScreen.tsx` uses `fetchWithTimeout` |
| P0-4 | `safeSetItem`/`safeGetItem` wrappers | ad6e2ec, a591880, d018577, 6e85aa1, 0b181b1, 4055dea | All unguarded localStorage writes in `tierService.ts` (daily/streak/memory), `auth.ts`, `openaiTTS.ts`, `ttsService.ts`, `App.tsx` now route through safeStorage; sessionStorage writes in auth wrapped inline |
| P0-5 | Stripe upgrade polling with backoff | 92b79fd | `pollUserTierUntilPaid()` in `stripe.ts` + `?upgraded=true` detection in `App.tsx` with blocking overlay |
| P0-6 | Root `ErrorBoundary` | 8f6ee66 | `src/components/ErrorBoundary.tsx` wraps `<App />` in `main.tsx`; warm fallback + Try again / Back to home buttons |
| P0-7 | Scripture URL https:// validation | a9b046a | `parseScriptureReferences` in `ConversationScreen.tsx` now regex-validates `^https:\/\//i` before rendering `<a>`, falls through to plain text otherwise |
| P0-8 | OG + Twitter meta in `index.html` | 5c41514 | `og:type`, `og:title`, `og:description`, `og:url`, `og:image` (1200x630 dims declared), `og:image:alt`, `twitter:card=summary_large_image`, twitter:image, canonical link |

## Build state

- Baseline (pre-Phase 1): 445.80 KB JS / 128.80 KB gzip
- After Phase 1: 450.21 KB JS / 130.14 KB gzip
- Delta: +4.41 KB JS / +1.34 KB gzip (ErrorBoundary, safeStorage, fetchWithTimeout, Stripe poll, OG meta)

## What's NOT covered by these P0s
- The 7 P1s from `audits/03-harden.md` — Phase 2.
- Memory summarize is still behind the ConversationScreen stream code — P1 item for fallback.
- No toast for "storage unwritable" yet — P1 / polish item.
