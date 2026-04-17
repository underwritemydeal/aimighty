/**
 * AImighty Design System — Single Source of Truth
 *
 * All color, typography, spacing, and shadow values live here.
 * Components import from this file — no hardcoded hex values elsewhere.
 */

// ───── Colors ─────
export const colors = {
  void: '#030308',
  voidSoft: 'rgba(10, 10, 18, 1)',
  voidOverlay: 'rgba(3, 3, 8, 0.92)',

  gold: '#d4b882',
  goldLight: '#e2c899',
  goldDark: '#bfa067',
  goldCore: '#fff5dc',
  goldFaint: 'rgba(212, 184, 130, 0.15)',
  goldBorder: 'rgba(212, 184, 130, 0.2)',
  goldBorderActive: 'rgba(212, 184, 130, 0.6)',
  goldBorderStrong: 'rgba(212, 184, 130, 0.8)',

  textPrimary: 'rgba(255, 248, 240, 0.95)',
  textSecondary: 'rgba(255, 248, 240, 0.6)',
  textTertiary: 'rgba(255, 248, 240, 0.4)',
  textMuted: 'rgba(255, 248, 240, 0.25)',

  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  borderMedium: 'rgba(255, 255, 255, 0.12)',

  surfaceElevated: 'rgba(255, 255, 255, 0.03)',
  surfaceHover: 'rgba(255, 255, 255, 0.06)',

  danger: '#ef4444',
} as const;

// ───── Typography ─────
export const fonts = {
  display: "'Cormorant Garamond', Georgia, serif",
  body: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

export const fontWeights = {
  thin: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ───── Shadows ─────
export const shadows = {
  goldGlow: '0 0 30px rgba(212, 184, 130, 0.15)',
  goldGlowStrong: '0 0 40px rgba(212, 184, 130, 0.25)',
  card: '0 8px 32px rgba(0, 0, 0, 0.3)',
  cardHover: '0 12px 48px rgba(0, 0, 0, 0.5)',
} as const;

// ───── Radii ─────
export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '999px',
} as const;

// ───── Spacing scale (px) ─────
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
} as const;

// ───── Viewport helpers ─────
export const viewport = {
  // Always use dvh, never vh. Tracks iOS URL-bar collapse correctly.
  fullHeight: '100dvh',
  fullHeightFallback: '-webkit-fill-available',
} as const;

// ───── Component style presets ─────
export const styles = {
  // Logo wordmark — "AI" in gold + "mighty" in white. Renders consistently across all screens.
  logoGold: { color: colors.gold },
  logoWhite: { color: colors.textPrimary },

  // Common section background
  darkSection: {
    background: colors.void,
    color: colors.textPrimary,
  },

  // Glass card — minimal, premium
  glassCard: {
    background: colors.surfaceElevated,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: radii.lg,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },

  // Primary gold button
  primaryButton: {
    background: colors.gold,
    color: '#0a0a0f',
    fontFamily: fonts.body,
    fontWeight: fontWeights.medium,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },

  // Ghost button — transparent with white border
  ghostButton: {
    background: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.textPrimary}`,
    fontFamily: fonts.body,
    fontWeight: fontWeights.medium,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
} as const;
