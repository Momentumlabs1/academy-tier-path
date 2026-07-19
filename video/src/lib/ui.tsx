import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, font, radii, shadows, spacing} from './tokens';

/**
 * Shared premium UI primitives for all CosmoTrades scenes.
 * Dark-theme, tokens-based, German labels. Nothing may look cheap.
 */

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export type PanelProps = {
  children?: React.ReactNode;
  /** Inner padding in px. Default spacing(4) = 32. */
  padding?: number;
  /** Optional brand glow around the panel. */
  glow?: 'blue' | 'orange' | 'none';
  radius?: number;
  style?: React.CSSProperties;
};

export const Panel: React.FC<PanelProps> = ({
  children,
  padding = spacing(4),
  glow = 'none',
  radius = radii.lg,
  style,
}) => (
  <div
    style={{
      backgroundColor: colors.panel,
      border: `1px solid ${colors.stroke}`,
      borderRadius: radius,
      padding,
      boxShadow:
        glow === 'blue'
          ? `${shadows.panel}, ${shadows.glowBlue}`
          : glow === 'orange'
            ? `${shadows.panel}, ${shadows.glowOrange}`
            : shadows.panel,
      fontFamily: font.family,
      color: colors.text,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Heading                                                             */
/* ------------------------------------------------------------------ */

export type HeadingProps = {
  children?: React.ReactNode;
  /** Font size in px. Default 64. */
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: number;
  style?: React.CSSProperties;
};

export const Heading: React.FC<HeadingProps> = ({
  children,
  size = 64,
  color = colors.text,
  align = 'left',
  weight = font.weight.bold,
  style,
}) => (
  <div
    style={{
      fontFamily: font.family,
      fontSize: size,
      fontWeight: weight,
      color,
      textAlign: align,
      letterSpacing: '-0.02em',
      lineHeight: 1.12,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export type BadgeProps = {
  label: string;
  color?: 'blue' | 'orange' | 'green' | 'red' | 'neutral';
  /** Pulsing dot + glow (e.g. "LIVE"). */
  pulse?: boolean;
  size?: number;
  style?: React.CSSProperties;
};

const BADGE_COLORS: Record<NonNullable<BadgeProps['color']>, string> = {
  blue: colors.blue,
  orange: colors.orange,
  green: colors.up,
  red: colors.down,
  neutral: colors.textDim,
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = 'blue',
  pulse = false,
  size = 22,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = BADGE_COLORS[color];
  const pulseT = pulse ? (Math.sin(frame * 0.22) + 1) / 2 : 0;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.45,
        padding: `${size * 0.35}px ${size * 0.8}px`,
        borderRadius: radii.pill,
        backgroundColor: `${c}1F`,
        border: `1px solid ${c}55`,
        fontFamily: font.family,
        fontSize: size,
        fontWeight: font.weight.semibold,
        letterSpacing: '0.06em',
        color: c,
        boxShadow: pulse ? `0 0 ${10 + pulseT * 14}px ${c}55` : undefined,
        ...style,
      }}
    >
      <span
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: '50%',
          backgroundColor: c,
          opacity: pulse ? 0.55 + pulseT * 0.45 : 1,
          transform: pulse ? `scale(${1 + pulseT * 0.25})` : undefined,
        }}
      />
      {label}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ProgressBar                                                         */
/* ------------------------------------------------------------------ */

export type ProgressBarProps = {
  /** Target fill 0..1. */
  progress: number;
  width?: number | string;
  height?: number;
  color?: string;
  /** If set, the fill animates from 0 to `progress` starting at this frame. */
  animateFromFrame?: number;
  /** Show "xx %" label right of the bar. */
  showLabel?: boolean;
  style?: React.CSSProperties;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  width = '100%',
  height = 10,
  color = colors.blue,
  animateFromFrame,
  showLabel = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const animated =
    animateFromFrame === undefined
      ? progress
      : progress *
        spring({
          frame: frame - animateFromFrame,
          fps,
          config: {damping: 200, stiffness: 60},
        });
  const clamped = Math.min(1, Math.max(0, animated));

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, width, ...style}}>
      <div
        style={{
          flex: 1,
          height,
          borderRadius: radii.pill,
          backgroundColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped * 100}%`,
            height: '100%',
            borderRadius: radii.pill,
            background: `linear-gradient(90deg, ${color}AA, ${color})`,
            boxShadow: `0 0 12px ${color}66`,
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontFamily: font.family,
            fontSize: height * 1.7,
            fontWeight: font.weight.semibold,
            color: colors.textDim,
            minWidth: height * 4,
          }}
        >
          {Math.round(clamped * 100)} %
        </span>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SignalCard                                                          */
/* ------------------------------------------------------------------ */

export type SignalCardProps = {
  /** Instrument. Default 'XAUUSD'. */
  pair?: string;
  direction?: 'LONG' | 'SHORT';
  /** Preformatted prices (German format), e.g. '3.341,50'. */
  entry?: string;
  sl?: string;
  tp?: string;
  /** Frame at which the card flies in. Default 0. */
  appearFrame?: number;
  width?: number;
  style?: React.CSSProperties;
};

const SignalRow: React.FC<{label: string; value: string; color: string}> = ({
  label,
  value,
  color,
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '18px 0',
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}
  >
    <span
      style={{
        fontSize: 24,
        fontWeight: font.weight.medium,
        color: colors.textDim,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: font.mono,
        fontSize: 30,
        fontWeight: font.weight.bold,
        color,
      }}
    >
      {value}
    </span>
  </div>
);

/** Gold-signal mock card: pair, direction, Entry/SL/TP rows. */
export const SignalCard: React.FC<SignalCardProps> = ({
  pair = 'XAUUSD',
  direction = 'LONG',
  entry = '3.341,50',
  sl = '3.324,00',
  tp = '3.378,00',
  appearFrame = 0,
  width = 460,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: frame - appearFrame,
    fps,
    config: {damping: 16, stiffness: 120, mass: 0.9},
  });
  const dirColor = direction === 'LONG' ? colors.up : colors.down;

  return (
    <Panel
      glow="blue"
      style={{
        width,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 90}px) scale(${0.94 + enter * 0.06})`,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing(2),
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: font.weight.semibold,
              letterSpacing: '0.14em',
              color: colors.textFaint,
              marginBottom: 6,
            }}
          >
            LIVE-SIGNAL
          </div>
          <div style={{fontSize: 42, fontWeight: font.weight.black, letterSpacing: '-0.01em'}}>
            {pair}
          </div>
        </div>
        <Badge label={direction} color={direction === 'LONG' ? 'green' : 'red'} pulse />
      </div>

      <SignalRow label="Einstieg" value={entry} color={colors.blue} />
      <SignalRow label="Stop-Loss" value={sl} color={colors.down} />
      <SignalRow label="Take-Profit" value={tp} color={colors.up} />

      <div
        style={{
          marginTop: spacing(2),
          fontSize: 19,
          color: colors.textFaint,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Gold · Spot</span>
        <span style={{color: dirColor, fontWeight: font.weight.semibold}}>
          {direction === 'LONG' ? 'Kauf-Setup' : 'Verkauf-Setup'}
        </span>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ */
/* CandleChart                                                         */
/* ------------------------------------------------------------------ */

export type ChartLevel = {
  /** Label drawn at the line, e.g. 'Einstieg'. */
  label: string;
  /** Vertical position, 0 = chart bottom, 1 = chart top. */
  yNorm: number;
  color?: string;
  /** Frame at which the level line draws in. Default 0. */
  appearFrame?: number;
};

export type CandleChartProps = {
  width?: number;
  height?: number;
  /** Total candles to build up. Default 28. */
  candleCount?: number;
  /** Frame at which the first candle appears. Default 0. */
  startFrame?: number;
  /** Frames between consecutive candles. Default 5. */
  framesPerCandle?: number;
  /** Seed for the deterministic price walk. Default 7. */
  seed?: number;
  /** Orange volume-profile bars on the right edge. Default false. */
  volumeProfile?: boolean;
  /** Horizontal price lines (Entry/SL/TP) with labels. */
  levels?: ChartLevel[];
  style?: React.CSSProperties;
};

type Candle = {open: number; high: number; low: number; close: number};

/** Deterministic PRNG (Park–Miller) so renders are reproducible. */
const makeRng = (seed: number): (() => number) => {
  let s = Math.floor(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

const generateCandles = (count: number, seed: number): Candle[] => {
  const rnd = makeRng(seed);
  const candles: Candle[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    const drift = 0.35; // gold trends up — reads bullish
    const move = (rnd() - 0.5) * 6 + drift;
    const open = price;
    const close = price + move;
    const high = Math.max(open, close) + rnd() * 2.2;
    const low = Math.min(open, close) - rnd() * 2.2;
    candles.push({open, high, low, close});
    price = close;
  }
  return candles;
};

/**
 * SVG candlestick chart that BUILDS UP over frames: candles appear
 * sequentially (wick first, then body), the newest candle pulses like a
 * live price. Optional orange volume-profile bars on the right edge.
 */
export const CandleChart: React.FC<CandleChartProps> = ({
  width = 1100,
  height = 620,
  candleCount = 28,
  startFrame = 0,
  framesPerCandle = 5,
  seed = 7,
  volumeProfile = false,
  levels = [],
  style,
}) => {
  const frame = useCurrentFrame();

  const candles = React.useMemo(
    () => generateCandles(candleCount, seed),
    [candleCount, seed],
  );

  const pad = 24;
  const profileWidth = volumeProfile ? 90 : 0;
  const plotW = width - pad * 2 - profileWidth;
  const plotH = height - pad * 2;

  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high));
  const toY = (p: number): number =>
    pad + plotH - ((p - min) / (max - min)) * plotH;

  const slot = plotW / candleCount;
  const bodyW = Math.min(30, slot * 0.62);

  const visibleCount = Math.min(
    candleCount,
    Math.max(0, Math.floor((frame - startFrame) / framesPerCandle) + 1),
  );
  const lastIdx = visibleCount - 1;
  const livePulse = (Math.sin(frame * 0.25) + 1) / 2;

  // Volume profile: seeded bell-ish distribution over 12 price bins.
  const bins = 12;
  const profileRnd = makeRng(seed + 991);
  const profile = new Array(bins).fill(0).map((_, i) => {
    const bell = Math.exp(-((i - bins * 0.55) ** 2) / (bins * 1.6));
    return 0.25 + bell * 0.55 + profileRnd() * 0.2;
  });

  return (
    <svg width={width} height={height} style={{display: 'block', ...style}}>
      {/* subtle grid */}
      {[0.2, 0.4, 0.6, 0.8].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={pad + plotW}
          y1={pad + plotH * g}
          y2={pad + plotH * g}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
      ))}

      {/* candles */}
      {candles.slice(0, visibleCount).map((c, i) => {
        const at = startFrame + i * framesPerCandle;
        const wickP = Math.min(1, Math.max(0, (frame - at) / 4));
        const bodyP = Math.min(1, Math.max(0, (frame - at - 2) / 5));
        const x = pad + slot * i + slot / 2;
        const up = c.close >= c.open;
        const color = up ? colors.up : colors.down;
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBot = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(2, bodyBot - bodyTop);
        const mid = (bodyTop + bodyBot) / 2;
        const isLast = i === lastIdx;
        const glow = isLast ? 0.45 + livePulse * 0.55 : 1;

        return (
          <g key={i} opacity={glow}>
            {/* wick grows from the middle outwards */}
            <line
              x1={x}
              x2={x}
              y1={mid - (mid - toY(c.high)) * wickP}
              y2={mid + (toY(c.low) - mid) * wickP}
              stroke={color}
              strokeWidth={2.5}
            />
            {/* body scales open from the middle */}
            <rect
              x={x - bodyW / 2}
              y={mid - (bodyH / 2) * bodyP}
              width={bodyW}
              height={Math.max(1, bodyH * bodyP)}
              rx={3}
              fill={color}
            />
            {isLast && bodyP >= 1 && (
              <circle
                cx={x}
                cy={toY(c.close)}
                r={6 + livePulse * 7}
                fill="none"
                stroke={colors.blue}
                strokeWidth={2.5}
                opacity={1 - livePulse * 0.7}
              />
            )}
            {isLast && bodyP >= 1 && (
              <circle cx={x} cy={toY(c.close)} r={5} fill={colors.blue} />
            )}
          </g>
        );
      })}

      {/* price levels (Entry / SL / TP) */}
      {levels.map((lvl) => {
        const appear = lvl.appearFrame ?? 0;
        const p = Math.min(1, Math.max(0, (frame - appear) / 12));
        if (p <= 0) return null;
        const y = pad + plotH - lvl.yNorm * plotH;
        const c = lvl.color ?? colors.blue;
        return (
          <g key={lvl.label} opacity={p}>
            <line
              x1={pad}
              x2={pad + plotW * p}
              y1={y}
              y2={y}
              stroke={c}
              strokeWidth={2}
              strokeDasharray="10 8"
            />
            <rect
              x={pad + 6}
              y={y - 20}
              width={lvl.label.length * 13 + 26}
              height={34}
              rx={8}
              fill={colors.panel}
              stroke={c}
              strokeWidth={1.5}
            />
            <text
              x={pad + 19}
              y={y + 3}
              fill={c}
              fontFamily={font.family}
              fontSize={20}
              fontWeight={600}
            >
              {lvl.label}
            </text>
          </g>
        );
      })}

      {/* orange volume profile, right edge */}
      {volumeProfile &&
        profile.map((v, i) => {
          const binH = plotH / bins;
          const at = startFrame + i * 2 + 10;
          const p = Math.min(1, Math.max(0, (frame - at) / 10));
          const barW = profileWidth * 0.9 * v * p;
          return (
            <rect
              key={i}
              x={width - pad - barW}
              y={pad + i * binH + 2}
              width={barW}
              height={binH - 4}
              rx={3}
              fill={colors.orange}
              opacity={0.34}
            />
          );
        })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* TierStep                                                            */
/* ------------------------------------------------------------------ */

export type TierStepProps = {
  /** Tier name, e.g. 'Foundation', 'Operator', 'Elite', 'Black'. */
  label: string;
  /** Perk labels shown as chips, e.g. ['Mehr Signale', 'Live-Room']. */
  perks?: string[];
  /** Position on the staircase (0 = lowest). Tints the step slightly. */
  index?: number;
  /** Highlighted step (orange glow). */
  active?: boolean;
  /** Frame at which the step rises in. Default 0. */
  appearFrame?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
};

const PerkChip: React.FC<{label: string}> = ({label}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 14px',
      borderRadius: radii.pill,
      backgroundColor: 'rgba(255,255,255,0.06)',
      border: `1px solid rgba(255,255,255,0.1)`,
      fontSize: 19,
      fontWeight: font.weight.medium,
      color: colors.textDim,
      whiteSpace: 'nowrap',
    }}
  >
    <svg width={12} height={12} viewBox="0 0 12 12">
      <path d="M6 0 L12 6 L6 12 L0 6 Z" fill={colors.orange} />
    </svg>
    {label}
  </span>
);

/** One step of the tier staircase (Foundation → Operator → Elite → Black). */
export const TierStep: React.FC<TierStepProps> = ({
  label,
  perks = [],
  index = 0,
  active = false,
  appearFrame = 0,
  width = 520,
  height = 170,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: frame - appearFrame,
    fps,
    config: {damping: 15, stiffness: 110, mass: 1},
  });

  // Higher tiers get a slightly stronger blue tint on the top edge.
  const tint = 0.08 + index * 0.05;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radii.md,
        backgroundColor: colors.panel,
        border: `1.5px solid ${active ? colors.orange : colors.stroke}`,
        borderTop: `3px solid ${active ? colors.orange : `rgba(117,185,245,${tint + 0.18})`}`,
        boxShadow: active ? `${shadows.panel}, ${shadows.glowOrange}` : shadows.panel,
        background: `linear-gradient(180deg, rgba(117,185,245,${tint}) 0%, ${colors.panel} 55%)`,
        padding: `${spacing(2.5)}px ${spacing(3)}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: font.family,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 120}px)`,
        ...style,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span
          style={{
            fontSize: 36,
            fontWeight: font.weight.black,
            color: active ? colors.orange : colors.text,
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.16em',
            color: colors.textFaint,
          }}
        >
          {`STUFE ${index + 1}`}
        </span>
      </div>
      <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
        {perks.map((p) => (
          <PerkChip key={p} label={p} />
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* LessonCard                                                          */
/* ------------------------------------------------------------------ */

export type LessonCardProps = {
  title: string;
  /** e.g. '08:24'. */
  duration?: string;
  /** Lesson progress 0..1. Default 0. */
  progress?: number;
  locked?: boolean;
  /** Frame at which the card fades/slides in. Default 0. */
  appearFrame?: number;
  width?: number;
  style?: React.CSSProperties;
};

const LockIcon: React.FC<{size?: number}> = ({size = 34}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x={4} y={10} width={16} height={11} rx={3} fill={colors.textDim} />
    <path
      d="M8 10 V7 a4 4 0 0 1 8 0 v3"
      stroke={colors.textDim}
      strokeWidth={2.5}
      fill="none"
    />
  </svg>
);

const PlayIcon: React.FC<{size?: number}> = ({size = 34}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx={12} cy={12} r={11} fill="rgba(117,185,245,0.18)" />
    <path d="M9.5 7.5 L17 12 L9.5 16.5 Z" fill={colors.blue} />
  </svg>
);

/** Academy lesson card with thumbnail, title and progress bar. */
export const LessonCard: React.FC<LessonCardProps> = ({
  title,
  duration = '06:00',
  progress = 0,
  locked = false,
  appearFrame = 0,
  width = 380,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: frame - appearFrame,
    fps,
    config: {damping: 18, stiffness: 130, mass: 0.8},
  });

  return (
    <Panel
      padding={0}
      radius={radii.md}
      style={{
        width,
        overflow: 'hidden',
        opacity: enter * (locked ? 0.6 : 1),
        transform: `translateY(${(1 - enter) * 60}px)`,
        ...style,
      }}
    >
      {/* thumbnail */}
      <div
        style={{
          height: width * 0.42,
          background: locked
            ? `linear-gradient(135deg, ${colors.panelSoft}, ${colors.panel})`
            : `linear-gradient(135deg, rgba(117,185,245,0.22), rgba(240,140,30,0.1) 70%, ${colors.panelSoft})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${colors.stroke}`,
        }}
      >
        {locked ? <LockIcon size={width * 0.13} /> : <PlayIcon size={width * 0.15} />}
      </div>

      <div style={{padding: spacing(2.5)}}>
        <div
          style={{
            fontSize: 25,
            fontWeight: font.weight.bold,
            marginBottom: 10,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 18,
            color: colors.textFaint,
            marginBottom: spacing(2),
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{locked ? 'Gesperrt' : 'Lektion'}</span>
          <span>{duration}</span>
        </div>
        {!locked && (
          <ProgressBar
            progress={progress}
            height={8}
            animateFromFrame={appearFrame + 12}
          />
        )}
      </div>
    </Panel>
  );
};
