import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {afPump, CameraRig, microReframe} from '../lib/camera';
import type {CameraKeyframe} from '../lib/camera';
import {CameraPOV} from '../lib/CameraPOV';
import {Cosmo} from '../lib/Cosmo';
import {colors, font, radii} from '../lib/tokens';
import {CandleChart, Heading} from '../lib/ui';

/**
 * Szene 1 — Cold Open „Cosmo schaltet die Kamera an" (Signature-Shot).
 *
 * POV aus Cosmos eigener Kamera: Schwarzbild → Klick → Kamera bootet
 * (REC/Timecode/Akku/AF-Klammern). Cosmo ist erst viel zu nah dran
 * (unscharfe Brust füllt den Frame, Mikro-Reframe-Rucker beim
 * Zurechtrücken), tritt zurück in sein Trading-Zimmer (3 Parallax-Ebenen,
 * Monitore booten mit Live-Charts), setzt sich an den Desk — der Fokus
 * pumpt, rastet ein, AF-Klammern blitzen grün. Lower-Third:
 * „Willkommen bei CosmoTrades".
 *
 * Positionswechsel sind in den Unschärfe-Peaks der Fokus-Pumps
 * geschnitten (siehe docs/videos/01-onboarding-walkthrough.md, Szene 1).
 */

/* ------------------------------------------------------------------ */
/* Timeline (Frames @ 30fps, 540 total = 18 s)                         */
/* ------------------------------------------------------------------ */

const CLICK = 12; // Klick — Shutter öffnet
const POWER_ON = 18; // Sensor an, HUD bootet, Belichtung fährt hoch
const RETREAT_START = 66; // er beginnt, rückwärts in den Raum zu gehen (DURCHGEHEND, kein Schnitt)
const RETREAT_END = 150; // steht mitten im Raum
const FOCUS_LOCK_1 = 158; // AF fängt ihn, sobald er steht
const HUNT_A = 240; // ein einzelner kleiner AF-Hunt beim Reden
const SIT_START = 300; // er geht durchgehend zum Desk und setzt sich
const SIT_END = 336; // sitzt
const FINAL_LOCK = 352; // finaler Fokus-Lock + Klammer-Confirm
const LOWER_THIRD = 436; // „Willkommen bei CosmoTrades"

// Monitore booten erst RUHIG nacheinander, wenn er sitzt (nichts fliegt rum).
const SCREEN_ON_CENTER = 372;
const SCREEN_ON_LEFT = 394;
const SCREEN_ON_RIGHT = 416;

/** Master-PNG-Seitenverhältnis (2160 × 3840). */
const COSMO_AR = 2160 / 3840;

const DESK_TOP = 800; // Boden-/Desk-Linie des Raums

const CLAMP = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

const EASE = {
  ...CLAMP,
  easing: Easing.inOut(Easing.cubic),
} as const;

type Parallax = {x: number; y: number};

/* ------------------------------------------------------------------ */
/* Raum — Ebene 1: Rückwand (Fenster, Poster, LED, Boden)              */
/* ------------------------------------------------------------------ */

const CITY_BUILDINGS: Array<{w: number; h: number; lights: Array<[number, number]>}> = [
  {w: 52, h: 168, lights: [[10, 24], [30, 58], [16, 96]]},
  {w: 66, h: 236, lights: [[12, 30], [40, 30], [26, 84], [44, 140], [14, 172]]},
  {w: 44, h: 120, lights: [[14, 28], [26, 62]]},
  {w: 72, h: 202, lights: [[16, 26], [44, 52], [28, 110], [50, 150]]},
  {w: 48, h: 96, lights: [[16, 30], [28, 58]]},
  {w: 58, h: 150, lights: [[14, 34], [36, 78], [22, 112]]},
];

const STARS: Array<[number, number, number]> = [
  [40, 26, 0.5], [110, 60, 0.3], [200, 20, 0.6], [280, 74, 0.35],
  [330, 36, 0.5], [150, 100, 0.25], [250, 120, 0.3], [70, 130, 0.35],
];

const RoomBackPlane: React.FC<{parallax: Parallax}> = ({parallax}) => {
  const frame = useCurrentFrame();
  const ledPulse = 0.82 + Math.sin(frame * 0.055) * 0.18;

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${parallax.x}px, ${parallax.y}px) scale(1.09)`,
      }}
    >
      {/* Wand */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, #101A2B 0%, #0C1322 55%, #090E18 100%)',
        }}
      />
      {/* Ambient-Glows auf der Wand */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 560px 300px at 17% 16%, rgba(117,185,245,0.11), transparent 70%),' +
            'radial-gradient(ellipse 520px 320px at 86% 30%, rgba(240,140,30,0.06), transparent 70%),' +
            'radial-gradient(ellipse 660px 260px at 50% 74%, rgba(117,185,245,0.12), transparent 72%)',
        }}
      />

      {/* Blaue LED-Leiste oben an der Wand */}
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: 64,
          height: 5,
          borderRadius: 3,
          background: `linear-gradient(90deg, rgba(117,185,245,0.35), ${colors.blue}, rgba(117,185,245,0.35))`,
          boxShadow: `0 0 24px rgba(117,185,245,${0.8 * ledPulse}), 0 0 70px rgba(117,185,245,${0.35 * ledPulse})`,
          opacity: ledPulse,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          top: 69,
          height: 130,
          background: 'linear-gradient(180deg, rgba(117,185,245,0.09), transparent)',
        }}
      />

      {/* Fenster mit Nacht-Skyline */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          top: 156,
          width: 400,
          height: 450,
          border: '12px solid #050910',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #0D1B33 0%, #0A1528 58%, #0B1220 100%)',
          boxShadow: '0 0 70px rgba(117,185,245,0.13), inset 0 0 60px rgba(4,7,12,0.6)',
        }}
      >
        {STARS.map(([sx, sy, so], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: sx,
              top: sy,
              width: 3,
              height: 3,
              borderRadius: '50%',
              backgroundColor: '#DCE9F7',
              opacity: so + Math.sin(frame * 0.08 + i * 2.1) * 0.12,
            }}
          />
        ))}
        {/* Mond */}
        <div
          style={{
            position: 'absolute',
            right: 46,
            top: 44,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#E8EFF8',
            opacity: 0.85,
            boxShadow: '0 0 40px rgba(220,235,250,0.5)',
          }}
        />
        {/* Skyline */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 7,
            paddingLeft: 8,
          }}
        >
          {CITY_BUILDINGS.map((b, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                width: b.w,
                height: b.h,
                backgroundColor: '#070D18',
                borderRadius: '3px 3px 0 0',
              }}
            >
              {b.lights.map(([lx, ly], j) => (
                <div
                  key={j}
                  style={{
                    position: 'absolute',
                    left: lx,
                    top: ly,
                    width: 5,
                    height: 7,
                    backgroundColor:
                      j % 3 === 0 ? 'rgba(117,185,245,0.75)' : 'rgba(240,196,120,0.7)',
                    opacity: 0.55 + Math.sin(frame * 0.05 + i * 3 + j * 7) * 0.3,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Jalousien-Lamellen */}
        <AbsoluteFill
          style={{
            background:
              'repeating-linear-gradient(180deg, rgba(4,7,12,0.5) 0px, rgba(4,7,12,0.5) 3px, transparent 3px, transparent 28px)',
          }}
        />
        {/* Fensterkreuz */}
        <div style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: 9, marginLeft: -4.5, backgroundColor: '#050910'}} />
        <div style={{position: 'absolute', top: '46%', left: 0, right: 0, height: 9, backgroundColor: '#050910'}} />
      </div>

      {/* Poster rechts an der Wand */}
      <div
        style={{
          position: 'absolute',
          left: 1470,
          top: 170,
          width: 200,
          height: 262,
          transform: 'rotate(-2deg)',
          backgroundColor: '#0D141F',
          border: `1px solid ${colors.stroke}`,
          borderRadius: 8,
          boxShadow: '0 14px 34px rgba(0,0,0,0.4)',
          padding: 16,
        }}
      >
        <svg width={168} height={150} viewBox="0 0 168 150">
          <polyline
            points="4,120 30,96 52,108 80,64 106,78 134,34 164,44"
            fill="none"
            stroke={colors.blue}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
          <circle cx={134} cy={34} r={7} fill={colors.orange} opacity={0.9} />
        </svg>
        <div
          style={{
            marginTop: 14,
            fontFamily: font.mono,
            fontSize: 17,
            letterSpacing: '0.3em',
            color: colors.textFaint,
          }}
        >
          XAUUSD
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 1706,
          top: 244,
          width: 148,
          height: 196,
          transform: 'rotate(1.8deg)',
          backgroundColor: '#0C121C',
          border: `1px solid ${colors.stroke}`,
          borderRadius: 8,
          boxShadow: '0 14px 34px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={92} height={92} viewBox="0 0 92 92">
          <circle cx={46} cy={46} r={36} fill="none" stroke={colors.orange} strokeWidth={5} opacity={0.75} strokeDasharray="168 60" strokeLinecap="round" />
          <circle cx={46} cy={46} r={13} fill={colors.blue} opacity={0.55} />
        </svg>
      </div>

      {/* Boden */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: DESK_TOP,
          bottom: -120,
          background: 'linear-gradient(180deg, #0A0F19 0%, #05080E 65%, #04070C 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: DESK_TOP - 1,
          height: 2,
          background: 'rgba(117,185,245,0.07)',
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Monitor mit Code-Chart auf dem Screen                               */
/* ------------------------------------------------------------------ */

type MonitorProps = {
  cx: number;
  screenW: number;
  screenH: number;
  /** rotateY in Grad — Seitenmonitore sind zur Mitte angewinkelt. */
  tilt?: number;
  /** Frame, ab dem der Screen bootet und der Chart läuft. */
  screenOn: number;
  seed: number;
  candleCount?: number;
  volumeProfile?: boolean;
  /** Standfuß-Höhe — der Ultrawide sitzt tiefer, damit hinter ihm keine Lücke klafft. */
  standH?: number;
};

const Monitor: React.FC<MonitorProps> = ({
  cx,
  screenW,
  screenH,
  tilt = 0,
  screenOn,
  seed,
  candleCount = 16,
  volumeProfile = false,
  standH = 44,
}) => {
  const frame = useCurrentFrame();
  const bezel = 8;
  const bodyW = screenW + bezel * 2;
  const bodyH = screenH + bezel * 2;
  const bodyTop = DESK_TOP - standH - bodyH;

  const glowP = interpolate(frame, [screenOn, screenOn + 26], [0, 1], CLAMP);
  const boot = interpolate(frame, [screenOn - 2, screenOn + 2, screenOn + 12], [0, 0.5, 0], CLAMP);

  return (
    <>
      {/* Standfuß */}
      <div
        style={{
          position: 'absolute',
          left: cx - 9,
          top: DESK_TOP - standH,
          width: 18,
          height: standH,
          backgroundColor: '#05080D',
          borderRadius: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: cx - 68,
          top: DESK_TOP - 10,
          width: 136,
          height: 10,
          backgroundColor: '#05080D',
          borderRadius: 5,
        }}
      />
      {/* Gehäuse + Screen */}
      <div
        style={{
          position: 'absolute',
          left: cx - bodyW / 2,
          top: bodyTop,
          width: bodyW,
          height: bodyH,
          backgroundColor: '#04070C',
          borderRadius: 10,
          border: '1px solid rgba(117,185,245,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: tilt !== 0 ? `perspective(1600px) rotateY(${tilt}deg)` : undefined,
          transformOrigin: 'center bottom',
          boxShadow: `0 20px 44px rgba(0,0,0,0.5), 0 0 ${46 * glowP}px rgba(117,185,245,${0.22 * glowP})`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: screenW,
            height: screenH,
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: '#060A11',
          }}
        >
          <CandleChart
            width={screenW}
            height={screenH}
            candleCount={candleCount}
            startFrame={screenOn}
            framesPerCandle={6}
            seed={seed}
            volumeProfile={volumeProfile}
            style={{position: 'absolute', top: 0, left: 0}}
          />
          {/* Boot-Blitz beim Einschalten */}
          <div style={{position: 'absolute', inset: 0, backgroundColor: `rgba(117,185,245,${boot})`}} />
          {/* Glas-Sheen */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(115deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 38%)',
            }}
          />
        </div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Raum — Ebene 2: Desk + Monitore + LED                               */
/* ------------------------------------------------------------------ */

const RoomMidPlane: React.FC<{parallax: Parallax}> = ({parallax}) => {
  const frame = useCurrentFrame();
  const ledPulse = 0.78 + Math.sin(frame * 0.07 + 1.4) * 0.22;

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${parallax.x}px, ${parallax.y}px) scale(1.06)`,
      }}
    >
      {/* Desk-Schatten auf dem Boden */}
      <div
        style={{
          position: 'absolute',
          left: 360,
          top: 990,
          width: 1200,
          height: 70,
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.55), transparent 70%)',
        }}
      />
      {/* Oranger LED-Glow-Pool unter dem Desk */}
      <div
        style={{
          position: 'absolute',
          left: 400,
          top: 1000,
          width: 1120,
          height: 76,
          background: `radial-gradient(ellipse 50% 55% at 50% 30%, rgba(240,140,30,${0.14 * ledPulse}), transparent 70%)`,
        }}
      />

      {/* Monitore (Seiten angewinkelt, Mitte Ultrawide) */}
      <Monitor cx={500} screenW={300} screenH={180} tilt={14} screenOn={SCREEN_ON_LEFT} seed={13} candleCount={16} />
      <Monitor cx={1420} screenW={300} screenH={180} tilt={-14} screenOn={SCREEN_ON_RIGHT} seed={15} candleCount={16} />
      <Monitor cx={960} screenW={460} screenH={150} standH={28} screenOn={SCREEN_ON_CENTER} seed={7} candleCount={26} volumeProfile />

      {/* Desk-Platte */}
      <div
        style={{
          position: 'absolute',
          left: 380,
          top: DESK_TOP,
          width: 1180,
          height: 22,
          background: 'linear-gradient(180deg, #131C29 0%, #0C1219 100%)',
          borderTop: '1.5px solid rgba(117,185,245,0.22)',
          borderRadius: 4,
        }}
      />
      {/* Frontblende */}
      <div
        style={{
          position: 'absolute',
          left: 410,
          top: DESK_TOP + 22,
          width: 1120,
          height: 178,
          background: 'linear-gradient(180deg, #0B111B 0%, #080D15 100%)',
          borderRadius: '0 0 10px 10px',
        }}
      />
      {/* Orange LED-Leiste unter der Blende */}
      <div
        style={{
          position: 'absolute',
          left: 440,
          top: DESK_TOP + 197,
          width: 1060,
          height: 5,
          borderRadius: 3,
          background: `linear-gradient(90deg, rgba(240,140,30,0.4), ${colors.orange}, rgba(240,140,30,0.4))`,
          boxShadow: `0 0 22px rgba(240,140,30,${0.85 * ledPulse}), 0 0 64px rgba(240,140,30,${0.4 * ledPulse})`,
          opacity: ledPulse,
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Raum — Ebene 3: unscharfer Vordergrund (Pflanze, dunkle Kante)      */
/* ------------------------------------------------------------------ */

const PLANT_LEAVES: Array<{rot: number; h: number; dx: number}> = [
  {rot: -34, h: 250, dx: -46},
  {rot: -14, h: 300, dx: -16},
  {rot: 4, h: 320, dx: 12},
  {rot: 22, h: 280, dx: 44},
  {rot: 42, h: 230, dx: 74},
];

const RoomFrontPlane: React.FC<{parallax: Parallax}> = ({parallax}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${parallax.x}px, ${parallax.y}px) scale(1.1)`,
        pointerEvents: 'none',
      }}
    >
      {/* dunkle Out-of-Focus-Kante unten links */}
      <div
        style={{
          position: 'absolute',
          left: -160,
          top: 870,
          width: 760,
          height: 400,
          background: 'radial-gradient(ellipse 50% 50% at 40% 60%, rgba(3,5,9,0.88), transparent 68%)',
          filter: 'blur(16px)',
        }}
      />
      {/* Pflanzen-Silhouette rechts, stark defokussiert */}
      <div style={{position: 'absolute', left: 1660, top: 700, filter: 'blur(11px)', opacity: 0.95}}>
        {PLANT_LEAVES.map((leaf, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 90 + leaf.dx,
              bottom: -280,
              width: 64,
              height: leaf.h,
              borderRadius: '50% 50% 46% 46%',
              backgroundColor: '#0B1711',
              transform: `rotate(${leaf.rot + Math.sin(frame * 0.03 + i) * 1.2}deg)`,
              transformOrigin: 'bottom center',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: 82,
            top: 262,
            width: 150,
            height: 130,
            borderRadius: '12px 12px 26px 26px',
            backgroundColor: '#080D15',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Szene                                                               */
/* ------------------------------------------------------------------ */

export const Scene1ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  /* ---- Kamera: Zoom / Fokus-Choreografie ------------------------- */

  const rigKeyframes: CameraKeyframe[] = [
    // Zoom: Close-up leicht reingedrückt → beruhigt sich, während er zurückgeht → finaler Push-in.
    {frame: 0, zoom: 1.12},
    {frame: RETREAT_START, zoom: 1.12},
    {frame: RETREAT_END, zoom: 1.02},
    {frame: SIT_START, zoom: 1.035},
    {frame: SIT_END, zoom: 1.0},
    {frame: FINAL_LOCK, zoom: 1.015},
    {frame: 539, zoom: 1.05},
    // Grund-Blur: Close-up unscharf → löst sich auf, WÄHREND er zurückgeht (AF folgt ihm).
    {frame: 0, blur: 18},
    {frame: 40, blur: 15},
    {frame: RETREAT_START, blur: 14},
    {frame: 110, blur: 5},
    {frame: FOCUS_LOCK_1, blur: 0.8},
    {frame: 170, blur: 0},
  ];

  // AF-Pumps: klein und motiviert — beim Reden, beim Hinsetzen (Distanzwechsel), beim Final-Lock.
  const pumpBlur = Math.max(
    afPump(frame, [HUNT_A], {maxBlur: 4, attack: 12, release: 16}),
    afPump(frame, [SIT_START + 18], {maxBlur: 9, attack: 10, release: 18}),
    afPump(frame, [FINAL_LOCK], {maxBlur: 5, attack: 12, release: 13}),
  );

  // Handheld: nervös beim Zurechtrücken, ruhig sobald er sitzt.
  const shakeAmount = frame < RETREAT_START ? 2.4 : frame < SIT_END ? 0.9 : 0.5;

  /* ---- Parallax-Pfad der drei Raum-Ebenen (deutlich beruhigt) ------ */

  const panX =
    interpolate(frame, [RETREAT_START, SIT_END, 539], [-20, 12, -6], EASE) +
    Math.sin(frame * 0.011) * 4;
  const panY =
    interpolate(frame, [RETREAT_START, SIT_END, 539], [8, -6, 3], EASE) +
    Math.sin(frame * 0.017 + 2) * 3;

  const back: Parallax = {x: panX * 0.35, y: panY * 0.35};
  const mid: Parallax = {x: panX * 0.7, y: panY * 0.7};
  const front: Parallax = {x: panX * 1.3, y: panY * 1.3};

  /* ---- Cosmo: EINE durchgehende Bewegung, kein Teleport ------------ */
  // Close-up (Brust füllt den Frame) → geht sichtbar rückwärts in den Raum → geht zum Desk und setzt sich.

  const cosmoH = interpolate(frame, [RETREAT_START, RETREAT_END, SIT_START, SIT_END], [3400, 735, 735, 640], EASE);
  const cosmoBottom = interpolate(frame, [RETREAT_START, RETREAT_END, SIT_START, SIT_END], [2760, 1014, 1014, 1078], EASE);
  const cosmoCx = interpolate(frame, [RETREAT_START, RETREAT_END, SIT_START, SIT_END], [960, 892, 892, 960], EASE);
  const cosmoW = cosmoH * COSMO_AR;

  // Geh-Wippen (Schritt-Rhythmus), nur während er sich bewegt.
  const walkEnv = Math.max(
    interpolate(frame, [RETREAT_START, RETREAT_START + 10, RETREAT_END - 12, RETREAT_END], [0, 1, 1, 0], CLAMP),
    interpolate(frame, [SIT_START, SIT_START + 8, SIT_END - 8, SIT_END], [0, 1, 1, 0], CLAMP),
  );
  const stepBob = -Math.abs(Math.sin(frame * 0.6)) * 16 * walkEnv;
  const stepTilt = Math.sin(frame * 0.3) * 2.0 * walkEnv;

  // Ruckartige „Zurechtrück"-Bewegungen im Close-up (blenden aus, sobald er losgeht).
  const joltFade = interpolate(frame, [RETREAT_START - 6, RETREAT_START + 6], [1, 0], CLAMP);
  const joltX = interpolate(frame, [POWER_ON, 26, 32, 44, 50, 58, 62, RETREAT_START], [0, 0, -70, -70, 55, 55, -15, -15], EASE) * joltFade;
  const joltY = interpolate(frame, [POWER_ON, 26, 32, 44, 50, 58, 62, RETREAT_START], [0, 0, 35, 35, -30, -30, 8, 8], EASE) * joltFade;
  const joltRot = interpolate(frame, [POWER_ON, 26, 32, 44, 50, 58, 62, RETREAT_START], [0, 0, -1.6, -1.6, 1.1, 1.1, -0.3, -0.3], EASE) * joltFade;
  const closeJitter = microReframe(frame, 5, 3.4);

  // Er wird heller, sobald er im Raumlicht steht (im Close-up schattet er die Kamera ab).
  const cosmoBright = interpolate(frame, [RETREAT_START, RETREAT_END], [0.62, 0.97], CLAMP);

  // Beim Hinsetzen wandert er HINTER den Desk: Crossfade exakt im Blur-Peak, Position bleibt identisch.
  const behindDesk = interpolate(frame, [SIT_START + 14, SIT_START + 26], [0, 1], CLAMP);

  // Kontakt-Schatten erst, wenn er sichtbar im Raum steht.
  const shadowOp = interpolate(frame, [RETREAT_START + 30, RETREAT_END], [0, 0.55], CLAMP) * (1 - behindDesk);

  /* ---- Power-on: Shutter, Belichtung, Scanlines, HUD --------------- */

  const shutterOpen = interpolate(frame, [CLICK, CLICK + 10], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const shutterLineScale = interpolate(frame, [CLICK - 3, CLICK + 2], [0.08, 1], CLAMP);
  const shutterLineOpacity =
    frame < CLICK - 3
      ? 0
      : interpolate(frame, [CLICK + 3, CLICK + 16], [0.95, 0], CLAMP);

  const exposureP = interpolate(frame, [POWER_ON, POWER_ON + 24], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.quad),
  });
  const exposureFlicker =
    frame < POWER_ON + 20 ? Math.abs(Math.sin(frame * 2.3)) * 0.12 * (1 - exposureP) : 0;
  const exposureDark = Math.min(0.92, 0.55 * (1 - exposureP) + exposureFlicker);

  const scanlineOpacity = interpolate(frame, [POWER_ON, POWER_ON + 30], [0.12, 0.045], CLAMP);
  const hudIn = interpolate(frame, [POWER_ON, POWER_ON + 10], [0, 1], CLAMP);

  /* ---- Lower-Third ------------------------------------------------ */

  const lowerThird = spring({
    frame: frame - LOWER_THIRD,
    fps,
    config: {damping: 20, stiffness: 90, mass: 1},
  });
  const underlineW = interpolate(frame, [LOWER_THIRD + 6, LOWER_THIRD + 28], [0, 250], EASE);

  return (
    <AbsoluteFill style={{backgroundColor: colors.black, fontFamily: font.family}}>
      {/* ============ Bild durch die Kamera ============ */}
      <CameraRig
        keyframes={rigKeyframes}
        shake={shakeAmount}
        shakeSeed={3}
        extraBlur={pumpBlur}
      >
        <RoomBackPlane parallax={back} />

        {/* Cosmo hinter dem Desk (Crossfade-Ziel beim Hinsetzen — Position identisch) */}
        {behindDesk > 0.001 && (
          <div style={{position: 'absolute', inset: 0, opacity: behindDesk, transform: `translate(${panX * 0.8}px, ${panY * 0.8}px)`}}>
            <div
              style={{
                position: 'absolute',
                left: cosmoCx - cosmoW / 2,
                top: cosmoBottom - cosmoH + stepBob,
                transform: `rotate(${stepTilt}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <Cosmo
                variant="master"
                height={cosmoH}
                idleSeed={4}
                style={{filter: `brightness(${cosmoBright}) drop-shadow(0 14px 20px rgba(0,0,0,0.45))`}}
              />
            </div>
          </div>
        )}

        <RoomMidPlane parallax={mid} />

        {/* Cosmo VOR dem Desk: eine durchgehende Bewegung vom Close-up bis zum Desk */}
        {behindDesk < 0.999 && (
          <div style={{position: 'absolute', inset: 0, opacity: 1 - behindDesk, transform: `translate(${panX * 0.8}px, ${panY * 0.8}px)`}}>
            {/* Kontakt-Schatten unter den Sneakern */}
            <div
              style={{
                position: 'absolute',
                left: cosmoCx - cosmoW * 0.42,
                top: cosmoBottom - 16 + stepBob * 0.3,
                width: cosmoW * 0.84,
                height: 34,
                opacity: shadowOp,
                background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.5), transparent 70%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: cosmoCx - cosmoW / 2 + joltX + closeJitter.x * 2 * joltFade,
                top: cosmoBottom - cosmoH + joltY + closeJitter.y * 2 * joltFade + stepBob,
                transform: `rotate(${joltRot + stepTilt + closeJitter.rotation * joltFade}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <Cosmo
                variant="master"
                height={cosmoH}
                idleSeed={4}
                style={{filter: `brightness(${cosmoBright}) contrast(1.04) drop-shadow(0 16px 24px rgba(0,0,0,0.4))`}}
              />
            </div>
          </div>
        )}

        <RoomFrontPlane parallax={front} />
      </CameraRig>

      {/* Sensor-Scanlines (POV-Textur) */}
      <AbsoluteFill
        style={{
          background:
            'repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)',
          opacity: frame < POWER_ON ? 0 : scanlineOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Belichtung fährt hoch (dunkel → normal, mit Flackern) */}
      {exposureDark > 0.004 && (
        <AbsoluteFill style={{backgroundColor: `rgba(2,4,8,${exposureDark})`, pointerEvents: 'none'}} />
      )}

      {/* ============ Kamera-HUD (REC, Timecode, Akku, AF) ============ */}
      <div style={{position: 'absolute', inset: 0, opacity: hudIn, pointerEvents: 'none'}}>
        <CameraPOV
          batteryLevel={0.64}
          timecodeStartFrame={-POWER_ON}
          focusPulseFrames={[FOCUS_LOCK_1, HUNT_A, FINAL_LOCK]}
        />
        {/* kleine Format-Zeile unten rechts */}
        <div
          style={{
            position: 'absolute',
            right: 56,
            bottom: 44,
            fontFamily: font.mono,
            fontSize: 20,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.5)',
            textShadow: '0 1px 6px rgba(0,0,0,0.6)',
          }}
        >
          4K · 30 FPS · AF
        </div>
      </div>

      {/* ============ Lower-Third: Willkommen ============ */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 1050,
          height: 340,
          background: 'radial-gradient(ellipse 60% 78% at 16% 100%, rgba(4,7,12,0.72), transparent 72%)',
          opacity: lowerThird,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 96,
          bottom: 92,
          opacity: lowerThird,
          transform: `translateY(${(1 - lowerThird) * 48}px)`,
        }}
      >
        <div
          style={{
            fontSize: 21,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.24em',
            color: colors.orange,
            marginBottom: 12,
          }}
        >
          COSMOTRADES · ONBOARDING
        </div>
        <Heading size={56}>
          Willkommen bei <span style={{color: colors.blue}}>CosmoTrades</span>
        </Heading>
        <div
          style={{
            marginTop: 16,
            width: underlineW,
            height: 4,
            borderRadius: radii.pill,
            background: `linear-gradient(90deg, ${colors.blue}, ${colors.orange})`,
            boxShadow: '0 0 14px rgba(117,185,245,0.5)',
          }}
        />
      </div>

      {/* ============ Shutter / Power-on ============ */}
      {frame < CLICK + 22 && (
        <AbsoluteFill style={{pointerEvents: 'none'}}>
          {/* obere + untere Blende öffnen sich */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: `${50 * (1 - shutterOpen)}%`,
              backgroundColor: colors.black,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: `${50 * (1 - shutterOpen)}%`,
              backgroundColor: colors.black,
            }}
          />
          {/* heller Sensor-Strich in der Mitte */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              height: 3,
              transform: `translateY(-50%) scaleX(${shutterLineScale})`,
              backgroundColor: 'rgba(224,240,255,0.95)',
              boxShadow: '0 0 26px rgba(180,220,255,0.9), 0 0 80px rgba(117,185,245,0.6)',
              opacity: shutterLineOpacity,
            }}
          />
        </AbsoluteFill>
      )}
      {/* komplett schwarz vor dem Klick */}
      {frame < CLICK && <AbsoluteFill style={{backgroundColor: colors.black}} />}
    </AbsoluteFill>
  );
};
