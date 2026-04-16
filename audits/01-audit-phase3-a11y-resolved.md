# Phase 3 — Accessibility P1 Resolutions

Five strict-accessibility P1s from `01-audit.md` addressed. One fix per commit, `npm run build` passed after every change.

| # | Title | Commit | Summary |
|---|-------|--------|---------|
| a11y-1 | AuthScreen inputs unlabeled | `65ed0f1` | Added `aria-label="Email"` / `aria-label="Password"` to the login inputs; wired the "Minimum 8 characters" hint via `aria-describedby="password-hint"`. WCAG 1.3.1 / 3.3.2. |
| a11y-2 | Streaming replies + limit banners silent | `30bd2d6` | Wrapped the messages container with `role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions text"` so token streams read incrementally. Free-limit and daily-limit banners now `role="alert" aria-live="assertive"`. WCAG 4.1.3. |
| a11y-3 | Touch targets < 44×44 | `a8df01b` | Back button (was `p-2` ≈28px), belief-name chip, character selector, mute, and menu buttons all bumped to 44×44 minimum via `width`/`height`/`minHeight` while glyphs stay the same size. WCAG 2.5.5. FAQ chevron on `LandingPage` already resolves to 60px+ via `padding: 22px 4px` — left as-is. |
| a11y-4 | No `<h1>` on LandingPage hero | `6a43b05` | Promoted the hero tagline `<p>` ("Speak to the divine — your way.") to `<h1>`. Inline styles retained so browser defaults don't leak in. WCAG 1.3.1 + SEO. |
| a11y-5 | Verbose belief-card aria-labels | `8a80f11` | `aria-label={`Select ${name} - ${subtitle}. ${description}`}` → `aria-label={`Select ${name}`}`. Visible subtitle + selfDescription already carry the context for both sighted and AT users. |

## Build status

Final build: 451.21 kB / 130.54 kB gzip. Clean. No visual or layout regressions.

## Out of scope (deliberate)

- Non-a11y P1s from `01-audit.md` belong to later phases:
  - Design-system hex-literal drift → `/normalize` (not in launch plan)
  - setInterval TTS drain leak → Phase 4 (`/optimize`)
  - Unused Three.js stack → Phase 4 (but explicitly excluded per launch plan)
  - console.log in production → deferred
  - OG/Twitter meta → already resolved in Phase 1 P0-8 (`5c41514`)
- All P2/P3 a11y items (`textTertiary` contrast, decorative SVG `aria-hidden`, FAQ `aria-expanded`, modal heading hierarchy) are deferred per the launch plan.

## Expected audit score lift

`/audit` Accessibility dimension should lift from **2 → 3** once these land. Touch targets and semantic labeling are the heaviest findings it keyed on. Perfect 4 would require the P2 wave (contrast, aria-hidden sweep, aria-expanded on FAQ).
