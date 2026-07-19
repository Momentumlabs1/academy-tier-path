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
import {
  colors,
  font,
  radii,
  shadows,
  spacing,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from '../lib/tokens';
import {Badge, CandleChart, Heading, LessonCard, Panel, SignalCard} from '../lib/ui';

/**
 * Szene 2 — Dashboard-Überblick (600 Frames / 20 s).
 *
 * Stilisiertes CosmoTrades-Dashboard (Sidebar, Header, drei Bereiche:
 * Signale / Lektionen / Live Calls). Die Kamera macht drei cineastische
 * Punch-Ins — auf jede Karte ein weicher Zoom mit Fokus-Wobble beim
 * Landen (afPump). Cosmo steht klein in der Ecke und zeigt jeweils auf
 * den aktiven Bereich.
 */

/* ------------------------------------------------------------------ */
/* Layout constants (px, at 1920x1080 design size)                     */
/* ------------------------------------------------------------------ */

const SIDEBAR_W = 300;
const PAD = 36;
const CONTENT_X = SIDEBAR_W + PAD; // 336
const CONTENT_Y = 190;

const COL1_X = CONTENT_X; // Signale
const COL1_W = 440;
const COL2_X = 808; // Lektionen
const COL2_W = 624;
const COL3_X = 1464; // Live Calls
const COL3_W = 420;

/* ------------------------------------------------------------------ */
/* Camera choreography                                                 */
/* ------------------------------------------------------------------ */

const clampNum = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/**
 * Keyframe values that center (cx, cy) on screen at the given zoom —
 * clamped so the 1920x1080 stage always covers the full frame and no
 * dead space slides into view.
 */
const punchTo = (
  zoom: number,
  cx: number,
  cy: number,
): {zoom: number; panX: number; panY: number} => {
  const maxX = (zoom - 1) * (VIDEO_WIDTH / 2);
  const maxY = (zoom - 1) * (VIDEO_HEIGHT / 2);
  return {
    zoom,
    panX: clampNum(-zoom * (cx - VIDEO_WIDTH / 2), -maxX, maxX),
    panY: clampNum(-zoom * (cy - VIDEO_HEIGHT / 2), -maxY, maxY),
  };
};

const mid = (a: number, b: number): number => (a + b) / 2;

/** Punch-in targets: Signale, Lektionen, Live Calls. */
const P1 = punchTo(1.72, 556, 440);
const P2 = punchTo(1.42, 1120, 506);
const P3 = punchTo(1.56, 1674, 445);

/**
 * Travel keyframes align pan+zoom on the same frames so the coverage
 * ratio stays constant mid-flight (stage never uncovers the frame).
 */
const CAMERA: CameraKeyframe[] = [
  // soft settle-in from a slightly high, defocused start
  {frame: 0, zoom: 1.1, panX: 0, panY: -18, blur: 6},
  {frame: 26, blur: 0},
  {frame: 34, zoom: 1.035, panX: 0, panY: -6},
  {frame: 88, zoom: 1, panX: 0, panY: 0},
  // punch-in 1 — Signale
  {frame: 124, ...P1},
  {frame: 204, zoom: P1.zoom + 0.05, panX: P1.panX + 6, panY: P1.panY - 10},
  // travel arc: pull back, drift right …
  {frame: 224, zoom: 1.36, panX: mid(P1.panX, P2.panX), panY: mid(P1.panY, P2.panY)},
  // punch-in 2 — Lektionen
  {frame: 244, ...P2},
  {frame: 356, zoom: P2.zoom + 0.045, panX: P2.panX - 8, panY: P2.panY - 8},
  {frame: 374, zoom: 1.47, panX: mid(P2.panX, P3.panX), panY: mid(P2.panY, P3.panY)},
  // punch-in 3 — Live Calls
  {frame: 392, ...P3},
  {frame: 504, zoom: P3.zoom + 0.05, panX: P3.panX - 6, panY: P3.panY - 10},
  // pull back to the full overview, then a slow final push
  {frame: 560, zoom: 1, panX: 0, panY: 0},
  {frame: 599, zoom: 1.05, panX: 0, panY: -8},
];

/** Background parallax: same path, strongly dampened (depth layer). */
const CAMERA_BG: CameraKeyframe[] = CAMERA.map((k) => {
  const out: CameraKeyframe = {frame: k.frame};
  if (k.zoom !== undefined) out.zoom = 1 + (k.zoom - 1) * 0.32;
  if (k.panX !== undefined) out.panX = k.panX * 0.22;
  if (k.panY !== undefined) out.panY = k.panY * 0.22;
  return out;
});

/** Landing frames of the three punch-ins + final pull-back (AF wobble). */
const AF_LANDINGS = [124, 244, 392, 560] as const;

/** Active windows of the three sections (for chapter dots + Cosmo). */
const SECTION_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [124, 226],
  [244, 374],
  [392, 522],
];

const CLAMP = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

/* ------------------------------------------------------------------ */
/* Reveal — spring-based entrance for dashboard elements               */
/* ------------------------------------------------------------------ */

type RevealProps = {
  /** Frame at which the element springs in. */
  at: number;
  from?: 'up' | 'down' | 'left' | 'right';
  dist?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

const Reveal: React.FC<RevealProps> = ({
  at,
  from = 'up',
  dist = 46,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({
    frame: frame - at,
    fps,
    config: {damping: 16, stiffness: 110, mass: 0.9},
  });
  const off = (1 - s) * dist;
  const transform =
    from === 'up'
      ? `translateY(${off}px)`
      : from === 'down'
        ? `translateY(${-off}px)`
        : from === 'left'
          ? `translateX(${-off}px)`
          : `translateX(${off}px)`;
  return <div style={{opacity: s, transform, ...style}}>{children}</div>;
};

/* ------------------------------------------------------------------ */
/* Icons (stroke-based, 22 px)                                         */
/* ------------------------------------------------------------------ */

type IconComp = React.FC<{color: string; size?: number}>;

const IconGrid: IconComp = ({color, size = 22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {[
      [3, 3],
      [14, 3],
      [3, 14],
      [14, 14],
    ].map(([x, y]) => (
      <rect
        key={`${x}-${y}`}
        x={x}
        y={y}
        width={7}
        height={7}
        rx={2}
        stroke={color}
        strokeWidth={2}
      />
    ))}
  </svg>
);

const IconSignal: IconComp = ({color, size = 22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M3 17.5 L9 10.5 L13 14 L21 5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.5 5 H21 V10.5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconAcademy: IconComp = ({color, size = 22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 4 L22 9 L12 14 L2 9 Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path
      d="M6.5 11.5 V16.5 c0 1.5 2.5 3 5.5 3 s5.5 -1.5 5.5 -3 V11.5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
);

const IconCalendar: IconComp = ({color, size = 22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x={3} y={5} width={18} height={16} rx={3} stroke={color} strokeWidth={2} />
    <path d="M3 10 H21" stroke={color} strokeWidth={2} />
    <path d="M8 3 V7 M16 3 V7" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const IconChat: IconComp = ({color, size = 22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x={3} y={4} width={18} height={13} rx={4} stroke={color} strokeWidth={2} />
    <path
      d="M8 17 L8 21 L13 17"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconGear: IconComp = ({color, size = 22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={12} r={3.4} stroke={color} strokeWidth={2} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const rad = (a * Math.PI) / 180;
      return (
        <line
          key={a}
          x1={12 + Math.cos(rad) * 6.2}
          y1={12 + Math.sin(rad) * 6.2}
          x2={12 + Math.cos(rad) * 9.4}
          y2={12 + Math.sin(rad) * 9.4}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);

const IconBell: IconComp = ({color, size = 22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3.5 a6 6 0 0 1 6 6 v3.2 l1.8 2.8 H4.2 L6 12.7 V9.5 a6 6 0 0 1 6 -6 Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path
      d="M9.8 18.8 a2.3 2.3 0 0 0 4.4 0"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const NAV_ITEMS: ReadonlyArray<{label: string; icon: IconComp; active?: boolean}> = [
  {label: 'Übersicht', icon: IconGrid, active: true},
  {label: 'Signale', icon: IconSignal},
  {label: 'Academy', icon: IconAcademy},
  {label: 'Live Calls', icon: IconCalendar},
  {label: 'Community', icon: IconChat},
  {label: 'Einstellungen', icon: IconGear},
];

const Sidebar: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({
    frame: frame - 2,
    fps,
    config: {damping: 18, stiffness: 90, mass: 1},
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: SIDEBAR_W,
        backgroundColor: 'rgba(19, 26, 36, 0.94)',
        borderRight: `1px solid ${colors.stroke}`,
        transform: `translateX(${(s - 1) * SIDEBAR_W * 0.6}px)`,
        opacity: s,
        display: 'flex',
        flexDirection: 'column',
        padding: '34px 22px 28px',
        boxShadow: shadows.soft,
      }}
    >
      {/* Wortmarke */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 10px',
          marginBottom: spacing(5),
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${colors.blue}, #3E7FBE)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: font.weight.black,
            color: colors.black,
            boxShadow: '0 0 22px rgba(117, 185, 245, 0.35)',
          }}
        >
          C
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: font.weight.black,
            letterSpacing: '0.02em',
            color: colors.text,
          }}
        >
          COSMO<span style={{color: colors.blue}}>TRADES</span>
        </div>
      </div>

      {/* Navigation */}
      {NAV_ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <Reveal key={item.label} at={8 + i * 4} from="left" dist={28}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 16px',
                marginBottom: 6,
                borderRadius: radii.md,
                backgroundColor: item.active
                  ? 'rgba(117, 185, 245, 0.10)'
                  : 'transparent',
                border: item.active
                  ? `1px solid ${colors.stroke}`
                  : '1px solid transparent',
              }}
            >
              {item.active && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 10,
                    bottom: 10,
                    width: 3,
                    borderRadius: 2,
                    backgroundColor: colors.blue,
                    boxShadow: '0 0 10px rgba(117, 185, 245, 0.7)',
                  }}
                />
              )}
              <Icon color={item.active ? colors.blue : colors.textDim} />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: item.active ? font.weight.semibold : font.weight.medium,
                  color: item.active ? colors.text : colors.textDim,
                }}
              >
                {item.label}
              </span>
            </div>
          </Reveal>
        );
      })}

      <div style={{flex: 1}} />

      {/* Coach-Zeile */}
      <Reveal at={30} from="up" dist={24}>
        <div
          style={{
            borderTop: `1px solid ${colors.stroke}`,
            paddingTop: spacing(2.5),
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{position: 'relative'}}>
            <Cosmo variant="portrait" height={54} still />
            <div
              style={{
                position: 'absolute',
                right: -1,
                bottom: 2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: colors.up,
                border: `2px solid ${colors.panel}`,
              }}
            />
          </div>
          <div>
            <div style={{fontSize: 20, fontWeight: font.weight.semibold}}>Cosmo</div>
            <div style={{fontSize: 15, color: colors.textFaint}}>Dein Coach · online</div>
          </div>
        </div>
      </Reveal>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

const Header: React.FC = () => (
  <Reveal
    at={8}
    from="down"
    dist={30}
    style={{position: 'absolute', left: CONTENT_X, top: 30, width: 1920 - CONTENT_X - PAD}}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <Heading size={42}>Dein Dashboard</Heading>
        <div style={{fontSize: 20, color: colors.textDim, marginTop: 6}}>
          Willkommen zurück — dein Kommandozentrum für Signale, Lektionen und Live Calls.
        </div>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div
          style={{
            padding: '11px 20px',
            borderRadius: radii.pill,
            backgroundColor: colors.panelSoft,
            border: `1px solid ${colors.stroke}`,
            fontSize: 18,
            color: colors.textDim,
            fontWeight: font.weight.medium,
          }}
        >
          Mi., 15. Juli
        </div>
        <div
          style={{
            position: 'relative',
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: colors.panelSoft,
            border: `1px solid ${colors.stroke}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconBell color={colors.textDim} />
          <div
            style={{
              position: 'absolute',
              top: 11,
              right: 12,
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: colors.orange,
              border: `2px solid ${colors.panelSoft}`,
            }}
          />
        </div>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: `linear-gradient(135deg, rgba(117,185,245,0.25), rgba(240,140,30,0.2))`,
            border: `1px solid ${colors.strokeStrong}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 19,
            fontWeight: font.weight.bold,
            color: colors.text,
          }}
        >
          DU
        </div>
      </div>
    </div>
  </Reveal>
);

/* ------------------------------------------------------------------ */
/* Section label                                                       */
/* ------------------------------------------------------------------ */

const SectionLabel: React.FC<{
  text: string;
  dot: string;
  at: number;
  right?: string;
}> = ({text, dot, at, right}) => (
  <Reveal at={at} from="up" dist={22} style={{marginBottom: 14}}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            backgroundColor: dot,
            boxShadow: `0 0 10px ${dot}`,
          }}
        />
        <span
          style={{
            fontSize: 17,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.18em',
            color: colors.textFaint,
            textTransform: 'uppercase',
          }}
        >
          {text}
        </span>
      </div>
      {right && (
        <span style={{fontSize: 16, color: colors.textFaint}}>{right} →</span>
      )}
    </div>
  </Reveal>
);

/* ------------------------------------------------------------------ */
/* Signale column extras                                               */
/* ------------------------------------------------------------------ */

const StatMini: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  at: number;
}> = ({label, value, valueColor = colors.text, at}) => (
  <Reveal at={at} from="up" dist={30} style={{flex: 1}}>
    <Panel padding={18} radius={radii.md}>
      <div style={{fontSize: 15, color: colors.textFaint, marginBottom: 6}}>{label}</div>
      <div
        style={{
          fontSize: 32,
          fontWeight: font.weight.black,
          color: valueColor,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
    </Panel>
  </Reveal>
);

/* ------------------------------------------------------------------ */
/* Live-Calls panel                                                    */
/* ------------------------------------------------------------------ */

const WEEK_DAYS: ReadonlyArray<{d: string; n: number; today?: boolean; call?: boolean}> = [
  {d: 'Mo', n: 13},
  {d: 'Di', n: 14},
  {d: 'Mi', n: 15, today: true, call: true},
  {d: 'Do', n: 16, call: true},
  {d: 'Fr', n: 17, call: true},
  {d: 'Sa', n: 18},
  {d: 'So', n: 19},
];

const WeekStrip: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', gap: 6, marginTop: 16}}>
      {WEEK_DAYS.map((day, i) => {
        const s = spring({
          frame: frame - (at + i * 2),
          fps,
          config: {damping: 15, stiffness: 140, mass: 0.7},
        });
        return (
          <div
            key={day.d}
            style={{
              flex: 1,
              height: 64,
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              backgroundColor: day.today
                ? 'rgba(240, 140, 30, 0.13)'
                : 'rgba(255, 255, 255, 0.03)',
              border: day.today
                ? `1.5px solid ${colors.orange}`
                : `1px solid rgba(255,255,255,0.05)`,
              opacity: s,
              transform: `translateY(${(1 - s) * 18}px) scale(${0.85 + s * 0.15})`,
            }}
          >
            <span style={{fontSize: 13, color: colors.textFaint}}>{day.d}</span>
            <span
              style={{
                fontSize: 20,
                fontWeight: font.weight.semibold,
                color: day.today ? colors.orange : colors.textDim,
              }}
            >
              {day.n}
            </span>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: day.call
                  ? day.today
                    ? colors.orange
                    : colors.blue
                  : 'transparent',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const CallRow: React.FC<{
  time: string;
  day: string;
  title: string;
  host: string;
  live?: boolean;
  at: number;
}> = ({time, day, title, host, live = false, at}) => (
  <Reveal at={at} from="up" dist={26}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 14px',
        borderRadius: radii.md,
        backgroundColor: live ? 'rgba(240, 140, 30, 0.07)' : 'rgba(255,255,255,0.02)',
        border: live
          ? `1px solid rgba(240, 140, 30, 0.5)`
          : `1px solid ${colors.stroke}`,
        boxShadow: live ? '0 0 22px rgba(240, 140, 30, 0.14)' : undefined,
      }}
    >
      <div
        style={{
          width: 84,
          padding: '10px 0',
          borderRadius: 10,
          backgroundColor: colors.panelSoft,
          textAlign: 'center',
          fontFamily: font.mono,
          fontSize: 21,
          fontWeight: font.weight.bold,
          color: live ? colors.orange : colors.blue,
          flexShrink: 0,
        }}
      >
        {time}
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div
          style={{
            fontSize: 20,
            fontWeight: font.weight.semibold,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
        <div style={{fontSize: 15, color: colors.textFaint, marginTop: 3}}>
          {day} · {host}
        </div>
      </div>
      {live && <Badge label="HEUTE" color="orange" size={14} />}
    </div>
  </Reveal>
);

const LiveCallsPanel: React.FC = () => (
  <Reveal at={44} from="up" dist={54}>
    <Panel padding={22} glow="none" style={{width: COL3_W}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 19,
            fontWeight: font.weight.semibold,
            color: colors.textDim,
          }}
        >
          Juli 2026
        </span>
        <Badge label="LIVE" color="red" pulse size={15} />
      </div>

      <WeekStrip at={54} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginTop: 18,
        }}
      >
        <CallRow
          time="19:00"
          day="Heute"
          title="Gold-Setups"
          host="mit Cosmo"
          live
          at={64}
        />
        <CallRow
          time="18:30"
          day="Do., 16. Juli"
          title="Q&A: Deine Fragen"
          host="mit dem Team"
          at={72}
        />
        <CallRow
          time="17:00"
          day="Fr., 17. Juli"
          title="Wochen-Ausblick Gold"
          host="mit Cosmo"
          at={80}
        />
      </div>
    </Panel>
  </Reveal>
);

/* ------------------------------------------------------------------ */
/* Markt-Überblick strip (bottom, fills the lower third)               */
/* ------------------------------------------------------------------ */

const MarketStrip: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.7 + (Math.sin(frame * 0.21) + 1) * 0.15;
  return (
    <Reveal
      at={68}
      from="up"
      dist={60}
      style={{
        position: 'absolute',
        left: CONTENT_X,
        top: 806,
        width: 1920 - CONTENT_X - PAD,
      }}
    >
      <Panel padding={20} radius={radii.lg}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 6px',
          }}
        >
          <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
            <span style={{fontSize: 21, fontWeight: font.weight.bold}}>
              Gold · Marktüberblick
            </span>
            <span style={{fontSize: 16, color: colors.textFaint}}>XAUUSD · M15</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 24,
                fontWeight: font.weight.bold,
                color: colors.text,
                opacity: flicker,
              }}
            >
              3.352,80
            </span>
            <span
              style={{
                fontSize: 17,
                fontWeight: font.weight.semibold,
                color: colors.up,
                backgroundColor: 'rgba(61, 220, 151, 0.12)',
                border: '1px solid rgba(61, 220, 151, 0.35)',
                borderRadius: radii.pill,
                padding: '5px 12px',
              }}
            >
              +0,34 %
            </span>
          </div>
        </div>
        <CandleChart
          width={1468}
          height={168}
          candleCount={52}
          framesPerCandle={4}
          startFrame={40}
          seed={12}
          style={{marginTop: 4}}
        />
      </Panel>
    </Reveal>
  );
};

/* ------------------------------------------------------------------ */
/* Dashboard stage (lives inside the main camera rig)                  */
/* ------------------------------------------------------------------ */

const DashboardUI: React.FC = () => (
  <AbsoluteFill>
    <Sidebar />
    <Header />

    {/* Spalte 1 — Signale */}
    <div style={{position: 'absolute', left: COL1_X, top: CONTENT_Y, width: COL1_W}}>
      <SectionLabel text="Live-Signale" dot={colors.blue} at={24} />
      <SignalCard appearFrame={36} width={COL1_W} />
      <div style={{display: 'flex', gap: 20, marginTop: spacing(3)}}>
        <StatMini label="Signale diese Woche" value="12" at={52} />
        <StatMini label="Trefferquote" value="78 %" valueColor={colors.up} at={58} />
      </div>
    </div>

    {/* Spalte 2 — Lektionen */}
    <div style={{position: 'absolute', left: COL2_X, top: CONTENT_Y, width: COL2_W}}>
      <SectionLabel
        text="Academy · Lektionen"
        dot={colors.orange}
        at={30}
        right="Alle ansehen"
      />
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 24}}>
        <LessonCard
          title="Trading-Grundlagen"
          duration="08:24"
          progress={1}
          appearFrame={42}
          width={300}
        />
        <LessonCard
          title="Chart-Analyse"
          duration="12:10"
          progress={0.45}
          appearFrame={48}
          width={300}
        />
        <LessonCard
          title="Risiko-Management"
          duration="09:32"
          progress={0.15}
          appearFrame={54}
          width={300}
        />
        <LessonCard
          title="Deine erste Order"
          duration="06:48"
          locked
          appearFrame={60}
          width={300}
        />
      </div>
    </div>

    {/* Spalte 3 — Live Calls */}
    <div style={{position: 'absolute', left: COL3_X, top: CONTENT_Y, width: COL3_W}}>
      <SectionLabel text="Live Calls" dot={colors.down} at={36} />
      <LiveCallsPanel />
    </div>

    {/* Breiter Chart-Streifen unten */}
    <MarketStrip />
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ */
/* Ambient background (parallax depth layer)                           */
/* ------------------------------------------------------------------ */

const BackgroundLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.03);
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(117,185,245,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(117,185,245,0.028) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 18% 10%, rgba(117,185,245,0.10), transparent 70%)',
          opacity: 0.8 + pulse * 0.2,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 88%, rgba(240,140,30,0.07), transparent 70%)',
          opacity: 0.8 - pulse * 0.2,
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Cosmo guide (screen-space overlay, points at the active section)    */
/* ------------------------------------------------------------------ */

const Chevron: React.FC<{dir: 'left' | 'right'}> = ({dir}) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    style={{transform: dir === 'right' ? 'scaleX(-1)' : undefined, flexShrink: 0}}
  >
    <path
      d="M10.5 2.5 L5 8 L10.5 13.5"
      stroke={colors.orange}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type BubbleSpec = {from: number; to: number; text: string};

const GuideBubble: React.FC<{spec: BubbleSpec; side: 'left' | 'right'}> = ({
  spec,
  side,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({
    frame: frame - spec.from,
    fps,
    config: {damping: 13, stiffness: 130, mass: 0.7},
  });
  const fade = 1 - interpolate(frame, [spec.to, spec.to + 10], [0, 1], CLAMP);
  const bob = Math.sin(frame * 0.11 + spec.from) * 3;

  if (frame < spec.from || fade <= 0.001) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 26,
        ...(side === 'right' ? {right: '78%'} : {left: '78%'}),
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 22px',
        borderRadius: radii.pill,
        backgroundColor: colors.panelSoft,
        border: `1px solid ${colors.strokeStrong}`,
        boxShadow: `${shadows.soft}, 0 0 24px rgba(117,185,245,0.18)`,
        fontFamily: font.family,
        fontSize: 21,
        fontWeight: font.weight.semibold,
        color: colors.text,
        whiteSpace: 'nowrap',
        opacity: s * fade,
        transform: `translateY(${(1 - s) * 18 + bob}px) scale(${0.9 + s * 0.1})`,
      }}
    >
      {side === 'right' && <Chevron dir="left" />}
      {spec.text}
      {side === 'left' && <Chevron dir="right" />}
    </div>
  );
};

const CosmoGuide: React.FC<{
  enter: number;
  exit: number;
  side: 'left' | 'right';
  bubbles: BubbleSpec[];
  hopAt?: number;
  idleSeed?: number;
}> = ({enter, exit, side, bubbles, hopAt, idleSeed = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const s = spring({
    frame: frame - enter,
    fps,
    config: {damping: 14, stiffness: 92, mass: 1.05},
  });
  const out = interpolate(frame, [exit, exit + 20], [0, 1], {
    ...CLAMP,
    easing: Easing.in(Easing.cubic),
  });

  if (frame < enter - 8 || frame > exit + 24) return null;

  let hopY = 0;
  if (hopAt !== undefined) {
    const h = interpolate(frame, [hopAt, hopAt + 16], [0, 1], CLAMP);
    hopY = -Math.sin(h * Math.PI) * 24;
  }
  const y = (1 - s) * 320 + out * 360 + hopY;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: -16,
        ...(side === 'right' ? {right: 26} : {left: 26}),
        transform: `translateY(${y}px)`,
      }}
    >
      {/* master neutral pose; flip mirrors him toward the active card */}
      <Cosmo height={430} flip={side === 'right'} idleSeed={idleSeed} />
      {bubbles.map((b) => (
        <GuideBubble key={b.text} spec={b} side={side} />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Chapter dots (which of the three sections is framed)                */
/* ------------------------------------------------------------------ */

const ChapterDots: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [104, 120, 528, 548], [0, 0.85, 0.85, 0], CLAMP);
  if (opacity <= 0.001) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 26,
        display: 'flex',
        justifyContent: 'center',
        gap: 10,
        opacity,
      }}
    >
      {SECTION_WINDOWS.map(([a, b], i) => {
        const on =
          interpolate(frame, [a - 10, a + 6], [0, 1], CLAMP) -
          interpolate(frame, [b, b + 12], [0, 1], CLAMP);
        return (
          <div
            key={i}
            style={{
              position: 'relative',
              width: 12 + 26 * on,
              height: 10,
              borderRadius: radii.pill,
              backgroundColor: 'rgba(242, 237, 228, 0.22)',
              overflow: 'hidden',
              boxShadow: on > 0.05 ? `0 0 ${12 * on}px rgba(240,140,30,0.6)` : undefined,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: radii.pill,
                backgroundColor: colors.orange,
                opacity: on,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export const Scene2Dashboard: React.FC = () => {
  const frame = useCurrentFrame();

  // Fokus-Wobble: AF pumpt kurz vor jeder Landung und rastet scharf ein.
  const focusWobble = afPump(frame, [...AF_LANDINGS], {
    maxBlur: 6,
    attack: 12,
    release: 16,
  });

  const fadeIn = interpolate(frame, [0, 12], [1, 0], CLAMP);

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, fontFamily: font.family}}>
      {/* Tiefen-Ebene: Ambient-Glow + Raster, gedämpfte Parallaxe */}
      <CameraRig keyframes={CAMERA_BG} shake={0.2} shakeSeed={4}>
        <BackgroundLayer />
      </CameraRig>

      {/* Haupt-Ebene: Dashboard mit Punch-In-Choreografie */}
      <CameraRig keyframes={CAMERA} shake={0.5} shakeSeed={11} extraBlur={focusWobble}>
        <DashboardUI />
      </CameraRig>

      {/* Screen-Space: Cosmo zeigt auf den aktiven Bereich */}
      <CosmoGuide
        enter={132}
        exit={202}
        side="right"
        idleSeed={3}
        bubbles={[{from: 142, to: 202, text: 'Deine Live-Signale'}]}
      />
      <CosmoGuide
        enter={252}
        exit={512}
        side="left"
        idleSeed={8}
        hopAt={386}
        bubbles={[
          {from: 262, to: 378, text: 'Deine Lektionen'},
          {from: 388, to: 512, text: 'Deine Live-Calls'},
        ]}
      />

      <ChapterDots />

      {/* Vignette + Eingangs-Blende */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 72% 62% at 50% 46%, transparent 55%, rgba(4,7,12,0.45) 100%)',
        }}
      />
      {fadeIn > 0.001 && (
        <AbsoluteFill style={{backgroundColor: colors.black, opacity: fadeIn}} />
      )}
    </AbsoluteFill>
  );
};
