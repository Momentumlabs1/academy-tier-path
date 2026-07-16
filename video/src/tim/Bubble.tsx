import React from 'react';
import {OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {FPS} from './theme';

// Circular speaker bubble, top-center — like the reference reel.
// Fixed position; a Zoom-style blue ring + subtle breathing react to the voice.
// NOTE on masking: every video layer gets its own borderRadius AND the mask
// container uses clip-path — border-radius+overflow alone does not reliably
// clip composited <video> layers in headless Chromium (caused square spills).
export type BubbleSegment = {fromFrame: number; durationInFrames: number; startFromSec: number};

const SIZE = 430; // etwas kleiner + tiefer: Insta-Crop-sicher
const TOP = 132;
const XFADE_FRAMES = 5;

const videoStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '50%',
};

export const Bubble: React.FC<{segments: BubbleSegment[]}> = ({segments}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // small mono WAV twin of the voice track — headless Chromium can't decode AAC
  const audioData = useAudioData(staticFile('assets/tim-audio-viz.wav'));

  const idx = segments.findIndex(
    (s) => frame >= s.fromFrame && frame < s.fromFrame + s.durationInFrames,
  );
  if (idx < 0) return null;
  const seg = segments[idx];
  const localF = frame - seg.fromFrame;

  const segStartFrom = (s: BubbleSegment) =>
    Math.round(s.startFromSec * FPS + 1e-6) - s.fromFrame;

  // short crossfade over each cut: the previous take keeps running on top
  const prev = idx > 0 && localF < XFADE_FRAMES ? segments[idx - 1] : null;
  const prevOpacity = prev ? 1 - (localF + 1) / (XFADE_FRAMES + 1) : 0;

  // speech level from the actual audio (temporally smoothed over 3 frames)
  let level = 0;
  if (audioData) {
    const srcFrame = segStartFrom(seg) + frame;
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

  // entrance pop, tiny cut-punch, voice breathing, slow idle breathing
  const pop = spring({frame: frame - 4, fps, config: {damping: 13, stiffness: 120, mass: 0.8}});
  const punch = seg.fromFrame === 0 ? 1 : interpolate(localF, [0, 7], [1.012, 1], {extrapolateRight: 'clamp'});
  const breathe = 1 + Math.sin(frame / (FPS * 2.4)) * 0.0035;
  const speakScale = 1 + level * 0.012;
  // short bright ring flash on the entrance (hook energy in the first second)
  const introFlash = Math.max(0, 1 - frame / 22);

  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - SIZE) / 2,
        top: TOP,
        width: SIZE,
        height: SIZE,
        transform: `scale(${pop * punch * speakScale * breathe})`,
      }}
    >
      {/* Zoom-style speaking ring: light blue shimmer driven by the voice */}
      <div
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          border: `3.5px solid rgba(110, 143, 255, ${Math.min(0.85, 0.12 + 0.6 * level + 0.55 * introFlash)})`,
          boxShadow: `0 0 ${16 + 66 * level + 40 * introFlash}px rgba(90, 130, 255, ${Math.min(0.8, 0.16 + 0.52 * level + 0.4 * introFlash)})`,
          transform: `scale(${1 + level * 0.022})`,
        }}
      />
      {/* circular mask: clip-path + per-layer border-radius (robust clipping) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          clipPath: 'circle(50% at 50% 50%)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.85)',
        }}
      >
        <OffthreadVideo
          src={staticFile('assets/tim-bubble.mp4')}
          startFrom={segStartFrom(seg)}
          muted
          style={videoStyle}
        />
        {prev && prevOpacity > 0 ? (
          <OffthreadVideo
            src={staticFile('assets/tim-bubble.mp4')}
            startFrom={segStartFrom(prev)}
            muted
            style={{...videoStyle, opacity: prevOpacity}}
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
      {/* thin hairline on top of everything for a crisp edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.10)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
