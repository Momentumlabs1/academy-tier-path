import React from 'react';
import {OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {FPS} from './theme';

// Circular speaker bubble, top-center — like the reference reel.
// Position is rock-solid (no drift); a Zoom-style blue ring glows with speech.
export type BubbleSegment = {fromFrame: number; durationInFrames: number; startFromSec: number};

export const Bubble: React.FC<{segments: BubbleSegment[]}> = ({segments}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // small mono WAV twin of the voice track — headless Chromium can't decode AAC
  const audioData = useAudioData(staticFile('assets/tim-audio-viz.wav'));

  const pop = spring({frame: frame - 4, fps, config: {damping: 13, stiffness: 120, mass: 0.8}});

  const seg = segments.find(
    (s) => frame >= s.fromFrame && frame < s.fromFrame + s.durationInFrames,
  );
  if (!seg) return null;

  const startFrom = Math.round(seg.startFromSec * FPS + 1e-6) - seg.fromFrame;
  const srcFrame = startFrom + frame;

  // speech level from the actual audio (temporally smoothed over 3 frames)
  let level = 0;
  if (audioData) {
    const bins = [0, 1, 2].flatMap((back) =>
      visualizeAudio({
        audioData,
        frame: Math.max(0, srcFrame - back),
        fps,
        numberOfSamples: 16,
      }).slice(0, 6),
    );
    const energy = bins.reduce((a, b) => a + b, 0) / bins.length;
    level = Math.min(1, energy * 5);
  }

  // Tiny punch on segment change to make the jump cut feel intentional.
  const local = frame - seg.fromFrame;
  const punch = seg.fromFrame === 0 ? 1 : interpolate(local, [0, 7], [1.02, 1], {extrapolateRight: 'clamp'});

  const size = 460;
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - size) / 2,
        top: 108,
        width: size,
        height: size,
        transform: `scale(${pop * punch})`,
      }}
    >
      {/* Zoom-style speaking ring: light blue shimmer driven by the voice */}
      <div
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          border: `3px solid rgba(110, 143, 255, ${0.10 + 0.5 * level})`,
          boxShadow: `0 0 ${14 + 50 * level}px rgba(90, 130, 255, ${0.15 + 0.45 * level})`,
          transform: `scale(${1 + level * 0.014})`,
        }}
      />
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
          startFrom={startFrom}
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
