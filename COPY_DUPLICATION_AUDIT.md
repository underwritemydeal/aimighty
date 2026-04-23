# Copy Duplication Audit

Following the LandingPage vs PaywallScreen divergence that ate sprint goodwill, this doc inventories every place the same semantic content is written twice. Each entry: what to watch, the current state, and a drift-safety note.

## Critical drifts found and fixed in this commit

### 1. PaywallScreen Believer tier — stale "Reflection"

- **File / line:** `src/components/screens/PaywallScreen.tsx:196`
- **Before:** `'Daily Prayer, Sacred Text, Reflection'`
- **After:** `'Daily Prayer, Sacred Text, Daily Belief Study'`
- **Why it mattered:** The in-app paywall promised a feature that was removed from the product in commit `5c2c1a5`. This was the same bug pattern as the LandingPage pricing — same row, same file family, missed in the earlier fix.

### 2. Terms of Service — wrong prices and wrong usage limits (legally material)

- **File / lines:** `src/components/screens/TermsScreen.tsx:266-267`
- **Before:**
  > Believer ($4.99/month or **$39.99**/year): **2 conversations per day**, **10 exchanges per conversation** ...
  > Divine ($14.99/month or **$119.99**/year): **2 conversations per day**, **10 exchanges per conversation**, premium AI voice output (**OpenAI TTS**) ...
- **After:**
  > Believer ($4.99/month or $47.00/year): 10 conversations per day ...
  > Divine ($14.99/month or $119.00/year): 20 conversations per day, premium AI voice output ...
- **Why it mattered:**
  - `$39.99` was never a real Believer annual price — the actual price across `stripe.ts`, `LandingPage.tsx`, `PaywallScreen.tsx`, and the worker's `STRIPE_PRICE_BELIEVER_ANNUAL` secret is $47.00. ToS is the contract — charging $47 when ToS says $39.99 is a misrepresentation claim waiting to happen.
  - "2 conversations per day" appeared to have been an early spec that was never updated. Actual enforcement in `src/services/tierService.ts` is 10/day (Believer) and 20/day (Divine) — matches both pricing cards. ToS saying "2/day" opens the door to a user arguing they're entitled to no more than what the contract says and canceling for "misrepresentation of service scope."
  - "OpenAI TTS" was factually wrong — the `/tts` endpoint has been on Smallest AI Lightning V3.1/V2 since CLAUDE.md was last updated 2026-04-18. Replaced with the generic "premium AI voice output" (the exact phrase used in the PaywallScreen/LandingPage Divine row) — no provider lock-in, and the ToS doesn't break the next time Smallest AI is swapped.

## Duplications still present — watch these on every future copy change

### 3. Tier pricing values

| Value | File / line | Context |
| --- | --- | --- |
| $4.99 | `config/stripe.ts:6` | Believer Monthly (authoritative-adjacent comment) |
| $4.99 | `components/screens/PaywallScreen.tsx:192` | Believer monthly card |
| $4.99 | `components/screens/LandingPage.tsx:602` | Believer marketing card |
| $4.99 | `components/screens/TermsScreen.tsx:266` | ToS §4.2 |
| $14.99 | `config/stripe.ts:7` | Divine Monthly (authoritative-adjacent comment) |
| $14.99 | `components/screens/PaywallScreen.tsx:209` | Divine monthly card |
| $14.99 | `components/screens/LandingPage.tsx:620` | Divine marketing card |
| $14.99 | `components/screens/TermsScreen.tsx:267` | ToS §4.2 |
| $47 | `config/stripe.ts:8` | Believer Annual comment |
| $47 | `components/screens/PaywallScreen.tsx:192` | Believer annual card |
| $47.00 | `components/screens/TermsScreen.tsx:266` | ToS (post-fix) |
| $119 | `config/stripe.ts:9` | Divine Annual comment |
| $119 | `components/screens/PaywallScreen.tsx:209` | Divine annual card |
| $119.00 | `components/screens/TermsScreen.tsx:267` | ToS (post-fix) |

**Drift-safety note:** The Stripe Price IDs are in env secrets on the worker (`STRIPE_PRICE_BELIEVER_MONTHLY` etc.) and ARE the source of truth for billing. The display prices above are hand-written in 4 places. A pricing change requires editing all 4, plus updating the Stripe product, plus rotating the env secrets. **Suggested future fix:** pull display prices from `config/stripe.ts` constants rather than hard-coding them per card.

### 4. Tier daily message limits

| Value | File / line | Context |
| --- | --- | --- |
| 10/day | `services/tierService.ts` | Enforcement (authoritative) |
| 10/day | `LandingPage.tsx:609`, `PaywallScreen.tsx:195`, `TermsScreen.tsx:266` | Display |
| 20/day | `services/tierService.ts` | Enforcement (authoritative) |
| 20/day | `LandingPage.tsx:627`, `PaywallScreen.tsx:213`, `TermsScreen.tsx:267` | Display |
| 3 lifetime | `services/auth.ts` | Enforcement (authoritative) |
| 3 lifetime / "3 free messages" | `LandingPage.tsx:591`, `PaywallScreen.tsx:181`, `TermsScreen.tsx:258`, `ConversationScreen.tsx:2563` | Display |

**Drift-safety note:** Limits hard-coded in 4 display sites + the enforcer. If you change the cap, grep for the old value AND `tierService` to find every place. Suggested future fix: export a `DAILY_LIMITS` constant object from `tierService.ts` and consume everywhere.

### 5. Feature wording micro-drift (cosmetic, no user-visible bug)

- "Streak tracking" (LandingPage Believer 611) vs "Conversation streak tracking" (PaywallScreen Believer 197) vs "Streak tracker" (both Divine cards) — three phrasings of the same feature. All now at parity within Divine; Believer has two different phrasings across Paywall/Landing.
- "Conversation memory" (LandingPage Free/Believer 595, 614, marked false) vs "Conversations remembered" (Divine cards, marked true). Two phrasings, same concept. Acceptable as-is because the false-row and the true-row aren't adjacent — the visual comparison reads fine.
- "Text conversations (browser voice)" (PaywallScreen Believer) vs "Browser voice" (LandingPage Believer). Same feature, different phrasing. Cosmetic.

### 6. Feature-claim drift opportunities (re-audit whenever features change)

- Anywhere the pattern `{ t: 'X', ok: true/false }` appears — currently only `LandingPage.tsx` (3 cards) and `PaywallScreen.tsx` (3 cards). Six pricing cards total, two files. When a tier gains or loses a feature, update all 6 rows. Consider lifting to a shared `src/config/tierFeatures.ts`.
- Anywhere the pattern `$<price>` / `<N> conversations` / `per (day|year|month)` appears — extra surface in `TermsScreen.tsx` §4.2.
- The menu items `'Daily Prayer'`, `'Sacred Text'`, `'Daily Belief Study'` are hard-coded in `ConversationScreen.tsx` (SettingsDropdown) — if any is renamed (as "Reflection" → "Daily Belief Study" was), also audit all 3 pricing cards for the same name.

### 7. The worker-side voice map is the single source of truth for TTS routing

- `worker/index.ts` — `SMALLEST_AI_VOICES` + `BELIEF_CHARACTER_MAP`. No duplicate map on the frontend. `TTS_CHARACTERS` (with onyx/ash/coral) is labelled legacy and not referenced by `/tts`. **Safe.**
- `src/services/openaiTTS.ts` file name is misleading (it's the Smallest AI client), but the only place the name matters is the file itself. See `TTS_VOICE_FIX_NEXT_STEPS.md` for why it wasn't renamed.

## Not drift — intentional duplication

- Belief names (`'Christianity'`, `'Islam'`, etc.) appear in `config/beliefSystems.ts`, `data/beliefSystems.ts`, and translations. These are normalized through `normalizeBeliefId()` for TTS routing. Intentional.
- Descriptors are in `config/beliefDescriptors.ts` — single source consumed by BeliefSelector + the redesigned Switch Belief modal. Already consolidated.
- The `aimightyme.com` literal appears in ~10 places (email templates, ToS, Privacy, metadata, canonical URL, share text). Intentional — changing the domain is a coordinated action anyway.
