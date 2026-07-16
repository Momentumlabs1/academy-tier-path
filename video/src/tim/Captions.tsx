import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from './captions';
import {COLORS, FONT} from './theme';

// One bold white phrase at a time, positioned between bubble and chart.
// `captions` must already be mapped to composition time (seconds).
export const Captions: React.FC<{captions: Caption[]}> = ({captions}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const active = captions.find((c) => t >= c.s && t < c.e);
  if (!active) return null;

  const local = (t - active.s) * fps;
  const inO = interpolate(local, [0, 5], [0, 1], {extrapolateRight: 'clamp'});
  const y = interpolate(local, [0, 6], [10, 0], {extrapolateRight: 'clamp', easing: (x) => 1 - (1 - x) ** 3});
  const sc = interpolate(local, [0, 6], [0.965, 1], {extrapolateRight: 'clamp', easing: (x) => 1 - (1 - x) ** 3});

  return (
    <div
      style={{
        position: 'absolute',
        top: 640,
        left: 60,
        width: 960,
        height: 210,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 56,
          lineHeight: 1.18,
          textAlign: 'center',
          color: COLORS.white,
          letterSpacing: '-0.01em',
          opacity: inO,
          transform: `translateY(${y}px) scale(${sc})`,
        }}
      >
        {active.text}
      </div>
    </div>
  );
};
