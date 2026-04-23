# AImighty Project Instructions

**Voice AI for spiritual guidance across 14 belief systems.**
**Last Updated: April 18, 2026 (belief picker image cards + iOS keyboard fix + champagne brand tokens)**

## What This Is

AImighty lets users have voice conversations with an AI speaking as the divine voice of their chosen belief system. User selects a tradition (Christianity, Islam, Buddhism, etc.), speaks or types, and gets a response in the authentic voice and wisdom of that tradition.

Core philosophy: **People are spiritually curious but religiously homeless.** Fewer people go to church but they still have questions, doubts, grief, wonder, and moments where they just need to talk to something bigger than themselves. AImighty is that place — for EVERY belief, with zero judgment.

God (in all 14 forms) is: warm, accessible, occasionally funny when appropriate, never dismissive, humble, judgment-free.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS v4 + Glass morphism |
| **Visual** | Midjourney AI-generated divine figure images (9:16) |
| **Backend** | Cloudflare Workers (serverless + cron) |
| **AI Chat** | Claude API (`claude-sonnet-4-20250514`) via streaming SSE, `max_tokens: 120` |
| **TTS** | Smallest AI Lightning V3.1/V2 (5 voice characters) — Divine tier only |
| **Browser TTS** | `window.speechSynthesis` — Believer tier only |
| **STT** | Web Speech API (free, browser-native, cached instance to avoid iOS re-prompts) |
| **Storage** | Cloudflare KV (articles, subscribers, tiers, daily content) |
| **Auth** | Email/password with localStorage/sessionStorage + rememberMe |
| **Payments** | Stripe Checkout (subscription) — price IDs in `src/config/stripe.ts` |
| **Email** | Resend (3k/mo free tier) — welcome + daily newsletter via cron |
| **Hosting** | Vercel (auto-deploy from GitHub) |

## Project Structure

```
Aimighty/
├── CLAUDE.md              # This file
├── TODO.md                # Task list
├── docs/reference.md      # Belief system library + SEO
│
└── aimighty/              # Main app
    ├── index.html         # viewport-fit=cover
    ├── vercel.json        # SPA rewrites + robots/sitemap proxy to worker
    ├── public/images/
    │   ├── hero-mobile.jpg        # 9:16 cosmic hero for landing mobile
    │   ├── hero-desktop.jpg       # 16:9 cosmic hero for landing desktop
    │   └── avatars/               # 14 belief portraits (mobile 9:16 + desktop 16:9)
    ├── src/
    │   ├── App.tsx              # Pathname-based routing
    │   ├── styles/
    │   │   └── designSystem.ts        # Single source of truth: colors/fonts/radii/shadows
    │   ├── components/screens/
    │   │   ├── LandingPage.tsx        # Public / — full redesign (hero → steps → beliefs → pricing → email → FAQ → CTA → footer)
    │   │   ├── ArticlePage.tsx        # Public /[belief]/[slug] (SEO)
    │   │   ├── WelcomeScreen.tsx      # App entry /app
    │   │   ├── BeliefSelector.tsx     # 14 belief cards with selfDescription
    │   │   ├── BeliefWelcomeScreen.tsx
    │   │   ├── ConversationScreen.tsx # Main voice conversation
    │   │   ├── AuthScreen.tsx         # Login/signup with rememberMe
    │   │   ├── PaywallScreen.tsx      # 3-tier, Stripe wired, monthly/annual
    │   │   ├── AboutScreen.tsx        # /about
    │   │   ├── PrivacyScreen.tsx      # /privacy (dark)
    │   │   └── TermsScreen.tsx        # /terms (dark)
    │   ├── services/
    │   │   ├── claudeApi.ts           # Streaming Claude + summarizeConversation
    │   │   ├── openaiTTS.ts           # Smallest AI TTS + sentence queue + word highlight + pause/resume
    │   │   ├── speechInput.ts         # Web Speech API (cached SpeechRecognition instance)
    │   │   ├── auth.ts                # Session + 30-day rememberMe + lastEmail auto-populate
    │   │   └── tierService.ts         # Tier, daily counter, streak, memory
    │   ├── config/
    │   │   ├── beliefSystems.ts       # Canonical IDs, aliases, greetings
    │   │   └── stripe.ts              # Price IDs + startCheckout + openBillingPortal
    │   └── data/
    │       ├── beliefSystems.ts       # 14 beliefs w/ selfDescription
    │       └── translations.ts        # i18n (15+ languages)
    │
    └── worker/
        ├── index.ts                   # All endpoints + cron handler
        └── wrangler.toml              # KV binding + cron trigger
```

## URL Routes (Frontend)

| Path | Screen | Public? |
|---|---|---|
| `/` | LandingPage | ✓ |
| `/app` | WelcomeScreen → app flow | — |
| `/about` | AboutScreen | ✓ |
| `/privacy` | PrivacyScreen | ✓ |
| `/terms` | TermsScreen | ✓ |
| `/[belief]/[slug]` | ArticlePage (SEO) | ✓ |

SPA rewrites in `vercel.json` serve the Vite SPA for all paths except `/sitemap.xml` and `/robots.txt` which proxy to the worker.

## 14 Canonical Belief IDs

**Religious (8):** `protestant`, `catholic`, `islam`, `judaism`, `hinduism`, `buddhism`, `mormonism`, `sikhism`
**Spiritual (3):** `sbnr`, `taoism`, `pantheism`
**Philosophical (3):** `science`, `agnosticism`, `atheism-stoicism`

Aliases: `atheism`/`stoicism` → `atheism-stoicism`; `earth` → `pantheism`; `spiritual` → `sbnr`; `lds`/`mormon` → `mormonism`; `christianity`/`protestant-christianity` → `protestant`; `science-reason` → `science`.

## Character / Voice Mapping

| Character | Voice | Default for |
|---|---|---|
| `god` | Onyx (masculine) | 11 beliefs |
| `jesus` | Ash (warm) | Christian beliefs only (protestant, catholic, mormonism) |
| `mary` | Coral (feminine) | `sbnr`, `taoism`, `pantheism` + selectable on all others |

## Tier System

Stored via `getTier()` in `src/services/tierService.ts`. MVP:
- Not logged in OR lifetime limit hit → `'free'`
- Logged in + `localStorage.aimighty_tier === 'divine'` → `'divine'`
- Otherwise logged in → `'believer'`

Authoritative tier comes from Stripe via worker `/user-tier?userId=` (KV-backed JSON `UserTierRecord`, 400-day TTL for annual / 40-day for monthly).

| Tier | Price | Messages | Voice | Memory | Daily Content |
|---|---|---|---|---|---|
| **Free (Seeker)** | $0 | 3 lifetime | — | — | locked (upgrade to unlock) |
| **Believer** | $4.99/mo · $47/yr | 10/day | Browser SpeechSynthesis | — | ✓ |
| **Divine** | $14.99/mo · $119/yr | 20/day | Smallest AI Lightning V3.1/V2 (5 voices) + sentence queue + word highlight | ✓ (rolling, per-belief) | ✓ |

**TTS routing** (ConversationScreen `speakResponse`):
- `'divine'` → Smallest AI Lightning TTS sentence queue (~$0.005/1k chars) with persistent audio element, `ontimeupdate`-driven word index, pause/resume support
- `'believer'` → `window.speechSynthesis.speak()` once per response
- `'free'` → no TTS

**TTS audio behavior:**
- Tap on screen does NOT stop audio (unlockMobileAudio early-returns if already unlocked)
- If audio is paused (e.g. iOS backgrounding), tap resumes from where it left off via `resumeAudio()`
- `pauseAudio()` / `resumeAudio()` / `isAudioPaused()` exported from `openaiTTS.ts` for future use

**Daily counter** (`aimighty_daily` in localStorage): `{date, count, tier}`. Resets on date change. Only user messages count; God's greeting and God's response don't. Limit hits show an inline banner (not paywall redirect) for Believer/Divine.

## Streak System

localStorage key `aimighty_streak`: `{currentStreak, lastConversationDate, longestStreak}`.

`bumpStreak()`: yesterday → +1; today → unchanged; 2+ days ago → reset to 1.
`formatStreak()`: progressive labels (0 → "Start your streak today 🙏"; 1 → "1 day streak — keep going"; 7+ → "X day streak — you're on fire"; 30+ → "X days — legendary").
`streakMilestone(n)`: overlay text at days 3/7/30. Displayed in dropdown menu.

## Memory System (Divine only)

localStorage key `aimighty_memory_<beliefId>` holds up to 5 notes per belief:
```ts
{ date, summary, mood, topics[], followUp? }
```

**Save triggers:**
- Every 3rd user message (in-flight checkpoint)
- On conversation unmount

**Injection:** On the first user turn of a new Divine conversation, `formatMemoryContext()` is prepended to the user message so Claude gets prior context. The assistant is told to reference the history naturally, not robotically.

**Memory is per-belief** — protestant memory never appears in a buddhist conversation.

## Worker Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/` | Claude chat (streaming SSE), `max_tokens: 120`, 3 sentence / 60 word HARD CAP. Stamps `firstMessageAt` on user tier record (non-blocking via `ctx.waitUntil`) |
| `POST` | `/tts` | Smallest AI Lightning V3.1/V2 TTS proxy (Divine tier only) |
| `GET` | `/daily-topic` | Today's topic (date-idempotent via `topic:YYYY-MM-DD`) + titles for all 14 beliefs |
| `GET` | `/daily-content?belief=<id>` | Prayer + sacredText + reflectionPrompt — cached 48h |
| `GET` | `/daily-article?belief=<id>` | Full SEO article body — cached 48h |
| `POST` | `/summarize-conversation` | Divine memory summary (`{summary, mood, topics, followUp}`) |
| `POST` | `/email-signup` | Add subscriber + send welcome via Resend |
| `GET` | `/unsubscribe?email=<email>` | Mark `active: false`, show HTML confirmation |
| `GET` | `/send-daily-emails` | Cron-triggered batch (also callable for testing) |
| `POST` | `/create-checkout-session` | Stripe Checkout session — includes `consent_collection[terms_of_service]=required` (EU/UK Art. 16(m) waiver) + `billing_address_collection=required` (region detection + tax) |
| `POST` | `/stripe-webhook` | Stripe webhook — verifies HMAC-SHA256 signature, handles `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated` |
| `GET` | `/user-tier?userId=<id>` | Read tier from KV record (returns `{tier}`, falls back to `'free'`) |
| `GET` | `/refund-eligibility?userId=<id>` | Structured refund eligibility check — returns `{eligible, reason, daysSincePurchase, region, euUkProtected, firstMessageAt, ...}`. Used by support for manual refund review |
| `POST` | `/create-portal-session` | Body `{userId}` → returns `{portalUrl}` for Stripe Billing Portal. Required for CA SB-313 and FTC Click-to-Cancel compliance |
| `GET` | `/sitemap.xml` | Dynamic sitemap (home + app + static + today's 14 articles) |
| `GET` | `/robots.txt` | `User-agent: * / Allow: /` + sitemap ref |
| `GET` | `/topic-history` | KV topic history (debug) |
| `POST` | `/reset-topics` | Admin reset |

### User Tier KV Record

`user-tier:<userId>` stores a JSON `UserTierRecord`:
```ts
{
  tier: 'believer' | 'divine',
  priceId: string,
  activatedAt: number,          // ms epoch
  firstMessageAt: number | null, // null = never used → refund-eligible
  region: string | null,         // ISO 3166-1 alpha-2
  consentTosAccepted: boolean,   // from Stripe consent_collection
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  cycle: 'monthly' | 'annual',
  cancelledAt: number | null,
}
```

- **TTL** — 400 days for annual, 40 days for monthly. Webhook-renewed on every successful payment so healthy subs never expire.
- **Legacy records** (bare string `'believer'` / `'divine'` from before the migration) are read transparently by `readUserTierRecord()` and treated as "already used" for refund purposes.
- **Refund eligibility** — Zero messages sent AND within 14 days of `activatedAt`. Enforced by `computeRefundEligibility()` in `worker/index.ts`.

### Cron Trigger

`worker/wrangler.toml`:
```toml
[triggers]
crons = ["0 15 * * *"]
```

Fires daily at 15:00 UTC (7am PST). Handler: `scheduled()` → `sendDailyEmailsBatch()` → iterates `email-subscribers-list` in KV, fetches `/daily-content` per subscriber, sends via Resend with day-of-week subject rotation.

### Worker Secrets

Set via `npx wrangler secret put <NAME>`:
- `ANTHROPIC_API_KEY` — Claude chat
- `SMALLEST_AI_API_KEY` — Smallest AI Lightning V3.1/V2 TTS (Divine tier)
- `OPENAI_API_KEY` — legacy, kept as fallback only (no longer used by `/tts`)
- `RESEND_API_KEY` — newsletter (app degrades gracefully if missing)
- `STRIPE_SECRET_KEY` — Stripe API key for checkout + portal
- `STRIPE_WEBHOOK_SECRET` — webhook signature verify
- `STRIPE_PRICE_BELIEVER_MONTHLY` — exact price ID → maps completed checkout to tier + cycle
- `STRIPE_PRICE_BELIEVER_ANNUAL` — same
- `STRIPE_PRICE_DIVINE_MONTHLY` — same
- `STRIPE_PRICE_DIVINE_ANNUAL` — same

KV namespace `ARTICLES` binding id `8e9f4fd21df54bb985d6bfcb3e414910` holds:
- `article:<date>:<belief>:<topic>` — cached articles
- `daily-content:<date>:<belief>` — cached daily content
- `topic:<date>` — today's locked topic
- `generation:history` — topic rotation history
- `email-subscriber:<email>` — subscriber record
- `email-subscribers-list` — email index
- `user-tier:<userId>` — paid tier from Stripe webhook (JSON `UserTierRecord`)

## Email Newsletter

**Welcome email** (sent on signup):
- Gold AImighty wordmark
- "Your daily divine begins today."
- Today's prayer for their chosen belief
- "Start your first conversation" → /app
- Unsubscribe link

**Daily email** (cron, day-of-week subject rotation):
- Sun: "Sunday — a word from the divine"
- Mon: "Start your week with this"
- Tue: "A prayer for your Tuesday"
- Wed: "Midweek wisdom"
- Thu: "A question to carry into your weekend"
- Fri: "End your week in reflection"
- Sat: "Your Saturday spiritual moment"

Body: prayer, sacred text with reference, reflection prompt, "Read today's full article →" link to `/[belief]/[slug]`, "Talk to God today" CTA.

Signup forms live on LandingPage (between Pricing and FAQ) and PaywallScreen (fallback for users who don't upgrade).

## Stripe Integration

- **Price IDs** in `src/config/stripe.ts` — fill from Stripe dashboard once products exist. Until populated, `isStripeConfigured()` returns false and PaywallScreen shows "Coming Soon".
- **Products needed:** Believer Monthly ($4.99) · Believer Annual ($47) · Divine Monthly ($14.99) · Divine Annual ($119)
- **Flow:** PaywallScreen CTA → `startCheckout()` → POST `/create-checkout-session` → Stripe Checkout → success redirect to `/app?upgraded=true`
- **Checkout session** includes: `consent_collection[terms_of_service]=required` (EU/UK Art. 16(m) waiver), `billing_address_collection=required` (region detection), `subscription_data[metadata][userId]` (so `customer.subscription.deleted` can revoke tier), `allow_promotion_codes=true`.
- **Webhook** handles 3 events: `checkout.session.completed` (writes full `UserTierRecord` JSON to KV), `customer.subscription.deleted` (revokes tier), `customer.subscription.updated` (records `cancelledAt` for scheduled cancellation).
- **Price → tier mapping**: deterministic via `STRIPE_PRICE_{BELIEVER,DIVINE}_{MONTHLY,ANNUAL}` env secrets matched against checkout metadata. Falls back to substring heuristic if env secrets aren't set.
- **On app load:** `fetchUserTier(userId)` reads authoritative tier from worker, overrides localStorage.
- **Self-service cancel:** `openBillingPortal(userId)` in `src/config/stripe.ts` → POST `/create-portal-session` → Stripe Billing Portal URL → user can cancel, update payment, download invoices. Required for CA SB-313 and FTC Click-to-Cancel.
- **Refund eligibility:** `computeRefundEligibility()` in `worker/index.ts` — eligible IFF `firstMessageAt === null` AND within 14 days of `activatedAt`. Support queries `/refund-eligibility?userId=<id>` for a deterministic `{eligible, reason}` response.

## Refund Policy

**All sales final once used.** Codified in ToS §4.4–4.6:
- Monthly: non-refundable once charged.
- Annual: non-refundable for the full 12-month term once used.
- **Zero-use exception:** full refund if user has NOT sent any messages AND is within 14 days of purchase. Enforced server-side via `firstMessageAt` on the `UserTierRecord`.
- **EU/UK/EEA (§4.5):** Explicit right-of-withdrawal waiver citing Directive 2011/83/EU Art. 16(m) and UK CCR 2013 Reg. 37. Waiver activates on first message; user retains full statutory right until then.
- **California/US (§4.6):** Auto-renewal disclosures per CA Bus. & Prof. Code §§17600–17606. Self-service cancellation via Stripe Billing Portal satisfies SB-313.
- **PaywallScreen disclosure:** visible before checkout, references waiver language + support email + /terms link.

## SEO Article Pages

Public route: `/[belief]/[slug]` renders `ArticlePage.tsx`.
- On mount: fetch `/daily-article?belief=<belief>` from worker
- Injects `<title>`, `<meta name="description">`, OG tags, Twitter card, canonical, JSON-LD `Article` schema into `<head>`
- Full article body with `<h1>` title, `<h2>` sections, intro/closing/CTA
- CTA links to `/app` for conversations
- Background: blurred belief image + dark overlay

`sitemap.xml` lists home + /app + /about + /privacy + /terms + today's 14 articles (one per belief). `robots.txt` allows all and references the sitemap.

## AI Disclosure

Built in as a feature, not a warning:

1. **Below greeting on conversation open** (first message only, fades on first user turn):
   "Powered by AI — with deep respect for your tradition"

2. **In all 14 system prompts** (via `CONVERSATION_INSTRUCTION`):
   > DISCLOSURE RULE: If the human directly asks "Are you real?" / "Are you actually God?" / "Is this AI?" — always answer honestly and warmly. Never claim to literally BE a divine figure. Say: "I am AI — but the questions you're bringing are real. The wisdom I draw from is real. And the conversation we can have is real."

3. **PaywallScreen footer:** "AImighty is an AI-powered spiritual companion. It is not affiliated with any religious institution and does not claim divine authority."

4. **Landing FAQ:** "Is this actually God?" → honest answer explaining AI-trained.

## Conversation System Prompt Layer (`CONVERSATION_INSTRUCTION`)

Applied to all 14 belief prompts via string interpolation. Contains:
1. **PURPOSE** — judgment-free listening, not conversion
2. **DISCLOSURE RULE** — honest about being AI
3. **TONE AWARENESS** — humor when appropriate, gravity when the room turns serious
4. **RESPONSE LENGTH RULES** — 1 sentence for greetings, 1-2 simple, 2-3 medium, 3 deep
5. **HARD CAP** — "3 sentences maximum, 60 words maximum. Count your sentences — delete the fourth."

**Response-length architectural standard (locked 2026-04-16):**
- `max_tokens: 120` in the worker's Claude call — hard ceiling, never widen
- 3 sentences maximum
- 60 words maximum
- 1 sentence for greetings
- Tone: **crisp, never verbose.** Depth comes from specificity (exact verses, real names, real numbers), not length. This is a product decision rooted in observed behavior — belief-specific prompts that prescribed "5-10 sentences for deeper questions" were overriding the cap and making God sound like a sermon rather than a conversation. Do not relax these limits without an explicit rationale in a commit message.

Each belief's `RESPONSE DEPTH` block reinforces the HARD CAP and instructs Claude to deliver depth through **specificity** (exact verses, real names, real numbers) rather than length.

## Design System

### Single source of truth: `src/styles/designSystem.ts`
All color, font, radius, shadow, and spacing tokens live here. New components should import from this file, not hardcode hex values. LandingPage is the reference implementation — other screens still have literal hex strings that should be migrated as they get touched.

```ts
import { colors, fonts, fontWeights, radii, shadows } from '../../styles/designSystem';
```

### Colors
- **Primary Gold:** `colors.gold` = `#d4b882` (muted champagne — migrated from `#d4af37` 2026-04-17)
- **Void (background):** `colors.void` = `#030308`
- **Void soft (pricing section):** `colors.voidSoft` = `rgba(10, 10, 18, 1)`
- **Text Primary:** `colors.textPrimary` = `rgba(255, 248, 240, 0.95)`
- **Gold border subtle:** `colors.goldBorder` = `rgba(212, 175, 55, 0.2)`
- **Gold border active:** `colors.goldBorderActive` = `rgba(212, 175, 55, 0.6)`
- **Gold glow shadow:** `shadows.goldGlow` = `0 0 30px rgba(212, 175, 55, 0.15)`

### Typography
- **Divine / headings:** Cormorant Garamond (300–500 weight) via `fonts.display`
- **UI / body:** Outfit (200–600 weights) via `fonts.body`
- **Logo wordmark (standardized):** "AI" in `colors.gold` + "mighty" in `colors.textPrimary`, always Cormorant Garamond. Consistent across all screens. Use the `Logo` component pattern from `LandingPage.tsx` when surfacing the wordmark.

### Viewport Rules — CRITICAL for mobile
- `viewport-fit=cover, interactive-widget=resizes-content` in `index.html` — the `interactive-widget` hint tells iOS 16.4+ Safari to resize content when the virtual keyboard opens rather than overlaying it
- Global CSS: `html, body, #root { min-height: 100dvh; -webkit-fill-available; }`
- **Every screen root** uses `minHeight: '100dvh'` or `height: '100dvh'` — NOT `100vh` or `h-screen` (those cause iOS black bars when URL bar collapses)
- **Never use `backgroundAttachment: 'fixed'`** — iOS Safari disables it and renders the background incorrectly (zoom/clip bug). Always `scroll`.
- ConversationScreen / belief card background divs use `backgroundSize: 'cover'` + `backgroundPosition: 'top center'`
- **LandingPage mobile hero** is the exception: `backgroundSize: 'contain'` + `backgroundColor: colors.void` so the full 9:16 cosmic image renders without cropping on narrow iPhones
- **ConversationScreen layout architecture (rebuilt 2026-04-22 — supersedes the 2026-04-18 lock):** declarative, CSS-only, no JavaScript keyboard math.
  - Root `.conversation-screen` is `height: 100dvh`, `display: flex`, `flex-direction: column`, `overflow: hidden`.
  - Background `.conversation-bg` is `position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0` — full-bleed behind iOS chrome, never scrolls.
  - Gradient overlay at `z-index: 1` darkens the top ~20% so God's face has ≥80px tonal separation from the header icons.
  - Header `.conversation-header` is `flex-shrink: 0`, `padding-top: calc(env(safe-area-inset-top) + 12px)`, `z-index: 30`.
  - Messages `.conversation-messages` is `flex: 1; overflow-y: auto; z-index: 10` — the ONLY part that scrolls.
  - Input `.conversation-input` is `position: sticky; bottom: 0; flex-shrink: 0; z-index: 30` — contains the scroll-button, mic, textarea, and chevron in a single unit so they ride the keyboard together.
  - The textarea itself uses class `.conversation-textarea` (renamed from `.conversation-input` so the outer container could take that name).
  - iOS keyboard: `interactive-widget=resizes-content` in the index.html viewport meta makes iOS Safari 16.4+ resize the layout viewport when the keyboard opens. `100dvh` shrinks with it, `flex:1` messages collapse to fit, and the sticky input rides the new bottom edge — no `--vvh`, no `visualViewport` listener, no `--kb-offset`.
  - **Do NOT** use `position: fixed` on the input bar. **Do NOT** add `visualViewport` resize/scroll listeners. **Do NOT** reintroduce a `--vvh` or `--kb-offset` CSS variable. Those were the repeatedly-regressing patches this architecture replaces — the native CSS path is simpler and stable.
- Safe-area padding on content wrappers, NOT on the background image
- God's text: **centered on both mobile and desktop** (cinematic spoken-word feel; safeguarded by the Worker's max_tokens=120 / 60-word cap — long centered prose wraps awkwardly, so do not relax the cap)

### LandingPage sections (top to bottom)
1. **Hero** — 100dvh, cosmic bg (mobile contain / desktop cover), floating logo, tagline, Begin + Learn More CTAs, animated scroll chevron
2. **How It Works** — 3 steps with 120px watermark numbers, pure SVG icons (hand / speak / star), "The Divine Speaks" as step 3
3. **Belief Showcase** — 14 cards, 16:9 aspect, real belief images with gradient overlay, name + selfDescription, no emoji
4. **Pricing** — slightly lighter bg, 3 tier cards via `PricingCard` subcomponent, Divine has gold glow + "Most Popular"
5. **Email signup** — deep gold gradient bg, wired to `/email-signup` worker endpoint
6. **FAQ** — accordion with thin gold dividers, chevron rotation, no cards
7. **Final CTA** — hero mobile image at 20% opacity bg, "You've always wanted to talk. / Now you can."
8. **Footer** — pure black, logo + tagline + Privacy/Terms/About links + copyright

## Auth System
- Email + password (minimum 8 characters, uppercase + lowercase + number)
- Disposable email domains blocked
- "Remember me" toggle:
  - ON → localStorage + 30-day `expiresAt` refreshed on every save
  - OFF → sessionStorage (cleared when tab closes)
- `getSession()` auto-expires on access when past `expiresAt`
- Rate limits: 50 msgs/hour, 500 char max input
- **Returning user experience:** `setLastEmail()` is called on successful signUp/signIn, persisting to `aimighty_last_email` in localStorage. AuthScreen defaults to the Sign In tab (not Sign Up) if `hasSignedInBefore()` is true, and pre-populates the email field from `getLastEmail()`. First-time visitors still see Create Account.

## Speech Input (STT)
- Uses `window.SpeechRecognition` / `webkitSpeechRecognition` (free, browser-native)
- **Cached instance:** `speechInput.ts` caches the `SpeechRecognition` instance at module level (`cachedRecognition`) and reuses it across `startListening()` calls. Only `instance.lang` is updated when the user changes language. This prevents iOS Safari from re-prompting for microphone permission on every mic tap (iOS prompts per-instance, not per-start).

## Belief Picker (`BeliefSelector.tsx`)

The "Who do you talk to?" signup screen. Design rules locked 2026-04-18:

- **Cards are 96px fixed height** (not `minHeight`) so every card is the same size regardless of descriptor length — Islam's 52-char descriptor used to make that card taller than Mormonism's 16-char one.
- **Card background = the belief's 16:9 conversation-screen image** (`/images/avatars/<id>-desktop.jpg`, with two aliases: `mormonism → mormon-desktop.jpg`, `atheism-stoicism → stoicism-desktop.jpg`). Rendered as a real `<img>` tag, not CSS `background-image`, so image-load failures surface in the Network tab and so the global `button { background: none }` reset can't strip it.
- **Cards render as `<div role="button">`, NOT `<button>`.** Two reasons: (1) the global `button { background: none }` reset in `index.css` strips the image via shorthand even on inner elements, and (2) some iOS Safari builds refuse to paint absolute-positioned `<img>` descendants of a `<button>`. A `div[role="button"]` with an `onKeyDown` handler for Enter/Space preserves accessibility without either quirk.
- **Overlay is a horizontal gradient** (`rgba(0,0,0,0.80)` left → `rgba(0,0,0,0.58)` right), not vertical. Text lives on the left, so the darker edge is where it needs contrast.
- **Text is single-line with `text-overflow: ellipsis`** for both the belief name (Outfit 500, 1.0625rem) and the descriptor (Cormorant Garamond italic 400, 0.95rem). Explicit font stacks (`"Outfit", system-ui, sans-serif` / `"Cormorant Garamond", Georgia, serif`) so a slow Google Fonts load doesn't cause a FOUT-driven layout shift.
- **Selected state** draws a theme-coloured 1px border + glow, not a coloured left-bar like the previous iteration.
- Descriptors live in `src/config/beliefDescriptors.ts` (14 canonical IDs) — add here, not in the component.

## Belief Welcome Screen
- Shows a cinematic quote overlay before entering the conversation
- **70 rotating quotes:** `welcomeMessages` is `Record<string, string[]>` with 5 quotes per belief × 14 beliefs. `pickWelcome()` selects one randomly on mount via `useState` initializer.
- **Timing:** bg fade-in at 300ms, quote fade-in at 800ms, auto-continue at 5800ms (~4s of fully readable quote time). Tap-to-skip is always available.

## Safety Guardrails (Non-Negotiable)
1. Mental health crisis → 988 Suicide & Crisis Lifeline
2. Medical emergency → 911
3. Abuse → National Domestic Violence Hotline 1-800-799-7233
4. Never claim to be literally God
5. Never encourage stopping medication or therapy
6. Never make specific prophecies
7. Never be dismissive of other religions
8. Humor NEVER appropriate for grief, loss, death, mental-health, trauma, crisis

## Commands

```bash
# Frontend (in /aimighty)
npm run dev          # Local dev server
npm run build        # Production build (must pass cleanly)

# Worker (in /aimighty/worker)
npx wrangler dev     # Local worker
npx wrangler deploy  # Deploy to Cloudflare
npx wrangler secret put <NAME>  # Set secrets
```

## When Helping With This Project

1. **Read belief system details** before modifying prompts
2. **Follow safety guardrails** — non-negotiable
3. **Test voice flow** — responses must sound natural spoken aloud
4. **Keep responses warm** — spiritual guidance, not information retrieval
5. **Respect all traditions** — never favor one belief over another
6. **Mobile first** — test on iOS Safari with URL bar collapse. Use `100dvh` always, never `100vh`
7. **Image positioning** — `backgroundSize: cover`, `backgroundPosition: top center`
8. **Tier awareness** — every user-facing change needs to consider free/believer/divine behavior
9. **Update this file** when adding new worker endpoints, tier behaviors, or architectural changes
