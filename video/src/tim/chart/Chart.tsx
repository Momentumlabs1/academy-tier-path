import React from 'react';
import {interpolate} from 'remotion';
import {COLORS, FONT} from '../theme';
import * as D from './data';

// The whole chart is driven by tSrc = seconds in the SOURCE recording.

const easeOut = (x: number) => 1 - (1 - x) ** 3;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const prog = (t: number, start: number, dur: number) => clamp01((t - start) / dur);

const PXU = (D.CHART.bottom - D.CHART.top) / (D.P_MAX - D.P_MIN);
const py = (p: number) => D.CHART.top + (D.P_MAX - p) * PXU;

// ---------- primitives ----------

const Candle: React.FC<{spec: D.CandleSpec; x: number; t: number; pulse?: boolean}> = ({spec, x, t, pulse}) => {
  const p = easeOut(prog(t, spec.t, spec.dur ?? 0.55));
  if (p <= 0) return null;
  const o = spec.o;
  const c = o + (spec.c - o) * p;
  const h = o + (spec.h - o) * p;
  const l = o + (spec.l - o) * p;
  const fill = spec.kind === 'blue' ? COLORS.blue : COLORS.candleWhite;
  const bodyTop = py(Math.max(o, c));
  const bodyH = Math.max(3, Math.abs(py(o) - py(c)));
  const showPulse = pulse && t >= spec.t && p < 1 + 1.2 / (spec.dur ?? 0.55);
  const ringP = ((t - spec.t) % 0.9) / 0.9;
  return (
    <g>
      <line x1={x} x2={x} y1={py(h)} y2={py(l)} stroke={fill} strokeWidth={3} opacity={0.9} />
      <rect x={x - D.M5_W / 2} y={bodyTop} width={D.M5_W} height={bodyH} fill={fill} rx={2.5} />
      {showPulse ? (
        <>
          <circle cx={x} cy={py(c)} r={6} fill="#fff" />
          <circle cx={x} cy={py(c)} r={6 + ringP * 22} fill="none" stroke="#fff" strokeWidth={2} opacity={(1 - ringP) * 0.6} />
        </>
      ) : null}
    </g>
  );
};

const Zone: React.FC<{
  t: number;
  at: number;
  x0: number;
  x1: number;
  pTop: number;
  pBot: number;
  fill: string;
  stroke: string;
  flashAt?: number;
}> = ({t, at, x0, x1, pTop, pBot, fill, stroke, flashAt}) => {
  const o = easeOut(prog(t, at, 0.6));
  if (o <= 0) return null;
  let flash = 0;
  if (flashAt !== undefined && t >= flashAt) {
    flash = Math.max(0, 1 - (t - flashAt) / 0.8) * 0.35;
  }
  return (
    <g opacity={o}>
      <rect
        x={x0}
        y={py(pTop)}
        width={x1 - x0}
        height={py(pBot) - py(pTop)}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        style={{filter: flash > 0 ? `brightness(${1 + flash * 2})` : undefined}}
      />
    </g>
  );
};

const Tag: React.FC<{
  x: number;
  y: number;
  text: string;
  bg: string;
  color: string;
  t: number;
  at: number;
  fontSize?: number;
}> = ({x, y, text, bg, color, t, at, fontSize = 24}) => {
  const s = easeOut(prog(t, at, 0.35));
  if (s <= 0) return null;
  const w = text.length * fontSize * 0.68 + 26;
  const h = fontSize + 18;
  return (
    <g transform={`translate(${x} ${y}) scale(${0.7 + 0.3 * s})`} opacity={s}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={7} fill={bg} />
      <text
        x={0}
        y={fontSize * 0.36}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={800}
        fontSize={fontSize}
        fill={color}
        letterSpacing="0.06em"
      >
        {text}
      </text>
    </g>
  );
};

const LevelLine: React.FC<{
  p: number;
  x0: number;
  x1: number;
  t: number;
  at: number;
  dashed?: boolean;
  label?: string;
  color?: string;
  pulseAt?: number;
}> = ({p, x0, x1, t, at, dashed, label, color = COLORS.level, pulseAt}) => {
  const dp = easeOut(prog(t, at, 0.5));
  if (dp <= 0) return null;
  let glow = 0;
  if (pulseAt !== undefined && t >= pulseAt && t < pulseAt + 1.6) {
    glow = Math.abs(Math.sin(((t - pulseAt) / 1.6) * Math.PI * 2)) * 0.8;
  }
  return (
    <g>
      <line
        x1={x0}
        x2={x0 + (x1 - x0) * dp}
        y1={py(p)}
        y2={py(p)}
        stroke={color}
        strokeWidth={glow > 0 ? 2 + glow : 2}
        strokeDasharray={dashed ? '7 8' : undefined}
        opacity={0.55 + glow * 0.45}
      />
      {label ? (
        <text
          x={x1 + 12}
          y={py(p) + 8}
          fontFamily={FONT}
          fontWeight={600}
          fontSize={24}
          fill={COLORS.white}
          opacity={dp * (0.75 + glow * 0.25)}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

// entry marker: white dot + ENTRY pill
const Entry: React.FC<{x: number; p: number; t: number; at: number; labelAt: number; dx?: number; dy?: number}> = ({
  x,
  p,
  t,
  at,
  labelAt,
  dx = 96,
  dy = 0,
}) => {
  const s = easeOut(prog(t, at, 0.4));
  if (s <= 0) return null;
  const ringP = ((t - at) % 1.1) / 1.1;
  return (
    <g>
      <circle cx={x} cy={py(p)} r={8 * s} fill="#fff" />
      <circle cx={x} cy={py(p)} r={8 + ringP * 26} fill="none" stroke="#fff" strokeWidth={2} opacity={(1 - ringP) * 0.5 * s} />
      <Tag x={x + dx} y={py(p) + dy} text="ENTRY" bg="#F5F6F7" color="#0A0A0B" t={t} at={labelAt} />
    </g>
  );
};

// scenario 1 trailing stop: red band that steps DOWN above each new candle high
const TrailBandShort: React.FC<{t: number}> = ({t}) => {
  const steps = D.SC1_STOP_STEPS;
  if (t < steps[0].t) return null;
  let p = steps[0].p;
  for (let i = 1; i < steps.length; i++) {
    if (t >= steps[i].t) {
      const k = easeOut(prog(t, steps[i].t, 0.45));
      p = steps[i - 1].p + (steps[i].p - steps[i - 1].p) * k;
    }
  }
  const o = easeOut(prog(t, steps[0].t, 0.5));
  const x0 = D.m5x(2) - 40;
  const x1 = D.CHART.right - 40;
  return (
    <g opacity={o}>
      <rect
        x={x0}
        y={py(p + D.SC1_STOP_BAND)}
        width={x1 - x0}
        height={py(p) - py(p + D.SC1_STOP_BAND)}
        fill={COLORS.redZone}
        stroke={COLORS.redZoneStroke}
        strokeWidth={1.5}
      />
      <line x1={x0} x2={x1} y1={py(p)} y2={py(p)} stroke={COLORS.red} strokeWidth={2.5} opacity={0.9} />
      <Tag x={x1 - 52} y={py(p + D.SC1_STOP_BAND / 2)} text="STOP" bg={COLORS.red} color="#fff" t={t} at={steps[0].t} />
    </g>
  );
};

// scenario 2 trailing stop: red tick + STOP tag stepping UP under candle lows
const TrailStopLong: React.FC<{t: number}> = ({t}) => {
  const steps = D.SC2_STOP_STEPS;
  if (t < steps[0].t) return null;
  let p = steps[0].p;
  let x = steps[0].x;
  for (let i = 1; i < steps.length; i++) {
    if (t >= steps[i].t) {
      const k = easeOut(prog(t, steps[i].t, 0.45));
      p = steps[i - 1].p + (steps[i].p - steps[i - 1].p) * k;
      x = steps[i - 1].x + (steps[i].x - steps[i - 1].x) * k;
    }
  }
  const o = easeOut(prog(t, steps[0].t, 0.4));
  const hit = t >= D.SC2_STOP_HIT;
  const hitP = hit ? Math.min(1, (t - D.SC2_STOP_HIT) / 0.7) : 0;
  return (
    <g opacity={o}>
      <line
        x1={x - 46}
        x2={x + 46}
        y1={py(p)}
        y2={py(p)}
        stroke={COLORS.red}
        strokeWidth={hit ? 4 : 3}
        opacity={0.95}
      />
      <Tag x={x + 118} y={py(p)} text="STOP" bg={COLORS.red} color="#fff" t={t} at={steps[0].t} />
      {hit ? (
        <circle
          cx={D.m5x(9)}
          cy={py(80.8)}
          r={10 + hitP * 42}
          fill="none"
          stroke={COLORS.red}
          strokeWidth={3}
          opacity={(1 - hitP) * 0.9}
        />
      ) : null}
    </g>
  );
};

// ---------- main ----------

export const Chart: React.FC<{tSrc: number}> = ({tSrc}) => {
  const t = tSrc;
  const chartIn = easeOut(prog(t, D.B.chartIn, 0.8));
  if (chartIn <= 0) return null;

  // camera: punch in on the M5 action during the scenarios
  const zoom = interpolate(
    t,
    [43.0, 44.2, 70.6, 71.8, 76.2, 77.4, 95.9, 97.4],
    [1, 1.05, 1.05, 1, 1, 1.05, 1.05, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  // M15 candle grow
  const mp = easeOut(prog(t, D.B.m15Grow, 1.1));
  const m15 = D.M15;
  const mC = m15.o + (m15.c - m15.o) * mp;
  const mH = m15.o + (m15.h - m15.o) * mp;
  const mL = m15.o + (m15.l - m15.o) * mp;

  // scenario 1 fade-out
  const sc1o = 1 - easeOut(prog(t, D.SC1_FADE, 0.8));

  const gridV = [200, 360, 520, 680, 840, 1000];
  const gridH = [960, 1120, 1280, 1440, 1600, 1760];

  const orBracketX = 148;
  const labelX = D.CHART.right - 30;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: chartIn}}>
      <svg
        width={1080}
        height={1920}
        viewBox="0 0 1080 1920"
        style={{transform: `scale(${zoom})`, transformOrigin: '58% 62%'}}
      >
        {/* faint grid */}
        <g>
          {gridV.map((x) => (
            <line key={`v${x}`} x1={x} x2={x} y1={D.CHART.top - 30} y2={D.CHART.bottom + 20} stroke={COLORS.grid} strokeWidth={1} />
          ))}
          {gridH.map((y) => (
            <line key={`h${y}`} x1={D.CHART.left} x2={D.CHART.right} y1={y} y2={y} stroke={COLORS.grid} strokeWidth={1} />
          ))}
        </g>

        {/* column headers */}
        <g opacity={easeOut(prog(t, D.B.headers, 0.5))}>
          <text x={D.M15_X} y={D.CHART.top - 44} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={27} fill={COLORS.grey}>
            M15
          </text>
          <text x={D.m5x(2)} y={D.CHART.top - 44} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={27} fill={COLORS.grey}>
            M5
          </text>
        </g>

        {/* opening range: high / low dashed lines */}
        <LevelLine p={D.OR_HIGH} x0={orBracketX} x1={labelX - 66} t={t} at={D.B.highLine} dashed label="High" />
        <LevelLine p={D.OR_LOW} x0={orBracketX} x1={labelX - 66} t={t} at={D.B.lowLine} dashed label="Low" />

        {/* opening range bracket */}
        <g opacity={easeOut(prog(t, D.B.orBracket, 0.6))}>
          <line x1={orBracketX} x2={orBracketX} y1={py(D.OR_HIGH)} y2={py(D.OR_LOW)} stroke={COLORS.dashed} strokeWidth={2} />
          <line x1={orBracketX} x2={orBracketX + 14} y1={py(D.OR_HIGH)} y2={py(D.OR_HIGH)} stroke={COLORS.dashed} strokeWidth={2} />
          <line x1={orBracketX} x2={orBracketX + 14} y1={py(D.OR_LOW)} y2={py(D.OR_LOW)} stroke={COLORS.dashed} strokeWidth={2} />
          <text
            x={orBracketX - 18}
            y={(py(D.OR_HIGH) + py(D.OR_LOW)) / 2}
            fontFamily={FONT}
            fontWeight={600}
            fontSize={25}
            fill={COLORS.grey}
            textAnchor="middle"
            transform={`rotate(-90 ${orBracketX - 18} ${(py(D.OR_HIGH) + py(D.OR_LOW)) / 2})`}
            letterSpacing="0.08em"
          >
            OPENING RANGE
          </text>
        </g>

        {/* M15 candle */}
        {mp > 0 ? (
          <g>
            <line x1={D.M15_X} x2={D.M15_X} y1={py(mH)} y2={py(mL)} stroke={COLORS.candleWhite} strokeWidth={4} opacity={0.9} />
            <rect
              x={D.M15_X - D.M15_W / 2}
              y={py(Math.max(m15.o, mC))}
              width={D.M15_W}
              height={Math.max(4, Math.abs(py(m15.o) - py(mC)))}
              fill={COLORS.candleWhite}
              rx={3}
            />
            {t < D.B.highLine ? (
              <>
                <circle cx={D.M15_X} cy={py(mC)} r={7} fill="#fff" />
                <circle
                  cx={D.M15_X}
                  cy={py(mC)}
                  r={7 + (((t - D.B.m15Grow) % 0.9) / 0.9) * 24}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={(1 - ((t - D.B.m15Grow) % 0.9) / 0.9) * 0.6}
                />
              </>
            ) : null}
          </g>
        ) : null}

        {/* volume profile */}
        <g>
          {D.PROFILE_ROWS.map((row, i) => {
            const rp = easeOut(prog(t, D.B.profile + i * 0.14, 0.5));
            if (rp <= 0) return null;
            const barH = 3.4 * PXU * 0.82;
            return (
              <rect
                key={row.p}
                x={D.PROFILE_X}
                y={py(row.p) - barH / 2}
                width={row.w * D.PROFILE_MAX_W * rp}
                height={barH}
                fill={COLORS.profile}
                rx={2}
              />
            );
          })}
        </g>

        {/* value area box */}
        <g opacity={easeOut(prog(t, D.B.vaBox, 0.7))}>
          <rect
            x={360}
            y={py(D.VAH)}
            width={labelX - 360 - 10}
            height={py(D.VAL) - py(D.VAH)}
            fill={COLORS.vaFill}
            stroke={COLORS.vaStroke}
            strokeWidth={1.5}
          />
          <text x={378} y={py(D.VAH) + 60} fontFamily={FONT} fontWeight={800} fontSize={42} fill={COLORS.vaText}>
            70&thinsp;%
          </text>
          <text
            x={378}
            y={py(D.VAH) + 98}
            fontFamily={FONT}
            fontWeight={600}
            fontSize={27}
            fill={COLORS.vaText}
            opacity={easeOut(prog(t, D.B.vaText, 0.5)) * 0.9}
          >
            Value Area
          </text>
        </g>

        {/* VAH / VAL */}
        <LevelLine p={D.VAH} x0={orBracketX} x1={labelX - 66} t={t} at={D.B.vahLabel} label="VAH" pulseAt={D.B.twoPulse} />
        <LevelLine p={D.VAL} x0={orBracketX} x1={labelX - 66} t={t} at={D.B.valLabel} label="VAL" pulseAt={D.B.twoPulse + 0.3} />

        {/* -------- scenario 1: fakeout short -------- */}
        {sc1o > 0 && t >= D.SC1[0].t ? (
          <g opacity={sc1o}>
            <Zone
              t={t}
              at={D.SC1_GREEN.t}
              x0={D.SC1_GREEN.x0}
              x1={D.SC1_GREEN.x1}
              pTop={D.SC1_GREEN.pTop}
              pBot={D.SC1_GREEN.pBot}
              fill={COLORS.greenZone}
              stroke={COLORS.greenZoneStroke}
              flashAt={D.SC1_TARGET_HIT}
            />
            <TrailBandShort t={t} />
            {D.SC1.map((c, i) => (
              <Candle key={i} spec={c} x={D.m5x(i)} t={t} pulse={i === lastActive(D.SC1, t)} />
            ))}
            <Entry x={D.SC1_ENTRY.x} p={D.SC1_ENTRY.p} t={t} at={D.SC1_ENTRY.t} labelAt={D.SC1_ENTRY.label} />
            {t >= D.SC1_TARGET_HIT ? (
              <circle
                cx={D.m5x(8)}
                cy={py(42.3)}
                r={10 + Math.min(1, (t - D.SC1_TARGET_HIT) / 0.7) * 40}
                fill="none"
                stroke={COLORS.green}
                strokeWidth={3}
                opacity={(1 - Math.min(1, (t - D.SC1_TARGET_HIT) / 0.7)) * 0.9}
              />
            ) : null}
          </g>
        ) : null}

        {/* -------- scenario 2: acceptance long -------- */}
        {t >= D.SC2[0].t ? (
          <g>
            <Zone
              t={t}
              at={D.SC2_GREEN.t}
              x0={D.SC2_GREEN.x0}
              x1={D.SC2_GREEN.x1}
              pTop={D.SC2_GREEN.pTop}
              pBot={D.SC2_GREEN.pBot}
              fill={COLORS.greenZone}
              stroke={COLORS.greenZoneStroke}
            />
            <Zone
              t={t}
              at={D.SC2_RED.t}
              x0={D.SC2_RED.x0}
              x1={D.SC2_RED.x1}
              pTop={D.SC2_RED.pTop}
              pBot={D.SC2_RED.pBot}
              fill={COLORS.redZone}
              stroke={COLORS.redZoneStroke}
            />
            {D.SC2.map((c, i) => (
              <Candle key={i} spec={c} x={D.m5x(i)} t={t} pulse={i === lastActive(D.SC2, t)} />
            ))}
            <Entry x={D.SC2_ENTRY.x} p={D.SC2_ENTRY.p} t={t} at={D.SC2_ENTRY.t} labelAt={D.SC2_ENTRY.label} dx={-16} dy={66} />
            <TrailStopLong t={t} />
          </g>
        ) : null}
      </svg>
    </div>
  );
};

function lastActive(list: D.CandleSpec[], t: number): number {
  let idx = -1;
  for (let i = 0; i < list.length; i++) {
    if (t >= list[i].t) idx = i;
  }
  return idx;
}
