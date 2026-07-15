/**
 * CosmoTrades design tokens — single source of truth for every scene.
 * Dark cinematic UI: nothing may look cheap.
 */

export const colors = {
  /** Page / stage background */
  bg: '#0B0F16',
  /** Panel / card surface */
  panel: '#131A24',
  /** Slightly lifted surface (nested cards, hover states) */
  panelSoft: '#1A2432',
  /** Cosmo brand blue */
  blue: '#75B9F5',
  /** Accent orange (CTAs, volume profile, highlights) */
  orange: '#F08C1E',
  /** Warm primary text */
  text: '#F2EDE4',
  /** Dimmed secondary text */
  textDim: 'rgba(242, 237, 228, 0.55)',
  /** Faint tertiary text / captions */
  textFaint: 'rgba(242, 237, 228, 0.32)',
  /** Hairline borders on panels */
  stroke: 'rgba(117, 185, 245, 0.14)',
  /** Stronger border (active/selected) */
  strokeStrong: 'rgba(117, 185, 245, 0.38)',
  /** Bullish candle / positive */
  up: '#3DDC97',
  /** Bearish candle / negative */
  down: '#F2555E',
  /** REC dot / warnings */
  rec: '#FF4B4B',
  /** Near-black for vignettes and letterboxing */
  black: '#04070C',
} as const;

export const font = {
  family: 'Inter, -apple-system, Segoe UI, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 800,
  },
} as const;

/** 8px base unit: spacing(2) === 16 */
export const spacing = (n: number): number => n * 8;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
  pill: 999,
} as const;

export const shadows = {
  /** Default deep panel drop */
  panel: '0 24px 64px rgba(0, 0, 0, 0.45)',
  /** Soft close shadow for small elements */
  soft: '0 8px 24px rgba(0, 0, 0, 0.35)',
  /** Blue brand glow (Cosmo elements, focus) */
  glowBlue: '0 0 40px rgba(117, 185, 245, 0.35)',
  /** Orange accent glow (CTA pulse) */
  glowOrange: '0 0 40px rgba(240, 140, 30, 0.4)',
} as const;

/** Canvas constants */
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 30;
