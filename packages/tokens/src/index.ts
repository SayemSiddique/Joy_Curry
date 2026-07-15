/**
 * @joy-curry/tokens — design tokens (single source of truth)
 *
 * Extracted verbatim from apps/web/src/styles/global.css `:root` (S7, 2026-07-11).
 * Web keeps consuming the CSS custom properties as-is; these TS constants are the
 * shared source that React Native styles (apps/mobile) will consume, since RN has
 * no CSS variables. If a value changes in global.css, mirror it here (and vice
 * versa) — flag the dual-source in a decision log entry, same as other mirrored
 * business rules (ORCHESTRATOR §9).
 *
 * Spacing / radii / font-size values that are `px`/`rem` strings in CSS are also
 * exposed as unitless numbers (…Px) for RN, which takes numeric style values.
 */

export const colors = {
  primary: '#541C0D',
  primaryHover: '#3E1409',
  primaryLight: '#F3E7DD',

  secondary: '#874535',
  secondaryHover: '#6E3829',

  cta: '#F5EBDC',
  ctaHover: '#E9DCC8',
  ctaText: '#541C0D',

  heroBg: '#3E1409',
  heroText: '#F5EBDC',
  heroSubtext: 'rgba(245, 235, 220, 0.7)',

  bg: '#F5EBDC',
  bgAlt: '#EFE3D2',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',

  textPrimary: '#2B1206',
  textSecondary: '#874535',
  textMuted: '#8A6248',
  textInverse: '#F5EBDC',

  border: '#E0CDB5',
  borderLight: '#EEE4D4',

  overlay: 'rgba(13, 9, 6, 0.72)',

  success: '#2E7D32',
  successLight: '#E8F5E9',
  error: '#C62828',
  errorLight: '#FFEBEE',
  warning: '#B5651D',
  warningLight: '#FFF3E0',

  veg: '#388E3C',
  vegan: '#1B5E20',
  nonveg: '#C62828',
  gf: '#558B2F',
  allergen: '#F9A825',
  spicy: '#D84315',
  halal: '#1565C0',
} as const;

export const fontFamily = {
  display: "'Rubik', -apple-system, sans-serif",
  body: "'Rubik', -apple-system, sans-serif",
  mono: "'Rubik', -apple-system, sans-serif",
  /** RN wants the raw family name (no fallback stack, no quotes). */
  native: 'Rubik',
} as const;

/** rem strings for web/CSS. 1rem = 16px. */
export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  md: '1.125rem',
  lg: '1.25rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '2.5rem',
  '4xl': '3rem',
  '5xl': '3.75rem',
  '6xl': '4.5rem',
} as const;

/** Same scale as fontSize, in px numbers for React Native. */
export const fontSizePx = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 60,
  '6xl': 72,
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  bold: 700,
  black: 900,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.35,
  normal: 1.55,
  relaxed: 1.8,
} as const;

/** px strings for web/CSS. */
export const space = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

/** Same scale as space, as px numbers for React Native. */
export const spacePx = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const radiusPx = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

/** CSS box-shadow strings (web only — RN uses its own shadow props). */
export const shadow = {
  sm: '0 1px 4px rgba(13, 9, 6, 0.08)',
  md: '0 4px 16px rgba(13, 9, 6, 0.12)',
  lg: '0 8px 32px rgba(13, 9, 6, 0.18)',
  xl: '0 16px 48px rgba(13, 9, 6, 0.24)',
  focus: '0 0 0 3px rgba(135, 69, 53, 0.45)',
} as const;

export const motion = {
  fast: '150ms ease-out',
  normal: '250ms ease-out',
  slow: '400ms ease-out',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Raw durations in ms for RN Animated / reanimated timing. */
  fastMs: 150,
  normalMs: 250,
  slowMs: 400,
} as const;

export const zIndex = {
  base: 1,
  dropdown: 10,
  sticky: 100,
  overlay: 500,
  modal: 1000,
  toast: 1100,
} as const;

export const layout = {
  maxWidth: '1280px',
  maxWidthPx: 1280,
  navbarHeight: '84px',
  navbarHeightPx: 84,
  toolbarHeight: '64px',
  toolbarHeightPx: 64,
} as const;

/** Everything under one namespace for ergonomic `import { tokens }`. */
export const tokens = {
  colors,
  fontFamily,
  fontSize,
  fontSizePx,
  fontWeight,
  lineHeight,
  space,
  spacePx,
  radius,
  radiusPx,
  shadow,
  motion,
  zIndex,
  layout,
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof typeof colors;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type FontSizeToken = keyof typeof fontSize;
