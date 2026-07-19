import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

/**
 * Camera rig — the "living camera" of every CosmoTrades scene.
 * Punch-ins, pans, rack-focus and handheld micro-shake, all keyframe-driven.
 */

export type CameraKeyframe = {
  frame: number;
  /** Scale factor. 1 = no zoom. */
  zoom?: number;
  /** Horizontal translate in px (positive = content moves right). */
  panX?: number;
  /** Vertical translate in px (positive = content moves down). */
  panY?: number;
  /** CSS blur in px. 0 = sharp. */
  blur?: number;
};

type Channel = 'zoom' | 'panX' | 'panY' | 'blur';

const CHANNEL_DEFAULTS: Record<Channel, number> = {
  zoom: 1,
  panX: 0,
  panY: 0,
  blur: 0,
};

/**
 * Interpolates one channel across all keyframes that define it.
 * Segments ease smoothly (cubic in-out); values clamp outside the range.
 */
const channelValue = (
  keyframes: readonly CameraKeyframe[],
  channel: Channel,
  frame: number,
): number => {
  const points = keyframes
    .filter((k) => k[channel] !== undefined)
    .sort((a, b) => a.frame - b.frame)
    // Dedupe identical frames (last one wins) — interpolate() needs a
    // strictly increasing input range.
    .filter((k, i, arr) => i === arr.length - 1 || arr[i + 1].frame !== k.frame);

  if (points.length === 0) {
    return CHANNEL_DEFAULTS[channel];
  }
  if (points.length === 1) {
    return points[0][channel] as number;
  }

  return interpolate(
    frame,
    points.map((p) => p.frame),
    points.map((p) => p[channel] as number),
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
};

/**
 * Deterministic layered-sine noise in [-1, 1] — cheap, seedable, loopless.
 */
const noise = (f: number, seed: number): number =>
  Math.sin(f * 0.093 + seed * 12.9898) * 0.62 +
  Math.sin(f * 0.0417 + seed * 78.233 + 1.7) * 0.38;

/**
 * Tiny handheld jitter for the "camera being adjusted" feel.
 * Returns px offsets + a fraction of a degree of roll.
 *
 * @param frame     current frame
 * @param seed      any number; different seeds -> different jitter paths
 * @param amplitude 1 = subtle default; scale up for the cold-open reframe
 */
export const microReframe = (
  frame: number,
  seed = 0,
  amplitude = 1,
): {x: number; y: number; rotation: number} => ({
  x: noise(frame, seed + 1) * 3.2 * amplitude,
  y: noise(frame, seed + 2) * 2.2 * amplitude,
  rotation: noise(frame, seed + 3) * 0.18 * amplitude,
});

export type AfPumpOptions = {
  /** Peak blur in px. Default 9. */
  maxBlur?: number;
  /** Frames the blur takes to build before the pump peak. Default 10. */
  attack?: number;
  /** Frames the blur takes to resolve back to sharp. Default 16. */
  release?: number;
};

/**
 * Autofocus pump: around each frame in `atFrames`, blur rises to `maxBlur`
 * and then resolves back to razor-sharp — the classic AF "hunt & lock".
 * Overlapping pumps take the max, so chains read as continuous hunting.
 *
 * Feed the result into <CameraRig extraBlur={...}> or any CSS filter.
 */
export const afPump = (
  frame: number,
  atFrames: readonly number[],
  options: AfPumpOptions = {},
): number => {
  const {maxBlur = 9, attack = 10, release = 16} = options;
  let blur = 0;
  for (const t of atFrames) {
    if (frame < t - attack || frame > t + release) {
      continue;
    }
    const v =
      frame <= t
        ? interpolate(frame, [t - attack, t], [0, maxBlur], {
            easing: Easing.out(Easing.quad),
          })
        : interpolate(frame, [t, t + release], [maxBlur, 0], {
            easing: Easing.inOut(Easing.cubic),
          });
    blur = Math.max(blur, v);
  }
  return blur;
};

export type CameraRigProps = {
  /** Sparse keyframes; each channel is interpolated independently. */
  keyframes?: CameraKeyframe[];
  /** Handheld micro-shake amount. 0 = locked-off (default), 1 = subtle, 2+ = nervous. */
  shake?: number;
  /** Seed for the shake path so two rigs never move in sync. */
  shakeSeed?: number;
  /** Additional blur px added on top of keyframed blur (e.g. from afPump). */
  extraBlur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Wraps children in an animatable camera: zoom (scale), pan (translate),
 * focus blur and optional micro-shake — all driven by the current frame.
 */
export const CameraRig: React.FC<CameraRigProps> = ({
  keyframes = [],
  shake = 0,
  shakeSeed = 0,
  extraBlur = 0,
  style,
  children,
}) => {
  const frame = useCurrentFrame();

  const zoom = channelValue(keyframes, 'zoom', frame);
  const panX = channelValue(keyframes, 'panX', frame);
  const panY = channelValue(keyframes, 'panY', frame);
  const blur = channelValue(keyframes, 'blur', frame) + extraBlur;

  const jitter =
    shake > 0 ? microReframe(frame, shakeSeed, shake) : {x: 0, y: 0, rotation: 0};

  return (
    <AbsoluteFill style={{overflow: 'hidden', ...style}}>
      <AbsoluteFill
        style={{
          transform: `translate(${panX + jitter.x}px, ${panY + jitter.y}px) rotate(${jitter.rotation}deg) scale(${zoom})`,
          filter: blur > 0.01 ? `blur(${blur}px)` : undefined,
          willChange: 'transform, filter',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
