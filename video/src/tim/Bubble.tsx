import React from 'react';
import {OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FPS} from './theme';

// Circular speaker bubble, top-center — like the reference reel.
// `segments` lets the ad-variant jump-cut to the second CTA take.
export type BubbleSegment = {fromFrame: number; durationInFrames: number; startFromSec: number};

export const Bubble: React.FC<{segments: BubbleSegment[]}> = ({segments}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const pop = spring({frame: frame - 4, fps, config: {damping: 13, stiffness: 120, mass: 0.8}});
  const floatY = Math.sin(frame / (FPS * 1.9)) * 6;
  const floatX = Math.cos(frame / (FPS * 2.7)) * 3;

  const seg = segments.find(
    (s) => frame >= s.fromFrame && frame < s.fromFrame + s.durationInFrames,
  );
  if (!seg) return null;

  // Tiny punch on segment change to make the jump cut feel intentional.
  const local = frame - seg.fromFrame;
  const punch = seg.fromFrame === 0 ? 1 : interpolate(local, [0, 7], [1.028, 1], {extrapolateRight: 'clamp'});

  const size = 460;
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - size) / 2 + floatX,
        top: 108 + floatY,
        width: size,
        height: size,
        transform: `scale(${pop * punch})`,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: '0 30px 90px rgba(0,0,0,0.85)',
          outline: '1.5px solid rgba(255,255,255,0.10)',
          outlineOffset: -1,
        }}
      >
        <OffthreadVideo
          src={staticFile('assets/tim-bubble.mp4')}
          startFrom={Math.round(seg.startFromSec * FPS + 1e-6) - seg.fromFrame}
          muted
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
        {/* soft inner vignette so the bright footage sits nicely on black */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.38) 100%)',
          }}
        />
      </div>
    </div>
  );
};
