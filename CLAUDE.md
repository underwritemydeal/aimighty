# CLAUDE.md — AImighty (aimighty.me)
## AI-Powered Spiritual Guidance Platform

---

## PROJECT OVERVIEW

AImighty is a PWA where users select their belief system and have a real-time voice conversation with a talking AI avatar representing their version of God (or the Universe, Reason, etc). The avatar speaks with lip-synced mouth movement. The user talks or types, the AI responds with voice and a moving face.

**Brand:** AImighty
**Domain:** aimighty.me
**Tagline:** "Every belief. One voice."
**Instagram:** @aimightyapp

---

## TECH STACK

### Frontend
- **React 18** with Vite (fast builds, modern tooling)
- **React Three Fiber** (@react-three/fiber + @react-three/drei) for 3D avatar rendering
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **PWA** — service worker for installability, offline asset caching

### Avatar & Lip Sync
- **Three.js via React Three Fiber** — renders the 3D avatar on the user's device (zero API cost)
- **Azure Neural TTS** — text-to-speech that outputs viseme data alongside audio
  - Visemes tell us exactly which mouth shape at which millisecond
  - MVP FALLBACK: If Azure isn't set up yet, use browser's SpeechSynthesis API as placeholder
- **Morph targets / blend shapes** on the 3D model driven by viseme data
- **Idle animations** — breathing, blinking, subtle head movement when not speaking

### AI Brain
- **Claude API** (claude-sonnet-4-20250514) via Cloudflare Worker proxy
- **Streaming enabled** (SSE) — response streams sentence by sentence
- **System prompts** per belief system (already written for Protestant Christianity and Science & Reason)
- **Conversation history** — send last 20 message pairs for context continuity

### Voice Input (User's voice)
- **Web Speech API** (SpeechRecognition) — free, built into browser
- Continuous recognition with interim results
- Fallback: text input for browsers that don't support it

### Backend / Infrastructure
- **Cloudflare Worker** — proxies Claude API calls, handles CORS, rate limiting
- **Vercel** — hosts the PWA, auto-deploy from GitHub push
- **Supabase** — user auth, conversation history, user preferences (Phase 2)
- **Stripe** — subscription payments (Phase 2)

### GitHub
- Repo name: `aimighty` (or `aimighty-app`)
- Auto-deploy to Vercel on push to main

---

## PROJECT STRUCTURE

```
aimighty/
├── public/
│   ├── models/           # 3D avatar GLTF/GLB files
│   ├── manifest.json     # PWA manifest
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css          # Tailwind base
│   │
│   ├── components/
│   │   ├── screens/
│   │   │   ├── WelcomeScreen.tsx       # Landing / intro
│   │   │   ├── BeliefSelector.tsx      # Choose your belief system
│   │   │   └── ConversationScreen.tsx  # Main conversation view
│   │   │
│   │   ├── avatar/
│   │   │   ├── AvatarScene.tsx         # Three.js canvas + scene setup
│   │   │   ├── AvatarModel.tsx         # 3D model loader + morph targets
│   │   │   ├── LipSync.tsx             # Viseme → morph target mapping
│   │   │   ├── IdleAnimations.tsx      # Breathing, blinking, micro-movements
│   │   │   └── BackgroundEffects.tsx   # Particles, glow, ambient atmosphere
│   │   │
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx       # Individual message display
│   │   │   ├── ChatTranscript.tsx      # Scrollable conversation history
│   │   │   ├── VoiceInput.tsx          # Mic button + Web Speech API
│   │   │   └── TextInput.tsx           # Fallback text input
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── CaptionOverlay.tsx      # Subtitles as God speaks
│   │
│   ├── services/
│   │   ├── claudeApi.ts        # Streaming Claude API calls via Worker
│   │   ├── ttsService.ts       # Azure TTS (or SpeechSynthesis fallback)
│   │   ├── speechInput.ts      # Web Speech API wrapper
│   │   └── visemeMapper.ts     # Azure viseme IDs → morph target names
│   │
│   ├── data/
│   │   ├── beliefSystems.ts    # Belief system metadata (name, icon, description, theme colors)
│   │   └── systemPrompts.ts    # Full system prompts per belief system
│   │
│   ├── hooks/
│   │   ├── useConversation.ts  # Manages message history + Claude API calls
│   │   ├── useLipSync.ts       # Manages viseme → morph target updates
│   │   ├── useSpeechInput.ts   # Web Speech API hook
│   │   └── useTTS.ts           # Text-to-speech hook with audio playback
│   │
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   │
│   └── utils/
│       ├── audioUtils.ts       # Web Audio API helpers
│       └── constants.ts        # App-wide constants
│
├── worker/
│   └── index.ts               # Cloudflare Worker — Claude API proxy
│
├── CLAUDE.md                   # This file
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json
```

---

## DESIGN SYSTEM

### Brand Colors
- **Primary:** Deep indigo/navy — #1a1a2e (dark, cosmic, universal)
- **Secondary:** Warm gold — #d4af37 (divine, premium)
- **Accent:** Soft white/cream — #f5f0e8
- **Background:** Near-black gradient — #0a0a1a to #1a1a2e
- **Text:** White #ffffff for primary, #a0a0b0 for secondary
- **Per-belief-system accent colors:**
  - Protestant: Gold #d4af37
  - Catholic: Deep red #8b0000
  - Islam: Emerald green #006400
  - SBNR: Purple/violet #7b2d8e
  - Science & Reason: Cosmic blue #1e90ff

### Typography
- **Headings:** Inter or Plus Jakarta Sans (clean, modern, premium)
- **Body:** Inter (highly readable)
- **God's speech captions:** Slightly larger, warm gold color, gentle fade-in animation

### Visual Style
- Dark, cosmic, atmospheric — NOT churchy, NOT techy
- Premium and minimal — think Calm app meets Apple
- Subtle particle effects and ambient glow
- The avatar is the centerpiece — everything else is secondary
- Mobile-first design — thumb-friendly tap targets

### Avatar Visual Themes (per belief system)
- **Protestant/Catholic:** Warm golden light, soft rays emanating outward
- **Islam:** Geometric light patterns, emerald and gold tones
- **SBNR:** Purple/violet aura, flowing energy particles
- **Science & Reason:** Deep blue cosmic backdrop, stars, nebula particles

---

## BELIEF SYSTEMS (Launch Set)

```typescript
const beliefSystems = [
  {
    id: 'protestant',
    name: 'Christianity',
    subtitle: 'Protestant',
    icon: '✝️',  // Replace with custom SVG
    description: 'Connect with the God of the Bible',
    themeColor: '#d4af37',
    particleColor: '#ffd700',
    backgroundGradient: ['#1a1a0a', '#2a2000'],
  },
  {
    id: 'catholic',
    name: 'Catholicism',
    subtitle: 'Catholic',
    icon: '⛪',
    description: 'Speak with the Holy Father',
    themeColor: '#8b0000',
    particleColor: '#ff4444',
    backgroundGradient: ['#1a0a0a', '#200000'],
  },
  {
    id: 'islam',
    name: 'Islam',
    subtitle: 'Muslim',
    icon: '☪️',
    description: 'Connect with Allah, the Most Merciful',
    themeColor: '#006400',
    particleColor: '#00ff88',
    backgroundGradient: ['#0a1a0a', '#002000'],
  },
  {
    id: 'sbnr',
    name: 'Spiritual',
    subtitle: 'Spiritual But Not Religious',
    icon: '✨',
    description: 'Connect with the Universe, Source, and Spirit',
    themeColor: '#7b2d8e',
    particleColor: '#cc77ff',
    backgroundGradient: ['#1a0a2a', '#200040'],
  },
  {
    id: 'science',
    name: 'Science & Reason',
    subtitle: 'The Universe',
    icon: '🔬',
    description: 'Explore meaning through science and wonder',
    themeColor: '#1e90ff',
    particleColor: '#4488ff',
    backgroundGradient: ['#0a0a2a', '#000040'],
  },
];
```

---

## CONVERSATION FLOW (Technical)

```
1. User selects belief system → loads system prompt + visual theme
2. God greets user (auto-play first message TTS + lip sync)
3. User taps mic button → Web Speech API listens
4. User speaks → speech-to-text converts to text
5. Text displayed in chat + sent to Cloudflare Worker
6. Worker sends to Claude API (streaming)
7. Claude streams response sentence by sentence
8. Each sentence chunk:
   a. Displayed as caption text (fade in)
   b. Sent to TTS service → generates audio + viseme data
   c. Audio plays through Web Audio API
   d. Viseme data drives avatar morph targets (lip sync)
   e. Avatar mouth moves in sync with voice
9. When response finishes → avatar returns to idle animation
10. Mic button re-activates → user can respond
```

---

## STREAMING PIPELINE (Critical for low latency)

```
Claude API (SSE stream)
    ↓ sentence boundary detected (period, question mark, exclamation)
    ↓
TTS Service processes sentence
    ↓ returns audio buffer + viseme timeline
    ↓
Audio queue (sentences play back-to-back seamlessly)
    ↓ audio plays through Web Audio API
    ↓
Viseme scheduler reads timeline, updates morph targets at correct timestamps
    ↓
Avatar mouth moves in sync
```

**Key implementation detail:** Buffer the first sentence before starting playback. This prevents choppy starts. Once playback begins, subsequent sentences should be queued and ready.

---

## AZURE TTS VISEME MAPPING

Azure Neural TTS returns viseme IDs (0-21) with timestamps. Map these to morph target names on the 3D model:

```typescript
const AZURE_VISEME_TO_MORPH: Record<number, string> = {
  0: 'viseme_sil',    // Silence
  1: 'viseme_aa',     // æ, ə, ʌ
  2: 'viseme_aa',     // ɑ
  3: 'viseme_O',      // ɔ
  4: 'viseme_E',      // ɛ, ʊ
  5: 'viseme_E',      // ɝ
  6: 'viseme_I',      // j, ɪ, i
  7: 'viseme_U',      // w, u
  8: 'viseme_O',      // o
  9: 'viseme_aa',     // aʊ
  10: 'viseme_O',     // ɔɪ
  11: 'viseme_aa',    // aɪ
  12: 'viseme_kk',    // h
  13: 'viseme_RR',    // ɹ
  14: 'viseme_nn',    // l
  15: 'viseme_SS',    // s, z
  16: 'viseme_CH',    // ʃ, dʒ, tʃ, ʒ
  17: 'viseme_TH',    // ð, θ
  18: 'viseme_FF',    // f, v
  19: 'viseme_DD',    // d, t, n, ɾ
  20: 'viseme_kk',    // k, g, ŋ
  21: 'viseme_PP',    // p, b, m
};
```

---

## MVP vs PHASE 2 SCOPE

### TONIGHT (MVP — Weeks 1 & 2):
- [x] React PWA scaffolded with Vite + Tailwind
- [x] Welcome screen → Belief selector → Conversation screen
- [x] 5 belief system cards with icons and theme colors
- [x] Cloudflare Worker proxying Claude API with streaming
- [x] Protestant + Science & Reason system prompts wired
- [x] Text input works end-to-end (type → Claude responds)
- [x] TTS plays God's response out loud (browser SpeechSynthesis for tonight, Azure upgrade later)
- [x] Web Speech API — user can talk instead of type
- [x] Three.js avatar scene — abstract glowing presence/face with ambient particles
- [x] Basic lip sync — audio amplitude drives mouth openness (upgrade to Azure visemes later)
- [x] Captions displayed as God speaks
- [x] Mobile responsive, PWA installable
- [x] Deployed to Vercel

### NOT TONIGHT (Phase 2):
- [ ] Azure Neural TTS with viseme data (upgrade from browser SpeechSynthesis)
- [ ] Full 3D avatar model with proper morph targets (commission from artist)
- [ ] Catholic, Islam, SBNR system prompts (use placeholder prompts tonight)
- [ ] Supabase auth + user accounts
- [ ] Conversation history persistence
- [ ] Stripe payments
- [ ] Custom cloned God voice
- [ ] Per-religion visual themes (particles, colors)
- [ ] Push notifications / daily wisdom

---

## IMPORTANT IMPLEMENTATION NOTES

### Avatar Strategy for Tonight
Since we don't have a custom 3D model with morph targets yet, build an ABSTRACT DIVINE PRESENCE:
- A luminous, glowing orb/sphere with soft pulsing light
- Particle system around it (floating light particles)
- The orb PULSES with the amplitude of the TTS audio (reacts to God's voice)
- Subtle color shifts based on the selected belief system
- This looks intentional and premium — NOT like a placeholder
- When we get the custom 3D face model later, we swap it in without changing any other code

### Audio-Reactive Orb (Tonight's "Avatar")
```
TTS audio plays
    ↓
Web Audio API AnalyserNode captures frequency data
    ↓
Amplitude (volume) → drives orb scale (pulses bigger when loud, smaller when quiet)
    ↓
Frequency bands → drive particle speed and glow intensity
    ↓
Result: A living, breathing, divine presence that reacts to its own voice
```

### Streaming Sentence Detection
Split Claude's streamed response at sentence boundaries:
- Period followed by space or end
- Question mark
- Exclamation mark
- BUT NOT periods in abbreviations (Dr., Mr., etc.)
- Buffer at least one full sentence before starting TTS

### Error Handling
- If Claude API fails: "I am still here. Please try speaking to me again."
- If TTS fails: Fall back to text-only with captions
- If mic access denied: Show text input prominently
- If WebGL not supported: Show a static image with pulsing CSS animation instead of Three.js

### Mobile Considerations
- Mic button must be LARGE and thumb-friendly (bottom center, at least 64px)
- Audio playback on iOS requires user interaction first (play a silent audio on first tap)
- Web Speech API works on mobile Chrome and Safari
- Three.js performance: keep polygon count low, limit particles to ~100 on mobile
- Test on iPhone Safari — it has quirks with audio context and WebGL

---

## CLOUDFLARE WORKER (Claude API Proxy)

```typescript
// worker/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { messages, beliefSystem } = await request.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        stream: true,
        system: getSystemPrompt(beliefSystem),
        messages: messages.slice(-40), // Last 20 exchanges (40 messages)
      }),
    });

    // Forward the stream to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  },
};
```

---

## COMMANDS & WORKFLOW

### Initial Setup
```bash
npm create vite@latest aimighty -- --template react-ts
cd aimighty
npm install
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing
npm install tailwindcss @tailwindcss/vite
```

### Development
```bash
npm run dev          # Local dev server
npm run build        # Production build
```

### Deploy
- Push to GitHub → Vercel auto-deploys
- Cloudflare Worker: `wrangler deploy` from worker/ directory

---

## QUALITY STANDARDS

- Every screen must look premium — dark, atmospheric, polished
- No placeholder-looking UI — even the MVP should feel like a real product
- Animations should be smooth (60fps) — use requestAnimationFrame, not setInterval
- Text should fade in smoothly, not pop
- The orb/avatar should ALWAYS be gently animating (never static)
- Loading states should feel intentional (soft pulse, not a spinner)
- Mobile must feel native — no janky scrolling, no tiny buttons
