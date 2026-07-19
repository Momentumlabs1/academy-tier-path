import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {colors, font, radii, shadows, spacing} from '../lib/tokens';
import {CameraRig, CameraKeyframe} from '../lib/camera';
import {Cosmo} from '../lib/Cosmo';
import {
  Badge,
  CandleChart,
  Heading,
  LessonCard,
  Panel,
  SignalCard,
  TierStep,
} from '../lib/ui';

/**
 * Szene 7 — CTA & Abschluss (540 Frames / 18 s)
 *
 * Beats:
 *   0–40    Dashboard kehrt unscharf zurück, Kamera setzt sich.
 *   20–100  Kicker → Heading → CTA-Button „Konto verknüpfen & einzahlen"
 *           (Glow-Puls, Sheen-Sweep, Radar-Ring).
 *   120–230 „Nächstes Video"-Karte fliegt rein; Schloss ruckelt, springt
 *           auf (Rotations-Spring), Flash-Ring + Sparkle-Burst, Karte
 *           schaltet auf FREIGESCHALTET, Play-Icon federt rein.
 *   245–410 Cosmo springt jubelnd von unten ins Bild (Overshoot-Spring,
 *           Lande-Wobble, Sparkles), „STUFE 1"-Chip poppt über ihm auf.
 *   412–540 Alles blendet weich aus → Logo-Sting COSMOTRADES
 *           (Letter-Stagger, Tracking-Settle, Blau/Orange-Underline-Sweep,
 *           Tagline) → Fade to Black.
 */

const CLAMP = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

/* Timing (Frames) ---------------------------------------------------- */
const KICKER_IN = 22;
const HEADING_IN = 36;
const CTA_IN = 58;
const MICRO_IN = 86;
const CARD_IN = 122;
const UNLOCK_AT = 196;
const COSMO_JUMP = 245;
const CHIP_IN = 302;
const CONTENT_OUT_START = 412;
const CONTENT_OUT_END = 456;
const LOGO_IN = 442;
const BLACK_IN = 516;

/* Deterministic hash for particles ----------------------------------- */
const hash01 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* ------------------------------------------------------------------ */
/* Sparkle burst — tasteful 4-point stars flying outward               */
/* ------------------------------------------------------------------ */

const SPARKLE_COLORS = [colors.blue, colors.orange, colors.text];

const SparkleBurst: React.FC<{
  x: number;
  y: number;
  startFrame: number;
  count?: number;
  seed?: number;
  spread?: number;
}> = ({x, y, startFrame, count = 11, seed = 1, spread = 130}) => {
  const frame = useCurrentFrame();
  const t = frame - startFrame;
  const life = 34;
  if (t < 0 || t > life) {
    return null;
  }
  const travel = interpolate(t, [0, life * 0.9], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const fade = interpolate(t, [0, life * 0.45, life], [1, 1, 0], CLAMP);

  return (
    <div style={{position: 'absolute', left: x, top: y, pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const r1 = hash01(seed * 13.7 + i * 3.1);
        const r2 = hash01(seed * 71.3 + i * 7.9);
        const angle = (i / count) * Math.PI * 2 + r1 * 0.9;
        const dist = spread * (0.35 + r2 * 0.65) * travel;
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist * 0.82 - t * 1.1;
        const size = (7 + r1 * 9) * (1 - t / life);
        const c = SPARKLE_COLORS[i % 3];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px - size / 2,
              top: py - size / 2,
              width: size,
              height: size,
              backgroundColor: c,
              clipPath:
                'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)',
              transform: `rotate(${angle * 57 + t * 5}deg)`,
              opacity: fade,
              filter: `drop-shadow(0 0 6px ${c})`,
            }}
          />
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Padlock that springs open                                           */
/* ------------------------------------------------------------------ */

const Padlock: React.FC<{openFrame: number; size?: number}> = ({
  openFrame,
  size = 120,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Anticipation jiggle shortly before the unlock.
  const tw = frame - (openFrame - 16);
  const jiggle =
    frame < openFrame && tw >= 0 ? Math.sin(tw * 0.95) * 3.4 * Math.exp(-tw * 0.1) : 0;

  // Bouncy shackle rotation (positive SVG rotation lifts the left leg up).
  const open = spring({
    frame: frame - openFrame,
    fps,
    config: {damping: 9, stiffness: 130, mass: 0.8},
  });
  const shackleRot = open * 62;
  const pop = interpolate(open, [0, 0.4, 1], [1, 1.09, 1], CLAMP);

  // After opening, the lock lifts away and fades so the play icon takes over.
  const fade = interpolate(frame, [openFrame + 22, openFrame + 44], [1, 0], CLAMP);
  const rise = interpolate(frame, [openFrame + 22, openFrame + 44], [0, -30], {
    ...CLAMP,
    easing: Easing.in(Easing.quad),
  });
  if (fade <= 0) {
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{
        display: 'block',
        opacity: fade,
        transform: `translateY(${rise}px) rotate(${jiggle}deg) scale(${pop})`,
        transformOrigin: '50% 70%',
      }}
    >
      {/* Shackle — swings open around its right anchor */}
      <g transform={`rotate(${shackleRot} 82 56)`}>
        <path
          d="M40 56 V38 a20 20 0 0 1 40 0 v18"
          stroke="#93A9BE"
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {/* Body */}
      <rect
        x={26}
        y={54}
        width={68}
        height={50}
        rx={13}
        fill="#22303F"
        stroke="rgba(117,185,245,0.4)"
        strokeWidth={2}
      />
      {/* Keyhole */}
      <circle cx={60} cy={74} r={7} fill={colors.black} />
      <rect x={56.5} y={78} width={7} height={13} rx={3.5} fill={colors.black} />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Expanding unlock flash ring                                         */
/* ------------------------------------------------------------------ */

const FlashRing: React.FC<{x: number; y: number; startFrame: number}> = ({
  x,
  y,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const t = frame - startFrame;
  if (t < 0 || t > 20) {
    return null;
  }
  const p = interpolate(t, [0, 20], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const r = 22 + p * 85;
  return (
    <svg
      width={260}
      height={260}
      style={{position: 'absolute', left: x - 130, top: y - 130, pointerEvents: 'none'}}
    >
      <circle
        cx={130}
        cy={130}
        r={r}
        fill="none"
        stroke={colors.blue}
        strokeWidth={3.5 * (1 - p) + 0.5}
        opacity={0.9 * (1 - p)}
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* The big CTA button                                                  */
/* ------------------------------------------------------------------ */

const CtaButton: React.FC<{appearFrame: number; width?: number}> = ({
  appearFrame,
  width = 620,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: frame - appearFrame,
    fps,
    config: {damping: 13, stiffness: 110, mass: 0.9},
  });
  const t = Math.max(0, frame - appearFrame);

  // Breathing glow + micro scale pulse.
  const pulse = (Math.sin(t * 0.14) + 1) / 2;
  const scale = (0.92 + enter * 0.08) * (1 + pulse * 0.012);

  // Sheen sweep every ~96 frames.
  const sheenT = (t % 96) / 96;
  const sheenX = interpolate(sheenT, [0.08, 0.5], [-220, width + 120], CLAMP);
  const sheenOpacity = sheenT > 0.06 && sheenT < 0.52 ? 0.4 : 0;

  // Expanding radar ring, every 64 frames after settle.
  const ringT = t > 26 ? ((t - 26) % 64) / 64 : 1;
  const ringScale = 1 + ringT * 0.16;
  const ringOpacity = ringT < 0.999 ? (1 - ringT) * 0.5 : 0;

  const height = 104;

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 70}px) scale(${scale})`,
        transformOrigin: 'center',
      }}
    >
      {/* Radar ring */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radii.lg,
          border: `2px solid ${colors.orange}`,
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />
      {/* Button surface */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radii.lg,
          background: `linear-gradient(135deg, #F7A54A 0%, ${colors.orange} 48%, #D9790F 100%)`,
          boxShadow: `0 18px 50px rgba(240,140,30,${0.26 + pulse * 0.2}), 0 0 ${
            26 + pulse * 30
          }px rgba(240,140,30,${0.32 + pulse * 0.26})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontFamily: font.family,
            fontSize: 30,
            fontWeight: font.weight.black,
            letterSpacing: '0.005em',
            color: '#131108',
            whiteSpace: 'nowrap',
          }}
        >
          Konto verknüpfen &amp; einzahlen
        </span>
        {/* Arrow */}
        <svg width={30} height={30} viewBox="0 0 24 24">
          <path
            d="M4 12 H19 M13 5.5 L19.5 12 L13 18.5"
            stroke="#131108"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        {/* Sheen sweep */}
        <div
          style={{
            position: 'absolute',
            top: '-40%',
            left: 0,
            width: 130,
            height: '180%',
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
            transform: `translateX(${sheenX}px) skewX(-20deg)`,
            opacity: sheenOpacity,
          }}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* „Nächstes Video"-Karte mit aufspringendem Schloss                   */
/* ------------------------------------------------------------------ */

const NextVideoCard: React.FC<{
  appearFrame: number;
  unlockFrame: number;
  width?: number;
}> = ({appearFrame, unlockFrame, width = 480}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: frame - appearFrame,
    fps,
    config: {damping: 15, stiffness: 100, mass: 1},
  });
  const unlockP = interpolate(frame, [unlockFrame + 4, unlockFrame + 28], [0, 1], {
    ...CLAMP,
    easing: Easing.inOut(Easing.cubic),
  });
  const cardPop = 1 + Math.sin(unlockP * Math.PI) * 0.022;
  const playIn = spring({
    frame: frame - (unlockFrame + 26),
    fps,
    config: {damping: 10, stiffness: 150, mass: 0.7},
  });

  const thumbH = 250;

  return (
    <Panel
      padding={0}
      radius={radii.lg}
      style={{
        width,
        overflow: 'hidden',
        opacity: enter,
        transform: `translateX(${(1 - enter) * 150}px) scale(${
          (0.95 + enter * 0.05) * cardPop
        })`,
        boxShadow: `${shadows.panel}, 0 0 ${44 * unlockP}px rgba(117,185,245,${
          0.4 * unlockP
        })`,
        border: `1px solid rgba(117,185,245,${0.14 + unlockP * 0.26})`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing(2.5)}px ${spacing(3)}px`,
        }}
      >
        <span
          style={{
            fontSize: 19,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.16em',
            color: colors.textFaint,
          }}
        >
          NÄCHSTES VIDEO
        </span>
        {/* Badge crossfade: GESPERRT → FREIGESCHALTET */}
        <div style={{display: 'grid'}}>
          <div style={{gridArea: '1 / 1', justifySelf: 'end', opacity: 1 - unlockP}}>
            <Badge label="GESPERRT" color="neutral" size={17} />
          </div>
          <div style={{gridArea: '1 / 1', justifySelf: 'end', opacity: unlockP}}>
            <Badge label="FREIGESCHALTET" color="green" size={17} pulse />
          </div>
        </div>
      </div>

      {/* Thumbnail */}
      <div
        style={{
          position: 'relative',
          height: thumbH,
          borderTop: `1px solid ${colors.stroke}`,
          borderBottom: `1px solid ${colors.stroke}`,
          background: `linear-gradient(135deg, ${colors.panelSoft}, ${colors.panel})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Unlocked gradient fades in over the locked one */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(117,185,245,0.28), rgba(240,140,30,0.12) 70%, rgba(26,36,50,0.9))',
            opacity: unlockP,
          }}
        />
        <Padlock openFrame={unlockFrame} size={124} />
        {/* Play icon springs in once the lock is gone */}
        {frame >= unlockFrame + 26 && (
          <div
            style={{
              position: 'absolute',
              opacity: Math.min(1, playIn),
              transform: `scale(${0.4 + playIn * 0.6})`,
            }}
          >
            <svg width={96} height={96} viewBox="0 0 24 24">
              <circle cx={12} cy={12} r={11} fill="rgba(117,185,245,0.2)" />
              <circle
                cx={12}
                cy={12}
                r={11}
                fill="none"
                stroke={colors.blue}
                strokeWidth={0.8}
              />
              <path d="M9.5 7.5 L17 12 L9.5 16.5 Z" fill={colors.blue} />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{padding: `${spacing(2.5)}px ${spacing(3)}px ${spacing(3)}px`}}>
        <div
          style={{
            fontSize: 29,
            fontWeight: font.weight.bold,
            letterSpacing: '-0.01em',
            marginBottom: 10,
          }}
        >
          Dein erstes Signal-Setup
        </div>
        <div
          style={{
            fontSize: 19,
            color: colors.textDim,
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: spacing(2),
          }}
        >
          <span>Video 2 · 07:12</span>
          <div style={{display: 'grid'}}>
            <span style={{gridArea: '1 / 1', justifySelf: 'end', opacity: 1 - unlockP}}>
              Nach Einzahlung
            </span>
            <span
              style={{
                gridArea: '1 / 1',
                justifySelf: 'end',
                opacity: unlockP,
                color: colors.up,
                fontWeight: font.weight.semibold,
              }}
            >
              Jetzt verfügbar
            </span>
          </div>
        </div>
        <div style={{fontSize: 16.5, color: colors.textFaint, lineHeight: 1.45}}>
          Schaltet sich nach deiner ersten Einzahlung automatisch frei — zusammen mit
          deinem ersten Level.
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ */
/* Blurred dashboard backdrop (depth layer)                            */
/* ------------------------------------------------------------------ */

const DashboardBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 540], [12, -26]);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          transform: `scale(1.08) translateY(${drift}px)`,
          filter: 'blur(13px) brightness(0.5) saturate(0.85)',
        }}
      >
        {/* Top nav */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 86,
            backgroundColor: colors.panel,
            borderBottom: `1px solid ${colors.stroke}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 48px',
            gap: 40,
            fontFamily: font.family,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.blue}, ${colors.orange})`,
              }}
            />
            <span
              style={{
                fontSize: 24,
                fontWeight: font.weight.black,
                letterSpacing: '0.1em',
                color: colors.text,
              }}
            >
              COSMOTRADES
            </span>
          </div>
          <div style={{flex: 1, display: 'flex', gap: 34, justifyContent: 'center'}}>
            {['Dashboard', 'Signale', 'Academy', 'Live-Calls'].map((n, i) => (
              <span
                key={n}
                style={{
                  fontSize: 21,
                  fontWeight: font.weight.medium,
                  color: i === 0 ? colors.blue : colors.textDim,
                }}
              >
                {n}
              </span>
            ))}
          </div>
          <Cosmo variant="portrait" height={54} still />
        </div>

        {/* Signals column */}
        <div style={{position: 'absolute', left: 48, top: 130}}>
          <SignalCard appearFrame={-90} width={420} />
        </div>

        {/* Chart panel */}
        <div style={{position: 'absolute', left: 520, top: 130}}>
          <Panel padding={24} style={{width: 850}}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <span style={{fontSize: 26, fontWeight: font.weight.bold}}>
                XAUUSD · M15
              </span>
              <Badge label="LIVE" color="green" pulse size={17} />
            </div>
            <CandleChart
              width={800}
              height={380}
              candleCount={26}
              startFrame={-300}
              seed={11}
              levels={[
                {label: 'Einstieg', yNorm: 0.42, color: colors.blue, appearFrame: -30},
                {label: 'Take-Profit', yNorm: 0.8, color: colors.up, appearFrame: -30},
              ]}
            />
          </Panel>
        </div>

        {/* Lessons column */}
        <div
          style={{
            position: 'absolute',
            left: 1420,
            top: 130,
            display: 'flex',
            flexDirection: 'column',
            gap: 26,
          }}
        >
          <LessonCard
            title="Was ist ein Signal?"
            duration="04:32"
            progress={1}
            appearFrame={-90}
            width={330}
          />
          <LessonCard
            title="Risiko verstehen"
            duration="06:18"
            progress={0.4}
            appearFrame={-90}
            width={330}
          />
        </div>

        {/* Tier row along the bottom */}
        <div
          style={{
            position: 'absolute',
            left: 48,
            top: 800,
            display: 'flex',
            gap: 30,
          }}
        >
          <TierStep
            label="Foundation"
            perks={['Signale', 'Academy']}
            index={0}
            appearFrame={-60}
            width={420}
            height={140}
            active
          />
          <TierStep
            label="Operator"
            perks={['Mehr Signale', 'Live-Room']}
            index={1}
            appearFrame={-60}
            width={420}
            height={140}
          />
          <TierStep
            label="Elite"
            perks={['1:1 Coaching', 'VIP']}
            index={2}
            appearFrame={-60}
            width={420}
            height={140}
          />
        </div>
      </AbsoluteFill>

      {/* Darkening wash so foreground pops */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(11,15,22,0.4) 0%, rgba(11,15,22,0.62) 55%, rgba(11,15,22,0.82) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Floating bokeh dust for cinematic depth                             */
/* ------------------------------------------------------------------ */

const Bokeh: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = React.useMemo(
    () =>
      new Array(15).fill(0).map((_, i) => ({
        x: hash01(i * 9.7) * 1920,
        y: hash01(i * 4.3 + 2) * 1080,
        r: 5 + hash01(i * 7.1 + 5) * 13,
        speed: 0.14 + hash01(i * 3.3 + 9) * 0.3,
        blue: hash01(i * 5.9 + 4) > 0.28,
        phase: hash01(i * 8.8 + 7) * Math.PI * 2,
      })),
    [],
  );

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {dots.map((d, i) => {
        const y = ((d.y - frame * d.speed) % 1180 + 1180) % 1180 - 50;
        const x = d.x + Math.sin(frame * 0.012 + d.phase) * 34;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: '50%',
              backgroundColor: d.blue ? colors.blue : colors.orange,
              opacity: 0.05 + hash01(i * 2.2) * 0.06,
              filter: 'blur(6px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Logo sting: COSMOTRADES wordmark + underline sweep                  */
/* ------------------------------------------------------------------ */

const WORD = 'COSMOTRADES';

const LogoSting: React.FC<{startFrame: number}> = ({startFrame}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame - 6) {
    return null;
  }

  // Tracking settles from wide to tight while letters arrive.
  const ls = interpolate(frame, [startFrame, startFrame + 62], [24, 7], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const sweep = interpolate(frame, [startFrame + 40, startFrame + 68], [0, 1], {
    ...CLAMP,
    easing: Easing.inOut(Easing.cubic),
  });
  const taglineIn = interpolate(frame, [startFrame + 60, startFrame + 76], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.quad),
  });
  const push = interpolate(frame, [startFrame, startFrame + 98], [1, 1.045], CLAMP);
  const glow = interpolate(frame, [startFrame + 20, startFrame + 70], [0, 1], CLAMP);

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font.family,
        transform: `scale(${push})`,
      }}
    >
      {/* Soft brand glow behind the wordmark */}
      <div
        style={{
          position: 'absolute',
          width: 1300,
          height: 560,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(117,185,245,0.13) 0%, rgba(240,140,30,0.05) 45%, transparent 70%)',
          filter: 'blur(30px)',
          opacity: glow,
        }}
      />
      <div style={{display: 'inline-flex', flexDirection: 'column'}}>
        {/* Wordmark, letter by letter */}
        <div style={{display: 'flex', whiteSpace: 'nowrap'}}>
          {WORD.split('').map((ch, i) => {
            const d = startFrame + i * 2.2;
            const p = interpolate(frame, [d, d + 16], [0, 1], {
              ...CLAMP,
              easing: Easing.out(Easing.cubic),
            });
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  margin: `0 ${ls / 2}px`,
                  fontSize: 116,
                  fontWeight: font.weight.black,
                  lineHeight: 1,
                  color: i >= 5 ? colors.blue : colors.text,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 34}px)`,
                  filter: p < 1 ? `blur(${(1 - p) * 9}px)` : undefined,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        {/* Blue → orange underline sweep */}
        <div
          style={{
            height: 6,
            marginTop: 30,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${colors.blue}, ${colors.orange})`,
            boxShadow: `0 0 24px rgba(117,185,245,${0.5 * sweep}), 0 0 24px rgba(240,140,30,${
              0.35 * sweep
            })`,
            transform: `scaleX(${sweep})`,
            transformOrigin: 'left center',
          }}
        />
        {/* Tagline */}
        <div
          style={{
            marginTop: 34,
            textAlign: 'center',
            fontSize: 30,
            fontWeight: font.weight.medium,
            letterSpacing: '0.1em',
            color: colors.textDim,
            opacity: taglineIn,
            transform: `translateY(${(1 - taglineIn) * 14}px)`,
          }}
        >
          Wir sehen uns drinnen.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Small green check for the microcopy row                             */
/* ------------------------------------------------------------------ */

const CheckItem: React.FC<{label: string}> = ({label}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 10}}>
    <svg width={20} height={20} viewBox="0 0 24 24">
      <circle cx={12} cy={12} r={11} fill="rgba(61,220,151,0.16)" />
      <path
        d="M7 12.5 L10.5 16 L17 8.5"
        stroke={colors.up}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
    {label}
  </span>
);

/* ------------------------------------------------------------------ */
/* Camera keyframes                                                    */
/* ------------------------------------------------------------------ */

const CAMERA: CameraKeyframe[] = [
  {frame: 0, zoom: 1.1, blur: 9, panY: 22},
  {frame: 42, zoom: 1.03, blur: 0, panY: 0},
  {frame: 236, zoom: 1.03, panX: 0},
  // Slight sympathetic push when Cosmo lands.
  {frame: 292, zoom: 1.065, panX: -8},
  {frame: 405, zoom: 1.065, blur: 0, panX: -8},
  // Push through the frame into the logo sting.
  {frame: 472, zoom: 1.2, blur: 15},
];

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  /* Entrances -------------------------------------------------------- */
  const kickerIn = interpolate(frame, [KICKER_IN, KICKER_IN + 18], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const headingIn = spring({
    frame: frame - HEADING_IN,
    fps,
    config: {damping: 15, stiffness: 110, mass: 0.9},
  });
  const microIn = interpolate(frame, [MICRO_IN, MICRO_IN + 20], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });

  /* Cosmo jump -------------------------------------------------------- */
  const jump = spring({
    frame: frame - COSMO_JUMP,
    fps,
    config: {damping: 10, stiffness: 92, mass: 1.05},
  });
  const jumpY = (1 - jump) * 760;
  const tLand = frame - COSMO_JUMP - 12;
  const cosmoRot =
    tLand > 0 ? Math.sin(tLand * 0.3) * 5 * Math.exp(-tLand * 0.055) : (1 - jump) * -7;
  const shadowT = 1 - Math.min(1, jumpY / 700);

  /* Level chip -------------------------------------------------------- */
  const chipIn = spring({
    frame: frame - CHIP_IN,
    fps,
    config: {damping: 11, stiffness: 130, mass: 0.7},
  });
  const chipBob = Math.sin(frame * 0.08) * 5;

  /* Outro ------------------------------------------------------------- */
  const contentOpacity = interpolate(
    frame,
    [CONTENT_OUT_START, CONTENT_OUT_END],
    [1, 0],
    {...CLAMP, easing: Easing.inOut(Easing.quad)},
  );
  const introFade = interpolate(frame, [0, 14], [1, 0], CLAMP);
  const endFade = interpolate(frame, [BLACK_IN, 538], [0, 1], {
    ...CLAMP,
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <AbsoluteFill
      style={{backgroundColor: colors.bg, fontFamily: font.family, overflow: 'hidden'}}
    >
      <CameraRig keyframes={CAMERA} shake={0.5} shakeSeed={17}>
        <AbsoluteFill style={{opacity: contentOpacity}}>
          {/* Depth layers */}
          <DashboardBackdrop />
          <Bokeh />

          {/* Soft blue key light behind the content */}
          <div
            style={{
              position: 'absolute',
              left: 360,
              top: 140,
              width: 1200,
              height: 800,
              background:
                'radial-gradient(ellipse at center, rgba(117,185,245,0.08) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />

          {/* Left column: kicker, heading, CTA, microcopy */}
          <div style={{position: 'absolute', left: 220, top: 292, width: 620}}>
            <div
              style={{
                fontSize: 23,
                fontWeight: font.weight.semibold,
                letterSpacing: interpolate(kickerIn, [0, 1], [0.55, 0.3]) + 'em',
                color: colors.orange,
                opacity: kickerIn,
                transform: `translateY(${(1 - kickerIn) * 18}px)`,
                marginBottom: 22,
              }}
            >
              DEIN NÄCHSTER SCHRITT
            </div>
            <div
              style={{
                opacity: headingIn,
                transform: `translateY(${(1 - headingIn) * 60}px)`,
                marginBottom: 40,
              }}
            >
              <Heading size={66} weight={font.weight.black}>
                Bereit fürs
                <br />
                nächste Level?
              </Heading>
            </div>
            <CtaButton appearFrame={CTA_IN} width={620} />
            <div
              style={{
                marginTop: 30,
                display: 'flex',
                gap: 34,
                fontSize: 21,
                fontWeight: font.weight.medium,
                color: colors.textDim,
                opacity: microIn,
                transform: `translateY(${(1 - microIn) * 16}px)`,
              }}
            >
              <CheckItem label="Ab 100 € Einzahlung" />
              <CheckItem label="Auszahlung jederzeit" />
            </div>
          </div>

          {/* Right: Nächstes-Video card + unlock FX */}
          <div style={{position: 'absolute', left: 1230, top: 262}}>
            <NextVideoCard appearFrame={CARD_IN} unlockFrame={UNLOCK_AT} width={480} />
          </div>
          <FlashRing x={1470} y={480} startFrame={UNLOCK_AT + 3} />
          <SparkleBurst
            x={1470}
            y={478}
            startFrame={UNLOCK_AT + 5}
            count={12}
            seed={4}
            spread={150}
          />

          {/* Cosmo jumps in celebrating */}
          <div
            style={{
              position: 'absolute',
              left: 790,
              top: 442,
              transform: `translateY(${jumpY}px) rotate(${cosmoRot}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Contact shadow */}
            <div
              style={{
                position: 'absolute',
                bottom: -14,
                left: '50%',
                width: 300,
                height: 44,
                transform: `translateX(-50%) scale(${0.5 + shadowT * 0.5})`,
                background:
                  'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 68%)',
                opacity: shadowT * 0.8,
              }}
            />
            <Cosmo variant="master" height={660} idleSeed={7} />
          </div>
          <SparkleBurst x={880} y={620} startFrame={COSMO_JUMP + 16} seed={3} spread={120} />
          <SparkleBurst x={1090} y={680} startFrame={COSMO_JUMP + 22} seed={8} spread={110} />

          {/* Level-1 chip floating above Cosmo */}
          <div
            style={{
              position: 'absolute',
              left: 975,
              top: 380,
              transform: `translateX(-50%) translateY(${
                (1 - chipIn) * 40 + chipBob
              }px) scale(${0.6 + chipIn * 0.4})`,
              opacity: Math.min(1, chipIn),
            }}
          >
            <Badge label="STUFE 1 FREIGESCHALTET" color="orange" pulse size={20} />
          </div>
        </AbsoluteFill>
      </CameraRig>

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 52%, rgba(4,7,12,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo sting */}
      <LogoSting startFrame={LOGO_IN} />

      {/* Fade in from previous scene */}
      <AbsoluteFill
        style={{backgroundColor: colors.black, opacity: introFade, pointerEvents: 'none'}}
      />
      {/* Final fade to black */}
      <AbsoluteFill
        style={{backgroundColor: colors.black, opacity: endFade, pointerEvents: 'none'}}
      />
    </AbsoluteFill>
  );
};
