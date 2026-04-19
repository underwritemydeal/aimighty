# /optimize — Performance Report

**Project:** AImighty · **Audit:** 2026-04-16 · **Launch:** 2026-04-19
**Measured on the built `dist/` bundle + source inspection. No live Lighthouse run; targets and estimates below.**

---

## Measured Baselines

| Asset | Size | Notes |
|---|---|---|
| **Built JS bundle** (`index-*.js`) | **436 KB min / 127 KB gzip** | Single file. React 19 + app. Three.js tree-shaken (0 matches in bundle ✓). |
| **Built CSS bundle** (`index-*.css`) | **26 KB min** | Tailwind 4 + `index.css`. Reasonable. |
| **`/public/images/` total** | **11 MB** | 14 beliefs × 2 formats (desktop 16:9 + mobile 9:16) + 2 heroes + 2 mashups. |
| **Hero desktop JPG** | 205 KB | LCP candidate on desktop. |
| **Hero mobile JPG** | 281 KB | LCP candidate on mobile — *slightly* heavy for mobile. |
| **Largest belief image** | 597 KB (`hinduism.jpg`, mobile 9:16) | Outlier; others 270–400 KB. |
| **Average belief `-desktop.jpg`** | ~290 KB | Acceptable as-is; can be cut ~40% with WebP. |
| **Average belief mobile portrait** | ~335 KB | Heavier; several 400–600 KB. |

**Estimated Core Web Vitals (no Lighthouse run — predicted):**

| Metric | Target | Predicted | Confidence |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5 s | 2.2–3.0 s on 4G, 1.2–1.8 s on fast cable | Medium |
| **INP** (Interaction to Next Paint) | < 200 ms | 250–500 ms during streaming on mid-tier Android | Medium-high — streaming is inline-style heavy |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Likely fine (~0.05) — `aspectRatio: 16/9` used on belief cards | High |
| **FCP** | < 1.8 s | ~1.0–1.5 s on 4G | Medium |
| **TTI** | < 3.8 s | ~2.5–3.5 s on 4G | Medium |

LCP risk is moderate (Google Fonts render-block + JPG hero with no `preload`/`fetchpriority`). INP is the one metric I'd watch closely — see runtime section.

---

## Priority Issues

### P0 — Do before launch (actual user-visible wins)

#### [P0] Unused Three.js stack still declared in `package.json`
- **Where:** `package.json:13-18` — `@react-three/drei`, `@react-three/fiber`, `@react-three/postprocessing`, `three`
- **Bundle impact:** Tree-shaken from the built JS (confirmed — 0 matches in `dist/assets/*.js`). But they remain in `package-lock.json` and `node_modules`, slowing `npm install` and bloating deploy caches. More importantly, leaving them in deps means any accidental import from a future feature would silently re-introduce ~500 KB.
- **Fix:** `npm uninstall @react-three/drei @react-three/fiber @react-three/postprocessing three`. Commit the lockfile change.
- **Impact:** Faster CI installs, smaller `node_modules`, no latent risk. Zero visible cost.

#### [P0] Inter font is loaded but unused
- **Where:** `index.html:16`
  ```html
  family=Outfit:wght@100;200;300;400;500;600&family=Inter:wght@300;400;500&family=Cormorant+Garamond:...
  ```
- **Impact:** Three weights of Inter (~25–30 KB compressed, potentially blocking if `display=swap` isn't honored by a network stall) are downloaded on every first-paint. `designSystem.ts` only references Outfit + Cormorant Garamond.
- **Fix:** Drop `&family=Inter:wght@300;400;500` from the URL. One character edit.
- **LCP impact:** Measurable — fewer CSS bytes parsed before first paint, one fewer font file to fetch.

#### [P0] Hero image is not preloaded and has no `fetchpriority`
- **Where:** `LandingPage.tsx:235-250` — hero bg image is set via inline `style.backgroundImage`
- **Impact:** The hero JPG is the LCP candidate on both desktop and mobile, but because it's a CSS `background-image` (not an `<img>`), browsers can't discover it until CSS parses. On 4G this adds 300–600 ms to LCP.
- **Fix 1 (simple):** Add `<link rel="preload" as="image" href="/images/hero-mobile.jpg" media="(max-width: 767px)">` and the desktop twin in `index.html`.
- **Fix 2 (better):** Switch the hero from CSS `background-image` to an `<img>` element with `fetchpriority="high"` behind the content. You get the LCP boost *and* discoverability.
- **LCP impact:** 200–500 ms on mobile 4G. Meaningful.

#### [P0] Mobile belief portraits average 335 KB with outliers at 600 KB
- **Where:** `public/images/avatars/*.jpg` (the non-`-desktop.jpg` variants — mobile 9:16)
- **Impact:** `ConversationScreen.tsx` loads the mobile portrait as the full-screen background on iOS. A mobile user on 4G pulling `hinduism.jpg` at 597 KB spends ~1.5 s just on that image before the conversation UI feels settled.
- **Fix:** Re-compress to 75–80 % quality (Midjourney output usually ships at 95 %+). Expected savings: 35–50 %. The images are background scrims under a dark overlay — visual degradation will be imperceptible.
  ```bash
  # Example — use cwebp / mozjpeg / squoosh CLI
  npx @squoosh/cli --mozjpeg '{"quality":78}' public/images/avatars/*.jpg
  ```
- **Impact:** Easily shaves 4–5 MB off the image payload across the app, and reduces ConversationScreen TTR after belief switch by 500–1000 ms on 4G.

#### [P0] No route-level code splitting — single 436 KB JS bundle
- **Where:** `src/App.tsx` — all 11 screens statically imported at the top
- **Impact:** First-paint path downloads the code for every route, including `PrivacyScreen.tsx` (623 lines), `TermsScreen.tsx` (703 lines), `AboutScreen.tsx` (194), `ArticlePage.tsx` (344), `PaywallScreen.tsx` (408) — none of which are needed for first paint on `/`.
- **Fix:**
  ```tsx
  const PrivacyScreen = lazy(() => import('./components/screens/PrivacyScreen'));
  const TermsScreen = lazy(() => import('./components/screens/TermsScreen'));
  const AboutScreen = lazy(() => import('./components/screens/AboutScreen'));
  const ArticlePage = lazy(() => import('./components/screens/ArticlePage'));
  const PaywallScreen = lazy(() => import('./components/screens/PaywallScreen'));
  ```
  Wrap route switch in `<Suspense fallback={<div />}>` (keep fallback minimal — a flash of blank is better than a bouncy skeleton for this aesthetic).
- **Impact:** Landing-page initial JS likely drops from 127 KB gzip to 70–85 KB gzip. FCP/LCP measurably faster on slow connections.

---

### P1 — Fix in the first week (biggest ROI after P0)

#### [P1] ConversationScreen re-renders the entire tree on every streaming token
- **Where:** `ConversationScreen.tsx:1070-1140` — stream callbacks call `setDisplayMessages(...)` on each token
- **Impact:** A typical 180-token response triggers 180 parent re-renders. Children are `memo`-wrapped (good), but the message list itself reconciles. On a Pixel 4a or similar mid-tier Android, this pushes INP into the 300–500 ms band during streaming. Feels laggy when typing the next message.
- **Fix:**
  1. Batch token updates into `requestAnimationFrame` — accumulate incoming tokens in a ref, flush to state on `rAF`. Cuts the render rate from token-frequency to frame-frequency (~60 Hz instead of 150–300 Hz).
  2. Or: keep a single `currentStreamingMessage` in a separate state / ref, render it via a dedicated sibling component, and only commit to `displayMessages` when the stream ends.
- **INP impact:** 40–60% reduction during streaming. This is the single largest runtime win available.

#### [P1] Inline style objects re-created every render throughout ConversationScreen
- **Where:** Per the earlier audit: dozens of `style={{ ... }}` objects in `ConversationScreen.tsx` (e.g., L1502–1514). Also widely in `LandingPage.tsx`, `WelcomeScreen.tsx`.
- **Impact:** Each render allocates a new object → React can't bail out of prop-equality checks on leaf DOM elements → subtree re-reconciles. On a 50-message conversation during stream, this is meaningful GC pressure.
- **Fix:** Extract stable styles to module-scope constants; use `useMemo` for styles that depend on `isMobile` / `tier`. Example pattern:
  ```tsx
  const BUBBLE_STYLE = { /* static */ } as const;
  const bubbleStyle = useMemo(() => ({ ...BUBBLE_STYLE, maxWidth: isMobile ? '90%' : '65%' }), [isMobile]);
  ```
- **Impact:** INP improves 10–20% further; less memory churn during long conversations.

#### [P1] setInterval TTS drain watcher at 400 ms polls for up to 60 s after component unmount
- **Where:** `ConversationScreen.tsx:1109-1120` (also flagged in `/harden` as P0-1-adjacent and `/audit` as P1)
- **Impact:** Memory leak + CPU wake-ups on every mobile device. If a user rapidly unmounts/remounts (belief switches, backgrounding and returning), multiple intervals stack.
- **Fix:** Hold the interval id in a `useRef`, clear in the `useEffect` cleanup return. Same for the 60 s safety `setTimeout`.

#### [P1] `backdrop-filter: blur(20px)` stacks cause jank on iPhone 11 and earlier
- **Where:** `ConversationScreen.tsx:243, 437, 444, 550-551`; `AuthScreen.tsx:129, 173-174`; `BeliefSelector.tsx:243`; `WelcomeScreen.tsx:65`
- **Impact:** Safari composites each blur as a separate layer. Three stacked = three full-screen-sized offscreen textures. Scroll FPS drops to 30–40 on older iOS devices. Observable, not catastrophic.
- **Fix:** Demote the outermost modal backdrop to a solid `rgba(3, 3, 8, 0.92)` (token `colors.voidOverlay` already exists). Reserve blur for the single frosted-card layer closest to content. Add `-webkit-backdrop-filter` fallback if it's missing anywhere.
- **Impact:** Smoother scrolling on iPhone 8–11 generation; lower GPU power draw (battery).

#### [P1] Outfit font ships 6 weights (100/200/300/400/500/600); 3 are referenced
- **Where:** `index.html:16` and `designSystem.ts:43-50`
- **Impact:** Each weight is a separate file (~10–15 KB compressed). `fontWeights` exports `thin(200) light(300) regular(400) medium(500) semibold(600) bold(700)` but the design only uses light, medium, semibold in practice (Outfit is UI font). Shipping thin(100) and ultra-light(200) costs maybe 25 KB for no gain.
- **Fix:** Narrow to `wght@300;400;500;600`. Inspect actual usage; drop unused weights.
- **Impact:** ~15–25 KB less web-font payload.

#### [P1] CLS risk on inline SVG icons without explicit `width/height` attrs
- **Where:** Some icons specify `width="40" height="40"` (good), others rely on `currentColor` + CSS. Audit every SVG in `ConversationScreen.tsx:75-192`.
- **Impact:** During font swap, icon-adjacent text reflows can nudge layouts on slow connections.
- **Fix:** Every inline SVG: explicit `width`, `height`, and optionally `aria-hidden="true"` on decorative ones.
- **CLS impact:** Likely already < 0.1, but hardening before launch.

---

### P2 — Worth doing but not urgent

#### [P2] Hero image not served as WebP / AVIF
- **Where:** `/public/images/hero-{mobile,desktop}.jpg`
- **Fix:** Convert to `.webp` (or AVIF for the cutting edge). Use `<picture>` with JPG fallback. Or use Vercel's Image Optimization (`next/image`-style wrapper) via a CDN URL.
  ```html
  <picture>
    <source type="image/avif" srcset="/images/hero-mobile.avif" media="(max-width: 767px)">
    <source type="image/webp" srcset="/images/hero-mobile.webp" media="(max-width: 767px)">
    <img src="/images/hero-mobile.jpg" alt="" fetchpriority="high">
  </picture>
  ```
- **Impact:** 30–50% image-byte reduction for browsers that support modern formats (which is ~95% of traffic).

#### [P2] Belief cards load 14 JPGs eagerly-ish
- **Where:** `LandingPage.tsx:529-542` — belief cards have `loading="lazy"` ✓. ConversationScreen does not lazy-load its full-screen background on mount, which is correct (LCP candidate there).
- **Status:** Landing page is correctly lazy. No fix here.
- **Nit:** Consider `decoding="async"` on the belief card `<img>` to allow off-main-thread decode on mobile.

#### [P2] Google Fonts is not self-hosted
- **Where:** `index.html:14-16`
- **Impact:** Third-party DNS + TLS + possibly regional CDN mismatch. `preconnect` helps (both `fonts.googleapis.com` and `fonts.gstatic.com` are preconnected — good). But self-hosted via Vercel would be one fewer DNS handshake and would eliminate the cross-origin request.
- **Fix:** Run a tool like `google-webfonts-helper` or `fontsource`, drop into `/public/fonts/` and adjust CSS. About 30 minutes of work.
- **LCP impact:** ~100–200 ms on cold cache, especially on mobile.

#### [P2] No explicit `content-visibility: auto` on offscreen sections
- **Where:** Long LandingPage (hero + how-it-works + 14 belief cards + pricing + email + FAQ + final CTA + footer = ~7 viewports)
- **Impact:** Browser renders everything, even what's 5 viewports below. On long landing pages, `content-visibility: auto` skips paint for offscreen content.
- **Fix:** Add to each section except the hero:
  ```css
  .landing-section { content-visibility: auto; contain-intrinsic-size: auto 900px; }
  ```
- **Impact:** 100–200 ms FCP/LCP win, smoother scroll, less initial paint cost.

#### [P2] No service worker / offline shell
- **Where:** `public/manifest.json` exists but no `sw.js` / Workbox / Vite-PWA
- **Impact:** Every load is a network load. For a meditative/spiritual app, supporting "offline" (cache last daily prayer, cache last conversation) would also be a UX win — but this is outside launch scope.
- **Fix:** Post-launch, add `vite-plugin-pwa` with a minimal cache strategy: cache-first for `/images/`, network-first for `/api/*` and HTML.

#### [P2] Streaming render path allocates new arrays on every token
- **Where:** `ConversationScreen.tsx` — `setDisplayMessages((prev) => prev.map(...))` inside hot stream loop
- **Impact:** Full `.map()` allocation per token for a list that may be 30+ items long. GC churn during streaming.
- **Fix:** Use a ref-based streaming buffer (as described in P1 #1 above). Only publish to `displayMessages` on complete sentences or at `rAF` boundaries.

#### [P2] `resize` listener on every screen, not throttled
- **Where:** `LandingPage.tsx:121-125`, `WelcomeScreen.tsx:160-166`, `ConversationScreen.tsx` — each registers `addEventListener('resize', check)` and calls `setState` on every fire
- **Impact:** iPad rotation / Safari URL-bar collapse triggers ~30 resize events in ~200 ms. Each re-renders the screen.
- **Fix:** Debounce at 100 ms, or use `matchMedia` + one-time listener keyed to the `768` breakpoint.
  ```ts
  const mql = window.matchMedia('(max-width: 767px)');
  const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mql.addEventListener('change', onChange);
  ```
- **Impact:** Cleaner render profile during rotation; smaller INP tail.

#### [P2] Article page fetches daily article + (likely) daily content serially
- **Where:** `ArticlePage.tsx:43-48`
- **Impact:** Sequential waterfalls. Article fetch → render → another fetch.
- **Fix:** `Promise.all([...])` where possible. Verify by reading the article-page flow.

#### [P2] No `rel="preload"` on primary fonts
- **Where:** `index.html` — has preconnect but not preload
- **Fix:**
  ```html
  <link rel="preload" as="font" type="font/woff2" href="...Cormorant Garamond 400..." crossorigin>
  ```
  Preload the one or two weights used in the hero (Cormorant 300 italic for tagline, Outfit 500 for the CTA).
- **Impact:** 50–150 ms faster text paint on cold load.

---

### P3 — Micro-polish

- **[P3]** `will-change: transform, opacity` on the scroll chevron (LandingPage) — one-time hint during the pulse animation; remove once animation completes. Saves a tiny paint cost.
- **[P3]** `decoding="async"` on all `<img>` elements (not just belief cards). Free perf win on image-heavy pages.
- **[P3]** Tailwind `content-visibility: auto` utility for the 14-belief grid when the section scrolls out of view.
- **[P3]** Vercel Analytics + Web Vitals — one-line enable (`import { inject } from '@vercel/analytics'`). Not a speed fix but required to *measure* whether these optimizations work in production. **Without this, you're optimizing blind.**
- **[P3]** Prefetch `/app` route (`<link rel="prefetch" href="/app">`) once the user scrolls past the hero — primes the SPA bundle before they click Begin.
- **[P3]** `Cache-Control: public, immutable, max-age=31536000` on `/images/*` and `/assets/*-[hash].*` — verify `vercel.json` sets this; hashed assets should be immutable.
- **[P3]** PWA install prompt — the `manifest.json` exists; consider shipping app icons and a legitimate install banner for the demonstrated value (daily ritual app).

---

## Patterns & Systemic Issues

1. **All performance wins live in three files.** The top 20% fix surface is `index.html` (preload, unused Inter, font weights), `LandingPage.tsx` (hero image, image formats), and `ConversationScreen.tsx` (streaming render, inline styles, setInterval). Nothing else is a hotspot.

2. **Image payload is the biggest lever.** 11 MB of source JPGs compress down to ~5–6 MB with WebP + 78%-quality recompression. That is the single largest bytes-per-engineer-hour win.

3. **Runtime perf is dominated by streaming.** The landing page is fine. The conversation screen under streaming is where mid-tier Android will feel laggy. Batching tokens into `rAF` is the one change that matters here.

4. **You're flying blind without RUM.** Vercel Web Analytics is one line. Without it, every number in this report stays estimated. **Add it before launch** — not to optimize with, but to know whether day-one traffic hits the targets.

5. **No premature optimization.** React 19 + Vite 8 + Tailwind 4 is a modern, well-behaved stack. The build output is clean (Three.js tree-shaken correctly, no obvious dead code). The problems are in content/assets, not in tooling.

---

## What's performing well

- **Tree-shaking works.** Three.js is in `package.json` but 0 matches in the built bundle. Vite + Rollup are doing their job.
- **Single JS bundle at 127 KB gzip** is not bad for a product with this many screens. Not industry-best (<100 KB would be), but respectable.
- **Belief cards use `aspectRatio: 16/9`** — CLS protection in place.
- **Belief cards use `loading="lazy"`** — correctly deferred.
- **Font `display=swap`** is set — correct strategy for FOUT-over-FOIT.
- **Google Fonts preconnect** is present for both origins with `crossorigin` — best-practice setup.
- **`manifest.json` + theme-color + apple-mobile-web-app-capable meta** — PWA-ready foundation, even without an SW.
- **`viewport-fit=cover` + `100dvh`** is honored — no forced-reflow on iOS URL bar collapse.
- **CSS is tiny** (26 KB minified) — Tailwind 4 is pruning well.
- **Memoized child components** in `ConversationScreen.tsx` (CharacterSelector, ThinkingDots, icon components) — good React hygiene.

---

## Recommended Actions

Ordered by ROI per hour of work:

1. **[P0, 5 min] `/optimize`** — Drop Inter from the Google Fonts URL. One character edit in `index.html`.
2. **[P0, 5 min] `/optimize`** — `npm uninstall` the Three.js stack.
3. **[P0, 10 min] `/optimize`** — Preload hero images (`<link rel="preload">` with media queries) in `index.html`.
4. **[P0, 30–60 min] `/optimize`** — Convert `/public/images/` to WebP at 78% quality. Keep JPG fallbacks. Use `<picture>` on hero; belief cards can go straight to WebP if you trust the browser floor.
5. **[P0, 60–90 min] `/optimize`** — Route-split `ArticlePage`, `PrivacyScreen`, `TermsScreen`, `AboutScreen`, `PaywallScreen` behind `React.lazy`.
6. **[P1, 60–90 min] `/optimize`** — Batch streaming token updates through `requestAnimationFrame` in `ConversationScreen.tsx`. Biggest INP win available.
7. **[P1, 30 min] `/harden`** — Fix the `setInterval` leak (also tracked in `/harden`).
8. **[P1, 45 min] `/optimize`** — De-stack `backdrop-filter` layers; swap outermost to `colors.voidOverlay`.
9. **[P1, 30 min] `/optimize`** — Extract stable inline styles to module-scope constants in `ConversationScreen.tsx`.
10. **[P2, 20 min] `/optimize`** — Narrow Outfit font weights to the ones actually used.
11. **[P2, 15 min] `/optimize`** — Add `content-visibility: auto` to LandingPage below-fold sections.
12. **[P2, 30 min] `/optimize`** — Self-host fonts (optional; nice to have).
13. **[P3, 2 min] `/optimize`** — Enable Vercel Web Analytics. **Required to validate any of the above in production.**
14. **[final] `/polish`** — Micro-wins (`decoding="async"`, `will-change` cleanup, cache headers audit).

---

> Report only — no fixes applied. Baselines above are measured from the built bundle and source; recommend a Lighthouse run on staging once P0 fixes land to get real numbers.
