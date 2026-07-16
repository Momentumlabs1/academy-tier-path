import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {COLORS, FONT} from './theme';

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

// Intro (first ~5.5s): "complexity" timeline — strategy pills popping up over
// the years, then everything dims and a clean "EINFACHHEIT" chip takes over.
// Driven by tSrc = SOURCE seconds (survives pause-cutting).

const PILLS = [
  {label: 'Wyckoff', at: 1.1, x: 190, y: 330},
  {label: 'FVG', at: 1.75, x: 470, y: 210},
  {label: 'Orderflow', at: 2.35, x: 760, y: 300},
  {label: 'Smart Money', at: 2.95, x: 330, y: 130},
  {label: 'Indikatoren', at: 3.4, x: 660, y: 90},
];

const YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];

export const IntroTimeline: React.FC<{tSrc: number}> = ({tSrc}) => {
  const {fps} = useVideoConfig();
  const t = tSrc;

  // the "Einfachheit" pill holds its beat, then hands over to the chart (~5.9)
  const fadeOut = interpolate(t, [5.25, 5.85], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (fadeOut <= 0) return null;

  // "Einfachheit schon." — calm, design-consistent entrance: the noisy pills
  // recede while one inverted pill (same design language) eases in on a stem.
  const ein = easeOutCubic(
    interpolate(t, [4.0, 4.75], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  const dim = interpolate(t, [4.0, 4.65], [1, 0.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const axisIn = interpolate(t, [0.6, 1.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
          opacity: dim,
        }}
      />
      {YEARS.map((y, i) => {
        const xx = x0 + ((x1 - x0) / (YEARS.length - 1)) * i;
        const show = axisIn > i / YEARS.length;
        return (
          <div key={y} style={{opacity: show ? dim : 0}}>
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
      {/* strategy pills on stems */}
      {PILLS.map((p) => {
        const s = spring({frame: (t - p.at) * fps, fps, config: {damping: 11, stiffness: 160, mass: 0.7}});
        if (s <= 0.15) return null;
        return (
          <div key={p.label} style={{opacity: dim}}>
            <div
              style={{
                position: 'absolute',
                left: p.x + 2,
                top: p.y + 52,
                width: 2,
                height: Math.max(0, (axisY - p.y - 52) * s),
                background: 'rgba(235,238,245,0.30)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: p.x - 90,
                top: p.y,
                transform: `scale(${s})`,
                border: '2px solid rgba(235,238,245,0.75)',
                borderRadius: 10,
                padding: '12px 26px',
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 30,
                color: COLORS.white,
                background: 'rgba(12,12,14,0.9)',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              {p.label}
            </div>
          </div>
        );
      })}
      {/* the clean answer: same pill language as above, inverted, on its own stem */}
      {ein > 0 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 539,
              top: 462,
              width: 2,
              height: Math.max(0, (axisY - 462) * ein),
              background: 'rgba(235,238,245,0.30)',
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
                background: COLORS.white,
                border: '2px solid rgba(235,238,245,0.75)',
                color: '#0A0A0B',
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 34,
                padding: '14px 32px',
                borderRadius: 10,
              }}
            >
              Einfachheit
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
