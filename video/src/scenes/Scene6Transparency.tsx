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
import {CameraRig, type CameraKeyframe} from '../lib/camera';
import {Cosmo} from '../lib/Cosmo';
import {Badge, Heading, Panel} from '../lib/ui';

/**
 * Szene 6 — Transparenz-Block (810 Frames, wichtigste Szene).
 *
 * Ruhig, clean, vertrauenswürdig — keine hektische Motion:
 *  1. 100-€-Chip wandert vom User-Icon aufs Panel „Dein Broker-Konto",
 *     ein Rück-Pfeil zeichnet sich zurück zum User („Auszahlung jederzeit").
 *  2. Diagramm Broker → Provision → CosmoTrades.
 *  3. Durchgestrichenes „Abo & Gebühren" + „0 € für dich".
 *  4. Risiko-Lower-Third blendet ein und BLEIBT stehen bis Szenenende.
 *
 * Cosmo groß rechts im Bild — hier kommt später der Hedra-Sprech-Clip C9
 * hin (TODO-Slot lebt in <Cosmo>, Position bleibt identisch).
 */

/* ------------------------------------------------------------------ */
/* Timing (Frames @ 30 fps)                                            */
/* ------------------------------------------------------------------ */

const T = {
  badgeIn: 10,
  headingIn: 18,
  sublineIn: 30,
  cosmoIn: 20,

  section1In: 66,
  userNodeIn: 78,
  brokerPanelIn: 92,
  chipPop: 118,
  chipTravelStart: 138,
  chipTravelEnd: 192,
  chipDockStart: 196,
  chipDockEnd: 218,
  balanceTickStart: 202,
  balanceTickEnd: 230,
  returnArrowStart: 228,
  returnArrowEnd: 284,
  returnLabelIn: 270,

  section2In: 330,
  nodeBrokerIn: 342,
  nodeProvisionIn: 358,
  nodeCosmoIn: 374,
  connector1Start: 358,
  connector1End: 394,
  connector2Start: 396,
  connector2End: 432,
  coinsStart: 440,

  feePillIn: 470,
  strikeStart: 494,
  strikeEnd: 514,
  zeroEuroIn: 524,

  disclaimerIn: 600,
} as const;

/* ------------------------------------------------------------------ */
/* Stage geometry (px, 1920x1080 stage coords)                         */
/* ------------------------------------------------------------------ */

const USER_NODE = {cx: 238, cy: 430, r: 62};
const BROKER_PANEL = {x: 580, y: 330, w: 470, h: 200};
const CHIP = {startX: 238, startY: 430, endX: 850, endY: 432, size: 96, arc: 95};
const FLOW_ROW_Y = 700;
const FLOW_NODE_H = 84;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const easeBetween = (frame: number, from: number, to: number): number =>
  interpolate(frame, [from, to], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Calm, trustworthy entrance — smooth glide, no overshoot. */
const useCalmSpring = (appearFrame: number, stiffness = 90): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - appearFrame,
    fps,
    config: {damping: 200, stiffness, mass: 1},
  });
};

const fadeUpStyle = (p: number, dist = 26): React.CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * dist}px)`,
});

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const PersonIcon: React.FC<{size?: number}> = ({size = 54}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={8.2} r={3.9} fill={colors.blue} />
    <path
      d="M4.4 20.4 c0-4.1 3.4-6.4 7.6-6.4 s7.6 2.3 7.6 6.4"
      stroke={colors.blue}
      strokeWidth={2.6}
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const BankIcon: React.FC<{size?: number; color?: string}> = ({
  size = 30,
  color = colors.blue,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 9 L12 3.5 L21 9 Z" fill={color} opacity={0.9} />
    <rect x={5} y={10.5} width={2.4} height={7} fill={color} opacity={0.75} />
    <rect x={10.8} y={10.5} width={2.4} height={7} fill={color} opacity={0.75} />
    <rect x={16.6} y={10.5} width={2.4} height={7} fill={color} opacity={0.75} />
    <rect x={3.4} y={18.6} width={17.2} height={2.4} rx={1} fill={color} />
  </svg>
);

const EuroIcon: React.FC<{size?: number; color?: string}> = ({
  size = 30,
  color = colors.orange,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
    <text
      x={12}
      y={16.6}
      textAnchor="middle"
      fontFamily={font.family}
      fontSize={13.5}
      fontWeight={800}
      fill={color}
    >
      €
    </text>
  </svg>
);

const CosmoMarkIcon: React.FC<{size?: number}> = ({size = 30}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={12} r={9.4} stroke={colors.blue} strokeWidth={2.2} />
    <circle cx={12} cy={12} r={4} fill={colors.blue} />
    <circle cx={17.4} cy={6.6} r={1.7} fill={colors.orange} />
  </svg>
);

const WarnIcon: React.FC<{size?: number}> = ({size = 54}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 3 L22.2 20.2 H1.8 Z"
      fill={colors.orange}
      stroke={colors.orange}
      strokeWidth={2.4}
      strokeLinejoin="round"
    />
    <rect x={11.05} y={9.2} width={1.9} height={5.9} rx={0.95} fill={colors.black} />
    <circle cx={12} cy={17.4} r={1.25} fill={colors.black} />
  </svg>
);

const ReturnGlyph: React.FC<{size?: number; color?: string}> = ({
  size = 22,
  color = colors.up,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M19 6 v5 a4 4 0 0 1 -4 4 H6.5"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      fill="none"
    />
    <path d="M10 10.6 L5.4 15 L10 19.4" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Section label                                                       */
/* ------------------------------------------------------------------ */

const SectionLabel: React.FC<{
  children: React.ReactNode;
  x: number;
  y: number;
  appearFrame: number;
}> = ({children, x, y, appearFrame}) => {
  const p = useCalmSpring(appearFrame);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: font.family,
        fontSize: 17,
        fontWeight: font.weight.semibold,
        letterSpacing: '0.24em',
        color: colors.textFaint,
        ...fadeUpStyle(p, 16),
      }}
    >
      <span
        style={{
          width: 26,
          height: 2,
          borderRadius: 1,
          backgroundColor: colors.orange,
          opacity: 0.85,
        }}
      />
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Beat 1 — Dein Broker-Konto                                          */
/* ------------------------------------------------------------------ */

const UserNode: React.FC = () => {
  const p = useCalmSpring(T.userNodeIn);
  return (
    <div
      style={{
        position: 'absolute',
        left: USER_NODE.cx - USER_NODE.r,
        top: USER_NODE.cy - USER_NODE.r,
        width: USER_NODE.r * 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        ...fadeUpStyle(p, 22),
      }}
    >
      <div
        style={{
          width: USER_NODE.r * 2,
          height: USER_NODE.r * 2,
          borderRadius: '50%',
          background: `linear-gradient(160deg, ${colors.panelSoft}, ${colors.panel})`,
          border: `1.5px solid ${colors.strokeStrong}`,
          boxShadow: `${shadows.soft}, 0 0 26px rgba(117,185,245,0.14)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PersonIcon size={58} />
      </div>
      <span
        style={{
          fontFamily: font.family,
          fontSize: 25,
          fontWeight: font.weight.bold,
          color: colors.text,
        }}
      >
        Du
      </span>
    </div>
  );
};

const BrokerPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const p = useCalmSpring(T.brokerPanelIn);

  const balance = Math.round(
    interpolate(frame, [T.balanceTickStart, T.balanceTickEnd], [0, 100], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // Single soft glow pulse when the chip lands.
  const glow = interpolate(frame, [188, 196, 246], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Panel
      padding={spacing(3.5)}
      style={{
        position: 'absolute',
        left: BROKER_PANEL.x,
        top: BROKER_PANEL.y,
        width: BROKER_PANEL.w,
        height: BROKER_PANEL.h,
        boxShadow: `${shadows.panel}, 0 0 ${glow * 46}px rgba(117,185,245,${0.38 * glow})`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        ...fadeUpStyle(p, 28),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 17,
          fontWeight: font.weight.semibold,
          letterSpacing: '0.18em',
          color: colors.textFaint,
        }}
      >
        <BankIcon size={26} />
        DEIN BROKER-KONTO
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{fontSize: 23, color: colors.textDim, fontWeight: font.weight.medium}}>
          Guthaben
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 45,
            fontWeight: font.weight.bold,
            color: colors.text,
            textShadow: glow > 0.05 ? `0 0 ${18 * glow}px rgba(117,185,245,0.6)` : undefined,
          }}
        >
          {balance},00 €
        </span>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            backgroundColor: colors.up,
            boxShadow: `0 0 10px ${colors.up}88`,
          }}
        />
        <span style={{fontSize: 19, color: colors.textDim}}>
          Auf deinen Namen · voller Zugriff
        </span>
      </div>
    </Panel>
  );
};

const EuroChip: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const pop = spring({
    frame: frame - T.chipPop,
    fps,
    config: {damping: 13, stiffness: 170, mass: 0.7},
  });
  const travel = easeBetween(frame, T.chipTravelStart, T.chipTravelEnd);
  const dock = easeBetween(frame, T.chipDockStart, T.chipDockEnd);

  if (frame < T.chipPop || dock >= 1) return null;

  const cx = CHIP.startX + (CHIP.endX - CHIP.startX) * travel;
  const cy =
    CHIP.startY +
    (CHIP.endY - CHIP.startY) * travel -
    Math.sin(travel * Math.PI) * CHIP.arc;

  const scale = pop * (1 - 0.45 * dock);
  const opacity = Math.min(1, pop) * (1 - dock);

  return (
    <div
      style={{
        position: 'absolute',
        left: cx - CHIP.size / 2,
        top: cy - CHIP.size / 2,
        width: CHIP.size,
        height: CHIP.size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 34% 28%, #FFC878, ${colors.orange} 58%, #B4670F 100%)`,
        border: '2.5px solid rgba(255, 235, 205, 0.4)',
        boxShadow: `0 12px 28px rgba(0,0,0,0.45), inset 0 0 0 6px rgba(0,0,0,0.14), 0 0 ${
          22 + Math.sin(travel * Math.PI) * 16
        }px rgba(240,140,30,0.4)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font.family,
        fontSize: 27,
        fontWeight: font.weight.black,
        color: '#331E04',
        letterSpacing: '-0.01em',
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {/* label dissolves faster than the coin so the ticking balance stays legible */}
      <span style={{opacity: Math.max(0, 1 - dock * 2.2)}}>100 €</span>
    </div>
  );
};

/** Curved return arrow „Auszahlung jederzeit" — draws itself back to the user. */
const ReturnArrow: React.FC = () => {
  const frame = useCurrentFrame();
  const p = easeBetween(frame, T.returnArrowStart, T.returnArrowEnd);
  const labelP = useCalmSpring(T.returnLabelIn);
  const headOpacity = interpolate(p, [0.88, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (frame < T.returnArrowStart - 4) return null;

  // Tangent at the path end (P3 - P2) → arrowhead angle.
  const angle = (Math.atan2(492 - 640, 300 - 356) * 180) / Math.PI;

  return (
    <svg
      width={1920}
      height={1080}
      viewBox="0 0 1920 1080"
      style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}
    >
      <path
        d="M 640 552 C 566 655, 356 640, 300 492"
        pathLength={1}
        stroke={colors.up}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={1}
        strokeDashoffset={1 - p}
        opacity={0.9}
        style={{filter: `drop-shadow(0 0 8px ${colors.up}55)`}}
      />
      <g
        transform={`translate(300, 492) rotate(${angle})`}
        opacity={headOpacity * 0.95}
      >
        <path d="M 0 -9 L 17 0 L 0 9 Z" fill={colors.up} />
      </g>

      {/* Label pill on the arrow dip */}
      <g
        opacity={labelP}
        transform={`translate(0, ${(1 - labelP) * 18})`}
      >
        <rect
          x={330}
          y={614}
          width={276}
          height={48}
          rx={24}
          fill={colors.panelSoft}
          stroke={`${colors.up}66`}
          strokeWidth={1.5}
        />
        <g transform="translate(352, 626)">
          <ReturnGlyph size={24} />
        </g>
        <text
          x={388}
          y={646}
          fontFamily={font.family}
          fontSize={22}
          fontWeight={600}
          fill={colors.up}
        >
          Auszahlung jederzeit
        </text>
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Beat 2 — Broker → Provision → CosmoTrades                           */
/* ------------------------------------------------------------------ */

type FlowNodeSpec = {
  x: number;
  w: number;
  label: string;
  accent: string;
  icon: React.ReactNode;
  appearFrame: number;
};

const FlowNode: React.FC<FlowNodeSpec> = ({x, w, label, accent, icon, appearFrame}) => {
  const p = useCalmSpring(appearFrame);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: FLOW_ROW_Y,
        width: w,
        height: FLOW_NODE_H,
        borderRadius: radii.md,
        backgroundColor: colors.panel,
        border: `1.5px solid ${accent}55`,
        borderTop: `2.5px solid ${accent}AA`,
        boxShadow: shadows.soft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 13,
        fontFamily: font.family,
        fontSize: 26,
        fontWeight: font.weight.bold,
        color: colors.text,
        letterSpacing: '-0.01em',
        ...fadeUpStyle(p, 24),
      }}
    >
      {icon}
      {label}
    </div>
  );
};

/** The two connector arrows + drifting provision coins, one full-stage SVG. */
const FlowConnectors: React.FC = () => {
  const frame = useCurrentFrame();
  const y = FLOW_ROW_Y + FLOW_NODE_H / 2;
  const c1 = {x1: 312, x2: 388};
  const c2 = {x1: 612, x2: 688};
  const p1 = easeBetween(frame, T.connector1Start, T.connector1End);
  const p2 = easeBetween(frame, T.connector2Start, T.connector2End);
  const stroke = 'rgba(117, 185, 245, 0.55)';

  const coin = (
    seg: {x1: number; x2: number},
    phase: number,
    key: string,
  ): React.ReactNode => {
    if (frame < T.coinsStart + phase) return null;
    const t = ((frame - T.coinsStart - phase) % 100) / 100;
    const cx = seg.x1 + (seg.x2 - seg.x1) * t;
    const o = Math.sin(t * Math.PI) * 0.85;
    return (
      <circle
        key={key}
        cx={cx}
        cy={y}
        r={6.5}
        fill={colors.orange}
        opacity={o}
        style={{filter: `drop-shadow(0 0 6px ${colors.orange}88)`}}
      />
    );
  };

  const arrow = (seg: {x1: number; x2: number}, p: number): React.ReactNode => (
    <g opacity={p > 0 ? 1 : 0}>
      <line
        x1={seg.x1}
        y1={y}
        x2={seg.x1 + (seg.x2 - seg.x1) * p}
        y2={y}
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d={`M ${seg.x2 - 12} ${y - 8} L ${seg.x2 + 2} ${y} L ${seg.x2 - 12} ${y + 8} Z`}
        fill={stroke}
        opacity={interpolate(p, [0.85, 1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      />
    </g>
  );

  return (
    <svg
      width={1920}
      height={1080}
      viewBox="0 0 1920 1080"
      style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}
    >
      {arrow(c1, p1)}
      {arrow(c2, p2)}
      {coin(c1, 0, 'coin1')}
      {coin(c2, 50, 'coin2')}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Beat 3 — durchgestrichenes Abo & Gebühren                           */
/* ------------------------------------------------------------------ */

const NoFeesRow: React.FC = () => {
  const frame = useCurrentFrame();
  const pillP = useCalmSpring(T.feePillIn);
  const strikeP = easeBetween(frame, T.strikeStart, T.strikeEnd);
  const zeroP = useCalmSpring(T.zeroEuroIn);
  const pillDim = interpolate(frame, [T.strikeStart, T.strikeEnd], [1, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 120,
        top: 812,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        fontFamily: font.family,
      }}
    >
      <div style={{position: 'relative', ...fadeUpStyle(pillP, 20), opacity: pillP * pillDim}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 26px',
            borderRadius: radii.pill,
            backgroundColor: colors.panelSoft,
            border: `1.5px solid rgba(242, 237, 228, 0.16)`,
            fontSize: 24,
            fontWeight: font.weight.semibold,
            color: colors.textDim,
          }}
        >
          <EuroIcon size={26} color={colors.textDim} />
          Abo &amp; Gebühren
        </div>
        {/* animated red strike */}
        <div
          style={{
            position: 'absolute',
            left: -8,
            right: -8,
            top: '50%',
            height: 4.5,
            borderRadius: 3,
            backgroundColor: colors.down,
            boxShadow: `0 0 12px ${colors.down}77`,
            transform: `translateY(-50%) rotate(-7deg) scaleX(${strikeP})`,
            transformOrigin: 'left center',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          ...fadeUpStyle(zeroP, 18),
        }}
      >
        <Badge label="0 €" color="green" size={23} />
        <span
          style={{
            fontSize: 25,
            fontWeight: font.weight.semibold,
            color: colors.text,
          }}
        >
          Für dich dauerhaft kostenlos.
        </span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Risiko-Lower-Third — blendet ein und BLEIBT stehen                  */
/* ------------------------------------------------------------------ */

const RiskLowerThird: React.FC = () => {
  const p = useCalmSpring(T.disclaimerIn, 70);
  return (
    <div
      style={{
        position: 'absolute',
        left: 100,
        right: 100,
        top: 902,
        borderRadius: radii.lg,
        backgroundColor: 'rgba(19, 26, 36, 0.94)',
        border: `1px solid ${colors.stroke}`,
        borderLeft: `5px solid ${colors.orange}`,
        boxShadow: shadows.panel,
        padding: '26px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 30,
        fontFamily: font.family,
        opacity: p,
        transform: `translateY(${(1 - p) * 56}px)`,
      }}
    >
      <WarnIcon size={56} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 7}}>
        <span
          style={{
            fontSize: 30,
            fontWeight: font.weight.bold,
            color: colors.text,
            letterSpacing: '-0.01em',
          }}
        >
          Trading birgt Risiken.
        </span>
        <span style={{fontSize: 23, color: colors.textDim, lineHeight: 1.35}}>
          Keine Anlageberatung. Trade nur mit Kapital, dessen Verlust du
          verkraften kannst.
        </span>
      </div>
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 16,
          fontWeight: font.weight.semibold,
          letterSpacing: '0.22em',
          color: colors.textFaint,
          whiteSpace: 'nowrap',
        }}
      >
        RISIKOHINWEIS
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  // Soft focus settle-in, then one slow, continuous push toward Cosmo.
  {frame: 0, zoom: 1.07, blur: 7, panX: 0, panY: 12},
  {frame: 40, zoom: 1, blur: 0, panY: 0},
  {frame: 320, zoom: 1.008},
  {frame: 600, zoom: 1.028, panX: -10, panY: -8},
  {frame: 810, zoom: 1.048, panX: -18, panY: -14},
];

export const Scene6Transparency: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const badgeP = useCalmSpring(T.badgeIn);
  const headingP = useCalmSpring(T.headingIn);
  const sublineP = useCalmSpring(T.sublineIn);

  // Cosmo glides in from the right, extra slow + smooth.
  const cosmoIn = spring({
    frame: frame - T.cosmoIn,
    fps,
    config: {damping: 200, stiffness: 55, mass: 1},
  });
  // Slow counter-drift for parallax against the camera push.
  const cosmoDrift = interpolate(frame, [0, 810], [12, -12]);
  const glowBreath = 0.8 + Math.sin(frame * 0.045) * 0.2;

  // Background drifts slower than the content layer → depth.
  const bgDriftX = Math.sin(frame * 0.006) * 9;
  const bgDriftY = Math.cos(frame * 0.005) * 6;

  const fadeIn = interpolate(frame, [0, 14], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, fontFamily: font.family}}>
      <CameraRig keyframes={CAMERA_KEYFRAMES}>
        {/* ------ Background layer (slow parallax drift) ------ */}
        <AbsoluteFill
          style={{
            transform: `translate(${bgDriftX}px, ${bgDriftY}px) scale(1.04)`,
          }}
        >
          <AbsoluteFill
            style={{
              backgroundImage:
                'radial-gradient(rgba(242, 237, 228, 0.045) 1px, transparent 1.5px)',
              backgroundSize: '46px 46px',
            }}
          />
          <AbsoluteFill
            style={{
              background: `radial-gradient(1250px 850px at 76% 40%, rgba(117,185,245,${
                0.1 * glowBreath
              }), transparent 70%)`,
            }}
          />
          <AbsoluteFill
            style={{
              background:
                'radial-gradient(950px 620px at 10% 90%, rgba(240,140,30,0.055), transparent 70%)',
            }}
          />
        </AbsoluteFill>

        {/* ------ Cosmo layer (right, large — Hedra-Sprech-Clip C9 kommt hierher) ------ */}
        <AbsoluteFill
          style={{
            opacity: cosmoIn,
            transform: `translateX(${(1 - cosmoIn) * 150 + cosmoDrift}px)`,
          }}
        >
          {/* soft floor glow anchoring him */}
          <div
            style={{
              position: 'absolute',
              left: 1130,
              top: 780,
              width: 660,
              height: 300,
              background: `radial-gradient(closest-side, rgba(117,185,245,${
                0.12 * glowBreath
              }), transparent)`,
            }}
          />
          <Cosmo variant="master" height={2450} x={801} y={-30} idleSeed={6} />
        </AbsoluteFill>

        {/* ------ Content layer (left column) ------ */}
        <AbsoluteFill>
          {/* Title block */}
          <div style={{position: 'absolute', left: 110, top: 84, ...fadeUpStyle(badgeP, 18)}}>
            <Badge label="VOLLE TRANSPARENZ" color="blue" size={20} />
          </div>
          <div style={{position: 'absolute', left: 110, top: 146, ...fadeUpStyle(headingP)}}>
            <Heading size={62}>Dein Geld bleibt deins.</Heading>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 110,
              top: 234,
              fontSize: 26,
              color: colors.textDim,
              fontWeight: font.weight.medium,
              ...fadeUpStyle(sublineP, 20),
            }}
          >
            Was mit deiner Einzahlung passiert — Schritt für Schritt.
          </div>

          {/* Beat 1 — Einzahlung & Auszahlung */}
          <SectionLabel x={110} y={294} appearFrame={T.section1In}>
            DEINE EINZAHLUNG
          </SectionLabel>
          <UserNode />
          <BrokerPanel />
          <EuroChip />
          <ReturnArrow />

          {/* Beat 2 — So verdienen wir */}
          <SectionLabel x={110} y={662} appearFrame={T.section2In}>
            SO VERDIENEN WIR
          </SectionLabel>
          <FlowConnectors />
          <FlowNode
            x={120}
            w={192}
            label="Broker"
            accent={colors.blue}
            icon={<BankIcon size={28} />}
            appearFrame={T.nodeBrokerIn}
          />
          <FlowNode
            x={388}
            w={224}
            label="Provision"
            accent={colors.orange}
            icon={<EuroIcon size={28} />}
            appearFrame={T.nodeProvisionIn}
          />
          <FlowNode
            x={688}
            w={262}
            label="CosmoTrades"
            accent={colors.blue}
            icon={<CosmoMarkIcon size={28} />}
            appearFrame={T.nodeCosmoIn}
          />

          {/* Beat 3 — kein Abo, keine Gebühren */}
          <NoFeesRow />
        </AbsoluteFill>
      </CameraRig>

      {/* Vignette (locked to screen, over the rig) */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 46%, transparent 56%, rgba(4,7,12,0.42) 100%)',
        }}
      />

      {/* Risiko-Disclaimer — locked broadcast graphic, holds until scene end */}
      <RiskLowerThird />

      {/* Scene fade-in */}
      <AbsoluteFill
        style={{backgroundColor: colors.black, opacity: fadeIn, pointerEvents: 'none'}}
      />
    </AbsoluteFill>
  );
};
