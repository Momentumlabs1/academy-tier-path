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
  const showPulse = pulse && t >= spec.t && t < spec.t + (spec.dur ?? 0.55) + 1.2;
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

// scenario 1's key candle: pushes above the VAH while "live", then retraces
// and closes back inside the value area (rejection). Turns from blue to white
// the moment the provisional close drops under the open.
const RejectionCandle: React.FC<{t: number}> = ({t}) => {
  const R = D.SC1_REJ;
  const up = easeOut(prog(t, R.tUp, R.durUp));
  if (up <= 0) return null;
  const down = easeOut(prog(t, R.tDown, R.durDown));
  const close = R.o + (R.peak - R.o) * up + (R.close - R.peak) * down;
  const hi = R.o + (R.hi - R.o) * up;
  const lo = R.o + (R.lo - R.o) * Math.min(1, up * 2);
  const bullish = close >= R.o;
  const fill = bullish ? COLORS.blue : COLORS.candleWhite;
  const showPulse = t >= R.tUp && t < R.tDown + R.durDown + 1.2;
  const ringP = ((t - R.tUp) % 0.9) / 0.9;
  return (
    <g>
      <line x1={R.x} x2={R.x} y1={py(hi)} y2={py(lo)} stroke={fill} strokeWidth={3} opacity={0.9} />
      <rect
        x={R.x - D.M5_W / 2}
        y={py(Math.max(R.o, close))}
        width={D.M5_W}
        height={Math.max(3, Math.abs(py(R.o) - py(close)))}
        fill={fill}
        rx={2.5}
      />
      {showPulse ? (
        <>
          <circle cx={R.x} cy={py(close)} r={6} fill="#fff" />
          <circle cx={R.x} cy={py(close)} r={6 + ringP * 22} fill="none" stroke="#fff" strokeWidth={2} opacity={(1 - ringP) * 0.6} />
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
  if (pulseAt !== undefined && t >= pulseAt && t < pulseAt + 1.1) {
    glow = Math.abs(Math.sin(((t - pulseAt) / 1.1) * Math.PI * 2)) * 0.8;
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
  const ringOn = t < at + 4.4; // a few ripples, then rest
  return (
    <g>
      <circle cx={x} cy={py(p)} r={8 * s} fill="#fff" />
      {ringOn ? (
        <circle cx={x} cy={py(p)} r={8 + ringP * 26} fill="none" stroke="#fff" strokeWidth={2} opacity={(1 - ringP) * 0.5 * s} />
      ) : null}
      <Tag x={x + dx} y={py(p) + dy} text="ENTRY" bg="#F5F6F7" color="#0A0A0B" t={t} at={labelAt} />
    </g>
  );
};

// trailing stop: red tick + STOP tag stepping along the candle sequence
const TrailStop: React.FC<{
  t: number;
  steps: {t: number; p: number; x: number}[];
  hit?: {t: number; x: number; p: number};
}> = ({t, steps, hit}) => {
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
  const isHit = hit !== undefined && t >= hit.t;
  const hitP = isHit ? Math.min(1, (t - (hit?.t ?? 0)) / 0.38) : 0;
  return (
    <g opacity={o}>
      <line
        x1={x - 46}
        x2={x + 46}
        y1={py(p)}
        y2={py(p)}
        stroke={COLORS.red}
        strokeWidth={isHit ? 4 : 3}
        opacity={0.95}
      />
      <Tag x={Math.min(x + 118, 932)} y={py(p)} text="STOP" bg={COLORS.red} color="#fff" t={t} at={steps[0].t} />
      {isHit && hit ? (
        <circle
          cx={hit.x}
          cy={py(hit.p)}
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

// staged reveal pill: opens from a blue accent line, text wipes in with a
// tracking-settle, exits by collapsing again — one motion language for all
const ScenarioPill: React.FC<{t: number; at: number; out: number; x: number; y: number; num?: string; label: string}> = ({
  t,
  at,
  out,
  x,
  y,
  num,
  label,
}) => {
  const openP = easeOut(prog(t, at, 0.45)); // pill opens horizontally
  const txtP = easeOut(prog(t, at + 0.16, 0.5)); // text wipe + tracking settle
  const outP = easeOut(prog(t, out, 0.4));
  if (openP <= 0 || outP >= 1) return null;
  const text = num ? `${num} · ${label}` : label;
  const w = text.length * 26 * 0.66 + 64;
  const clipId = `pillclip-${num ?? 'x'}-${Math.round(at * 10)}`;
  const scaleX = Math.max(0.06, openP) * (1 - 0.3 * outP);
  const scaleY = Math.min(1, openP * 1.6) * (1 - 0.12 * outP);
  const o = Math.min(1, openP * 2.2) * (1 - outP);
  const track = 6 - 4.2 * txtP + 3 * outP; // px letter-spacing settles in
  const accentX = -w / 2 + 14;
  return (
    <g opacity={o} transform={`translate(${x} ${y + (1 - openP) * 12 - outP * 10})`}>
      <g transform={`scale(${scaleX} ${scaleY})`}>
        <rect x={-w / 2} y={-30} width={w} height={60} rx={12} fill="rgba(10,10,12,0.94)" stroke="rgba(235,238,245,0.30)" strokeWidth={2} />
        {/* blue accent bar, slides down as the pill opens */}
        <rect x={accentX} y={-30 + 44 * (1 - txtP)} width={4} height={Math.max(4, 60 * txtP - 16)} rx={2} fill={COLORS.blueBright} opacity={0.9} />
      </g>
      <clipPath id={clipId}>
        <rect x={-w / 2 + 24} y={-30} width={Math.max(0, (w - 30) * txtP)} height={60} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <text
          x={12}
          y={9}
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={800}
          fontSize={26}
          letterSpacing={`${track}px`}
          opacity={Math.min(1, txtP * 1.6) * (1 - outP)}
        >
          {num ? (
            <>
              <tspan fill={COLORS.blueBright}>{num}</tspan>
              <tspan fill={COLORS.grey}> · </tspan>
            </>
          ) : null}
          <tspan fill={COLORS.white}>{label}</tspan>
        </text>
      </g>
    </g>
  );
};

// thin vertical sweep that "wipes" scenario 1 off the chart
const Sweep: React.FC<{t: number}> = ({t}) => {
  const p = prog(t, 70.35, 0.65);
  if (p <= 0 || p >= 1) return null;
  const x = 420 + 560 * (p * p * (3 - 2 * p)); // smoothstep
  const o = Math.sin(Math.PI * p);
  return (
    <g opacity={o}>
      <line x1={x} x2={x} y1={D.CHART.top - 10} y2={D.CHART.bottom + 10} stroke="rgba(110,143,255,0.16)" strokeWidth={12} />
      <line x1={x} x2={x} y1={D.CHART.top - 10} y2={D.CHART.bottom + 10} stroke="rgba(185,198,255,0.85)" strokeWidth={2.5} />
    </g>
  );
};

// ---------- main ----------

export const Chart: React.FC<{tSrc: number}> = ({tSrc}) => {
  const t = tSrc;
  const chartIn = easeOut(prog(t, D.B.chartIn, 0.8));
  if (chartIn <= 0) return null;

  // camera: punch in on the M5 action during the scenarios
  // (windows avoid the pause-cut ranges so the zoom never jumps)
  const zoom = interpolate(
    t,
    [43.0, 44.2, 69.9, 70.8, 76.2, 77.4, 96.45, 97.55],
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
  const sc1o = 1 - easeOut(prog(t, D.SC1_FADE, 0.5));

  // header emphasis: M15 while the opening range is the topic, M5 from the
  // "wir warten, ob eine M5-Kerze ..." moment on
  const m15In = easeOut(prog(t, D.B.m15Header, 0.5));
  const m5In = easeOut(prog(t, D.B.m5Header, 0.5));
  const m5e = easeOut(prog(t, D.B.m5Emph, 0.7));

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
        {/* faint grid — draws in staggered while he teases "der einfachste Edge" */}
        <g>
          {gridV.map((x, i) => {
            const gp = easeOut(prog(t, 6.0 + i * 0.12, 0.7));
            if (gp <= 0) return null;
            return (
              <line
                key={`v${x}`}
                x1={x}
                x2={x}
                y1={D.CHART.top - 30}
                y2={D.CHART.top - 30 + (D.CHART.bottom + 50 - D.CHART.top) * gp}
                stroke={COLORS.grid}
                strokeWidth={1}
                opacity={gp}
              />
            );
          })}
          {gridH.map((y, i) => {
            const gp = easeOut(prog(t, 6.3 + i * 0.12, 0.7));
            if (gp <= 0) return null;
            return (
              <line
                key={`h${y}`}
                x1={D.CHART.left}
                x2={D.CHART.left + (D.CHART.right - D.CHART.left) * gp}
                y1={y}
                y2={y}
                stroke={COLORS.grid}
                strokeWidth={1}
                opacity={gp}
              />
            );
          })}
        </g>

        {/* column headers with dynamic emphasis */}
        <g>
          <text
            x={D.M15_X}
            y={D.CHART.top - 44}
            textAnchor="middle"
            fontFamily={FONT}
            fontWeight={800}
            fontSize={24 + 11 * (1 - m5e)}
            fill={COLORS.white}
            opacity={m15In * (0.5 + 0.5 * (1 - m5e))}
          >
            M15
          </text>
          <rect
            x={D.M15_X - 25}
            y={D.CHART.top - 34}
            width={50}
            height={4}
            rx={2}
            fill={COLORS.blueBright}
            opacity={m15In * (1 - m5e)}
          />
          <text
            x={D.m5x(2)}
            y={D.CHART.top - 44}
            textAnchor="middle"
            fontFamily={FONT}
            fontWeight={800}
            fontSize={24 + 11 * m5e}
            fill={COLORS.white}
            opacity={m5In * (0.5 + 0.5 * m5e)}
          >
            M5
          </text>
          <rect
            x={D.m5x(2) - 22}
            y={D.CHART.top - 34}
            width={44}
            height={4}
            rx={2}
            fill={COLORS.blueBright}
            opacity={m5In * m5e}
          />
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

        {/* value area box: wipes in left->right, edges draw, label rises in */}
        {(() => {
          const vaP = easeOut(prog(t, D.B.vaBox, 0.75));
          if (vaP <= 0) return null;
          const boxW = (labelX - 360 - 10) * vaP;
          const lp = easeOut(prog(t, D.B.vaBox + 0.45, 0.55));
          const sp = easeOut(prog(t, D.B.vaText, 0.5));
          return (
            <g>
              <defs>
                <linearGradient id="vaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(58,80,178,0.36)" />
                  <stop offset="100%" stopColor="rgba(44,62,140,0.20)" />
                </linearGradient>
              </defs>
              <rect x={360} y={py(D.VAH)} width={boxW} height={py(D.VAL) - py(D.VAH)} fill="url(#vaFill)" />
              {/* edges draw with the wipe */}
              <line x1={360} x2={360 + boxW} y1={py(D.VAH)} y2={py(D.VAH)} stroke="rgba(110,143,255,0.55)" strokeWidth={2} />
              <line x1={360} x2={360 + boxW} y1={py(D.VAL)} y2={py(D.VAL)} stroke="rgba(110,143,255,0.55)" strokeWidth={2} />
              {/* label block, lower-left inside the box */}
              <g opacity={lp} transform={`translate(0 ${(1 - lp) * 14})`}>
                <text x={402} y={py(D.VAL + 7)} fontFamily={FONT} fontWeight={800} fontSize={48} fill={COLORS.vaText} letterSpacing="-0.01em">
                  70&thinsp;%
                </text>
                <text
                  x={403}
                  y={py(D.VAL + 7) + 42}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={23}
                  letterSpacing="0.2em"
                  fill="rgba(170,187,255,0.78)"
                  opacity={sp}
                >
                  VALUE AREA
                </text>
              </g>
            </g>
          );
        })()}

        {/* VAH / VAL */}
        <LevelLine p={D.VAH} x0={orBracketX} x1={labelX - 66} t={t} at={D.B.vahLabel} label="VAH" pulseAt={D.B.twoPulse} />
        <LevelLine p={D.VAL} x0={orBracketX} x1={labelX - 66} t={t} at={D.B.valLabel} label="VAL" pulseAt={D.B.twoPulse + 0.2} />

        {/* -------- scenario 1: rejection at the VAH -> short -------- */}
        {sc1o > 0 && t >= D.SC1_WAIT[0].t ? (
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
            <Zone
              t={t}
              at={D.SC1_RED.t}
              x0={D.SC1_RED.x0}
              x1={D.SC1_RED.x1}
              pTop={D.SC1_RED.pTop}
              pBot={D.SC1_RED.pBot}
              fill={COLORS.redZone}
              stroke={COLORS.redZoneStroke}
            />
            <TrailStop t={t} steps={D.SC1_STOP_STEPS} />
            {D.SC1_WAIT.map((c, i) => (
              <Candle key={i} spec={c} x={D.m5x(i)} t={t} pulse={i === lastActive(D.SC1_WAIT, t) && t < D.SC1_REJ.tUp} />
            ))}
            <RejectionCandle t={t} />
            {D.SC1_TRAIL.map((c, i) => (
              <Candle key={i} spec={c} x={D.m5x(i + D.SC1_TRAIL_X0)} t={t} pulse={i === lastActive(D.SC1_TRAIL, t)} />
            ))}
            <Entry x={D.SC1_ENTRY.x} p={D.SC1_ENTRY.p} t={t} at={D.SC1_ENTRY.t} labelAt={D.SC1_ENTRY.label} dx={-24} dy={64} />
            {t >= D.SC1_TARGET_HIT ? (
              <circle
                cx={D.m5x(D.SC1_TRAIL_X0 + 3)}
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

        {/* -------- transitions between the scenarios -------- */}
        <Sweep t={t} />
        <ScenarioPill t={t} at={6.6} out={8.55} x={540} y={1290} label="DER EINFACHSTE EDGE" />
        <ScenarioPill t={t} at={42.95} out={45.65} x={700} y={1122} num="1" label="FAKEOUT" />
        <ScenarioPill t={t} at={72.4} out={76.35} x={700} y={1150} num="2" label="AKZEPTANZ" />

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
            <TrailStop t={t} steps={D.SC2_STOP_STEPS} hit={{t: D.SC2_STOP_HIT, x: D.m5x(9), p: 80.8}} />
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
