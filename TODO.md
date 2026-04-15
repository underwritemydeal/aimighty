# AImighty — Current TODO

**Last Updated:** April 15, 2026 (post landing-redesign + hero bg fix)
**Latest commit on master:** `696003d` — Hero: remove backgroundAttachment fixed (iOS bug)

---

## 🔥 REAL-DEVICE VERIFICATION (blocking — only you can test)

- [ ] **iPhone hero image** — confirm full 9:16 cosmic image shows with `contain` + void bg, no crop/zoom, on iPhone SE (375px) through Pro Max (430px)
- [ ] **Landing → /app** flow — tap Begin, land on WelcomeScreen, URL updates to `/app`
- [ ] **Mobile conversation screen** — black bars gone, background edge-to-edge, input bar visible above home indicator, doesn't clip behind keyboard
- [ ] **Desktop God text centered** — open a conversation at viewport ≥768px, confirm God's responses render center-aligned
- [ ] **Remember Me round-trip** — log in with checkbox, close browser tab, reopen aimightyme.com, should skip AuthScreen and land on BeliefSelector (or last conversation)
- [ ] **iOS Safari sentence-queue TTS + word highlight** — on Divine tier, confirm audio starts within ~1.5s of stream completion and gold highlight tracks each word
- [ ] **Free tier paywall** — 3 lifetime messages → redirect to PaywallScreen
- [ ] **Believer tier daily limit** — 10 messages → inline banner (no redirect)
- [ ] **Divine tier memory checkpoint** — after 3 user messages, check `localStorage.aimighty_memory_<belief>` contains a summary note
- [ ] **Dropdown lock icons on Free** — Daily Wisdom / Prayer / Sacred Text / Reflection show lock icon and tap → PaywallScreen

---

## 💳 STRIPE — needs your dashboard access

- [ ] **Create 4 Stripe products** in dashboard (or via `stripe products create` + `stripe prices create`):
  - Believer Monthly — $4.99/month recurring
  - Believer Annual — $47.00/year recurring
  - Divine Monthly — $14.99/month recurring
  - Divine Annual — $119.00/year recurring
- [ ] **Paste price IDs** into `src/config/stripe.ts` (`STRIPE_PRICE_IDS` object) — while empty, PaywallScreen stays in "Coming Soon" mode
- [ ] **Set Stripe secrets** on worker: `npx wrangler secret put STRIPE_SECRET_KEY` and `npx wrangler secret put STRIPE_WEBHOOK_SECRET`
- [ ] **Configure webhook endpoint** in Stripe dashboard → `https://aimighty-api.robby-hess.workers.dev/stripe-webhook`, listen for `checkout.session.completed`
- [ ] **Test in Stripe test mode** — complete a checkout with test card `4242 4242 4242 4242`, confirm `user-tier:<userId>` lands in KV with correct tier
- [ ] **Price → tier mapping sanity check** — worker infers tier from priceId containing "divine". If your Stripe price IDs don't contain that substring, hardcode a priceId → tier map in `worker/index.ts` around the `checkout.session.completed` handler.

---

## 📧 EMAIL — almost done

- [x] Resend API integration (worker endpoints + welcome + daily templates)
- [x] `RESEND_API_KEY` secret set, tested against Resend API directly (message ID returned)
- [x] `divine@aimightyme.com` sender domain verified in Resend
- [x] Cron trigger `0 15 * * *` registered and deployed
- [ ] **First real daily email send** — fires tomorrow at 7am PST (15:00 UTC) automatically, OR run manually now: `curl https://aimighty-api.robby-hess.workers.dev/send-daily-emails`
- [ ] **Sign yourself up** at aimightyme.com and confirm welcome email lands in your real inbox (not a test address)
- [ ] **Rotate the Resend API key** at some point — the one you pasted in chat (`re_FRjch9df_...`) is in the session log

---

## 🎨 DESIGN SYSTEM — partially enforced

- [x] `src/styles/designSystem.ts` created with colors / fonts / radii / shadows / spacing tokens
- [x] LandingPage migrated to import from designSystem — no hardcoded hex values in that file
- [ ] **Migrate the other 8 screens** to import from `designSystem.ts` instead of using literal hex strings:
  - [ ] `WelcomeScreen.tsx` — hero logo, BEGIN button, background handling
  - [ ] `BeliefSelector.tsx` — card borders, hover states
  - [ ] `ConversationScreen.tsx` — 40+ inline hex values scattered through top bar, dropdown, modals, input bar
  - [ ] `AuthScreen.tsx` — input borders, error states, checkbox accent
  - [ ] `PaywallScreen.tsx` — already uses mostly consistent colors; 10 min pass
  - [ ] `AboutScreen.tsx` — short file, easy migration
  - [ ] `PrivacyScreen.tsx` — verify floating logo uses `colors.gold` / `colors.textPrimary` imports
  - [ ] `TermsScreen.tsx` — same as Privacy
- [ ] **Logo wordmark audit** — confirm "AI" gold + "mighty" white treatment matches exactly on every screen that renders the wordmark. WelcomeScreen specifically not checked post-redesign.
- [ ] **Extract a `<Logo>` component** from LandingPage.tsx into `src/components/ui/Logo.tsx` so all 9 screens import the same component instead of reimplementing it

---

## 🔍 SEO — shipped but unverified

- [x] Public article pages at `/[belief]/[slug]` with meta tags + JSON-LD schema
- [x] `/sitemap.xml` worker endpoint with today's 14 articles
- [x] `/robots.txt` worker endpoint
- [x] Vercel rewrites proxying `/sitemap.xml` and `/robots.txt` to worker
- [ ] **Submit sitemap** to Google Search Console at `https://aimightyme.com/sitemap.xml`
- [ ] **Verify `site:aimightyme.com` returns results** — takes 24–48h after sitemap submission
- [ ] **Link Daily Wisdom modal → public article URL** — currently the in-app reader doesn't link out to the indexable public `/[belief]/[slug]` page (trivial follow-up, drives real web traffic)
- [ ] **Pre-render article pages at build time** — current implementation is client-side fetch; Googlebot can render JS but static HTML would be better. Could use Vite SSG or Vercel Edge Functions.

---

## 🐛 KNOWN BUGS / PAPER CUTS

- [ ] **"Pray with God" and "Reflect with God" CTAs** only preload text into the input; user still has to tap send. Spec implied auto-starting a conversation — finish the wiring.
- [ ] **Browser history / popstate** — landing CTAs push state but no `popstate` listener exists, so browser back/forward between `/` and `/app` doesn't re-sync the state machine. Needs a single `window.addEventListener('popstate', ...)` in App.tsx.
- [ ] **Article page `_slug` param unused** — ArticlePage currently fetches `/daily-article?belief=X` which returns today's topic only, so any slug renders the same article. Either support historical slug lookup in the worker (extra KV indexing) OR hide stale slugs from the sitemap.
- [ ] **Desktop-image fallback** for belief `atheism-stoicism` — the data file references `/images/avatars/stoicism-desktop.jpg` directly. Belief showcase has a special case for this, but other screens that build the path from `belief.id` will hit a 404. Audit image path derivation in ConversationScreen / BeliefWelcomeScreen.
- [ ] **TTS 3-5s delay** — still need to measure post-sentence-queue; logs are in place but unverified on production

---

## 🚀 NICE TO HAVE (not blocking launch)

- [ ] **Convert belief showcase images to WebP** — 14 × 16:9 JPEGs are ~200KB each; WebP would halve total page weight
- [ ] **Extract `beliefImagePath(id)` helper** — currently duplicated logic for `mormon`/`stoicism` special cases across 3+ files
- [ ] **Tests** — the app has zero tests. A few Playwright smoke tests would catch regressions on landing → app → conversation
- [ ] **Error boundary** — a top-level React error boundary that renders a graceful "Something went wrong, return home" screen instead of a white crash
- [ ] **Analytics** — no telemetry yet; add Plausible or a simple `/track` worker endpoint that logs to KV
- [ ] **Fonts self-hosted** — currently loaded from Google Fonts; self-host via `/public/fonts/` for one less DNS roundtrip
- [ ] **ConversationScreen memory UI** — show the user their Divine memory notes somewhere in the menu so they know the AI "remembers"
- [ ] **Day 3/7/30 streak milestone overlays** — built, untested on real device
- [ ] **Daily Blessing for Divine tier** — spec called for a 5th dropdown item (personalized), only 4 content items wired
- [ ] **i18n for landing page** — LandingPage is English-only; the in-app flow already supports 15+ languages via `translations.ts`
- [ ] **www.aimightyme.com DNS** — if the non-apex domain still needs a CNAME record

---

## ✅ RECENTLY COMPLETED (this session stretch, April 15 2026)

- [x] Full landing page redesign: cosmic hero, 3-step watermark numbers, belief image cards (no emoji), gold glow pricing, accordion FAQ, final CTA, dark footer
- [x] Design system file (`src/styles/designSystem.ts`) + LandingPage migration
- [x] SVG icons throughout — zero emojis on landing
- [x] "The Divine Speaks" replaces "God Responds" in step 3
- [x] Scroll indicator with CSS keyframe bounce
- [x] Mobile hero: `contain` + void bg fallback (iOS fixed-attachment bug fix)
- [x] Stripe wiring: `/create-checkout-session`, `/stripe-webhook` (HMAC-SHA256 verify), `/user-tier`, frontend `startCheckout`
- [x] Email newsletter: `/email-signup`, `/unsubscribe`, `/send-daily-emails`, cron `0 15 * * *`, HTML templates, Resend key active
- [x] SEO: ArticlePage at `/[belief]/[slug]`, sitemap.xml, robots.txt, Vercel rewrites
- [x] Visual fixes: `100dvh` everywhere, no more `100vh` / `h-screen`, hero edge-to-edge
- [x] Privacy/Terms restyled dark with floating wordmark
- [x] About page rewritten with story / commitment / safety / team
- [x] Tier system: free/believer/divine with daily limits, browser vs OpenAI TTS routing
- [x] Streak tracking + milestone overlays
- [x] Rolling memory system (Divine only) with checkpoint every 3 messages
- [x] selfDescription on all 14 beliefs + BeliefSelector display
- [x] Canonical `atheism-stoicism` id — no more double-normalization
- [x] Date-idempotent topic pick — all 14 beliefs share one daily topic
- [x] Sentence-level streaming TTS + word-by-word gold highlighting
- [x] AI disclosure line under greeting + prompt rule in all 14 system prompts
- [x] Humor / mission / disclosure layer in `CONVERSATION_INSTRUCTION` (applies to all 14 beliefs)
