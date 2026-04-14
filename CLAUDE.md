# CLAUDE.md — AImighty (aimighty.me)
## AI-Powered Spiritual Guidance Platform

---

## PROJECT OVERVIEW

AImighty is a PWA where users select their belief system and have a real-time voice conversation with an AI representing their version of God (or the Universe, Reason, etc). The user talks or types, the AI responds with voice and displays divine text.

**Brand:** AImighty
**Domain:** aimighty.me
**Tagline:** "Every belief. One voice."
**Instagram:** @aimightyapp

---

## TECH STACK

### Frontend
- **React 18** with Vite
- **TypeScript** for type safety
- **Tailwind CSS v4** for styling
- **PWA** — manifest.json for installability

### Visual Design
- **Midjourney AI-generated images** — Full-screen divine figure backgrounds per belief system
- **Glass morphism UI** — Frosted glass cards with backdrop blur
- **Cormorant Garamond** — Elegant serif font for God's spoken words
- **Outfit** — Clean sans-serif for UI elements

### AI Brain
- **Claude API** (claude-sonnet-4-20250514) via Cloudflare Worker proxy
- **Streaming enabled** (SSE) — response streams token by token
- **System prompts** per belief system
- **Conversation history** — maintains context

### Voice
- **TTS:** Browser SpeechSynthesis API (voice priority: Google UK Male, Daniel, Aaron)
- **STT:** Web Speech API (SpeechRecognition) — free, built into browser
- Fallback: text input for unsupported browsers

### Backend / Infrastructure
- **Cloudflare Worker** — proxies Claude API calls, handles CORS
- **Vercel** — hosts the PWA, auto-deploy from GitHub push

---

## PROJECT STRUCTURE

```
aimighty/
├── public/
│   ├── images/
│   │   └── avatars/           # Midjourney divine figure images
│   │       ├── protestant.jpg
│   │       ├── catholic.jpg
│   │       ├── islam.jpg
│   │       ├── judaism.jpg
│   │       ├── hinduism.jpg
│   │       ├── buddhism.jpg
│   │       ├── mormon.jpg
│   │       ├── sikhism.jpg
│   │       ├── sbnr.jpg
│   │       ├── taoism.jpg
│   │       ├── pantheism.jpg
│   │       ├── science.jpg
│   │       ├── agnosticism.jpg
│   │       ├── stoicism.jpg
│   │       ├── hero-mashup-desktop.jpg
│   │       └── hero-mashup-mobile.jpg
│   ├── manifest.json          # PWA manifest
│   └── favicon.svg            # Golden flame icon
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css              # Design system + Tailwind
│   │
│   ├── components/
│   │   └── screens/
│   │       ├── WelcomeScreen.tsx       # Landing with hero image
│   │       ├── BeliefSelector.tsx      # Choose belief system (14 options)
│   │       ├── ConversationScreen.tsx  # Main conversation view
│   │       ├── AuthScreen.tsx          # Login/signup
│   │       ├── PaywallScreen.tsx       # Premium upsell
│   │       ├── AboutScreen.tsx
│   │       ├── TermsScreen.tsx
│   │       └── PrivacyScreen.tsx
│   │
│   ├── services/
│   │   ├── claudeApi.ts        # Streaming Claude API calls
│   │   ├── ttsService.ts       # Browser SpeechSynthesis
│   │   ├── speechInput.ts      # Web Speech API wrapper
│   │   └── auth.ts             # Authentication service
│   │
│   ├── data/
│   │   ├── beliefSystems.ts    # 14 belief systems with metadata
│   │   ├── systemPrompts.ts    # System prompts per belief
│   │   └── translations.ts     # i18n support
│   │
│   └── types/
│       └── index.ts            # TypeScript interfaces
│
├── worker/
│   └── index.ts               # Cloudflare Worker
│
├── CLAUDE.md                   # This file
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## DESIGN SYSTEM

### Brand Colors
- **Primary Gold:** #d4af37 (divine, premium)
- **Background:** #030308 (deep void black)
- **Text Primary:** rgba(255, 248, 240, 0.95) (warm white)
- **Text Secondary:** rgba(255, 255, 255, 0.5)

### Per-Belief Accent Colors
| Belief | Color | Hex |
|--------|-------|-----|
| Protestant | Gold | #d4af37 |
| Catholic | Royal Blue | #4169E1 |
| Islam | Emerald | #00A86B |
| Judaism | Gold | #d4af37 |
| Hinduism | Saffron | #FF6B00 |
| Buddhism | Gold | #d4af37 |
| Mormon | Warm White | #F5F5DC |
| Sikhism | Deep Orange | #FF8C00 |
| SBNR | Purple | #9370DB |
| Taoism | Sage Green | #2E8B57 |
| Pantheism | Forest Green | #228B22 |
| Science | Steel Blue | #4682B4 |
| Agnosticism | Dark Gold | #B8860B |
| Stoicism | Steel Blue | #4682B4 |

### Typography
- **Divine text:** Cormorant Garamond (300 weight, 1.8 line-height)
- **UI text:** Outfit (200-600 weights)
- **Hero size:** clamp(2.5rem, 3.2rem + 4vw, 4rem)

### Visual Style
- Dark, cosmic, atmospheric
- Midjourney AI art as full-screen backgrounds
- Glass morphism cards (backdrop-filter: blur(20px))
- Gradient overlays for text readability
- Mobile-first design

---

## 14 BELIEF SYSTEMS

### Religious Traditions
1. Protestant Christianity
2. Catholic Christianity
3. Islam
4. Judaism
5. Hinduism
6. Buddhism
7. Latter-day Saints (Mormon)
8. Sikhism

### Spiritual Paths
9. Spiritual But Not Religious (SBNR)
10. Taoism
11. Pantheism

### Philosophical Frameworks
12. Science & Reason
13. Agnosticism
14. Stoicism/Atheism

Each has:
- Custom Midjourney avatar image
- Accent color for UI elements
- Unique greeting message
- System prompt defining voice and perspective

---

## CONVERSATION STATE MACHINE

```typescript
type ConversationState =
  | 'idle'        // Waiting for user input
  | 'listening'   // Mic is active
  | 'sending'     // Waiting for Claude (shows thinking dots)
  | 'streaming'   // Text appearing token by token
  | 'speaking';   // TTS playing
```

### Flow
1. User selects belief system → loads image + system prompt
2. God greets user (text appears FIRST, then TTS speaks)
3. User taps mic OR types message
4. Text sent to Claude API (streaming)
5. Response streams token by token (displayed live)
6. When streaming complete → TTS speaks the full response
7. When TTS finishes → return to idle state
8. Mic re-activates for next message

**Key principle:** Text FIRST, voice SECOND. Never start TTS until streaming is 100% complete.

---

## TTS CONFIGURATION

```typescript
// Voice priority (first available is used)
const VOICE_PRIORITY = [
  'Google UK English Male',
  'Daniel',
  'Aaron',
  'Microsoft David',
  'Alex',
];

// Voice settings
const VOICE_SETTINGS = {
  rate: 0.82,    // Slightly slower for gravitas
  pitch: 0.85,   // Slightly lower
};

// Dynamic timeout based on text length
const timeout = Math.max(15000, Math.min(text.length * 100, 120000));
```

---

## CSS CLASSES

### Glass Morphism
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}
```

### Divine Text
```css
.text-divine {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 300;
  line-height: 1.8;
  letter-spacing: 0.02em;
}
```

### Belief Cards
```css
.belief-card {
  background-size: cover;
  background-position: center top;  /* Show head/face */
  border-radius: 16px;
}
```

---

## COMMANDS

```bash
npm run dev          # Local dev server (localhost:5173)
npm run build        # Production build
```

---

## SAFETY GUARDRAILS (Non-Negotiable)

1. Mental health crisis → direct to 988 Suicide & Crisis Lifeline
2. Medical emergency → direct to 911
3. Abuse → direct to National Domestic Violence Hotline
4. Never claim to be literally God
5. Never encourage stopping medication or therapy
6. Never make specific prophecies
7. Never be dismissive of other religions
8. Always respect user autonomy

---

## RECENT CHANGES (April 2026)

### Visual Redesign
- Removed Three.js particle face avatar
- Added Midjourney AI-generated divine figure images
- Full-screen image backgrounds with gradient overlays
- Glass morphism UI throughout
- Cormorant Garamond font for divine text
- Golden flame favicon

### Technical Improvements
- Clean state machine for conversation flow
- Text-first, voice-second synchronization
- Improved TTS voice selection and timing
- PWA manifest with gold theme color
- Fixed CSS @import ordering for fonts

### Files Changed
- Deleted: ParticleFace.tsx, AvatarScene.tsx, LazyAvatarScene.tsx, NebulaBackground.tsx
- Added: public/images/avatars/*.jpg (16 Midjourney images)
- Added: public/manifest.json
- Updated: All screen components, index.css, favicon.svg
