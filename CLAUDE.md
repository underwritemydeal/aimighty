# AImighty Project Instructions

**Voice AI for spiritual guidance across 14 belief systems.**
**Last Updated: April 14, 2026**

## What This Is

AImighty lets users have voice conversations with an AI speaking as the divine voice of their chosen belief system. User selects a tradition (Christianity, Islam, Buddhism, etc.), speaks into their phone, and hears a response in the authentic voice and wisdom of that tradition.

Think "talk to God" but personalized to YOUR beliefs. Not text — voice. Not generic — tradition-specific.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS v4 + Glass morphism |
| **Visual** | Midjourney AI-generated divine figure images |
| **Backend** | Cloudflare Workers (serverless) |
| **AI Chat** | Claude API (claude-sonnet-4-20250514) via streaming SSE |
| **TTS** | OpenAI gpt-4o-mini-tts via Worker proxy (Onyx/Ash/Coral voices) |
| **STT** | Web Speech API (free, browser-native) |
| **Storage** | Cloudflare KV (article generation history) |
| **Auth** | Email/password with localStorage/sessionStorage |
| **Hosting** | Vercel (auto-deploy from GitHub) |

## Project Structure

```
Aimighty/
├── CLAUDE.md              # This file (project overview)
├── TODO.md                # Current task list
├── docs/
│   └── reference.md       # Full belief system library, prompts, SEO
│
└── aimighty/              # Main application
    ├── public/
    │   └── images/avatars/   # 16 Midjourney divine figure images
    ├── src/
    │   ├── components/screens/
    │   │   ├── WelcomeScreen.tsx      # Hero image landing
    │   │   ├── BeliefSelector.tsx     # 14 belief system cards
    │   │   ├── ConversationScreen.tsx # Main voice conversation
    │   │   ├── AuthScreen.tsx         # Login/signup with remember me
    │   │   └── PaywallScreen.tsx      # Premium upsell
    │   ├── services/
    │   │   ├── claudeApi.ts           # Streaming Claude calls
    │   │   ├── openaiTTS.ts           # OpenAI TTS with mobile unlock
    │   │   ├── speechInput.ts         # Web Speech API wrapper
    │   │   └── auth.ts                # Auth with session persistence
    │   └── data/
    │       ├── beliefSystems.ts       # 14 beliefs with metadata
    │       └── translations.ts        # i18n (15+ languages)
    │
    └── worker/
        ├── index.ts                   # Cloudflare Worker
        └── wrangler.toml              # Worker config with KV binding
```

## User Flow

1. **Welcome Screen** → User taps BEGIN
2. **Belief Selector** → User picks from 14 belief systems
3. **Auth Screen** → Email + password (remember me toggle)
4. **Conversation Screen**:
   - God greets user (text appears, then voice speaks)
   - User taps mic OR types message
   - Claude streams response token by token
   - When complete → OpenAI TTS speaks the response
   - User can continue conversation

**Key principle:** Text FIRST, voice SECOND. Never start TTS until streaming is 100% complete.

## 14 Belief Systems

### Religious Traditions
1. Protestant Christianity — God (Father), Jesus, Mary
2. Catholic Christianity — God, Jesus, Mary (Marian devotion)
3. Islam — Allah
4. Judaism — Adonai, Shekhinah
5. Hinduism — Brahman, Divine Mother
6. Buddhism — The Buddha, Kuan Yin
7. Mormonism (LDS) — God, Jesus
8. Sikhism — Waheguru

### Spiritual Paths
9. SBNR (Spiritual But Not Religious) — The Universe, Source Energy
10. Taoism — The Tao, Divine Feminine
11. Pantheism — The Earth, Gaia

### Philosophical Frameworks
12. Science & Reason — The Cosmos
13. Agnosticism — Wisdom, Inner Voice
14. Atheism/Stoicism — Reason, Wisdom

## Character System

Each belief system supports multiple character voices:

| Character | Voice | Available For |
|-----------|-------|---------------|
| God/Primary | Onyx (masculine) | All beliefs |
| Jesus | Ash (warm) | Christian beliefs only |
| Mary/Divine Feminine | Coral (feminine) | All beliefs (belief-specific identity) |

The worker modifies the system prompt based on character selection:
- Jesus speaks AS Jesus (first person), not as God talking about Jesus
- Mary/Divine Feminine adapts to each tradition (Shekhinah, Kuan Yin, Gaia, etc.)

## Conversation State Machine

```typescript
type ConversationState =
  | 'idle'        // Waiting for user input
  | 'listening'   // Mic is active
  | 'sending'     // Waiting for Claude (thinking dots)
  | 'streaming'   // Text appearing token by token
  | 'speaking';   // TTS playing
```

## Cloudflare Worker Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/` | POST | Claude chat (streaming SSE) |
| `/tts` | POST | OpenAI TTS audio generation |
| `/daily-topic` | GET | Get today's article topic + titles |
| `/topic-history` | GET | View covered/remaining topics |
| `/reset-topics` | POST | Reset topic cycle (admin) |

### Worker Environment Variables
- `ANTHROPIC_API_KEY` — Claude API key (secret)
- `OPENAI_API_KEY` — OpenAI API key (secret)
- `ARTICLES` — KV namespace binding for topic history

## TTS Configuration

```typescript
// OpenAI TTS voices
const TTS_CHARACTERS = {
  god: { voice: 'onyx', instructions: 'Speak with deep warmth and authority...' },
  jesus: { voice: 'ash', instructions: 'Speak with gentle warmth and compassion...' },
  mary: { voice: 'coral', instructions: 'Speak with nurturing maternal warmth...' },
};

// Audio format: opus (faster than mp3)
// Max text: 1500 chars (~30 seconds)
```

### Mobile Audio Strategy
iOS Safari requires `audio.play()` in the same call stack as user gesture. Solution:
1. Create ONE persistent Audio element
2. On ANY tap, play silent audio to "unlock" it
3. Reuse same element for all TTS playback
4. Multiple unlock points: container tap, buttons, chevron

## Smart Topic Selection

Daily article generation picks topics intelligently:
- 50 topics cycle through then reset
- Heavy topics (death, grief, suffering) never back-to-back
- After heavy topic → next day picks uplifting/practical topic

```javascript
const HEAVY_TOPICS = ['death', 'suffering', 'grief', 'loss', 'betrayal', 
                      'addiction', 'shame', 'guilt', 'enemies', 'sacrifice'];
```

## Design System

### Colors
- **Primary Gold:** #d4af37
- **Background:** #030308 (deep void black)
- **Text Primary:** rgba(255, 248, 240, 0.95)

### Typography
- **Divine text:** Cormorant Garamond (300 weight)
- **UI text:** Outfit (200-600 weights)

### Desktop vs Mobile Layout
- **Divine messages:**
  - Mobile: max-width 85%, font 1.15-1.5rem, line-height 1.8
  - Desktop: max-width 65%, font 1.3-1.8rem, line-height 1.9, centered
- **User messages:**
  - Mobile: max-width 85%, right-aligned
  - Desktop: max-width 50%, right margin 10%

## Auth System

- Email + password (minimum 8 characters)
- Disposable email domains blocked
- "Remember me" toggle:
  - ON → localStorage (persists across browser sessions)
  - OFF → sessionStorage (cleared when browser closes)
- Rate limits: 50 msgs/hour, 500 char max input

## Safety Guardrails (Non-Negotiable)

1. Mental health crisis → 988 Suicide & Crisis Lifeline
2. Medical emergency → 911
3. Abuse → National Domestic Violence Hotline 1-800-799-7233
4. Never claim to be literally God
5. Never encourage stopping medication or therapy
6. Never make specific prophecies
7. Never be dismissive of other religions
8. Always respect user autonomy

## Monetization

| Tier | Price | Features |
|------|-------|----------|
| Free (Seeker) | $0 | 3 messages total |
| Believer | $4.99/mo | Unlimited conversations |
| Devoted | $9.99/mo | + content library, priority |

## Commands

```bash
# Frontend (in /aimighty)
npm run dev          # Local dev server
npm run build        # Production build

# Worker (in /aimighty/worker)
npx wrangler dev     # Local worker
npx wrangler deploy  # Deploy to Cloudflare
```

## Recent Changes (April 14, 2026)

### Voice System
- Migrated from browser SpeechSynthesis to OpenAI gpt-4o-mini-tts
- Added character system (God/Jesus/Mary) with belief-specific identities
- Fixed mobile audio with persistent audio element strategy
- Opus audio format for faster loading

### Worker Enhancements
- Added belief ID normalization (earth→pantheism, spiritual→sbnr, etc.)
- Added character personality system to system prompts
- Added smart topic selection with KV storage
- Added /daily-topic, /topic-history, /reset-topics endpoints

### UI Improvements
- Fixed desktop text centering (God's messages centered, larger font)
- Added "Remember me" toggle to auth
- Fixed BEGIN button positioning (80px from bottom)
- Added controls auto-hide for clean screenshot mode

## When Helping With This Project

1. **Read belief system details** before modifying prompts
2. **Follow safety guardrails** — non-negotiable
3. **Test voice flow** — responses must sound natural spoken aloud
4. **Keep responses warm** — spiritual guidance, not information retrieval
5. **Respect all traditions** — never favor one belief over another
6. **Mobile first** — test on iOS Safari and Android Chrome
7. **Image positioning** — use `background-position: top center` for divine figures
