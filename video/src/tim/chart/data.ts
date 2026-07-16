// All times are SOURCE seconds (raw recording). The Chart converts using TRIM.

export type CandleSpec = {
  o: number;
  c: number;
  h: number;
  l: number;
  t: number; // when the candle starts growing
  dur?: number; // grow duration
  kind: 'blue' | 'white';
};

// ---- price space ----
export const P_MIN = 24;
export const P_MAX = 94;

export const OR_HIGH = 78; // opening range high
export const OR_LOW = 30; // opening range low
export const VAH = 64;
export const VAL = 42;

// ---- pixel space (1080x1920 canvas) ----
export const CHART = {top: 880, bottom: 1800, left: 70, right: 1010};

export const M15_X = 240; // candle center
export const M15_W = 66;
export const PROFILE_X = 292; // bars grow to the right from here
export const M5_X0 = 492; // first M5 candle center
export const M5_STEP = 50;
export const M5_W = 32;

export const m5x = (i: number) => M5_X0 + i * M5_STEP;

// The M15 opening candle
export const M15 = {o: 38, c: 72, h: OR_HIGH, l: OR_LOW};

// Volume profile rows: price center + relative width (0..1)
export const PROFILE_ROWS: {p: number; w: number}[] = [
  {p: 76, w: 0.14},
  {p: 72, w: 0.28},
  {p: 68, w: 0.5},
  {p: 64, w: 0.68},
  {p: 60, w: 0.9},
  {p: 56, w: 1.0},
  {p: 52, w: 0.92},
  {p: 48, w: 0.68},
  {p: 44, w: 0.48},
  {p: 40, w: 0.3},
  {p: 36, w: 0.17},
  {p: 32, w: 0.09},
];
export const PROFILE_MAX_W = 148; // px at w=1

// ---- Scenario 1: fakeout above VAH -> short back to VAL ----
export const SC1: CandleSpec[] = [
  {o: 54, c: 59, h: 60.5, l: 52.5, t: 43.3, kind: 'blue'},
  {o: 59, c: 63, h: 65, l: 58, t: 44.5, kind: 'blue'},
  {o: 63, c: 69, h: 71, l: 62, t: 46.3, kind: 'blue'},
  {o: 69, c: 72, h: 75, l: 68, t: 47.7, kind: 'blue'},
  {o: 72, c: 58, h: 73, l: 56.5, t: 49.4, dur: 0.9, kind: 'white'}, // the trap
  {o: 58, c: 54, h: 59, l: 53, t: 63.2, kind: 'white'},
  {o: 54, c: 51, h: 55, l: 50, t: 64.9, kind: 'white'},
  {o: 51, c: 48.5, h: 52, l: 47.5, t: 66.4, kind: 'white'},
  {o: 48.5, c: 42.3, h: 49.5, l: 41.8, t: 68.2, dur: 0.9, kind: 'white'}, // explosive leg
];
export const SC1_ENTRY = {x: m5x(4), p: 58, t: 53.6, label: 56.4};
export const SC1_STOP_STEPS = [
  {t: 57.8, p: 75}, // above the fakeout high
  {t: 63.9, p: 59},
  {t: 65.6, p: 55},
  {t: 67.1, p: 52},
];
export const SC1_STOP_BAND = 3.6; // band thickness in price units
export const SC1_GREEN = {t: 60.5, x0: m5x(4) - M5_W, x1: m5x(9) + M5_W, pTop: 58, pBot: VAL};
export const SC1_TARGET_HIT = 69.6;
export const SC1_FADE = 71.2; // scenario 1 fades out

// ---- Scenario 2: acceptance above VAH -> long continuation ----
export const SC2: CandleSpec[] = [
  {o: 58, c: 62, h: 63.5, l: 56.5, t: 76.6, kind: 'blue'},
  {o: 62, c: 67.5, h: 69, l: 61, t: 77.5, kind: 'blue'},
  {o: 67.5, c: 70, h: 71.5, l: 66.5, t: 78.8, kind: 'blue'},
  {o: 70, c: 68.5, h: 71, l: 67, t: 79.9, kind: 'white'},
  {o: 68.5, c: 64.6, h: 69, l: 64.1, t: 84.3, dur: 0.8, kind: 'white'}, // pullback to VAH
  {o: 64.6, c: 71, h: 72, l: 64, t: 88.0, kind: 'blue'}, // continuation
  {o: 71, c: 76.5, h: 78, l: 70, t: 90.6, kind: 'blue'},
  {o: 76.5, c: 82, h: 83.5, l: 74.5, t: 92.2, kind: 'blue'},
  {o: 82, c: 88.5, h: 90, l: 81, t: 93.7, kind: 'blue'},
  {o: 88.5, c: 80.8, h: 89.5, l: 80.5, t: 95.0, dur: 0.7, kind: 'white'}, // stop-out candle
];
export const SC2_ENTRY = {x: m5x(4), p: 64.6, t: 87.5, label: 87.9};
export const SC2_GREEN = {t: 88.2, x0: m5x(4) - M5_W, x1: m5x(9) + M5_W, pTop: 91, pBot: 64.6};
export const SC2_RED = {t: 89.4, x0: m5x(4) - M5_W, x1: m5x(9) + M5_W, pTop: 64.6, pBot: 57.5};
export const SC2_STOP_STEPS = [
  {t: 89.8, p: 57.5, x: m5x(4)},
  {t: 91.5, p: 70, x: m5x(6)},
  {t: 93.0, p: 74.5, x: m5x(7)},
  {t: 94.4, p: 81, x: m5x(8)},
];
export const SC2_STOP_HIT = 95.6;

// ---- other beats ----
export const B = {
  chartIn: 5.9, // chart canvas fades in
  m15Grow: 9.0,
  highLine: 12.9,
  lowLine: 13.6,
  orBracket: 15.9,
  headers: 19.8, // "M15 | M5"
  profile: 20.1,
  vaBox: 24.7,
  vaText: 28.9,
  vahLabel: 32.8,
  valLabel: 35.3,
  twoPulse: 40.2,
};
