import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';

/**
 * <Cosmo> — the character layer.
 *
 * Currently renders a static PNG with a subtle idle "breathing" loop so
 * previews already feel alive.
 *
 * TODO(character-clips): Replace the <Img> below with
 *   <OffthreadVideo transparent src={staticFile('cosmo/clips/<clip>.webm')} />
 * once the keyed alpha-WebM clips (C1–C13, see docs/videos/01-onboarding-
 * walkthrough.md) exist. Keep the same positioning wrapper so scenes don't
 * need to change.
 */

export type CosmoVariant = 'master' | 'plate1' | 'plate4' | 'portrait';

const VARIANT_FILES: Record<CosmoVariant, string> = {
  /** Transparent full-body master (2160x3840) */
  master: 'cosmo/master.png',
  /** P1 frontal full-body on magenta plate */
  plate1: 'cosmo/plate-P1-frontal-magenta.png',
  /** P4 chest-up close-up on magenta plate */
  plate4: 'cosmo/plate-P4-closeup-magenta.png',
  /** Circular portrait with ring (avatar-style) */
  portrait: 'cosmo/portrait-ring.png',
};

export type CosmoProps = {
  /** Which source image to render. Default 'master'. */
  variant?: CosmoVariant;
  /** Rendered height in px (width follows the aspect ratio). Default 900. */
  height?: number;
  /** Absolute left position in px. If omitted, Cosmo is not absolutely positioned. */
  x?: number;
  /** Absolute top position in px. */
  y?: number;
  /** Mirror horizontally (look the other way). */
  flip?: boolean;
  /** Disable the idle breathing/bob loop (e.g. inside freeze frames). */
  still?: boolean;
  /** Phase offset for the idle loop so multiple Cosmos never move in sync. */
  idleSeed?: number;
  style?: React.CSSProperties;
};

export const Cosmo: React.FC<CosmoProps> = ({
  variant = 'master',
  height = 900,
  x,
  y,
  flip = false,
  still = false,
  idleSeed = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  // Idle breathing: tiny vertical bob + chest scale, layered sines so the
  // loop never reads as mechanical.
  const t = frame + idleSeed * 37;
  const bobY = still ? 0 : Math.sin(t * 0.09) * 4 + Math.sin(t * 0.041 + 1.3) * 2;
  const breathScale = still ? 1 : 1 + Math.sin(t * 0.075 + 0.6) * 0.006;

  const positioned = x !== undefined || y !== undefined;

  return (
    <div
      style={{
        position: positioned ? 'absolute' : 'relative',
        left: x,
        top: y,
        height,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/*
        TODO(character-clips): swap this <Img> for
        <OffthreadVideo transparent src={staticFile('cosmo/clips/….webm')} />
        keeping transform/origin identical.
      */}
      <Img
        src={staticFile(VARIANT_FILES[variant])}
        style={{
          height: '100%',
          width: 'auto',
          transform: `${flip ? 'scaleX(-1) ' : ''}translateY(${bobY}px) scaleY(${breathScale})`,
          transformOrigin: 'bottom center',
        }}
      />
    </div>
  );
};
