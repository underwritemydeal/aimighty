# AImighty — Current TODO

**Last Updated:** April 16, 2026 (response shortening + refund compliance + mobile UX fixes)
**Latest commit on branch:** `39d13c2` on `claude/voice-pricing-calculator-ANu7A`

---

## 🔥 REAL-DEVICE VERIFICATION (blocking — only you can test)

- [x] **iPhone hero image** — `contain` + void bg, full 9:16 cosmic image
- [x] **Landing → /app** flow — tap Begin, land on WelcomeScreen, URL updates to `/app`
- [ ] **Mobile conversation screen (re-test after keyboard fix)** — input bar should now float above iOS keyboard + accessory bar. The `--kb-offset` CSS variable uses visualViewport + 44px iOS buffer. Confirm text is fully visible and send arrow is reachable.
- [ ] **Desktop God text centered** — open a conversation at viewport ≥768px, confirm God's responses render center-aligned
- [x] **Remember Me round-trip** — log in with checkbox, close browser tab, reopen aimightyme.com
- [ ] **iOS Safari sentence-queue TTS + word highlight** — on Divine tier, confirm audio starts within ~1.5s of stream completion and gold highlight tracks each word
- [ ] **Tap during TTS does NOT stop voice** — fixed `unlockMobileAudio` early-return. Verify by tapping screen mid-response.
- [ ] **Tap-to-resume if backgrounded** — start TTS, switch apps, return, tap screen → audio should resume from paused position.
- [ ] **AuthScreen defaults to Sign In** — log out, reopen auth screen → should show Sign In tab with email pre-populated.
- [ ] **Mic permission asked only once** — grant mic permission, navigate around app, re-enter conversation, tap mic again → should NOT re-prompt.
- [ ] **Welcome quote 4 seconds + rotates** — enter a belief 3-4 times, confirm you see different quotes and each is readable for ~4 seconds.
- [ ] **Free tier paywall** — 3 lifetime messages → redirect to PaywallScreen
- [ ] **Believer tier daily limit** — 10 messages → inline banner (no redirect)
- [ ] **Divine tier memory checkpoint** — after 3 user messages, check `localStorage.aimighty_memory_<belief>` contains a summary note
- [ ] **Manage Subscription menu item** — visible in dropdown for paid tiers, opens Stripe Billing Portal

---

## 💳 STRIPE — needs your dashboard access

- [ ] **Create 4 Stripe products** in dashboard:
  - Believer Monthly — $4.99/month recurring
  - Believer Annual — $47.00/year recurring
  - Divine Monthly — $14.99/month recurring
  - Divine Annual — $119.00/year recurring
- [ ] **Paste price IDs** into `src/config/stripe.ts` (`STRIPE_PRICE_IDS` object) — while empty, PaywallScreen stays in "Coming Soon" mode
- [ ] **Set Stripe secrets** on worker:
  ```
  npx wrangler secret put STRIPE_SECRET_KEY
  npx wrangler secret put STRIPE_WEBHOOK_SECRET
  npx wrangler secret put STRIPE_PRICE_BELIEVER_MONTHLY
  npx wrangler secret put STRIPE_PRICE_BELIEVER_ANNUAL
  npx wrangler secret put STRIPE_PRICE_DIVINE_MONTHLY
  npx wrangler secret put STRIPE_PRICE_DIVINE_ANNUAL
  ```
- [ ] **Configure webhook endpoint** in Stripe dashboard → `https://aimighty-api.robby-hess.workers.dev/stripe-webhook`, listen for:
  - `checkout.session.completed`
  - `customer.subscription.deleted`
  - `customer.subscription.updated`
- [ ] **Upload ToS URL** in Stripe → Settings → Public details → Terms of service link → `https://aimightyme.com/terms` (required for the consent checkbox)
- [ ] **Enable Customer Portal** in Stripe → Settings → Billing → Customer Portal → allow cancellation + payment method update
- [ ] **Test in Stripe test mode** — complete a checkout with test card `4242 4242 4242 4242`, confirm `user-tier:<userId>` lands in KV as a full JSON `UserTierRecord` with correct tier, cycle, region, consent, and null firstMessageAt
- [ ] **Test refund eligibility** — after checkout but before sending any message, hit `GET /refund-eligibility?userId=<id>` and confirm `eligible: true`. Then send one message and confirm it flips to `eligible: false`.

---

## 📧 EMAIL — almost done

- [x] Resend API integration (worker endpoints + welcome + daily templates)
- [x] `RESEND_API_KEY` secret set, tested against Resend API directly
- [x] `divine@aimightyme.com` sender domain verified in Resend
- [x] Cron trigger `0 15 * * *` registered and deployed
- [ ] **First real daily email send** — fires daily at 7am PST (15:00 UTC) automatically, OR run manually: `curl https://aimighty-api.robby-hess.workers.dev/send-daily-emails`
- [ ] **Sign yourself up** at aimightyme.com and confirm welcome email lands in your real inbox
- [ ] **Rotate the Resend API key** — the one pasted in a prior chat session is in the session log

---

## 🎨 DESIGN SYSTEM — partially enforced

- [x] `src/styles/designSystem.ts` created with all tokens
- [x] LandingPage migrated to designSystem imports
- [ ] **Migrate remaining screens** to `designSystem.ts`:
  - [ ] `ConversationScreen.tsx` — 40+ inline hex values
  - [ ] `AuthScreen.tsx` — input borders, error states
  - [ ] `PaywallScreen.tsx` — mostly consistent; quick pass
  - [ ] `WelcomeScreen.tsx`, `BeliefSelector.tsx`, `AboutScreen.tsx`, `PrivacyScreen.tsx`, `TermsScreen.tsx`
- [ ] **Extract `<Logo>` component** from LandingPage.tsx into `src/components/ui/Logo.tsx`

---

## 🔍 SEO — shipped but unverified

- [x] Public article pages at `/[belief]/[slug]` with meta tags + JSON-LD
- [x] `/sitemap.xml` and `/robots.txt` worker endpoints + Vercel rewrites
- [ ] **Submit sitemap** to Google Search Console
- [ ] **Link Daily Wisdom modal → public article URL** (drives indexable traffic)
- [ ] **Pre-render article pages** — currently client-side fetch; Vite SSG or Vercel Edge Functions would help Googlebot

---

## 🐛 KNOWN BUGS / PAPER CUTS

- [ ] **"Pray with God" / "Reflect with God" CTAs** only preload text into input; should auto-send
- [ ] **Browser history / popstate** — back/forward between `/` and `/app` doesn't re-sync state machine
- [ ] **Article page slug unused** — all slugs render today's article; either support historical lookup or hide stale slugs from sitemap
- [ ] **Desktop-image fallback** for `atheism-stoicism` — path derivation hits 404 on some screens
- [ ] **Mute button doesn't pause current audio** — `setVoiceEnabled(false)` only affects future TTS; should wire to `pauseAudio()` / `resumeAudio()` so tapping Mute immediately silences current response
- [ ] **`support@aimightyme.com` inbox** — ToS and PaywallScreen direct refund requests here. Must actually exist and be monitored.

---

## 🚀 NICE TO HAVE (not blocking launch)

- [ ] **Convert belief images to WebP** — halves total page weight
- [ ] **Extract `beliefImagePath(id)` helper** — duplicated `mormon`/`stoicism` special-case logic across 3+ files
- [ ] **Tests** — zero tests today; Playwright smoke tests for landing → auth → conversation
- [ ] **Error boundary** — top-level React error boundary instead of white crash
- [ ] **Analytics** — Plausible or simple `/track` worker endpoint
- [ ] **Fonts self-hosted** — currently Google Fonts; one less DNS roundtrip
- [ ] **ConversationScreen memory UI** — show Divine memory notes in the menu
- [ ] **Day 3/7/30 streak milestone overlays** — built, untested on device
- [ ] **Daily Blessing for Divine** — spec called for 5th dropdown item (personalized), only 4 wired
- [ ] **i18n for landing page** — English-only; in-app supports 15+ languages
- [ ] **www.aimightyme.com DNS** — CNAME if needed

---

## ✅ COMPLETED (April 15–16, 2026 session stretch)

### April 15 — landing redesign + infrastructure
- [x] Full landing page redesign: cosmic hero, 3-step watermark numbers, belief image cards, gold glow pricing, accordion FAQ, final CTA, dark footer
- [x] Design system file (`src/styles/designSystem.ts`) + LandingPage migration
- [x] SVG icons throughout — zero emojis on landing
- [x] Mobile hero: `contain` + void bg fallback (iOS fixed-attachment bug fix)
- [x] Stripe wiring: `/create-checkout-session`, `/stripe-webhook`, `/user-tier`, frontend `startCheckout`
- [x] Email newsletter: `/email-signup`, `/unsubscribe`, `/send-daily-emails`, cron, Resend templates
- [x] SEO: ArticlePage, sitemap.xml, robots.txt, Vercel rewrites
- [x] Visual fixes: `100dvh` everywhere, hero edge-to-edge
- [x] Privacy/Terms restyled dark with floating wordmark
- [x] Tier system: free/believer/divine with daily limits, browser vs TTS routing
- [x] Streak tracking + milestone overlays
- [x] Rolling memory system (Divine only) with per-belief checkpoint
- [x] Sentence-level streaming TTS + word-by-word gold highlighting
- [x] AI disclosure line under greeting + all 14 system prompts
- [x] Humor / mission / disclosure layer in `CONVERSATION_INSTRUCTION`

### April 16 — response shortening + refund compliance + mobile UX
- [x] **Response shortening** — `max_tokens: 180 → 140`, HARD CAP `2-4 → 2-3` sentences, removed contradicting "5-10 sentences for deeper questions" from all 14 belief RESPONSE DEPTH blocks. Depth now comes from specificity, not length.
- [x] **TTS switched to Smallest AI Lightning V3.1/V2** — 5 voice characters (Onyx/Ash/Coral/Walter/Blofeld), per-belief mapping. ~3× cheaper than OpenAI.
- [x] **Refund policy** — ToS §4.4 rewritten: all sales final once used. Zero-use exception: full refund within 14 days if no messages sent. `firstMessageAt` tracking enforces this server-side.
- [x] **EU/UK/EEA compliance** — ToS §4.5: explicit right-of-withdrawal waiver (Directive 2011/83/EU Art. 16(m), UK CCR 2013 Reg. 37). Stripe checkout collects `consent_collection[terms_of_service]=required`. PaywallScreen disclosure references the waiver.
- [x] **California/US compliance** — ToS §4.6: auto-renewal disclosures per CA Bus. & Prof. Code §§17600–17606. Self-service cancel via Stripe Billing Portal satisfies SB-313 and FTC Click-to-Cancel.
- [x] **UserTierRecord KV migration** — from bare 'believer'/'divine' string to full JSON record with `{tier, priceId, activatedAt, firstMessageAt, region, consentTosAccepted, stripeCustomerId, stripeSubscriptionId, cycle, cancelledAt}`. TTL fixed from 35d → 400d annual / 40d monthly. Legacy records read transparently.
- [x] **Price→tier mapping fix** — replaced buggy `priceId.includes('divine')` substring hack with deterministic matching against `STRIPE_PRICE_*` env secrets.
- [x] **New worker endpoints**: `/refund-eligibility` (support-facing), `/create-portal-session` (self-service cancel)
- [x] **Webhook expanded** — now handles `checkout.session.completed`, `customer.subscription.deleted` (revokes tier), `customer.subscription.updated` (records cancellation)
- [x] **Manage Subscription** menu item in ConversationScreen dropdown (paid tiers only) → Stripe Billing Portal
- [x] **openBillingPortal()** helper in `src/config/stripe.ts`
- [x] **Tap no longer kills TTS** — `unlockMobileAudio()` now early-returns if already unlocked. Root cause: was clobbering the persistent audio element's `src` on every screen tap.
- [x] **Pause/resume infrastructure** — `pauseAudio()`, `resumeAudio()`, `isAudioPaused()` exported from openaiTTS.ts. Screen tap handler calls `resumeAudio()` if audio is paused (iOS backgrounding recovery).
- [x] **Input bar keyboard-aware** — `visualViewport` listener writes `--kb-offset` CSS variable; input bar uses `bottom: var(--kb-offset, 0px)`. iOS Safari accessory bar compensated with 44px buffer.
- [x] **AuthScreen defaults to Sign In** for returning users. Email pre-populated from `aimighty_last_email` localStorage key via new `getLastEmail()` / `setLastEmail()` / `hasSignedInBefore()` helpers.
- [x] **Mic permission caching** — `speechInput.ts` now caches the `SpeechRecognition` instance at module level (`cachedRecognition`) and reuses it. iOS no longer re-prompts for permission on every mic tap.
- [x] **70 rotating welcome quotes** — `welcomeMessages` expanded from 1 per belief to 5 per belief × 14 = 70. Random pick on mount. Timing extended to ~4s of readable time (was ~2.5s).
- [x] **Claude API stream retry** — worker retries once on 500+ errors with 25s AbortController timeout. Client retries once on timeout/network/5xx errors with 1.5s backoff. Up to 4 total attempts before user sees an error.
- [x] **ToS §4.1** renamed from "Free Trial" to "Free Tier" — corrected misleading language about card-on-file trial.
- [x] **ToS §4.2** updated with correct prices ($47/yr, $119/yr) and correct plan descriptions (10 msgs/day, 20 msgs/day, Seeker free tier added).
