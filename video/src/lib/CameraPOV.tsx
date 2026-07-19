import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {afPump} from './camera';
import {colors, font} from './tokens';

/**
 * Camera-UI overlay for the POV cold open: everything you would see through
 * Cosmo's own camera — REC dot, timecode, battery, autofocus brackets,
 * vignette. Pure code, layered on top of the scene.
 */

export type CameraPOVProps = {
  /** Blinking red REC dot + "REC" label (top-left). Default true. */
  rec?: boolean;
  /** Running timecode HH:MM:SS:FF (top-center). Default true. */
  timecode?: boolean;
  /** Battery icon (top-right). Default true. */
  battery?: boolean;
  /** Autofocus corner brackets (center). Default true. */
  brackets?: boolean;
  /** Dark edge vignette. Default true. */
  vignette?: boolean;
  /** Battery charge 0..1. Default 0.78. */
  batteryLevel?: number;
  /** Offset added to the current frame before formatting the timecode. */
  timecodeStartFrame?: number;
  /** Frames at which the AF brackets pump out and flash on resolve. */
  focusPulseFrames?: number[];
  /** Color of the resolve flash. Default green (focus locked). */
  focusFlashColor?: string;
};

const pad = (n: number): string => String(n).padStart(2, '0');

const formatTimecode = (frame: number, fps: number): string => {
  const f = Math.max(0, Math.floor(frame));
  const totalSeconds = Math.floor(f / fps);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const ff = f % fps;
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
};

const hudText: React.CSSProperties = {
  fontFamily: font.mono,
  fontSize: 26,
  fontWeight: 600,
  letterSpacing: '0.12em',
  color: 'rgba(255, 255, 255, 0.92)',
  textShadow: '0 1px 6px rgba(0, 0, 0, 0.6)',
};

/** One corner of the AF bracket as an SVG L-shape. */
const Corner: React.FC<{
  rotation: number;
  color: string;
  size: number;
}> = ({rotation, color, size}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    style={{transform: `rotate(${rotation}deg)`, display: 'block'}}
  >
    <path
      d="M 4 24 L 4 4 L 24 4"
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const CameraPOV: React.FC<CameraPOVProps> = ({
  rec = true,
  timecode = true,
  battery = true,
  brackets = true,
  vignette = true,
  batteryLevel = 0.78,
  timecodeStartFrame = 0,
  focusPulseFrames = [],
  focusFlashColor = colors.up,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  // REC dot: hard blink, ~1 Hz.
  const recOn = frame % fps < fps * 0.55;

  // AF brackets: gentle breathing + pump around each focus pulse,
  // then a flash when focus resolves.
  const breathe = 1 + Math.sin(frame * 0.06) * 0.015;
  const pump = afPump(frame, focusPulseFrames, {maxBlur: 1, attack: 12, release: 10});
  const bracketScale = breathe + pump * 0.16; // expands while hunting

  let flash = 0;
  for (const t of focusPulseFrames) {
    if (frame >= t && frame <= t + 14) {
      flash = Math.max(
        flash,
        interpolate(frame, [t, t + 14], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      );
    }
  }
  const bracketColor =
    flash > 0.01 ? focusFlashColor : 'rgba(255, 255, 255, 0.85)';

  const boxSize = 460;
  const cornerSize = 56;
  const level = Math.min(1, Math.max(0, batteryLevel));

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {vignette && (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(ellipse 72% 62% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)',
          }}
        />
      )}

      {/* Top-left: REC */}
      {rec && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            left: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: colors.rec,
              opacity: recOn ? 1 : 0.12,
              boxShadow: recOn ? `0 0 14px ${colors.rec}` : 'none',
            }}
          />
          <span style={hudText}>REC</span>
        </div>
      )}

      {/* Top-center: timecode */}
      {timecode && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <span style={{...hudText, opacity: 0.85}}>
            {formatTimecode(frame + timecodeStartFrame, fps)}
          </span>
        </div>
      )}

      {/* Top-right: battery */}
      {battery && (
        <div style={{position: 'absolute', top: 48, right: 56}}>
          <svg width={64} height={30} viewBox="0 0 64 30">
            <rect
              x={1.5}
              y={1.5}
              width={55}
              height={27}
              rx={6}
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth={3}
            />
            <rect x={58} y={9} width={5} height={12} rx={2} fill="rgba(255,255,255,0.85)" />
            <rect
              x={6}
              y={6}
              width={46 * level}
              height={18}
              rx={3}
              fill={level < 0.2 ? colors.rec : 'rgba(255,255,255,0.85)'}
            />
          </svg>
        </div>
      )}

      {/* Center: autofocus corner brackets */}
      {brackets && (
        <div
          style={{
            position: 'absolute',
            left: width / 2 - boxSize / 2,
            top: height / 2 - boxSize / 2,
            width: boxSize,
            height: boxSize,
            transform: `scale(${bracketScale})`,
            opacity: 0.9 + flash * 0.1,
            filter: flash > 0.01 ? `drop-shadow(0 0 ${10 * flash}px ${focusFlashColor})` : undefined,
          }}
        >
          <div style={{position: 'absolute', top: 0, left: 0}}>
            <Corner rotation={0} color={bracketColor} size={cornerSize} />
          </div>
          <div style={{position: 'absolute', top: 0, right: 0}}>
            <Corner rotation={90} color={bracketColor} size={cornerSize} />
          </div>
          <div style={{position: 'absolute', bottom: 0, right: 0}}>
            <Corner rotation={180} color={bracketColor} size={cornerSize} />
          </div>
          <div style={{position: 'absolute', bottom: 0, left: 0}}>
            <Corner rotation={270} color={bracketColor} size={cornerSize} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
