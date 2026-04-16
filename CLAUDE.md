# AImighty Project Instructions

**Voice AI for spiritual guidance across 14 belief systems.**
**Last Updated: April 15, 2026 (post landing-redesign + hero bg fix)**

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
| **AI Chat** | Claude API (`claude-sonnet-4-20250514`) via streaming SSE |
| **TTS** | OpenAI `gpt-4o-mini-tts` (Onyx/Ash/Coral) — Divine tier only |
| **Browser TTS** | `window.speechSynthesis` — Believer tier only |
| **STT** | Web Speech API (free, browser-native) |
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
    │   │   ├── openaiTTS.ts           # OpenAI TTS + sentence queue + word highlight
    │   │   ├── speechInput.ts         # Web Speech API
    │   │   ├── auth.ts                # Session + 30-day rememberMe expiry
    │   │   └── tierService.ts         # Tier, daily counter, streak, memory
    │   ├── config/
    │   │   ├── beliefSystems.ts       # Canonical IDs, aliases, greetings
    │   │   └── stripe.ts              # Price IDs (fill from Stripe dashboard)
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

Authoritative tier comes from Stripe via worker `/user-tier?userId=` (KV-backed, 35-day TTL).

| Tier | Price | Messages | Voice | Memory | Daily Content |
|---|---|---|---|---|---|
| **Free (Seeker)** | $0 | 3 lifetime | — | — | 🔒 (upgrade to unlock) |
| **Believer** | $4.99/mo · $47/yr | 10/day | Browser SpeechSynthesis | — | ✓ |
| **Divine** | $14.99/mo · $119/yr | 20/day | OpenAI gpt-4o-mini-tts (Onyx/Ash/Coral) + sentence queue + word highlight | ✓ (rolling, per-belief) | ✓ |

**TTS routing** (ConversationScreen `speakResponse`):
- `'divine'` → OpenAI sentence queue (iOS persistent audio element, `ontimeupdate`-driven word index)
- `'believer'` → `window.speechSynthesis.speak()` once per response
- `'free'` → no TTS

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
| `POST` | `/` | Claude chat (streaming SSE), `max_tokens: 140`, 2-3 sentence HARD CAP. Stamps `firstMessageAt` on user tier record (non-blocking via `ctx.waitUntil`) |
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
- `user-tier:<userId>` — paid tier from Stripe webhook

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
- **Webhook:** `checkout.session.completed` → map priceId → tier → write `user-tier:<userId>` to KV with 35-day TTL
- **On app load:** `fetchUserTier(userId)` reads authoritative tier from worker, overrides localStorage

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
4. **RESPONSE LENGTH RULES** — 1-2 sentences for greetings, up to 2-4 for substantive responses
5. **HARD CAP** — "2-4 sentences maximum. You are in conversation, not giving a sermon."

## Design System

### Single source of truth: `src/styles/designSystem.ts`
All color, font, radius, shadow, and spacing tokens live here. New components should import from this file, not hardcode hex values. LandingPage is the reference implementation — other screens still have literal hex strings that should be migrated as they get touched.

```ts
import { colors, fonts, fontWeights, radii, shadows } from '../../styles/designSystem';
```

### Colors
- **Primary Gold:** `colors.gold` = `#d4af37`
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
- `viewport-fit=cover` in `index.html`
- Global CSS: `html, body, #root { min-height: 100dvh; -webkit-fill-available; }`
- **Every screen root** uses `minHeight: '100dvh'` or `height: '100dvh'` — NOT `100vh` or `h-screen` (those cause iOS black bars when URL bar collapses)
- **Never use `backgroundAttachment: 'fixed'`** — iOS Safari disables it and renders the background incorrectly (zoom/clip bug). Always `scroll`.
- ConversationScreen / belief card background divs use `backgroundSize: 'cover'` + `backgroundPosition: 'top center'`
- **LandingPage mobile hero** is the exception: `backgroundSize: 'contain'` + `backgroundColor: colors.void` so the full 9:16 cosmic image renders without cropping on narrow iPhones
- ConversationScreen input bar: `position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom)` — slides off during TTS
- Safe-area padding on content wrappers, NOT on the background image
- God's text: **desktop centered**, **mobile left-aligned** (easier to read on narrow screens)

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
