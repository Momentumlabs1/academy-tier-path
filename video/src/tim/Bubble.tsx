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

  const idx = segments.findIndex(
    (s) => frame >= s.fromFrame && frame < s.fromFrame + s.durationInFrames,
  );
  if (idx < 0) return null;
  const seg = segments[idx];

  const startFrom = Math.round(seg.startFromSec * FPS + 1e-6) - seg.fromFrame;
  const srcFrame = startFrom + frame;

  // short crossfade over each cut: the previous take keeps running underneath
  const XF = 5;
  const localF = frame - seg.fromFrame;
  const prev = idx > 0 && localF < XF ? segments[idx - 1] : null;
  const prevOpacity = prev ? 1 - (localF + 1) / (XF + 1) : 0;
  const prevStartFrom = prev ? Math.round(prev.startFromSec * FPS + 1e-6) - prev.fromFrame : 0;

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
  const punch = seg.fromFrame === 0 ? 1 : interpolate(localF, [0, 7], [1.012, 1], {extrapolateRight: 'clamp'});
  const speakScale = 1 + level * 0.012; // bubble breathes slightly with the voice

  const size = 460;
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - size) / 2,
        top: 108,
        width: size,
        height: size,
        transform: `scale(${pop * punch * speakScale})`,
      }}
    >
      {/* Zoom-style speaking ring: light blue shimmer driven by the voice */}
      <div
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          border: `3.5px solid rgba(110, 143, 255, ${0.12 + 0.6 * level})`,
          boxShadow: `0 0 ${16 + 66 * level}px rgba(90, 130, 255, ${0.16 + 0.52 * level})`,
          transform: `scale(${1 + level * 0.022})`,
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
        {prev && prevOpacity > 0 ? (
          <OffthreadVideo
            src={staticFile('assets/tim-bubble.mp4')}
            startFrom={prevStartFrom}
            muted
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: prevOpacity,
            }}
          />
        ) : null}
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
