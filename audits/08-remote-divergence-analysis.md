# Remote divergence analysis — before merge

**Date:** 2026-04-16
**Merge base (common ancestor):** `733e7a3` — "Switch TTS from OpenAI to Smallest AI Lightning V3.1"
**Local (our) tip:** `7464ff6` — "docs(audits): Phase 6 launch readiness report" (+48 commits from base)
**Remote tip:** `1027e10` — "god 3-4 sentence limit + TTS fixes" (+10 commits from base)
**Safety branches:** `backup-local-phases-1-5`, `backup-remote-master` — both local + pushed to origin

This document analyzes each of the 10 remote commits, the exact overlap with our Phase 1-5 hardening work, and a file-by-file merge plan.

Investigation method: fetched origin, ran a trial `git merge --no-commit --no-ff origin/master` to let git surface real vs. auto-merged conflicts, read the conflict regions, then aborted the merge before committing. HEAD is back at `7464ff6` and unmodified.

---

## 1. Per-commit analysis

### 1.1 `801f344` — Shorten God responses: hard cap 2-3 sentences, max_tokens 140

- **Files touched:** `worker/index.ts` (42 lines: 21+ / 21−)
- **What actually changed:** In `worker/index.ts` only.
  - `CONVERSATION_INSTRUCTION` HARD CAP: `2-4 sentences` → `2-3 sentences` (1 for greetings).
  - `max_tokens: 180` → `max_tokens: 140`.
  - All 14 belief-specific `RESPONSE DEPTH` blocks rewritten to defer to the HARD CAP instead of prescribing their own 5-10 sentence counts. Cited rationale: belief-specific blocks were overriding the global cap, so Claude was running long.
- **Overlap with our Phase 1-5 work:** None. Our phases never touched prompt length or `max_tokens`. Orthogonal.
- **Conflict severity:** **Clean** — auto-merges in worker/index.ts (different hunks than our Phase 2 cron retry work).
- **Recommended resolution:** **Theirs wins.** This is a real product improvement rooted in observed behavior. Keep as-is. Superseded later by `1027e10` which tightens further to 3-4 sentences / `max_tokens: 120` — but the two tighten in the same direction, so both apply in order.

### 1.2 `ded38fc` — Tighten refund policy: all sales final, zero-use exception only

- **Files touched:** `aimighty-terms-of-service.md`, `src/components/screens/PaywallScreen.tsx` (54 lines: 50+ / 4−)
- **What actually changed:**
  - ToS §4.4 rewritten — explicit 5-point non-refundable policy with 14-day zero-use exception and chargeback-abuse language.
  - ToS §4.2 prices corrected — stale `$39.99/yr` → `$47`, `$119.99` → `$119`. Plan descriptions reconciled to CLAUDE.md (10 msgs Believer, 20 Divine, Seeker added).
  - PaywallScreen: new gold-bordered disclosure card between tier grid and newsletter fallback, with support email + /terms links.
- **Overlap with our Phase 1-5 work:** None. Our Phase 5 touched PaywallScreen *error copy* (line 294), not the tier-grid area. Different hunks.
- **Conflict severity:** **Clean** — auto-merges in PaywallScreen.
- **Recommended resolution:** **Theirs wins.** Legal + product decision, outside hardening scope. Keep as-is.

### 1.3 `05de394` — Server-side refund eligibility + EU/UK consent + self-service cancel

- **Files touched:** `CLAUDE.md`, `aimighty-terms-of-service.md`, `src/components/screens/ConversationScreen.tsx` (+14), `src/components/screens/PaywallScreen.tsx`, `src/config/stripe.ts` (+39), `worker/index.ts` (+406, largest remote commit) — 524 lines net.
- **What actually changed:**
  - **Worker:** New `UserTierRecord` JSON shape (activatedAt, firstMessageAt, region, consentTosAccepted, stripeCustomerId/SubscriptionId, cycle, cancelledAt). Replaces bare `'believer'|'divine'` string. Transparent migration via `readUserTierRecord`/`writeUserTierRecord`. TTL bug fix (annual 400d vs. monthly 40d — was silently 35d for all). `priceIdToTierAndCycle()` deterministic mapping via new `STRIPE_PRICE_{BELIEVER,DIVINE}_{MONTHLY,ANNUAL}` env secrets (replaces `priceId.includes('divine')` substring hack). `computeRefundEligibility()` with EU/UK Art. 16(m) reasoning. `/create-checkout-session` now includes `consent_collection.terms_of_service=required` + `billing_address_collection=required`. `/stripe-webhook` now handles `customer.subscription.deleted` + `.updated`. New endpoints: `/refund-eligibility` GET, `/create-portal-session` POST. `firstMessageAt` stamped via `ctx.waitUntil` on first chat.
  - **Frontend:** `src/config/stripe.ts` gains `openBillingPortal(userId)` helper. `ConversationScreen.tsx` gains "Manage Subscription" item in settings dropdown (paid tiers only).
  - **ToS:** §4.1 renamed Free Trial → Free Tier; §4.5 new EU/UK withdrawal waiver (Art. 16(m), UK Reg. 37); §4.6 new CA/US auto-renewal disclosures (SB-313, NY GBL §527-a, etc.).
- **Overlap with our Phase 1-5 work:**
  - `src/config/stripe.ts`: **major conflict.** Both sides add new exports. Ours adds `pollUserTierUntilPaid` (Phase 1 P0-5). Theirs adds `openBillingPortal`. Different functions, but the diff touches adjacent lines of the file — git's merge landed them in conflict.
  - `ConversationScreen.tsx`: **import-line conflict only.** Ours added `fetchWithTimeout` import; theirs added `openBillingPortal` import. Both are legit, both must survive.
  - `worker/index.ts`: theirs rewrites huge sections. Our Phase 2 cron retry is in a different code region (cron handler, ~lines 1100s) than their refund/consent/portal machinery (mostly webhook + checkout paths). Auto-merge succeeded.
- **Conflict severity:** **Major** (stripe.ts and ConversationScreen.tsx imports) + **huge but resolvable** (worker/index.ts auto-merged clean, but the file is now enormous and deserves a build check).
- **Recommended resolution:** **Hybrid.**
  - `stripe.ts`: keep BOTH `pollUserTierUntilPaid` (ours) AND `openBillingPortal` (theirs). They are independent functions serving different flows. Manual edit to stack them.
  - `ConversationScreen.tsx` imports: keep BOTH `fetchWithTimeout` import (ours) AND `openBillingPortal` import (theirs). Manual edit.
  - `worker/index.ts`: verify after merge that our Phase 2 cron retry (commit `449e9d6`) is still intact. Their 406 lines don't touch cron — should survive auto-merge.

### 1.4 `d72da8e` — Mobile conversation UX: tap-doesn't-kill-voice + keyboard-aware input bar

- **Files touched:** `src/components/screens/ConversationScreen.tsx` (+44), `src/services/openaiTTS.ts` (+61) — 98 lines.
- **What actually changed:**
  - `openaiTTS.ts`: `unlockMobileAudio()` now early-returns if `audioUnlocked` is already true (previously logged-but-did-nothing flag). Root cause of "tap kills voice" — every tap was re-setting the persistent audio element's src to a silent data-URI MP3. New exports: `pauseAudio`, `resumeAudio`, `isAudioPaused`. The pause pair preserves `currentTime` unlike `stop()`, enabling tap-to-resume.
  - `ConversationScreen.tsx`: new `useEffect` subscribing to `window.visualViewport.resize/scroll`, writing keyboard offset into CSS custom property `--kb-offset` on `documentElement`. Input bar's `bottom` now uses `var(--kb-offset, 0px)` with `0.2s ease` transition. Screen-tap handler now calls `resumeAudio()` if `isAudioPaused()` — so iOS backgrounding/tab switches resume cleanly.
- **Overlap with our Phase 1-5 work:**
  - `ConversationScreen.tsx`: **no direct conflict.** Our rAF batching (Phase 4 `bc9e514`) is in `onToken` handler. Our drain-watcher refs (`c1d7eb3`) are in unmount effect. Our character persistence (`4452f65`) is in initial state. These are separate regions from their visualViewport effect and handleScreenTap mods. **However**, both sides add useEffects and import lines — import line auto-merge worked (the import conflict surfaced was unrelated), the effects landed in different positions.
  - `openaiTTS.ts`: **major conflict.** Theirs adds three new exports + early-return guard in `unlockMobileAudio`. Ours adds the `fallback: boolean` field to `QueuedSentence`, the fallback-branch routing in `playNextInQueue`, and changes to fetch error handling (Phase 5 `6c16d58`). Different functions, but the file's import/helper region overlaps.
- **Conflict severity:** **Major** in `openaiTTS.ts`; minor in `ConversationScreen.tsx`.
- **Recommended resolution:** **Hybrid — both sides win, different code paths.**
  - `openaiTTS.ts`: keep their `unlockMobileAudio` early-return guard + `pauseAudio`/`resumeAudio`/`isAudioPaused` exports. Keep our `QueuedSentence.fallback` field and the fallback routing in `playNextInQueue`. Merge both sets of exports in the public API. They don't semantically collide.
  - `ConversationScreen.tsx`: keep their visualViewport effect + keyboard-aware bottom. Keep our rAF batching, drain-watcher refs, and character persistence. All coexist.

### 1.5 `39d13c2` — iOS input clip fix, welcome quote rotation, auth default for returning users, mic permission caching

- **Files touched:** `src/components/screens/AuthScreen.tsx` (+10), `BeliefWelcomeScreen.tsx` (+141, near-rewrite), `ConversationScreen.tsx` (+18), `src/services/auth.ts` (+33), `src/services/speechInput.ts` (+23) — 194 lines.
- **What actually changed:**
  - `ConversationScreen.tsx`: adds `IOS_ACCESSORY_BAR_HEIGHT = 44px` buffer to `--kb-offset` on iOS only (accessory bar isn't covered by `visualViewport.height`).
  - `BeliefWelcomeScreen.tsx`: `welcomeMessages` type changes from `Record<string, string>` to `Record<string, string[]>` — 5 quotes per belief, 70 total. New `pickWelcome()` helper with stable-per-mount random choice. Fade-in timing retimed to 800ms → 5800ms (old was ~2.5s).
  - `AuthScreen.tsx`: default mode now `hasSignedInBefore() ? 'login' : 'signup'`. Email field pre-populates from `getLastEmail()`.
  - `auth.ts`: new `LAST_EMAIL_KEY` + `getLastEmail()`/`setLastEmail()`/`hasSignedInBefore()`. `signUp`/`signIn` success paths call `setLastEmail()`.
  - `speechInput.ts`: module-level `cachedRecognition` instance, reused across `startListening()` calls (only `.lang` updated). iOS webkit was creating a fresh instance each call → iOS consent prompt re-fired every session.
- **Overlap with our Phase 1-5 work:**
  - `AuthScreen.tsx`: **conflict candidate.** Our Phase 3 a11y fixes added aria-labels to email and password inputs (`65ed0f1`). Our Phase 5 error copy rewrite (`7af1ed1`) changed catch fallbacks (lines 84, 95). Their `39d13c2` changes line 45 (default mode) and reads `getLastEmail()`. **Different lines, auto-merged.**
  - `ConversationScreen.tsx`: no overlap (iOS buffer is near their keyboard effect from `d72da8e`).
  - `auth.ts`: none — we modified `messageCount` / `hasReachedFreeLimit` handling earlier? No — we didn't. Their additions in auth.ts are net-new keys. Auto-merged.
  - `speechInput.ts`: our Phase 1 work? Let me confirm — our Phase 2 touched `speechInput.ts` (`2753cd4 fix(speech): trust navigator.language, not UI language, for STT`). That's a different concern (language source). Auto-merge worked.
  - `BeliefWelcomeScreen.tsx`: **not touched by us.** No overlap.
- **Conflict severity:** **Clean** — everything auto-merged.
- **Recommended resolution:** **Both win, verify auto-merge.** Run build after merge to confirm the cached `SpeechRecognition` instance (theirs) plays well with the language-on-start override (ours).

### 1.6 `4db3f21` — Stream idle timeout retry + CLAUDE.md / TODO.md update

- **Files touched:** `CLAUDE.md` (+67), `TODO.md` (+166), `src/services/claudeApi.ts` (+37), `worker/index.ts` (+118) — 255 lines.
- **What actually changed:**
  - Worker: Claude chat endpoint retries once on 500+ or stream timeout. 25-second AbortController timeout. Friendly "Response took too long. Please try again." on abort.
  - `claudeApi.ts`: client-side retry once on 5xx/timeout/idle/network with 1.5s backoff. Combined with worker retry = up to 4 total attempts.
  - `CLAUDE.md` / `TODO.md`: massive updates reflecting Smallest AI TTS, max_tokens 140, 2-3 sentence cap, `UserTierRecord`, refund/portal/consent, visualViewport keyboard, pause/resume, cached SpeechRecognition, 70 welcome quotes, lastEmail auto-populate.
- **Overlap with our Phase 1-5 work:**
  - `claudeApi.ts`: **direct conflict.** Our Phase 1 fix (commit unclear from log — landed in phase 1 P0 set) wrapped the main fetch with `fetchWithTimeout(WORKER_URL, {...}, 30000)`. Their `4db3f21` changes the raw `fetch(WORKER_URL, ...)` to add retry loop but kept plain `fetch`. We both edit the same `fetch` call. See Critical Overlap E.
  - `worker/index.ts`: their retry touches the Claude chat handler. Auto-merged (their retry is wrapped *around* the fetch body we had, not in conflict).
  - `CLAUDE.md`: modified by the user/linter already to reflect remote state (see context reminder). Keep current state.
- **Conflict severity:** **Major** in `claudeApi.ts`. Clean elsewhere.
- **Recommended resolution:** **Hybrid.** Use `fetchWithTimeout(..., 30000)` instead of plain `fetch` INSIDE their retry loop. The 30s header budget and the retry-on-5xx-or-timeout are complementary. Need to rebuild the loop so the wrapped call is what's retried.

### 1.7 `db85b13` — Skip landing for returning logged-in users

- **Files touched:** `src/App.tsx` (+12).
- **What actually changed:** Initial screen resolver for pathname `/` now checks `isLoggedIn()` → goes direct to conversation/belief-selector via replaceState to `/app`.
- **Overlap with our Phase 1-5 work:** Our Phase 4 (`979aeea`) converted static imports to `React.lazy()` + `Suspense`. This commit pre-dates the final routing shape — **superseded** by `e58a454` two commits later and again by `af02d6b`. See Critical Overlap C.
- **Conflict severity:** **Intermediate.** Only relevant as a stepping stone to their final routing in `af02d6b`.
- **Recommended resolution:** **Ignore in isolation**; the final-state routing from `af02d6b` is what merges. Take theirs for the routing logic, preserve ours for the `lazy()` import declarations.

### 1.8 `e58a454` — Rewrite app routing: session → conversation, no session → auth

- **Files touched:** `src/App.tsx` (+142 — near-rewrite), `src/types/index.ts` (+1).
- **What actually changed:**
  - `App.tsx`: initial screen returns `'auth'` (no session) or `'loading'` → conversation/belief-selector (valid session). **WelcomeScreen removed from render tree and imports.** `handleSignOut` → auth (not welcome). `handleAuthSuccess` goes direct to conversation if saved belief exists.
  - `types/index.ts`: adds `'loading'` to `Screen` union.
- **Overlap with our Phase 1-5 work:**
  - `App.tsx`: **TOTAL conflict with Phase 4 code-splitting.** Their rewrite uses static `import` statements (Line 17-25 of their version). Ours uses `const X = lazy(() => import(...))`. These are mutually exclusive at the import level — git surfaced this as the Hunk 1 conflict.
  - Our Phase 4 also kept `LandingPage` eager and lazy-loaded everything else. Their rewrite removes WelcomeScreen from render entirely. Our lazy list includes WelcomeScreen.
  - Our Phase 1 (`987a1ce fix(tier): reconcile server tier before revealing UI on boot`) added tier-reconciliation logic to the session-restore useEffect. Their rewrite removes it.
- **Conflict severity:** **Total rewrite** of App.tsx.
- **Recommended resolution:** **Hybrid — theirs wins on routing, ours wins on lazy loading + tier reconciliation.** See Critical Overlap C and the Merge Plan below.

### 1.9 `af02d6b` — Auth defaults to sign-in, agree text single line, landing page restored for new visitors

- **Files touched:** `src/App.tsx` (+25), `src/components/screens/AuthScreen.tsx` (+9).
- **What actually changed:**
  - `AuthScreen.tsx`: default mode hard-coded to `'login'` (removes the `hasSignedInBefore()` check from `39d13c2` — superseded). "By continuing" text gets `whiteSpace: 'nowrap'` + `fontSize: 0.7rem`.
  - `App.tsx`: adds `localStorage.getItem('aimighty_has_visited')` gate. `isLoggedIn()` → conversation; no session + has_visited → auth; no session + no flag → landing (shown once). Landing's `onEnterApp` sets the flag.
- **Overlap with our Phase 1-5 work:**
  - `AuthScreen.tsx`: our Phase 3 aria-labels and Phase 5 error copy are in different regions. **Auto-merges clean.**
  - `App.tsx`: further evolves the routing from `e58a454`. Same overlap surface.
- **Conflict severity:** **Subsumed by 1.8** — fixes in the same file.
- **Recommended resolution:** **Theirs wins on routing + auth default**; ours preserved on a11y + error copy + tier reconciliation. Net state from this commit is what replaces our App.tsx routing section.

### 1.10 `1027e10` — God 3-4 sentence limit, strip scripture from TTS, caps normalization, word sync fix, faster audio start

- **Files touched:** `src/services/openaiTTS.ts` (+53), `worker/index.ts` (+6) — 59 lines.
- **What actually changed:**
  - Worker: HARD RULE strengthened to "3-4 sentences maximum, never exceed 60 words, count your sentences, delete the fifth." `max_tokens: 140 → 120`. `sample_rate: 24000 → 16000` (smaller audio files, faster generation + transfer).
  - `openaiTTS.ts`: new `cleanTextForTTS()` strips scripture citations (John 3:16, Romans, Surah, Hadith, Gita, parenthetical citations) before TTS. Also normalizes standalone ALL-CAPS words (YOU/HE/ME/US) to title case for pronunciation. Word-by-word highlighting disabled (Smallest AI doesn't return word-level timestamps, client-side estimation drifted) — replaced with sentence-level highlighting.
- **Overlap with our Phase 1-5 work:**
  - `openaiTTS.ts`: **minor conflict.** Theirs adds `cleanTextForTTS` and changes how the request body is built. Ours added `fallback: boolean` path (Phase 5 `6c16d58`) and fetchWithTimeout on the TTS request. Conflict at line 452-458 — body construction + wrapper.
  - `worker/index.ts`: no overlap (different lines).
- **Conflict severity:** **Minor** in `openaiTTS.ts`.
- **Recommended resolution:** **Hybrid.** Use theirs for `cleanTextForTTS`, worker `sample_rate`, and sentence-level highlighting. Use ours for the `fallback` field and `fetchWithTimeout` wrapping. Body uses `ttsText` (theirs) since it's the cleaned version.

---

## 2. Critical Overlap Points

### A. Response length caps

- **Remote state:** `801f344` moved to max_tokens 140 + 2-3 sentences. `1027e10` further tightened to max_tokens 120 + 3-4 sentences + 60 words. (Note: slight wording evolution — 2-3 → 3-4 → hard word count.)
- **Our state:** We did not touch this. Launch readiness report (`07-launch-readiness.md`) scenario #4 verified the 2-4 cap at `worker/index.ts:244`. That line is now 3-4 (with word cap) per remote.
- **Question asked:** Is the remote's cap sufficient, or did we already have tighter limits somewhere?
- **Answer:** Remote's cap is strictly tighter than ours in every dimension. No conflict, no regression. **Take theirs.** Update `07-launch-readiness.md` scenario #4 after merge to reflect "3-4 sentences, <60 words, max_tokens 120".

### B. Auth screen changes

- **Remote state:** `39d13c2` defaulted to `hasSignedInBefore() ? 'login' : 'signup'`. `af02d6b` superseded it to hard `'login'` + nowrap on "By continuing" text.
- **Our state:** Phase 3 (`65ed0f1`) added aria-label to email + password + properly connected aria-describedby. Phase 5 (`7af1ed1`) replaced generic "Something went wrong" in catch blocks with the in-voice copy.
- **Question asked:** Are the a11y fixes preserved if we take the remote's auth default change?
- **Answer:** **Yes — auto-merge succeeded on AuthScreen.tsx.** Their changes hit lines 45 (default mode) and the "By continuing" text near line 370; ours hit input attributes around line 210-240 and catch fallbacks at 84/95. Different hunks. **Both survive.** Spot-check after merge to confirm aria-label and the new error copy are intact.

### C. App routing

- **Remote state:** Three-commit evolution ending at `af02d6b`:
  1. `db85b13` added "skip landing for logged-in /" (interim).
  2. `e58a454` rewrote the entire routing: WelcomeScreen removed, auth-first for no-session, direct-to-conversation for session. **All imports reverted to static.**
  3. `af02d6b` added `aimighty_has_visited` gate so first-ever visitor still sees landing; restored has_visited→auth flow.
- **Our state:** Phase 4 `979aeea` converted 10 screen imports to `React.lazy()` + wrapped screens in `<Suspense>`. Phase 1 `987a1ce` added `fetchUserTier` reconciliation in session-restore useEffect. Our App.tsx also kept `WelcomeScreen` in the flow (they removed it).
- **Question asked:** Does the route rewrite preserve our code splitting, or does it undo Phase 4 bundle optimization?
- **Answer:** **It undoes code splitting if taken verbatim.** Their rewrite uses static `import` for all screens — direct regression of Phase 4 P0-5 (main bundle 451→215 kB). This is the single highest-risk conflict.
- **Resolution:** Take THEIR routing logic (auth-first, has_visited gate, loading state, no WelcomeScreen in render) but KEEP OUR `lazy()` import declarations + `<Suspense>` wrapper. Also re-add our Phase 1 tier reconciliation block inside their session-restore branch. Specifically:
  - Replace imports with our `lazy()` declarations (but drop `WelcomeScreen` since they removed it — **wait**, their `af02d6b` brought landing back; need to verify whether WelcomeScreen is actually still reachable. From the conflict read, their render tree no longer has `currentScreen === 'welcome'`, so `WelcomeScreen` lazy import becomes dead code after the merge. Drop the `WelcomeScreen` lazy import but keep `LandingPage` + all others).
  - Keep our `Suspense` wrapper around the screen container (they didn't touch this).
  - Re-add our Phase 1 tier reconciliation: `fetchUserTier(existingUser.id)` inside the logged-in branch, ungating `setIsInitialized(true)` only after it resolves.
  - Re-add our `pollUserTierUntilPaid` + `?upgraded=true` useEffect (survived auto-merge at the top-level but needs spot-check).
- **Net bundle impact:** Phase 4 main-bundle cut (−52%) is preserved if this is done correctly. Risk is high if the merge is rushed.

### D. ConversationScreen streaming

- **Remote state:**
  - `4db3f21` stream retry (in `claudeApi.ts`, not ConversationScreen).
  - `d72da8e` visualViewport keyboard handling + tap-to-resume via `resumeAudio()`.
  - `39d13c2` iOS accessory bar buffer on `--kb-offset`.
  - `1027e10` sentence-level highlighting replaces word-level in `openaiTTS.ts`.
  - `05de394` "Manage Subscription" dropdown item.
- **Our state:**
  - Phase 1: stream `onError` state reset (earlier commit).
  - Phase 4 `bc9e514` rAF batching on `onToken` (render rate 150-300 Hz → ~60 Hz).
  - Phase 4 `c1d7eb3` TTS drain-watcher refs + unmount cleanup.
  - Phase 5 `4452f65` character persistence per belief.
  - Phase 5 `6c16d58` TTS 429 browser fallback.
- **Question asked:** Do the remote's stream fixes conflict with or complement our stream error handling? Will rAF batching survive the merge?
- **Answer:** **Complement, not conflict.** Their retry is in `claudeApi.ts`, not ConversationScreen. Their keyboard/accessory buffer is a new useEffect. Their resumeAudio tap handler is in a tap handler we didn't touch. Our rAF batching is inside `onToken` (line ~1057). Our drain watcher is in the TTS controller. Our character persistence is in initial state/setter. **All five pieces of ours are in different code regions from all four pieces of theirs.** Git auto-merged ConversationScreen.tsx except for the one import-line conflict (`fetchWithTimeout` vs. `openBillingPortal`).
- **Resolution:** **Both sides win.** Resolve the import conflict manually (keep both imports). Spot-check the file after merge to verify each of our 5 Phase 4/5 fixes is still in place at expected line numbers.

### E. Worker / server changes

- **Remote state:**
  - `801f344` max_tokens 140 + 2-3 cap.
  - `1027e10` max_tokens 120 + 3-4 cap + sample_rate 16k.
  - `05de394` the 406-line `UserTierRecord` + refund + portal + webhook overhaul.
  - `4db3f21` retry + 25s AbortController.
- **Our state:**
  - Phase 1 `a9b046a fix(scripture): reject non-https hrefs before rendering link` — client-side, not worker.
  - Phase 2 `449e9d6 fix(cron): retry transient daily-email failures, log batch summary` — worker cron handler.
  - Phase 1 `fetchWithTimeout` additions — client-side service calls to worker (claudeApi.ts, stripe.ts, tierService.ts indirectly).
- **Question asked:** Any conflicts in worker/index.ts?
- **Answer:** **Auto-merged clean.** Their four commits touch the Claude chat handler, Stripe endpoints, webhook handler, and TTS proxy — each a different region from our cron-retry work (~line 1100s). Git surfaced no conflict on worker/index.ts.
- **Resolution:** **Accept auto-merge.** Spot-check post-merge that our cron per-email try/catch is still present and that the batch summary log still fires. Build will catch any type regressions from their `UserTierRecord` refactor.

---

## 3. Merge Plan — file by file

Conflict count: **5 real conflicts + 5 auto-merged files that need spot-check.**

### src/App.tsx — 3 conflict hunks

**Start from theirs (routing logic)**, then layer back in:
- Our `lazy()` import declarations for AuthScreen, BeliefSelector, BeliefWelcomeScreen, ConversationScreen, PaywallScreen, AboutScreen, PrivacyScreen, TermsScreen, ArticlePage. LandingPage stays eager. **Drop WelcomeScreen lazy import** (their rewrite removed it from render tree — confirm with a grep that no `currentScreen === 'welcome'` case remains before deleting import).
- Our `<Suspense fallback={...}>` wrapper around the screen container (line ~363 in our version).
- Our Phase 1 tier reconciliation block: `fetchUserTier(existingUser.id)` inside the session-restore logged-in branch, `.finally()` calling `setIsInitialized(true)`. Required — without this, `getTier()` returns stale localStorage on first interaction.
- Our Phase 1 `pollUserTierUntilPaid` + `?upgraded=true` useEffect — verify it survived in the top-level hunks outside the conflict regions.
- Our `safeGetItem`/`safeSetItem` usage for `LANGUAGE_STORAGE_KEY` (theirs uses raw `localStorage.getItem`) — **ours wins on this detail**, uses the `safeStorage` wrapper that handles private-mode throws.
- Our `handleLanguageChange` setter that persists + updates `document.documentElement.dir`/`.lang` — keep ours, theirs dropped the setter entirely.

Final render tree after merge: article, landing (first-ever visitor gate), auth, belief-selector, belief-welcome, conversation, paywall, about, privacy, terms. No `welcome` case.

### src/components/screens/ConversationScreen.tsx — 1 import conflict

**Keep both imports.** Resolve the conflict to:
```
import { fetchWithTimeout } from '../../services/fetchWithTimeout';
import { openBillingPortal } from '../../config/stripe';
```
Spot-check after merge:
- rAF batching in `onToken` (line ~1057 in HEAD): present with `pendingRafRef`.
- Drain watcher refs (`drainWatcherRef`, `drainSafetyRef`, `pendingRafRef`) declared near top of component.
- Unmount useEffect that cancels all three.
- Character state initialized from `getCharacterForBelief(belief.id)`.
- `setCharacter` useCallback writes through `setCharacterForBelief`.
- `fetchWithTimeout` actually used somewhere (verify import isn't dead).
- "Manage Subscription" dropdown item from theirs present (gated on paid tier).
- visualViewport useEffect writing `--kb-offset` + iOS 44px buffer present.
- `handleScreenTap` calls `resumeAudio()` if `isAudioPaused()`.

### src/config/stripe.ts — 1 conflict spanning 2 functions

**Keep both functions.** Resolve the conflict region (lines 72-135 in conflicted state) to include:
- Our `pollUserTierUntilPaid` function (exponential backoff poll for `?upgraded=true` redirect).
- Their `openBillingPortal` function (creates /create-portal-session and redirects).

Ordering: put `pollUserTierUntilPaid` immediately after `fetchUserTier`, then `openBillingPortal` at the end. No shared state; purely additive.

### src/services/claudeApi.ts — 1 conflict in retry + timeout wrapping

**Hybrid**: Wrap their retry loop around a `fetchWithTimeout(WORKER_URL, {...}, 30000)` call instead of their plain `fetch(WORKER_URL, ...)`. Both intents survive:
- Timeout budget (ours): 30s time-to-headers so a hanging worker doesn't hang the client indefinitely.
- Retry loop (theirs): `MAX_CLIENT_ATTEMPTS = 2` with 1.5s backoff on 5xx/timeout/network errors.

A `fetchWithTimeout` failure should be treated as a retryable error inside their loop (same as timeout). Manual edit in the conflict region around lines 64-80.

### src/services/openaiTTS.ts — 1 conflict in fetch body region

**Hybrid** around line 452-458:
- Use `ttsText` (theirs, the `cleanTextForTTS`-sanitized version) as the body text.
- Keep `fetchWithTimeout(..., 20000)` (ours) wrapping the fetch.
- Result: `body: JSON.stringify({ text: ttsText, beliefSystem, character, language })` inside `fetchWithTimeout`.

Also verify after merge:
- `cleanTextForTTS` definition (theirs) present and called before fetch.
- Our `entry.fallback` flag logic on non-ok response still present (line ~462 in HEAD).
- Our fallback-branch in `playNextInQueue` still routes to `fallbackBrowserTTS` when `entry.fallback === true`.
- Their new `pauseAudio`, `resumeAudio`, `isAudioPaused` exports present and implemented.
- Their `unlockMobileAudio` early-return guard present.
- Sentence-level (not word-level) highlight logic present.

### Auto-merged files — verify each

1. **src/components/screens/AuthScreen.tsx** — verify:
   - Their default-mode `'login'` (from `af02d6b`) is the active default.
   - Their `getLastEmail()` pre-population wired.
   - Our aria-label on email input (`aria-label="Email"`) and password input present.
   - Our error copy ("The connection is briefly strained…") in signup + signin catch blocks.
   - "By continuing" `whiteSpace: 'nowrap'` + `0.7rem` font size.

2. **src/components/screens/PaywallScreen.tsx** — verify:
   - Their refund disclosure card (ded38fc) + EU/UK waiver language (05de394) both present.
   - Our Phase 5 error copy on Stripe catch fallback still present.

3. **src/services/auth.ts** — verify:
   - Their `LAST_EMAIL_KEY`, `getLastEmail`, `setLastEmail`, `hasSignedInBefore` present.
   - Their `setLastEmail()` called in `signUp` and `signIn` success branches.
   - Our pre-existing session helpers (`getSession`, `getCurrentUser`, `isLoggedIn`, `hasReachedFreeLimit`) unchanged.

4. **src/services/speechInput.ts** — verify:
   - Their `cachedRecognition` module variable + single-instance behavior.
   - Our `navigator.language`-based language selection (`2753cd4`) — critical that their caching doesn't lock in a stale `.lang`. If they always update `.lang` before each call, both coexist. Read the final merged file to confirm.

5. **worker/index.ts** — verify:
   - Their `UserTierRecord` refactor complete and compiles.
   - Their new endpoints (`/refund-eligibility`, `/create-portal-session`) present.
   - Their webhook event handlers (`customer.subscription.deleted` + `.updated`) present.
   - Their `max_tokens: 120`, HARD CAP 3-4 sentences, 60-word limit in `CONVERSATION_INSTRUCTION`.
   - Their retry + 25s AbortController in chat POST handler.
   - Their sample_rate 16000 in Smallest AI TTS call.
   - **Our Phase 2 `449e9d6` cron retry per-email try/catch + batch summary log** still present in the cron handler / `sendDailyEmailsBatch`.
   - Required new env secrets declared: `STRIPE_PRICE_BELIEVER_MONTHLY`, `STRIPE_PRICE_BELIEVER_ANNUAL`, `STRIPE_PRICE_DIVINE_MONTHLY`, `STRIPE_PRICE_DIVINE_ANNUAL`.

### New files (no conflict, accept as-is)

- `src/components/ErrorBoundary.tsx` (ours, Phase 1 P0-6) — untouched on remote.
- `src/services/fetchWithTimeout.ts` (ours, Phase 1) — untouched.
- `src/services/safeStorage.ts` (ours, Phase 1 P0-4) — untouched.
- `scripts/compress-images.mjs` (ours, Phase 4 P0-4) — untouched.
- `audits/*.md` (ours, all phases + this doc) — untouched.

### Post-merge verification

After all conflicts resolved, before committing the merge:

1. `npm run build` — zero errors, zero warnings.
2. Grep for our Phase 4/5 fixes still present:
   - `grep -n "requestAnimationFrame" src/components/screens/ConversationScreen.tsx` — rAF batching.
   - `grep -n "drainWatcherRef\|drainSafetyRef" src/components/screens/ConversationScreen.tsx` — refs.
   - `grep -n "getCharacterForBelief\|setCharacterForBelief" src/components/screens/ConversationScreen.tsx src/services/tierService.ts` — character persistence.
   - `grep -n "entry.fallback\|fallbackBrowserTTS" src/services/openaiTTS.ts` — TTS 429 fallback.
   - `grep -n "The connection is briefly strained" src/` — error copy rewrite in all 3 sites.
   - `grep -n "lazy(" src/App.tsx` — code splitting preserved.
   - `grep -n "<Suspense" src/App.tsx` — Suspense wrapper preserved.
   - `grep -n "fetchUserTier.*existingUser" src/App.tsx` — Phase 1 tier reconciliation.
3. Check the final bundle output: main JS should still be ~215 kB gzipped / 67 kB. If it's back to 450 kB, code splitting was lost.

---

## 4. Divergence severity summary

**Overall: Medium-High.** Not scary; fully resolvable with careful manual work. The 10 remote commits are semantically additive — they expand worker capability, tighten product behavior, and fix mobile UX regressions. Our 48 commits are orthogonal — they harden existing flows, optimize bundles, and add a11y. **The two streams of work are largely complementary.**

The single highest-risk area is **App.tsx** — their rewrite and our code-split collide at the import level, and the easy path (take theirs) would silently regress Phase 4's 52% bundle cut. This must be resolved with care.

The second-highest-risk area is **auto-merge on worker/index.ts** — git succeeded because the hunks don't physically overlap, but the file is now +566 lines on the remote side, most of it a type-shape rewrite (`UserTierRecord`). A type error in the cron handler (our Phase 2 edit) won't be caught until `npm run build`.

### Red flags that would suggest NOT merging

**None material.** Spot checks did not surface:
- Any deletion of files we rely on.
- Any revert of Phase 1 P0 hardening (ErrorBoundary, fetchWithTimeout, safeStorage, `isSending` guard, stream onError reset, scripture URL validation, OG meta) — those all live in files the remote didn't touch.
- Any downgrade of dependencies or framework versions.
- Any commit that undoes a Phase 3 a11y fix — their `AuthScreen.tsx` edits are in different regions from our aria-label work.
- Any regression of the launch-blocking Stripe config — in fact `05de394` adds more infrastructure around Stripe but still requires the price IDs to be populated manually (they are *more* explicitly env-based now via `STRIPE_PRICE_*` secrets instead of hard-coded in `src/config/stripe.ts`). This is a net improvement but adds a new manual-configuration surface.

### Estimated time to complete the merge

- Resolve 5 conflict files with manual edits: ~30-40 min for careful edits and understanding.
- Spot-check 5 auto-merged files: ~10 min.
- `npm run build` + fix any type errors from `UserTierRecord` migration: ~10-20 min (their worker refactor is large; type mismatches plausible).
- Run grep verification checklist (Section 3 post-merge): ~5 min.
- Manual visual/smoke test in dev server: ~15-20 min.
- Total: **~75-95 minutes of focused merge work**, including build-fix cycles.

---

## 5. Recommendation

**Proceed with merge following the file-by-file plan in Section 3.**

Order of execution when approved:
1. Start merge: `git merge origin/master` (will re-create the conflicts).
2. Resolve in order of risk: App.tsx → openaiTTS.ts → claudeApi.ts → stripe.ts → ConversationScreen.tsx.
3. Spot-check 5 auto-merged files per Section 3.
4. `npm run build` — iterate until clean.
5. Run grep verification checklist.
6. Commit the merge: `git commit` (uses the auto-generated merge message; optionally amend to add a summary of what was preserved from each side).
7. Re-run `npm run build` once more on the merged commit.
8. Push to origin.

Do NOT push intermediate states. Do NOT force. If `npm run build` cannot be made green within 20 minutes of the merge commit, `git merge --abort` and come back to it — the backups at `backup-local-phases-1-5` and `backup-remote-master` preserve both endpoints indefinitely.

---

*Analysis complete. Awaiting user approval of Merge Plan before execution.*
