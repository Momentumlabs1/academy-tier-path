import {FPS, TRIM} from './theme';

// ---------------------------------------------------------------------------
// Pause compression: the raw take has lots of small gaps between phrases.
// Each entry removes the middle of a gap, keeping a short tail after the last
// word and a short lead-in before the next one.
// [prevWordEnd, nextWordStart, tailKeep, preKeep] — all in SOURCE seconds.
// ---------------------------------------------------------------------------
const GAPS: Array<[number, number, number, number]> = [
  [4.83, 5.83, 0.15, 0.2], // direkt nach "Einfachheit schon." in die Erklärung
  [8.63, 8.97, 0.1, 0.14],
  [11.61, 12.13, 0.1, 0.14],
  [15.09, 15.55, 0.1, 0.14],
  [17.07, 17.53, 0.1, 0.14],
  [19.45, 19.99, 0.1, 0.14],
  [23.17, 23.65, 0.1, 0.14],
  [36.33, 38.91, 0.22, 0.28],
  [41.41, 42.89, 0.18, 0.26],
  [43.53, 43.93, 0.1, 0.14],
  [45.47, 45.87, 0.1, 0.14],
  [48.73, 49.23, 0.1, 0.14],
  [51.21, 51.61, 0.1, 0.14],
  [57.09, 57.59, 0.1, 0.14],
  [62.45, 62.93, 0.1, 0.14],
  [67.27, 68.03, 0.13, 0.17],
  [70.85, 72.29, 0.18, 0.26],
  [73.01, 73.93, 0.13, 0.2],
  [76.15, 76.57, 0.1, 0.14],
  [80.17, 80.69, 0.1, 0.14],
  [83.37, 83.87, 0.1, 0.14],
  [88.83, 89.31, 0.1, 0.14],
  [95.83, 96.55, 0.13, 0.17],
  [99.95, 100.81, 0.18, 0.22],
];

export type SrcSeg = {from: number; to: number};

const roundF = (x: number) => Math.round(x + 1e-6);

// keep-segments of [start..end] with the gap middles removed
const keepSegments = (start: number, end: number): SrcSeg[] => {
  const segs: SrcSeg[] = [];
  let cursor = start;
  for (const [prevEnd, nextStart, tailKeep, preKeep] of GAPS) {
    const cutFrom = prevEnd + tailKeep;
    const cutTo = nextStart - preKeep;
    if (cutTo <= cutFrom) continue;
    if (cutFrom >= end) break;
    if (cutTo <= cursor) continue;
    segs.push({from: cursor, to: Math.min(cutFrom, end)});
    cursor = cutTo;
    if (cursor >= end) return segs.filter((s) => s.to > s.from);
  }
  segs.push({from: cursor, to: end});
  return segs.filter((s) => s.to > s.from);
};

export type TimelineSeg = {
  fromFrame: number; // composition frame where this segment starts
  durationInFrames: number;
  srcStartFrame: number; // frame in the source media
};

export type Timeline = {
  segs: TimelineSeg[];
  durationInFrames: number;
  srcToComp: (s: number) => number; // source sec -> composition sec
  compToSrc: (t: number) => number; // composition sec -> source sec
};

export const buildTimeline = (srcSegs: SrcSeg[]): Timeline => {
  const segs: TimelineSeg[] = [];
  let cum = 0;
  for (const s of srcSegs) {
    const srcStartFrame = roundF(s.from * FPS);
    const durationInFrames = roundF(s.to * FPS) - srcStartFrame;
    segs.push({fromFrame: cum, durationInFrames, srcStartFrame});
    cum += durationInFrames;
  }
  const srcToComp = (s: number): number => {
    for (const seg of segs) {
      const srcStart = seg.srcStartFrame / FPS;
      const srcEnd = (seg.srcStartFrame + seg.durationInFrames) / FPS;
      const compStart = seg.fromFrame / FPS;
      if (s < srcStart) return compStart; // inside a removed gap -> snap to cut
      if (s < srcEnd) return compStart + (s - srcStart);
    }
    return cum / FPS;
  };
  const compToSrc = (t: number): number => {
    for (const seg of segs) {
      const compStart = seg.fromFrame / FPS;
      const compEnd = (seg.fromFrame + seg.durationInFrames) / FPS;
      if (t < compEnd || seg === segs[segs.length - 1]) {
        return seg.srcStartFrame / FPS + Math.max(0, t - compStart);
      }
    }
    return t;
  };
  return {segs, durationInFrames: cum, srcToComp, compToSrc};
};

// organic: one straight take, ending after the organic CTA
export const ORGANIC_TIMELINE = buildTimeline(keepSegments(TRIM, 108.7));

// ad: same body, but right after "…Gewinnen raus." jump to the ad-CTA take
export const AD_TIMELINE = buildTimeline([
  ...keepSegments(TRIM, 100.15),
  {from: 109.95, to: 122.6},
]);
