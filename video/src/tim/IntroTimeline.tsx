import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {COLORS, FONT} from './theme';

// Intro (first ~8s): three failed "paths" pop onto a timeline, each lights up
// white for a beat and then errors out in red — then "Einfachheit" lands in
// green. The timeline doesn't vanish: it recedes (dims) while the chart grid
// builds, and only fully fades right before the M15 candle.
// Driven by tSrc = SOURCE seconds (survives pause-cutting).

const easeOut = (x: number) => 1 - (1 - x) ** 3;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const prog = (t: number, start: number, dur: number) => clamp01((t - start) / dur);

type RGBA = [number, number, number, number];
const mix = (a: RGBA, b: RGBA, k: number): string => {
  const c = a.map((v, i) => v + (b[i] - v) * k);
  return `rgba(${c[0].toFixed(0)},${c[1].toFixed(0)},${c[2].toFixed(0)},${c[3].toFixed(3)})`;
};

// pill states: normal -> white highlight -> red error
const BG_N: RGBA = [12, 12, 14, 0.9];
const BG_W: RGBA = [245, 246, 247, 1];
const BG_E: RGBA = [74, 15, 17, 0.72];
const BD_N: RGBA = [235, 238, 245, 0.75];
const BD_W: RGBA = [255, 255, 255, 1];
const BD_E: RGBA = [229, 72, 77, 0.95];
const TX_N: RGBA = [245, 246, 247, 1];
const TX_W: RGBA = [10, 10, 11, 1];
const TX_E: RGBA = [255, 146, 150, 1];

const PILLS = [
  {label: 'Wyckoff', at: 0.75, errAt: 2.35, x: 175, y: 300},
  {label: 'FVG', at: 1.2, errAt: 2.85, x: 470, y: 165},
  {label: 'Smart Money', at: 1.65, errAt: 3.35, x: 720, y: 285},
];

const YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];

export const IntroTimeline: React.FC<{tSrc: number; tComp: number}> = ({tSrc, tComp}) => {
  const {fps} = useVideoConfig();
  const t = tSrc;

  // recede while the chart grid builds, fully gone before the M15 candle.
  // Fades run on COMPOSITION time so the pause-cut at src 4.98 never pops.
  const fadeOut =
    interpolate(tComp, [4.5, 5.1], [1, 0.22], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    interpolate(tComp, [6.5, 7.45], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (fadeOut <= 0) return null;

  // green answer pill
  const ein = easeOut(prog(t, 4.0, 0.7));
  const axisIn = interpolate(t, [0.2, 0.9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const axisY = 560;
  const x0 = 120;
  const x1 = 960;

  return (
    <div style={{position: 'absolute', left: 0, top: 880, width: 1080, height: 760, opacity: fadeOut}}>
      {/* axis */}
      <div
        style={{
          position: 'absolute',
          left: x0,
          top: axisY,
          width: (x1 - x0) * axisIn,
          height: 2,
          background: 'rgba(235,238,245,0.5)',
        }}
      />
      {YEARS.map((y, i) => {
        const xx = x0 + ((x1 - x0) / (YEARS.length - 1)) * i;
        const show = axisIn > i / YEARS.length;
        return (
          <div key={y} style={{opacity: show ? 1 : 0}}>
            <div style={{position: 'absolute', left: xx, top: axisY - 7, width: 2, height: 16, background: 'rgba(235,238,245,0.55)'}} />
            <div
              style={{
                position: 'absolute',
                left: xx - 40,
                top: axisY + 22,
                width: 80,
                textAlign: 'center',
                fontFamily: FONT,
                fontWeight: 500,
                fontSize: 26,
                color: COLORS.grey,
              }}
            >
              {y}
            </div>
          </div>
        );
      })}

      {/* three failed paths: pop -> white highlight -> red error */}
      {PILLS.map((p) => {
        const s = spring({frame: (t - p.at) * fps, fps, config: {damping: 11, stiffness: 190, mass: 0.65}});
        if (s <= 0.15) return null;
        const hl = easeOut(prog(t, p.errAt - 0.4, 0.22)); // flash white + grow
        const err = easeOut(prog(t, p.errAt, 0.3)); // settle into error red
        const bg = err > 0 ? mix(BG_W, BG_E, err) : mix(BG_N, BG_W, hl);
        const bd = err > 0 ? mix(BD_W, BD_E, err) : mix(BD_N, BD_W, hl);
        const tx = err > 0 ? mix(TX_W, TX_E, err) : mix(TX_N, TX_W, hl);
        const scale = s * (1 + 0.14 * hl - 0.14 * hl * err);
        return (
          <div key={p.label}>
            <div
              style={{
                position: 'absolute',
                left: p.x + 2,
                top: p.y + 52,
                width: 2,
                height: Math.max(0, (axisY - p.y - 52) * s),
                background: err > 0.5 ? 'rgba(229,72,77,0.35)' : 'rgba(235,238,245,0.30)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: p.x - 90,
                top: p.y,
                transform: `scale(${scale})`,
                border: `2px solid ${bd}`,
                borderRadius: 10,
                padding: '12px 26px',
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 30,
                color: tx,
                background: bg,
                whiteSpace: 'nowrap',
                textAlign: 'center',
                boxShadow: err > 0 ? `0 0 ${18 * err}px rgba(229,72,77,${0.25 * err})` : undefined,
              }}
            >
              <span style={{display: 'inline-block', width: 32 * err, opacity: err, fontWeight: 800, textAlign: 'left'}}>
                ✕
              </span>
              {p.label}
            </div>
          </div>
        );
      })}

      {/* the answer, in green */}
      {ein > 0 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 539,
              top: 462,
              width: 2,
              height: Math.max(0, (axisY - 462) * ein),
              background: 'rgba(48,164,108,0.45)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 396,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              opacity: ein,
              transform: `translateY(${(1 - ein) * 18}px) scale(${0.96 + 0.04 * ein})`,
            }}
          >
            <div
              style={{
                background: '#2FA76C',
                border: '2px solid rgba(130,235,180,0.85)',
                color: '#04140C',
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 34,
                padding: '14px 32px',
                borderRadius: 10,
                boxShadow: '0 0 34px rgba(48,164,108,0.35)',
              }}
            >
              ✓ Einfachheit
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
