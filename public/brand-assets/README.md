# AImighty Brand Assets

Social launch · Sunday April 19, 2026.

## Palette — Champagne gold (muted, aged, Byzantine)

| Role              | Hex       | RGB              | Use                                        |
| ----------------- | --------- | ---------------- | ------------------------------------------ |
| `gold` (base)     | `#D4B882` | 212, 184, 130    | Primary gold — text, ring, accents         |
| `goldHi`          | `#E2C899` | 226, 200, 153    | Highlights, top of sheen gradient          |
| `goldLo`          | `#BFA067` | 191, 160, 103    | Shadows, bottom of sheen, dim details      |
| `goldCore`        | `#FFF5DC` | 255, 245, 220    | Warm-white core line on the halo           |
| `void`            | `#030308` | 3, 3, 8          | Primary black background                   |
| `voidSoft`        | `#0A0A12` | 10, 10, 18       | Secondary section bg (e.g. pricing)        |
| `textPrimary`     | `#F5F0E8` | 245, 240, 232    | Soft warm white — never pure `#FFFFFF`     |

Retired: `#D4AF37`, `#E8C84A`, `#B8962E` — these read as trophy/yellow gold. Do
not reintroduce. All rgba values previously using `(212, 175, 55, ...)` should
use `(212, 184, 130, ...)`.

## Typography

| Role           | Family                         | Weight   | Notes                                   |
| -------------- | ------------------------------ | -------- | --------------------------------------- |
| Display / logo | Cormorant Garamond             | 500, 600 | Serif · sacred · "AI" mark, headlines   |
| Sacred italic  | Cormorant Garamond italic      | 500      | Taglines ("Every belief. One voice.")   |
| Body / UI      | Outfit                         | 300-600  | Sans · secondary text, buttons, URLs    |

## Logo lockup

Two marks coexist:

1. **Symbol / logomark** (AI + halo) — standalone icon. Used for profile pics, favicons, video end cards, watermarks. File: `mark.svg` (embedded "AI" font, scales infinitely).
2. **Wordmark** — "AImighty" in Cormorant Garamond 500, "AI" in `gold`, "mighty" in `textPrimary`. Inline text for headers, nav, legal.

Halo design:
- Tilted disc (17° z-rotation, ry/rx ≈ 0.52 — reads as perspective, not flat saucer)
- Positioned behind-and-above the AI letters (lower rim occluded)
- Asymmetric bloom: visible back rim carries the glow; hidden front rim stays thin

## Asset inventory

All files in this folder. Production URLs once merged: `https://aimightyme.com/brand-assets/<filename>`.

| File                              | Size            | Purpose                              |
| --------------------------------- | --------------- | ------------------------------------ |
| `mark.svg`                        | vector          | Master logomark — scale for anything |
| `profile-1080.png`                | 1080 × 1080     | X / Instagram / LinkedIn avatar      |
| `social-banner-1500x500.png`      | 1500 × 500      | X header / LinkedIn banner           |
| `launch-vertical-1080x1920.png`   | 1080 × 1920     | IG/TikTok/YT story · launch post     |
| `launch-square-1080.png`          | 1080 × 1080     | IG / X feed · launch post            |
| `end-card-1080x1920.png`          | 1080 × 1920     | Video end card · minimal black       |

Preview page: `/brand-assets/preview.html` and `/brand-assets/halo-rev.html`.

## How to re-render or extend

The source templates live outside this folder (session-local — not committed):
- `/tmp/brand-render/logomark.html` — the AI+halo renderer, parameterized by gold/goldHi/goldLo/core/bg/size/markScale
- `/tmp/brand-render/asset.html` — the composer for banner/vertical/square/endcard layouts

To re-render an asset, open the HTML in a browser (or screenshot via headless
Chrome) at the correct `window-size`. The renderer reads colors from query
params so palette changes don't require code edits.

## Do not

- Add shiny trophy-gold (`#D4AF37`, `#FFD700`, `#E8C84A`). It's the first thing to reject.
- Use pure white (`#FFFFFF`). Always `#F5F0E8` or an rgba derivative.
- Use `backgroundAttachment: fixed` (iOS breaks it).
- Use `100vh` anywhere. Always `100dvh`.
