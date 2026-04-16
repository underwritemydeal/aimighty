# Phase 2 — P1 Resolutions

All 7 P1s from `03-harden.md` addressed. One fix per commit, `npm run build` passed after every change.

| # | Title | Commit | Summary |
|---|-------|--------|---------|
| P1-1 | Tier staleness on boot | `987a1ce` | On logged-in mount, await `fetchUserTier(userId)` with 5s timeout before revealing UI; mirror server tier to localStorage via `setDivine`. Server 'free' does not downgrade the local cache (protects just-paid users whose KV row may have expired). |
| P1-2 | Speech-input language decoupled from UI | `2753cd4` | `resolveSpeechLanguage` order: explicit `aimighty_speech_language` → `navigator.language` (already BCP-47) → UI-language map → `en-US`. Exports `getSpeechLanguage` / `setSpeechLanguage` for a future settings toggle. |
| P1-3 | Memory checkpoint collapse | `f8ac0b3` | Added optional `sessionId` to `MemoryNote`. Same-session checkpoints overwrite the latest note; a new session (even same day) pushes a new entry. Legacy notes without sessionId fall back to same-day overwrite so migration doesn't double-write. `ConversationScreen` generates one `sessionIdRef` per mount and passes it to both save sites. |
| P1-4 | Reduced-motion bypass | `7e02b47` | `WelcomeScreen` cinematic stagger useEffect short-circuits to `phase=5` when `matchMedia('(prefers-reduced-motion: reduce)')` matches. Existing CSS transitions already respect the media query; this covers JS-driven `setTimeout` stagger that the stylesheet can't reach. |
| P1-5 | iOS audio unlock | `b3960d2` | The global first-interaction listener previously called only `initAudio()` (preconnect). Now also calls `unlockMobileAudio()` synchronously inside the tap/touch handler so iOS Safari's gesture-unlock requirement is satisfied before the first Divine TTS sentence arrives. |
| P1-6 | Mic-denied fallback copy | `580565b` | Rewrote `errorMessages` map in `speechInput.ts` so `not-allowed`, `audio-capture`, `service-not-allowed`, `network`, and `no-speech` each tell the user they can still type below. Toast timeout on `ConversationScreen` bumped from 3s → 6s so the fallback message is actually readable. |
| P1-7 | Cron partial-batch retry | `449e9d6` | `sendDailyEmailsBatch` wraps both `/daily-content` and Resend fetches in `fetchWithOneRetry` (one retry on 429 / 5xx / network error, 500ms backoff). Failures are counted separately from 'skipped' (inactive) and surface in a structured `[DAILY-EMAIL-BATCH]` JSON log line so Cloudflare log search can alert on non-zero failed counts. Sample failure list capped at 20 entries. |

## Build status

Final build: 450.91 kB / 130.46 kB gzip. Clean. No frontend regressions introduced.

## Out of scope (deliberate)

- No new UI surfaces (e.g., explicit speech-language toggle, tier banner, audio-unlock visual). Those are `/polish` items.
- No Discord webhook / Sentry integration for the batch summary — the structured log gives Cloudflare Logs search / Logpush enough signal for launch.
- No queue rewrite for the cron. The audit explicitly calls that a long-term change.
