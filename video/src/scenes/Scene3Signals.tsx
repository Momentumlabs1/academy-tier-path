import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {afPump, CameraRig, type CameraKeyframe} from '../lib/camera';
import {colors, font, radii, spacing} from '../lib/tokens';
import {
  Badge,
  CandleChart,
  type ChartLevel,
  Heading,
  Panel,
  ProgressBar,
  SignalCard,
} from '../lib/ui';

/**
 * Szene 3 — Signale (Herzstück).
 *
 * Voller Fokus auf den Gold-Chart: Loader → Candles bauen sich live auf →
 * Live-Preis pulsiert → Signal-Card fliegt rein, Entry/SL/TP-Linien
 * zeichnen sich passend am Chart. Permanenter Drift-Zoom, Parallax-Tiefe,
 * kein Cosmo im Bild. 660 Frames @ 30 fps.
 */

/* ------------------------------------------------------------------ */
/* Timing (frames)                                                     */
/* ------------------------------------------------------------------ */

const T = {
  panelIn: 6,
  loaderFadeStart: 66,
  loaderFadeEnd: 84,
  chartStart: 90, // first candle
  toastIn: 336,
  cardIn: 348,
  flashStart: 348,
  flashEnd: 368,
  levelEntry: 380,
  levelSL: 402,
  levelTP: 424,
  headerIn: 388,
  crvIn: 470,
  captionIn: 560,
} as const;

const CHART = {
  seed: 218, // bullish final candle, net-up walk, entry lands at yNorm 0.56
  candles: 34,
  framesPerCandle: 5,
  width: 1086,
  height: 560,
} as const;

/* ------------------------------------------------------------------ */
/* Deterministic replica of the lib candle walk — lets the Entry line  */
/* land EXACTLY on the live price of the last candle.                  */
/* ------------------------------------------------------------------ */

const makeRng = (seed: number): (() => number) => {
  let s = Math.floor(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

const computeEntryYNorm = (count: number, seed: number): number => {
  const rnd = makeRng(seed);
  let price = 100;
  let lastClose = price;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < count; i++) {
    const move = (rnd() - 0.5) * 6 + 0.35; // same drift as lib
    const open = price;
    const close = price + move;
    const high = Math.max(open, close) + rnd() * 2.2;
    const low = Math.min(open, close) - rnd() * 2.2;
    min = Math.min(min, low);
    max = Math.max(max, high);
    price = close;
    lastClose = close;
  }
  return (lastClose - min) / (max - min);
};

const ENTRY_Y = computeEntryYNorm(CHART.candles, CHART.seed);
const SL_Y = Math.max(0.06, ENTRY_Y - 0.18);
const TP_Y = Math.min(0.95, ENTRY_Y + 0.3);

/* ------------------------------------------------------------------ */
/* Signal prices (German format) — card and chart labels stay in sync. */
/* ------------------------------------------------------------------ */

const PRICE_ENTRY = 3341.5;
const PRICE_SL = 3324.0;
const PRICE_TP = 3378.0;
const PRICE_BUILD_FROM = 3318.4;
const PRICE_DAY_OPEN = 3312.8;

/** '3341.5' -> '3.341,50' — manual, so renders are locale-independent. */
const formatDE = (v: number): string => {
  const [int, dec] = v.toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
};

const LEVELS: ChartLevel[] = [
  {
    label: `Einstieg ${formatDE(PRICE_ENTRY)}`,
    yNorm: ENTRY_Y,
    color: colors.blue,
    appearFrame: T.levelEntry,
  },
  {
    label: `Stop-Loss ${formatDE(PRICE_SL)}`,
    yNorm: SL_Y,
    color: colors.down,
    appearFrame: T.levelSL,
  },
  {
    label: `Take-Profit ${formatDE(PRICE_TP)}`,
    yNorm: TP_Y,
    color: colors.up,
    appearFrame: T.levelTP,
  },
];

/* ------------------------------------------------------------------ */
/* Camera — tight on the building chart, pull-back reveals the signal, */
/* then a permanent slow drift-zoom keeps the frame alive.             */
/* ------------------------------------------------------------------ */

const CAMERA: CameraKeyframe[] = [
  {frame: 0, zoom: 1.3, panX: 400, panY: -30, blur: 12},
  {frame: 34, blur: 0},
  {frame: 100, zoom: 1.22, panX: 335, panY: -40},
  {frame: 290, zoom: 1.26, panX: 355, panY: -30}, // slow push while candles build
  {frame: 378, zoom: 1.0, panX: 0, panY: 0}, // pull back: signal card arrives
  {frame: 659, zoom: 1.055, panX: -12, panY: -10}, // endless drift-in
];

/* ------------------------------------------------------------------ */
/* Backdrop — bleeds far beyond the stage so camera pans never reveal  */
/* a void: glow blobs, drifting grid, parallax watermark.              */
/* ------------------------------------------------------------------ */

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const breathe = (Math.sin(frame * 0.035) + 1) / 2;

  return (
    <div style={{position: 'absolute', inset: -420, backgroundColor: colors.bg}}>
      {/* blue key glow, top-left */}
      <div
        style={{
          position: 'absolute',
          left: '6%',
          top: '2%',
          width: 1500,
          height: 1100,
          background: `radial-gradient(ellipse at center, rgba(117,185,245,${
            0.1 + breathe * 0.035
          }) 0%, transparent 62%)`,
        }}
      />
      {/* orange counter glow, bottom-right */}
      <div
        style={{
          position: 'absolute',
          right: '2%',
          bottom: '-4%',
          width: 1300,
          height: 950,
          background: `radial-gradient(ellipse at center, rgba(240,140,30,${
            0.075 + (1 - breathe) * 0.03
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
          transform: `translate(${-frame * 0.06}px, ${frame * 0.04}px)`,
        }}
      />
      {/* oversized ticker watermark, slow counter-drift */}
      <div
        style={{
          position: 'absolute',
          left: 1560,
          top: 400,
          fontFamily: font.mono,
          fontSize: 210,
          fontWeight: font.weight.black,
          letterSpacing: '0.04em',
          color: 'rgba(117,185,245,0.045)',
          whiteSpace: 'nowrap',
          transform: `translateX(${-frame * 0.14}px)`,
        }}
      >
        XAUUSD
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Loader — spinning focus ring while "market data" streams in.        */
/* ------------------------------------------------------------------ */

const Loader: React.FC = () => {
  const frame = useCurrentFrame();

  const out = interpolate(frame, [T.loaderFadeStart, T.loaderFadeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (out >= 1) return null;

  const inP = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dots = '.'.repeat((Math.floor(frame / 9) % 3) + 1);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing(3),
        opacity: inP * (1 - out),
        transform: `scale(${1 + out * 0.05})`,
      }}
    >
      <svg
        width={96}
        height={96}
        viewBox="0 0 96 96"
        style={{
          transform: `rotate(${frame * 7.5}deg)`,
          filter: 'drop-shadow(0 0 14px rgba(117,185,245,0.45))',
        }}
      >
        <circle
          cx={48}
          cy={48}
          r={40}
          fill="none"
          stroke="rgba(117,185,245,0.14)"
          strokeWidth={5}
        />
        <circle
          cx={48}
          cy={48}
          r={40}
          fill="none"
          stroke={colors.blue}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="150 101"
        />
      </svg>
      <div
        style={{
          fontFamily: font.family,
          fontSize: 30,
          fontWeight: font.weight.semibold,
          color: colors.text,
          letterSpacing: '0.01em',
        }}
      >
        Marktdaten werden geladen{dots}
      </div>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 21,
          fontWeight: font.weight.medium,
          color: colors.textFaint,
          letterSpacing: '0.14em',
        }}
      >
        XAUUSD · GOLD SPOT
      </div>
      <ProgressBar
        progress={1}
        width={340}
        height={7}
        animateFromFrame={6}
        style={{marginTop: spacing(1)}}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Live price readout — counts up while candles build, then keeps      */
/* ticking with a tiny live wobble.                                    */
/* ------------------------------------------------------------------ */

const LivePrice: React.FC = () => {
  const frame = useCurrentFrame();

  const buildEnd = T.chartStart + (CHART.candles - 1) * CHART.framesPerCandle;
  const base = interpolate(frame, [T.chartStart, buildEnd], [PRICE_BUILD_FROM, PRICE_ENTRY], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wobbleAmp = interpolate(frame, [T.chartStart + 10, T.chartStart + 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wobble =
    (Math.sin(frame * 0.55) * 0.7 + Math.sin(frame * 0.171 + 2.3) * 0.45) * wobbleAmp;
  const price = base + wobble;
  const deltaPct = (price / PRICE_DAY_OPEN - 1) * 100;

  const show = interpolate(frame, [T.chartStart - 4, T.chartStart + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        opacity: show,
        transform: `translateY(${(1 - show) * 14}px)`,
      }}
    >
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 42,
          fontWeight: font.weight.bold,
          color: colors.text,
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDE(price)}
      </span>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 22,
          fontWeight: font.weight.semibold,
          color: colors.up,
          backgroundColor: 'rgba(61,220,151,0.12)',
          border: '1px solid rgba(61,220,151,0.3)',
          borderRadius: radii.pill,
          padding: '4px 14px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {`+${formatDE(deltaPct)} %`}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export const Scene3Signals: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Chart panel entrance
  const panelIn = spring({
    frame: frame - T.panelIn,
    fps,
    config: {damping: 20, stiffness: 90, mass: 1},
  });

  // Headline enters only after the camera has pulled back
  const headerIn = spring({
    frame: frame - T.headerIn,
    fps,
    config: {damping: 17, stiffness: 110, mass: 0.9},
  });

  // "Neues Signal" toast + CRV chip
  const toastIn = spring({
    frame: frame - T.toastIn,
    fps,
    config: {damping: 14, stiffness: 150, mass: 0.7},
  });
  const crvIn = spring({
    frame: frame - T.crvIn,
    fps,
    config: {damping: 15, stiffness: 130, mass: 0.8},
  });

  // Closing caption
  const captionIn = spring({
    frame: frame - T.captionIn,
    fps,
    config: {damping: 22, stiffness: 80, mass: 1},
  });

  // Rack focus as the signal card lands
  const rackFocus = afPump(frame, [T.cardIn + 4], {maxBlur: 5, attack: 12, release: 18});

  // Signal-arrival flash
  const flash = interpolate(frame, [T.flashStart, T.flashEnd], [0.22, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Gentle idle floats (different phases = layered depth)
  const floatChart = Math.sin(frame * 0.045 + 1.8) * 3;
  const floatCard = Math.sin(frame * 0.052) * 4.5;

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, fontFamily: font.family}}>
      <CameraRig keyframes={CAMERA} shake={0.4} shakeSeed={31} extraBlur={rackFocus}>
        <Backdrop />

        {/* ---------- headline (revealed by the pull-back) ---------- */}
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 66,
            opacity: headerIn,
            transform: `translateY(${(1 - headerIn) * 40}px)`,
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
            DAS HERZSTÜCK
          </div>
          <Heading size={62}>Live-Signale</Heading>
        </div>

        {/* ---------- chart panel ---------- */}
        <Panel
          padding={spacing(4)}
          style={{
            position: 'absolute',
            left: 110,
            top: 205,
            width: 1150,
            opacity: panelIn,
            transform: `translateY(${(1 - panelIn) * 70 + floatChart}px) scale(${
              0.96 + panelIn * 0.04
            })`,
          }}
        >
          {/* chart header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: spacing(2.5),
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: font.weight.black,
                    letterSpacing: '-0.01em',
                    color: colors.text,
                  }}
                >
                  XAUUSD
                </span>
                <Badge label="LIVE" color="red" pulse size={19} />
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: colors.textFaint,
                  letterSpacing: '0.08em',
                }}
              >
                Gold · Spot · M15
              </div>
            </div>
            <LivePrice />
          </div>

          <div style={{position: 'relative'}}>
            <CandleChart
              width={CHART.width}
              height={CHART.height}
              candleCount={CHART.candles}
              startFrame={T.chartStart}
              framesPerCandle={CHART.framesPerCandle}
              seed={CHART.seed}
              volumeProfile
              levels={LEVELS}
            />
            <Loader />
          </div>
        </Panel>

        {/* ---------- signal side (toast → card → CRV chip) ---------- */}
        <div
          style={{
            position: 'absolute',
            left: 1335,
            top: 238,
            opacity: toastIn,
            transform: `translateX(${(1 - toastIn) * 60}px)`,
          }}
        >
          <Badge label="NEUES SIGNAL" color="orange" pulse size={21} />
        </div>

        <SignalCard
          pair="XAUUSD"
          direction="LONG"
          entry={formatDE(PRICE_ENTRY)}
          sl={formatDE(PRICE_SL)}
          tp={formatDE(PRICE_TP)}
          appearFrame={T.cardIn}
          width={495}
          style={{
            position: 'absolute',
            left: 1335,
            top: 306,
            marginTop: floatCard,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 1335,
            top: 812,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: crvIn,
            transform: `translateY(${(1 - crvIn) * 30 + floatCard}px)`,
          }}
        >
          <Badge label="CRV 1 : 2" color="blue" size={20} />
          <span style={{fontSize: 20, color: colors.textDim, fontWeight: font.weight.medium}}>
            Direkt aufs Dashboard gepusht
          </span>
        </div>

        {/* ---------- closing caption ---------- */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 58,
            textAlign: 'center',
            fontSize: 34,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.02em',
            color: colors.textDim,
            opacity: captionIn,
            transform: `translateY(${(1 - captionIn) * 30}px)`,
          }}
        >
          Klar <span style={{color: colors.orange}}>·</span> Präzise{' '}
          <span style={{color: colors.orange}}>·</span> Ohne Blabla
        </div>
      </CameraRig>

      {/* signal-arrival flash (over the rig, under the vignette) */}
      {flash > 0 && (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(ellipse at 78% 46%, rgba(117,185,245,0.55) 0%, transparent 58%)',
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
