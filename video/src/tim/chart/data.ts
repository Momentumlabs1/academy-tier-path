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

// ---- Scenario 1: rejection at VAH -> short back to VAL ----
// The M5 candle pushes above the VAH intraday but CLOSES back inside
// (live retracing candle = the rejection). No candle body closes above the VA.
export const SC1_WAIT: CandleSpec[] = [
  {o: 54, c: 58, h: 59.5, l: 52.5, t: 43.3, kind: 'blue'},
  {o: 58, c: 62, h: 64.8, l: 57, t: 44.5, kind: 'blue'}, // tests the VAH with a wick
];
// two-phase live candle: rises above VAH while he says "bricht ... aus",
// falls back inside while he says "schließt aber wieder innerhalb"
export const SC1_REJ = {
  x: m5x(2),
  o: 62,
  peak: 71, // provisional close above VAH while the candle is "live"
  close: 61, // final close back inside the VA
  hi: 73, // wick above the VAH stays
  lo: 60.2,
  tUp: 45.9,
  durUp: 2.5,
  tDown: 49.2,
  durDown: 1.7,
};
export const SC1_TRAIL: CandleSpec[] = [
  {o: 61, c: 56, h: 62, l: 55, t: 63.2, kind: 'white'},
  {o: 56, c: 52, h: 57, l: 51, t: 64.9, kind: 'white'},
  {o: 52, c: 48.5, h: 53, l: 47.5, t: 66.4, kind: 'white'},
  {o: 48.5, c: 42.3, h: 49.5, l: 41.8, t: 68.2, dur: 0.9, kind: 'white'}, // explosive leg
];
export const SC1_TRAIL_X0 = 3; // trail candles start at m5x(3)
export const SC1_ENTRY = {x: m5x(2), p: 61, t: 53.6, label: 56.4};
// risk zone like scenario 2: red from entry up to the stop above the high
export const SC1_RED = {t: 57.8, x0: m5x(2) - M5_W, x1: m5x(6) + 50, pTop: 74.5, pBot: 61};
export const SC1_GREEN = {t: 60.5, x0: m5x(2) - M5_W, x1: m5x(6) + 50, pTop: 61, pBot: VAL};
// trailing stop steps DOWN above each new candle high (line + tag, like SC2)
export const SC1_STOP_STEPS = [
  {t: 57.8, p: 74.5, x: m5x(2)},
  {t: 63.9, p: 62.5, x: m5x(3)},
  {t: 65.6, p: 57.5, x: m5x(4)},
  {t: 67.1, p: 53.5, x: m5x(5)},
];
export const SC1_TARGET_HIT = 69.6;
export const SC1_FADE = 70.55; // scenario 1 fades out (before the cut at 71.05)

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
  m15Header: 9.2, // "M15" appears with the candle, emphasized
  highLine: 12.9,
  lowLine: 13.6,
  orBracket: 15.9,
  m5Header: 19.8, // "M5" appears small next to it
  profile: 20.1,
  vaBox: 24.7,
  vaText: 28.9,
  vahLabel: 32.8,
  valLabel: 35.3,
  twoPulse: 40.2,
  m5Emph: 42.9, // emphasis flips from M15 to M5 ("warten, ob eine M5-Kerze ...")
};
