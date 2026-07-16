export const FPS = 30;
export const W = 1080;
export const H = 1920;

// The raw recording starts with ~0.6s of silence; we trim the first 0.4s.
export const TRIM = 0.4;

export const COLORS = {
  bg: '#050505',
  white: '#F5F6F7',
  grey: '#9CA3AF',
  greyDim: '#4B5563',
  grid: 'rgba(255,255,255,0.045)',
  blue: '#537BF2',
  blueBright: '#6E8FFF',
  candleWhite: '#EDEEF0',
  profile: 'rgba(148,158,175,0.42)',
  vaFill: 'rgba(52,73,163,0.30)',
  vaStroke: 'rgba(110,143,255,0.35)',
  vaText: '#AABBFF',
  level: 'rgba(235,238,245,0.55)',
  dashed: 'rgba(235,238,245,0.35)',
  red: '#E5484D',
  redZone: 'rgba(127,29,29,0.45)',
  redZoneStroke: 'rgba(229,72,77,0.35)',
  green: '#30A46C',
  greenZone: 'rgba(22,101,52,0.40)',
  greenZoneStroke: 'rgba(48,164,108,0.35)',
} as const;

export const FONT = 'InterVideo, -apple-system, Helvetica, sans-serif';
