import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {afPump, CameraRig, type CameraKeyframe} from '../lib/camera';
import {Cosmo} from '../lib/Cosmo';
import {colors, font, radii, shadows, spacing} from '../lib/tokens';
import {Heading, TierStep} from '../lib/ui';

/**
 * Szene 5 — Level & Unlocks.
 *
 * Tier-Treppe animiert sich von unten nach oben: Foundation → Operator →
 * Elite → Black. Die Kamera klettert die Treppe cinematisch hoch, jede
 * Stufe leuchtet nacheinander auf, Perk-Icons poppen daneben auf. Black
 * bekommt Premium-Treatment (Gold-Aura, Funken, Flash). Cosmo steht klein
 * unten und blickt nach oben. 690 Frames @ 30 fps.
 */

/* ------------------------------------------------------------------ */
/* Timing (frames)                                                     */
/* ------------------------------------------------------------------ */

const T = {
  titleIn: 10,
  titleOutStart: 112,
  titleOutEnd: 142,
  s1In: 46,
  s1Light: 84,
  s2In: 148,
  s2Light: 190,
  s2LightB: 210,
  s3In: 254,
  s3Light: 296,
  s4In: 362,
  blackGlow: 372,
  s4Light: 400,
  flashStart: 400,
  flashEnd: 430,
  camToS2: 122,
  camAtS2: 168,
  camToS3: 228,
  camAtS3: 274,
  camToS4: 334,
  camAtS4: 386,
  pullBack: 508,
  pullDone: 575,
  captionIn: 590,
} as const;

/* ------------------------------------------------------------------ */
/* Staircase geometry (world coordinates, 1920x1080 stage)             */
/* ------------------------------------------------------------------ */

const STEP_W = 560;
const STEP_H = 185;

type Tier = {
  label: string;
  perks: string[];
  x: number;
  y: number;
  appear: number;
  light: number;
};

const TIERS: Tier[] = [
  {
    label: 'Foundation',
    perks: ['Basis-Signale', 'Academy-Zugang'],
    x: 200,
    y: 830,
    appear: T.s1In,
    light: T.s1Light,
  },
  {
    label: 'Operator',
    perks: ['Mehr Signale', 'Live-Room'],
    x: 580,
    y: 600,
    appear: T.s2In,
    light: T.s2Light,
  },
  {
    label: 'Elite',
    perks: ['Alle Live-Sessions', '1:1 Coaching'],
    x: 960,
    y: 370,
    appear: T.s3In,
    light: T.s3Light,
  },
  {
    label: 'Black',
    perks: ['VIP-Betreuung', 'Inner Circle', 'Direkter Draht'],
    x: 1340,
    y: 140,
    appear: T.s4In,
    light: T.s4Light,
  },
];

const centerOf = (t: Tier): {cx: number; cy: number} => ({
  cx: t.x + STEP_W / 2,
  cy: t.y + STEP_H / 2,
});

/* ------------------------------------------------------------------ */
/* Camera — starts tight on Cosmo at the base, climbs step by step     */
/* (plateaus on each tier), pushes into Black, then pulls back for     */
/* the full-staircase reveal and keeps drifting.                       */
/* pan = (stageCenter - target) * zoom                                 */
/* ------------------------------------------------------------------ */

const CAMERA: CameraKeyframe[] = [
  {frame: 0, zoom: 1.5, panX: 810, panY: -562, blur: 12},
  {frame: 30, blur: 0},
  {frame: 55, zoom: 1.4, panX: 616, panY: -476}, // Foundation
  {frame: T.camToS2, zoom: 1.4, panX: 616, panY: -476}, // hold
  {frame: T.camAtS2, zoom: 1.38, panX: 110, panY: -166}, // Operator
  {frame: T.camToS3, zoom: 1.38, panX: 110, panY: -166}, // hold
  {frame: T.camAtS3, zoom: 1.38, panX: -400, panY: 152}, // Elite
  {frame: T.camToS4, zoom: 1.38, panX: -400, panY: 152}, // hold
  {frame: T.camAtS4, zoom: 1.42, panX: -937, panY: 440}, // Black
  {frame: 460, zoom: 1.5, panX: -990, panY: 465}, // slow push into Black
  {frame: T.pullBack, zoom: 1.5, panX: -990, panY: 465}, // hold
  {frame: T.pullDone, zoom: 0.97, panX: 0, panY: 0}, // full reveal
  {frame: 689, zoom: 1.03, panX: -14, panY: 10}, // endless drift
];

/* ------------------------------------------------------------------ */
/* Backdrop — bleeds beyond the stage so pans never reveal a void.     */
/* ------------------------------------------------------------------ */

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const breathe = (Math.sin(frame * 0.035) + 1) / 2;

  return (
    <div style={{position: 'absolute', inset: -420, backgroundColor: colors.bg}}>
      {/* blue key glow at the base of the staircase */}
      <div
        style={{
          position: 'absolute',
          left: '-2%',
          bottom: '-6%',
          width: 1500,
          height: 1100,
          background: `radial-gradient(ellipse at center, rgba(117,185,245,${
            0.1 + breathe * 0.035
          }) 0%, transparent 62%)`,
        }}
      />
      {/* warm counter glow at the summit (Black) */}
      <div
        style={{
          position: 'absolute',
          right: '-4%',
          top: '-4%',
          width: 1400,
          height: 1000,
          background: `radial-gradient(ellipse at center, rgba(240,140,30,${
            0.07 + (1 - breathe) * 0.03
          }) 0%, transparent 60%)`,
        }}
      />
      {/* drifting grid (own motion = parallax against the camera) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(117,185,245,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(117,185,245,0.05) 1px, transparent 1px)`,
          backgroundSize: '72px 72px',
          transform: `translate(${-frame * 0.05}px, ${frame * 0.055}px)`,
        }}
      />
      {/* floor glow that grounds Cosmo + Foundation */}
      <div
        style={{
          position: 'absolute',
          left: 480,
          top: 1330,
          width: 1400,
          height: 280,
          background:
            'radial-gradient(ellipse at center, rgba(117,185,245,0.08) 0%, transparent 65%)',
        }}
      />
    </div>
  );
};

/* Giant faint up-chevrons in the empty upper-left — echo the ascent. */
const ChevronWatermark: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg
      width={430}
      height={560}
      viewBox="0 0 430 560"
      style={{
        position: 'absolute',
        left: 160,
        top: 96,
        transform: `translateY(${-frame * 0.07}px)`,
      }}
    >
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M35 ${190 + i * 165} L215 ${60 + i * 165} L395 ${190 + i * 165}`}
          fill="none"
          stroke={`rgba(117,185,245,${0.055 - i * 0.012})`}
          strokeWidth={30}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Ascent path — glowing line that draws itself up the staircase,      */
/* always one move ahead of the camera. Junction dots ignite as the    */
/* line passes them.                                                   */
/* ------------------------------------------------------------------ */

const AscentPath: React.FC = () => {
  const frame = useCurrentFrame();

  const pts = TIERS.map(centerOf);
  const segLen = Math.hypot(pts[1].cx - pts[0].cx, pts[1].cy - pts[0].cy);
  const total = segLen * 3;

  const progress = interpolate(
    frame,
    [118, 158, T.camToS3 - 4, 264, T.camToS4 - 4, 375],
    [0, 1 / 3, 1 / 3, 2 / 3, 2 / 3, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  return (
    <svg
      width={1920}
      height={1080}
      viewBox="0 0 1920 1080"
      style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}
    >
      <defs>
        <linearGradient
          id="s5-ascent"
          gradientUnits="userSpaceOnUse"
          x1={pts[0].cx}
          y1={pts[0].cy}
          x2={pts[3].cx}
          y2={pts[3].cy}
        >
          <stop offset="0%" stopColor={colors.blue} />
          <stop offset="72%" stopColor={colors.blue} />
          <stop offset="100%" stopColor={colors.orange} />
        </linearGradient>
      </defs>
      <polyline
        points={pts.map((p) => `${p.cx},${p.cy}`).join(' ')}
        fill="none"
        stroke="url(#s5-ascent)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={total}
        strokeDashoffset={total * (1 - progress)}
        style={{filter: 'drop-shadow(0 0 10px rgba(117,185,245,0.55))'}}
        opacity={0.85}
      />
      {pts.map((p, i) => {
        const reached = progress >= i / 3 - 0.001;
        const on = interpolate(
          frame,
          [TIERS[i].appear + 16, TIERS[i].appear + 30],
          [0, 1],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
        );
        const isBlack = i === 3;
        return (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={8}
            fill={isBlack ? colors.orange : colors.blue}
            opacity={reached ? on * 0.9 : 0}
            style={{
              filter: `drop-shadow(0 0 8px ${
                isBlack ? 'rgba(240,140,30,0.8)' : 'rgba(117,185,245,0.8)'
              })`,
            }}
          />
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Light-up aura behind a step: springs in when the step ignites,      */
/* eases down to an "unlocked ember" when the camera moves on.         */
/* ------------------------------------------------------------------ */

const StepAura: React.FC<{
  cx: number;
  cy: number;
  inFrame: number;
  dimFrame?: number;
}> = ({cx, cy, inFrame, dimFrame}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: frame - inFrame,
    fps,
    config: {damping: 20, stiffness: 70, mass: 1},
  });
  const dim =
    dimFrame === undefined
      ? 1
      : interpolate(frame, [dimFrame, dimFrame + 40], [1, 0.42], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

  return (
    <div
      style={{
        position: 'absolute',
        left: cx - 460,
        top: cy - 290,
        width: 920,
        height: 580,
        background:
          'radial-gradient(ellipse at center, rgba(117,185,245,0.17) 0%, transparent 62%)',
        opacity: enter * dim,
        pointerEvents: 'none',
      }}
    />
  );
};

/* Premium gold aura + rising sparkles for the Black tier. */
const BlackAura: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: frame - T.blackGlow,
    fps,
    config: {damping: 22, stiffness: 60, mass: 1.1},
  });
  const breathe = 0.82 + 0.18 * Math.sin(frame * 0.055);
  const {cx, cy} = centerOf(TIERS[3]);

  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {/* wide gold wash */}
      <div
        style={{
          position: 'absolute',
          left: cx - 520,
          top: cy - 340,
          width: 1040,
          height: 680,
          background:
            'radial-gradient(ellipse at center, rgba(245,197,107,0.19) 0%, transparent 60%)',
          opacity: enter * breathe,
        }}
      />
      {/* hot orange core */}
      <div
        style={{
          position: 'absolute',
          left: cx - 380,
          top: cy - 240,
          width: 760,
          height: 480,
          background:
            'radial-gradient(ellipse at center, rgba(240,140,30,0.16) 0%, transparent 58%)',
          opacity: enter,
        }}
      />
    </div>
  );
};

const Sparkles: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.s4In + 6) return null;

  const fadeIn = interpolate(frame, [T.s4In + 8, T.s4In + 42], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dots = Array.from({length: 12}, (_, i) => {
    const t = frame - T.s4In - i * 9;
    if (t < 0) return null;
    const cycle = 130 + (i % 5) * 22;
    const p = ((t % cycle) + cycle) % cycle / cycle;
    const x = 1370 + ((i * 97) % 520) + Math.sin(t * 0.06 + i * 1.7) * 9;
    const y = 348 - p * 268;
    const size = 3 + (i % 3);
    const gold = i % 2 === 0;
    const op = Math.sin(p * Math.PI) * (0.45 + (i % 3) * 0.16) * fadeIn;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: gold ? '#F5C56B' : colors.orange,
          boxShadow: `0 0 ${6 + size * 2}px ${
            gold ? 'rgba(245,197,107,0.9)' : 'rgba(240,140,30,0.9)'
          }`,
          opacity: op,
        }}
      />
    );
  });

  return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>{dots}</div>;
};

/* ------------------------------------------------------------------ */
/* Sheen sweep — a light streak brushes across a step when it ignites. */
/* ------------------------------------------------------------------ */

const SheenSweep: React.FC<{x: number; y: number; atFrame: number}> = ({
  x,
  y,
  atFrame,
}) => {
  const frame = useCurrentFrame();
  if (frame < atFrame || frame > atFrame + 30) return null;

  const p = interpolate(frame, [atFrame, atFrame + 28], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: STEP_W,
        height: STEP_H,
        borderRadius: radii.md,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -30,
          bottom: -30,
          width: '38%',
          left: `${-45 + p * 165}%`,
          background:
            'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.13) 50%, transparent 100%)',
          transform: 'skewX(-16deg)',
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Perk pops — medallion icon + label pill that spring in beside the   */
/* active step, with an expanding ring ripple.                         */
/* ------------------------------------------------------------------ */

type PerkIconType = 'chart' | 'signal' | 'live' | 'one' | 'crown';

const PerkIcon: React.FC<{type: PerkIconType; color: string}> = ({type, color}) => {
  switch (type) {
    case 'chart':
      return (
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 17 L9 11 L13 14.5 L21 6.5"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 6.5 H21 V12"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'signal':
      return (
        <svg width={28} height={28} viewBox="0 0 24 24">
          <rect x={4} y={13} width={3.6} height={7} rx={1.4} fill={color} />
          <rect x={10.2} y={9} width={3.6} height={11} rx={1.4} fill={color} />
          <rect x={16.4} y={4.5} width={3.6} height={15.5} rx={1.4} fill={color} />
        </svg>
      );
    case 'live':
      return (
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <circle cx={12} cy={12} r={3} fill={color} />
          <path
            d="M7.2 7.2 a6.8 6.8 0 0 0 0 9.6 M16.8 7.2 a6.8 6.8 0 0 1 0 9.6"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'one':
      return (
        <svg width={28} height={28} viewBox="0 0 24 24" fill={color}>
          <circle cx={8.4} cy={8.6} r={2.9} />
          <path d="M3.4 18.6 a5 5 0 0 1 10 0 Z" />
          <circle cx={16.6} cy={8.6} r={2.9} opacity={0.55} />
          <path d="M13 18.6 a5 5 0 0 1 8.4 -3.6 v3.6 Z" opacity={0.55} />
        </svg>
      );
    case 'crown':
      return (
        <svg width={28} height={28} viewBox="0 0 24 24">
          <path
            d="M4 17.5 L4 8.5 L8.6 12.4 L12 6.5 L15.4 12.4 L20 8.5 L20 17.5 Z"
            fill={color}
          />
          <circle cx={12} cy={4.6} r={1.4} fill={color} />
        </svg>
      );
  }
};

const PerkPop: React.FC<{
  x: number;
  y: number;
  appear: number;
  label: string;
  icon: PerkIconType;
  gold?: boolean;
}> = ({x, y, appear, label, icon, gold = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < appear) return null;

  const accent = gold ? colors.orange : colors.blue;
  const enter = spring({
    frame: frame - appear,
    fps,
    config: {damping: 11, stiffness: 170, mass: 0.6},
  });
  const fade = interpolate(frame, [appear, appear + 7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ring = interpolate(frame, [appear, appear + 26], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        opacity: fade,
        transform: `scale(${0.5 + enter * 0.5})`,
        transformOrigin: 'left center',
      }}
    >
      <div style={{position: 'relative', width: 64, height: 64}}>
        {/* ring ripple */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid ${accent}`,
            transform: `scale(${1 + ring * 0.9})`,
            opacity: (1 - ring) * 0.6,
          }}
        />
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: colors.panelSoft,
            border: `1.5px solid ${gold ? 'rgba(240,140,30,0.55)' : colors.strokeStrong}`,
            boxShadow: gold ? shadows.glowOrange : shadows.glowBlue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PerkIcon type={icon} color={gold ? '#F5C56B' : colors.blue} />
        </div>
      </div>
      <span
        style={{
          padding: '10px 20px',
          borderRadius: radii.pill,
          backgroundColor: 'rgba(19,26,36,0.92)',
          border: `1px solid ${gold ? 'rgba(240,140,30,0.4)' : colors.stroke}`,
          fontSize: 24,
          fontWeight: font.weight.semibold,
          color: gold ? '#F5C56B' : colors.text,
          whiteSpace: 'nowrap',
          boxShadow: shadows.soft,
        }}
      >
        {label}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export const Scene5Tiers: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // HUD title in/out (fixed overlay, unaffected by the climbing camera)
  const titleIn = spring({
    frame: frame - T.titleIn,
    fps,
    config: {damping: 17, stiffness: 110, mass: 0.9},
  });
  const titleOut = interpolate(frame, [T.titleOutStart, T.titleOutEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleOpacity = titleIn * titleOut;

  // Closing caption after the pull-back reveal
  const captionIn = spring({
    frame: frame - T.captionIn,
    fps,
    config: {damping: 22, stiffness: 80, mass: 1},
  });

  // AF hunts & locks on each landing, tiny re-focus on the final reveal
  const rackFocus =
    afPump(frame, [T.camAtS2, T.camAtS3, T.camAtS4], {
      maxBlur: 4.5,
      attack: 12,
      release: 16,
    }) + afPump(frame, [T.pullDone + 2], {maxBlur: 3, attack: 14, release: 18});

  // Gold flash the moment Black ignites (Black sits screen-center then)
  const flash = interpolate(frame, [T.flashStart, T.flashEnd], [0.3, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, fontFamily: font.family}}>
      <CameraRig keyframes={CAMERA} shake={0.45} shakeSeed={53} extraBlur={rackFocus}>
        <Backdrop />
        <ChevronWatermark />
        <AscentPath />

        {/* light-up auras (blue for tiers 1–3, dimming to an ember) */}
        <StepAura {...centerOf(TIERS[0])} inFrame={T.s1Light - 6} dimFrame={T.camToS2} />
        <StepAura {...centerOf(TIERS[1])} inFrame={T.s2Light - 6} dimFrame={T.camToS3} />
        <StepAura {...centerOf(TIERS[2])} inFrame={T.s3Light - 6} dimFrame={T.camToS4} />
        <BlackAura />

        {/* Cosmo at the base, small, gazing up the staircase */}
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: 1044,
            width: 190,
            height: 30,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 668,
            transform: 'rotate(-2.5deg)',
            transformOrigin: 'bottom center',
          }}
        >
          <Cosmo height={402} idleSeed={5} />
        </div>

        {/* the staircase — tiny per-step float keeps the frame alive */}
        {TIERS.map((tier, i) => {
          const float = Math.sin(frame * 0.042 + i * 1.9) * 2.5;
          return (
            <div
              key={tier.label}
              style={{
                position: 'absolute',
                left: tier.x,
                top: tier.y,
                transform: `translateY(${float}px)`,
              }}
            >
              <TierStep
                label={tier.label}
                perks={tier.perks}
                index={i}
                active={i === 3}
                appearFrame={tier.appear}
                width={STEP_W}
                height={STEP_H}
              />
            </div>
          );
        })}

        {/* ignition sheens */}
        {TIERS.map((tier) => (
          <SheenSweep key={tier.label} x={tier.x} y={tier.y} atFrame={tier.light} />
        ))}

        {/* rising gold sparkles around Black */}
        <Sparkles />

        {/* perk pops (mehr Signale, Live-Room, 1:1, VIP) */}
        <PerkPop x={790} y={866} appear={T.s1Light} label="Signale ab Tag 1" icon="chart" />
        <PerkPop x={1170} y={618} appear={T.s2Light} label="Mehr Signale" icon="signal" />
        <PerkPop x={1170} y={698} appear={T.s2LightB} label="Live-Room" icon="live" />
        <PerkPop x={1550} y={390} appear={T.s3Light} label="1:1 Betreuung" icon="one" />
        <PerkPop x={1478} y={54} appear={T.s4Light} label="VIP" icon="crown" gold />
      </CameraRig>

      {/* ---------- fixed HUD title ---------- */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 66,
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleIn) * 40 - (1 - titleOut) * 24}px)`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 21,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.24em',
            color: colors.orange,
            marginBottom: 10,
          }}
        >
          LEVEL &amp; UNLOCKS
        </div>
        <Heading size={62}>Dein Weg nach oben</Heading>
      </div>

      {/* ---------- closing caption ---------- */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 56,
          textAlign: 'center',
          fontSize: 34,
          fontWeight: font.weight.medium,
          letterSpacing: '0.02em',
          color: colors.textDim,
          textShadow: '0 2px 18px rgba(4,7,12,0.85)',
          opacity: captionIn,
          transform: `translateY(${(1 - captionIn) * 30}px)`,
        }}
      >
        <span style={{color: colors.text, fontWeight: font.weight.bold}}>
          Du entscheidest,
        </span>{' '}
        wie tief du gehst<span style={{color: colors.orange}}>.</span>
      </div>

      {/* gold ignition flash (over the rig, under the vignette) */}
      {flash > 0 && (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(ellipse at 50% 42%, rgba(245,180,80,0.55) 0%, transparent 56%)',
            opacity: flash,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* cinematic vignette, locked to the frame */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 52%, rgba(4,7,12,0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
