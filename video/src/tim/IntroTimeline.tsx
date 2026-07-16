import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT} from './theme';

// Intro (0:00–0:05): "complexity" timeline — strategy pills popping up over
// the years, then everything dims and a clean "EINFACHHEIT" chip takes over.
// `t` domain: composition seconds (already trimmed).

const PILLS = [
  {label: 'Wyckoff', at: 0.7, x: 190, y: 330},
  {label: 'FVG', at: 1.35, x: 470, y: 210},
  {label: 'Orderflow', at: 1.95, x: 760, y: 300},
  {label: 'Smart Money', at: 2.55, x: 330, y: 130},
  {label: 'Indikatoren', at: 3.0, x: 660, y: 90},
];

const YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];

export const IntroTimeline: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const fadeOut = interpolate(t, [4.9, 5.55], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (fadeOut <= 0) return null;

  const simple = t >= 3.6; // "Einfachheit schon." (source 4.0 - trim 0.4)
  const dim = interpolate(t, [3.6, 4.0], [1, 0.22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const axisIn = interpolate(t, [0.2, 1.0], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const chipSpring = spring({frame: frame - Math.round(3.75 * fps), fps, config: {damping: 12, stiffness: 150}});

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
        const s = spring({frame: frame - Math.round(p.at * fps), fps, config: {damping: 11, stiffness: 160, mass: 0.7}});
        if (s <= 0.01) return null;
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
      {/* the clean answer */}
      {simple ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 260,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            transform: `scale(${chipSpring})`,
          }}
        >
          <div
            style={{
              background: COLORS.white,
              color: '#0A0A0B',
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 44,
              letterSpacing: '0.14em',
              padding: '20px 44px',
              borderRadius: 12,
            }}
          >
            EINFACHHEIT
          </div>
        </div>
      ) : null}
    </div>
  );
};
