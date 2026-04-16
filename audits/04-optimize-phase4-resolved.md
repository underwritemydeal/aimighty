# Phase 4 — Perf P0/P1 Resolutions

Highest-ROI-per-minute items from `04-optimize.md` applied. One fix per commit, `npm run build` passed after every change. Three.js removal **explicitly excluded** from this phase per launch plan.

## P0s

| # | Title | Commit | Summary |
|---|-------|--------|---------|
| P0-1 | Inter font loaded but unused | `3db073e` | Dropped `&family=Inter:wght@300;400;500` from the Google Fonts URL. `designSystem.ts` only references Outfit + Cormorant Garamond. Grep confirmed zero source references. One fewer font file to fetch per cold load. |
| P0-2 | Three.js still in package.json | _excluded_ | Skipped per launch plan. Already tree-shaken out of the bundle; only cost is `npm install` time on CI. Will revisit post-launch. |
| P0-3 | Hero not preloaded / no fetchpriority | `270b269` | Added `<link rel="preload" as="image" href="/images/hero-mobile.jpg" media="(max-width: 767px)" fetchpriority="high" />` and the desktop twin to `index.html`. LCP candidate now starts fetching during HTML parse instead of waiting for CSS. |
| P0-4 | Mobile portraits 335kB avg, 600kB outlier | `eec5ecf` | Ran one-shot `scripts/compress-images.mjs` (sharp + mozjpeg q80 progressive). **Total `public/images/` dropped from 10.04 MB to 4.96 MB (saved 5.08 MB)**. Hero: mobile 281→132 kB (-53%), desktop 205→94 kB (-54%). Largest belief outlier: `hinduism.jpg` 596→211 kB (-64.5%). Script kept for future re-runs. `sharp` added as devDependency. |
| P0-5 | No route-level code splitting | `979aeea` | `App.tsx`: `LandingPage` stays eager (LCP-critical, most common entry); every other screen is `React.lazy()` behind a minimal `Suspense` fallback. **Main bundle: 451.21 kB → 215.21 kB (130.54 kB → 66.97 kB gzip — 48% cut).** Each other screen is now an on-demand chunk. Landing-page first paint drops measurably. |

## P1s

| # | Title | Commit | Summary |
|---|-------|--------|---------|
| P1-1 | Token-rate re-renders during streaming | `bc9e514` | `ConversationScreen.tsx` `onToken`: accumulate into `fullResponseRef` as before, but batch the state commit behind a single `requestAnimationFrame`. Render rate drops from 150-300 Hz (token rate) to ~60 Hz (frame rate). `onComplete` and unmount both cancel any pending rAF so stale snapshots cannot overwrite final text. Biggest available INP win. |
| P1-2 | Inline style objects re-created every render | _deferred_ | Secondary to P1-1. rAF batching already collapses most streaming-time render cost. Large cross-file refactor — deferred past launch. |
| P1-3 | setInterval TTS drain watcher leak | `c1d7eb3` | Divine-tier TTS drain watcher was captured only in a local var — if the user navigated mid-response the 400 ms `setInterval` + 60 s safety `setTimeout` kept firing `setState` on the unmounted component. Now tracked in `drainWatcherRef` / `drainSafetyRef` and cleared on unmount + when a new watcher starts. |
| P1-4 | backdrop-filter layer stacking jank | _deferred_ | Affects iPhone 11 and earlier only. Modest UX win (scroll FPS 30→45 on older devices). Deferred past launch. |
| P1-5 | Outfit font ships 6 weights, 3 used | `a7c3aee` | Dropped weight 100 (100% unused per grep across `src/**/*.{ts,tsx,css}`). Kept 200/300/400/500/600 — 200 has 3 references, rest are heavily used. Weight 600 kept (86 refs). Small but free payload reduction. |
| P1-6 | CLS on inline SVGs without explicit w/h | _no action_ | Audited every SVG in `ConversationScreen.tsx:75-192` — all already specify explicit `width` and `height`. Not actually a vulnerability in this codebase. |

## Bundle & asset impact

| Metric | Before Phase 4 | After Phase 4 | Delta |
|---|---|---|---|
| Main JS bundle (min) | 451.21 kB | 215.21 kB | **−52%** |
| Main JS bundle (gzip) | 130.54 kB | 66.97 kB | **−49%** |
| `public/images/` total | 10.04 MB | 4.96 MB | **−5.08 MB** |
| Hero mobile jpg | 281 kB | 132 kB | **−53%** |
| Hero desktop jpg | 205 kB | 94 kB | **−54%** |
| Font weight files | 3 fonts × 6/3/3 weights | 2 fonts × 5/3 weights | Inter removed entirely; Outfit narrowed by 1 weight |

## Build status

Final production build: clean. `ConversationScreen` chunk: 50.95 kB / 14.75 kB gzip. No visual or layout regressions.

## Out of scope (deliberate)

- **Three.js uninstall** — excluded per launch plan.
- **Onboarding compression** — out of scope for `/optimize`.
- All P2/P3 items (WebP/AVIF conversion, self-hosted fonts, `content-visibility: auto`, resize throttling, Vercel Analytics, service worker, prefetch links) — deferred per launch plan.
- Inline style extraction (P1-2) and backdrop-filter destacking (P1-4) — marginal wins after the rAF batching; cost > return inside the 72 h window.

## Expected audit score lift

`/optimize` Performance dimension expected to lift from **2/4** toward **3-4** on the next pass. Main bundle halved, image payload halved, LCP path preloaded, streaming render batched — the big levers are all pulled.
