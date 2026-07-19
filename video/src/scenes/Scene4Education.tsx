import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {afPump, CameraRig, type CameraKeyframe} from '../lib/camera';
import {Cosmo} from '../lib/Cosmo';
import {colors, font, radii, shadows, spacing} from '../lib/tokens';
import {Badge, Heading, LessonCard, Panel, ProgressBar} from '../lib/ui';

/**
 * Szene 4 — Education & Live Calls (600 Frames / 20 s).
 *
 * Akt 1 (0–332): Die Academy. Ein hohes Lesson-Grid baut sich gestaffelt
 * auf, Fortschrittsbalken animieren, die Kamera scrollt in zwei weichen
 * Zügen durch die Reihen (mit AF-Wobble beim Landen).
 *
 * Akt 2 (332–600): Live Calls. Der Schnitt versteckt sich im Unschärfe-
 * Peak eines Fokus-Pumps. Kalender-Panel mit Call-Terminen + großes
 * pulsierendes LIVE-Badge, daneben die "Läuft gerade"-Karte mit
 * Teilnehmer-Avataren. Cosmo steht halbgroß rechts und erklärt.
 */

/* ------------------------------------------------------------------ */
/* Global timing                                                       */
/* ------------------------------------------------------------------ */

/** Frame des versteckten Schnitts (Blur-Peak) zwischen Akt 1 und Akt 2. */
const SWAP = 332;

const CLAMP = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

/* ------------------------------------------------------------------ */
/* Camera choreography                                                 */
/* ------------------------------------------------------------------ */

/**
 * Akt 1: settle-in oben, dann zwei Scroll-Züge nach unten durchs Grid.
 * Endet in einem Push mit Blur-Rampe — der Peak verdeckt den Schnitt.
 */
const CAM_A: CameraKeyframe[] = [
  {frame: 0, zoom: 1.15, panX: 0, panY: 26, blur: 7},
  {frame: 22, blur: 0},
  {frame: 36, zoom: 1.07, panY: 12},
  {frame: 96, zoom: 1.03, panY: 0},
  {frame: 140, zoom: 1.03, panY: 0},
  // Scroll-Zug 1 — Reihe 2 ins Zentrum
  {frame: 208, zoom: 1.05, panY: -292},
  {frame: 246, zoom: 1.05, panY: -308},
  // Scroll-Zug 2 — Reihe 3 + Footer
  {frame: 302, zoom: 1.07, panY: -640},
  {frame: 318, zoom: 1.075, panY: -656, panX: 0, blur: 0},
  // Push in die Unschärfe (Schnitt bei SWAP)
  {frame: SWAP, zoom: 1.16, panY: -700, panX: -70, blur: 16},
];

/** Akt 2: aus der Unschärfe aufziehen, ruhig atmen, finaler Push. */
const CAM_B: CameraKeyframe[] = [
  {frame: SWAP, zoom: 1.18, panX: 84, panY: 26, blur: 15},
  {frame: SWAP + 24, zoom: 1.05, panX: 0, panY: 0, blur: 0},
  {frame: 470, zoom: 1.02, panX: 0, panY: 0},
  {frame: 540, zoom: 1.02, panX: 0, panY: 0},
  {frame: 599, zoom: 1.08, panX: -40, panY: -16},
];

/** Hintergrund: gleicher Weg, stark gedämpft (Tiefen-Ebene). */
const CAM_BG: CameraKeyframe[] = [
  {frame: 0, zoom: 1.02, panX: 0, panY: 10},
  {frame: 330, zoom: 1.04, panX: -12, panY: -60},
  {frame: 360, zoom: 1.03, panX: 10, panY: -40},
  {frame: 599, zoom: 1.05, panX: 0, panY: -70},
];

/** Vordergrund-Bokeh: gleicher Weg, verstärkt (näher an der Linse). */
const CAM_FG: CameraKeyframe[] = [
  {frame: 0, zoom: 1, panX: 0, panY: 46},
  {frame: 330, zoom: 1.03, panX: -26, panY: -240},
  {frame: 360, zoom: 1.02, panX: 16, panY: -270},
  {frame: 599, zoom: 1.06, panX: -10, panY: -330},
];

/* ------------------------------------------------------------------ */
/* Reveal — spring-based entrance                                      */
/* ------------------------------------------------------------------ */

type RevealProps = {
  /** Frame, an dem das Element einfedert. */
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
/* Background + foreground depth layers                                */
/* ------------------------------------------------------------------ */

/** Überdimensionierte Tiefen-Ebene: Glows, Punktraster, Watermark. */
const BackgroundLayer: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: -240,
      top: -500,
      width: 2400,
      height: 2260,
      backgroundImage:
        'radial-gradient(rgba(117,185,245,0.055) 1.4px, transparent 1.5px)',
      backgroundSize: '46px 46px',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 260,
        top: 420,
        width: 1100,
        height: 900,
        background:
          'radial-gradient(circle, rgba(117,185,245,0.11) 0%, transparent 62%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: 120,
        top: 1150,
        width: 1000,
        height: 860,
        background:
          'radial-gradient(circle, rgba(240,140,30,0.08) 0%, transparent 62%)',
      }}
    />
    {/* Watermark */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 880,
        textAlign: 'center',
        fontFamily: font.family,
        fontSize: 268,
        fontWeight: font.weight.black,
        letterSpacing: '0.28em',
        color: 'rgba(117,185,245,0.03)',
        whiteSpace: 'nowrap',
      }}
    >
      ACADEMY
    </div>
  </div>
);

type Orb = {x: number; y: number; size: number; color: string; phase: number};

const ORBS: Orb[] = [
  {x: 150, y: 210, size: 180, color: colors.blue, phase: 0},
  {x: 1730, y: 340, size: 130, color: colors.orange, phase: 1.4},
  {x: 300, y: 1120, size: 220, color: colors.blue, phase: 2.6},
  {x: 1650, y: 1260, size: 150, color: colors.blue, phase: 3.9},
  {x: 950, y: 1560, size: 190, color: colors.orange, phase: 5.1},
];

/** Unscharfe Bokeh-Orbs vor der Szene — verkaufen die Tiefenstaffelung. */
const BokehLayer: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 0, top: -200, width: 1920, height: 2000}}>
      {ORBS.map((o, i) => {
        const dx = Math.sin(frame * 0.017 + o.phase) * 30;
        const dy = Math.cos(frame * 0.013 + o.phase) * 24;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: o.x,
              top: o.y,
              width: o.size,
              height: o.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${o.color}2E 0%, transparent 68%)`,
              filter: 'blur(16px)',
              transform: `translate(${dx}px, ${dy}px)`,
            }}
          />
        );
      })}
    </div>
  );
};

/* ================================================================== */
/* AKT 1 — Academy / Lesson-Grid                                       */
/* ================================================================== */

type LessonSpec = {
  title: string;
  duration: string;
  progress: number;
  locked?: boolean;
};

const LESSONS: LessonSpec[][] = [
  [
    {title: 'Trading-Grundlagen', duration: '08:12', progress: 1},
    {title: 'Charts richtig lesen', duration: '06:45', progress: 1},
    {title: 'Candlesticks verstehen', duration: '07:30', progress: 1},
  ],
  [
    {title: 'Support & Resistance', duration: '09:58', progress: 0.62},
    {title: 'Risikomanagement', duration: '11:04', progress: 0.35},
    {title: 'Dein erster Trade', duration: '07:20', progress: 0.12},
  ],
  [
    {title: 'Gold-Setups im Detail', duration: '09:40', progress: 0, locked: true},
    {title: 'Trading-Psychologie', duration: '08:15', progress: 0, locked: true},
    {title: 'Profi-Strategien', duration: '12:30', progress: 0, locked: true},
  ],
];

const CARD_W = 400;
const GRID_COLS = [316, 760, 1204] as const;
const GRID_ROWS = [332, 672, 1012] as const;
const GRID_APPEAR: ReadonlyArray<readonly number[]> = [
  [62, 70, 78],
  [96, 104, 112],
  [150, 158, 166],
];

const AcademyHeader: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 150, top: 92}}>
      <Reveal at={30}>
        <div
          style={{
            fontFamily: font.family,
            fontSize: 21,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.22em',
            color: colors.blue,
            marginBottom: 14,
          }}
        >
          COSMOTRADES ACADEMY
        </div>
      </Reveal>
      <Reveal at={38}>
        <Heading size={68}>Academy — Schritt für Schritt</Heading>
      </Reveal>
      <Reveal at={48}>
        <div
          style={{
            fontFamily: font.family,
            fontSize: 27,
            fontWeight: font.weight.medium,
            color: colors.textDim,
            marginTop: 12,
          }}
        >
          Vom ersten Chart bis zum eigenen Setup — in deinem Tempo.
        </div>
      </Reveal>
    </div>

    {/* Fortschritts-Block rechts */}
    <Reveal at={58} from="right" style={{position: 'absolute', left: 1414, top: 128, width: 356}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16}}>
        <Cosmo variant="portrait" height={58} still />
        <div>
          <div
            style={{
              fontFamily: font.family,
              fontSize: 23,
              fontWeight: font.weight.semibold,
              color: colors.text,
            }}
          >
            Dein Fortschritt
          </div>
          <div
            style={{
              fontFamily: font.family,
              fontSize: 17,
              color: colors.textFaint,
              marginTop: 3,
            }}
          >
            3 von 9 Lektionen abgeschlossen
          </div>
        </div>
      </div>
      <ProgressBar progress={0.34} height={10} showLabel animateFromFrame={78} />
    </Reveal>
  </>
);

/** Kleiner Hinweis-Pill unter der letzten Karten-Reihe. */
const FooterHint: React.FC = () => (
  <Reveal
    at={200}
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 1372,
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 26px',
        borderRadius: radii.pill,
        backgroundColor: colors.panelSoft,
        border: `1px solid ${colors.stroke}`,
        boxShadow: shadows.soft,
        fontFamily: font.family,
        fontSize: 22,
        fontWeight: font.weight.medium,
        color: colors.textDim,
      }}
    >
      <svg width={13} height={13} viewBox="0 0 12 12">
        <path d="M6 0 L12 6 L6 12 L0 6 Z" fill={colors.orange} />
      </svg>
      Jede Woche kommen neue Lektionen dazu
    </div>
  </Reveal>
);

/** Akt-1-Bühne: Header + hohes 3×3-Grid (Kamera scrollt hindurch). */
const AcademyStage: React.FC = () => (
  <AbsoluteFill>
    <AcademyHeader />
    {LESSONS.map((row, r) =>
      row.map((lesson, c) => (
        <LessonCard
          key={lesson.title}
          title={lesson.title}
          duration={lesson.duration}
          progress={lesson.progress}
          locked={lesson.locked}
          appearFrame={GRID_APPEAR[r][c]}
          width={CARD_W}
          style={{position: 'absolute', left: GRID_COLS[c], top: GRID_ROWS[r]}}
        />
      )),
    )}
    <FooterHint />
  </AbsoluteFill>
);

/* ================================================================== */
/* AKT 2 — Live Calls                                                  */
/* ================================================================== */

const HEADER_B_AT = 334;
const CAL_AT = 346;
const TILES_AT = 352;
const LIVE_BADGE_AT = 372;
const COSMO_AT = 372;
const CARD_AT = 388;
const AVATARS_AT = 414;
const CHIPS_AT = 448;
const NOTE_AT = 470;
const BUBBLE_AT = 442;

/* ---------------------------- Kalender ---------------------------- */

// Juli 2026: der 1. ist ein Mittwoch → Offset 2 (Montag-Start).
// Live-Calls: jeden Mittwoch. "Heute" ist Mi, der 15. — Call läuft.
const CALL_DAYS = [1, 8, 15, 22, 29] as const;
const TODAY = 15;
const DAY_LABELS = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'] as const;

type DayCell = {label: string; day?: number; faint?: boolean};

const CELLS: DayCell[] = [
  {label: '29', faint: true},
  {label: '30', faint: true},
  ...Array.from({length: 31}, (_, i) => ({label: `${i + 1}`, day: i + 1})),
  {label: '1', faint: true},
  {label: '2', faint: true},
];

const CheckIcon: React.FC = () => (
  <svg width={13} height={13} viewBox="0 0 12 12" fill="none">
    <path
      d="M2 6.2 L4.8 9 L10 3.2"
      stroke={colors.up}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CalendarTile: React.FC<{cell: DayCell; index: number}> = ({cell, index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const s = spring({
    frame: frame - (TILES_AT + index * 1.2),
    fps,
    config: {damping: 13, stiffness: 160, mass: 0.6},
  });

  const isCall = cell.day !== undefined && (CALL_DAYS as readonly number[]).includes(cell.day);
  const isToday = cell.day === TODAY;
  const isPast = cell.day !== undefined && cell.day < TODAY;

  // Pulsierender Ring um "heute"
  const ringT = ((frame - TILES_AT) % 46) / 46;
  const ringOpacity = isToday ? (1 - ringT) * 0.55 : 0;
  const ringScale = 1 + ringT * 0.18;

  const numberColor = cell.faint
    ? colors.textFaint
    : isToday
      ? colors.text
      : isPast
        ? colors.textFaint
        : colors.textDim;

  return (
    <div
      style={{
        position: 'relative',
        height: 70,
        borderRadius: 10,
        backgroundColor: isToday ? 'rgba(117,185,245,0.10)' : 'rgba(255,255,255,0.028)',
        border: isToday
          ? `1.5px solid ${colors.strokeStrong}`
          : isCall
            ? `1px solid rgba(240,140,30,0.32)`
            : `1px solid ${colors.stroke}`,
        boxShadow: isToday ? '0 0 22px rgba(117,185,245,0.22)' : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: Math.min(1, s) * (cell.faint ? 0.35 : 1),
        transform: `scale(${0.7 + s * 0.3})`,
      }}
    >
      {isToday && (
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 12,
            border: `1.5px solid ${colors.rec}`,
            opacity: ringOpacity,
            transform: `scale(${ringScale})`,
          }}
        />
      )}
      <span
        style={{
          fontFamily: font.family,
          fontSize: 22,
          fontWeight: isToday ? font.weight.bold : font.weight.semibold,
          color: numberColor,
          lineHeight: 1,
        }}
      >
        {cell.label}
      </span>
      {isToday ? (
        <span
          style={{
            fontFamily: font.family,
            fontSize: 12,
            fontWeight: font.weight.bold,
            letterSpacing: '0.14em',
            color: colors.rec,
            lineHeight: 1,
          }}
        >
          LIVE
        </span>
      ) : isCall && isPast ? (
        <CheckIcon />
      ) : isCall ? (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: colors.orange,
            boxShadow: '0 0 8px rgba(240,140,30,0.7)',
          }}
        />
      ) : (
        <span style={{height: 7}} />
      )}
    </div>
  );
};

const CalendarPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Großes LIVE-Badge poppt separat ein
  const badgeS = spring({
    frame: frame - LIVE_BADGE_AT,
    fps,
    config: {damping: 11, stiffness: 150, mass: 0.7},
  });

  return (
    <Reveal at={CAL_AT} from="left" dist={64} style={{position: 'absolute', left: 130, top: 292}}>
      <Panel padding={28} style={{width: 744}}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing(2.5),
          }}
        >
          <div>
            <div style={{fontSize: 32, fontWeight: font.weight.bold, letterSpacing: '-0.01em'}}>
              Juli 2026
            </div>
            <div style={{fontSize: 19, color: colors.textDim, marginTop: 5}}>
              Live-Call: jeden Mittwoch · 18:00 Uhr
            </div>
          </div>
          <div
            style={{
              opacity: Math.min(1, badgeS),
              transform: `scale(${0.5 + badgeS * 0.5})`,
              transformOrigin: 'center',
            }}
          >
            <Badge label="LIVE" color="red" pulse size={30} />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
            marginBottom: 10,
          }}
        >
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: 16,
                fontWeight: font.weight.semibold,
                letterSpacing: '0.1em',
                color: colors.textFaint,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8}}>
          {CELLS.map((cell, i) => (
            <CalendarTile key={`${cell.label}-${i}`} cell={cell} index={i} />
          ))}
        </div>
      </Panel>
    </Reveal>
  );
};

/* ---------------------- "Läuft gerade"-Karte ----------------------- */

/** Mini-Equalizer — signalisiert laufenden Audio-Stream. */
const EqBars: React.FC<{color?: string; height?: number}> = ({
  color = colors.rec,
  height = 22,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 3, height}}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: height * (0.35 + Math.abs(Math.sin(frame * 0.29 + i * 1.9)) * 0.65),
            borderRadius: 2,
            backgroundColor: color,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
};

const AVATAR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ['#75B9F5', '#3D6FA8'],
  ['#F08C1E', '#B85E10'],
  ['#3DDC97', '#1E8C5F'],
  ['#8E7CF2', '#5646B8'],
  ['#F2555E', '#A63640'],
  ['#F5D375', '#C09A2E'],
  ['#5AC8FA', '#2E7FB0'],
  ['#F58CB0', '#B04E77'],
];

/** Teilnehmer-Reihe: abstrakte Kreise, überlappend, poppen gestaffelt. */
const AvatarRow: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const size = 52;

  const counterS = spring({
    frame: frame - (AVATARS_AT + AVATAR_GRADIENTS.length * 4),
    fps,
    config: {damping: 12, stiffness: 150, mass: 0.7},
  });

  return (
    <div style={{display: 'flex', alignItems: 'center'}}>
      {AVATAR_GRADIENTS.map(([a, b], i) => {
        const s = spring({
          frame: frame - (AVATARS_AT + i * 4),
          fps,
          config: {damping: 11, stiffness: 170, mass: 0.6},
        });
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              marginLeft: i === 0 ? 0 : -13,
              background: `radial-gradient(circle at 32% 28%, ${a}, ${b} 78%)`,
              border: `2.5px solid ${colors.panel}`,
              boxShadow: shadows.soft,
              opacity: Math.min(1, s),
              transform: `scale(${s})`,
              zIndex: i + 1,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'relative',
          zIndex: AVATAR_GRADIENTS.length + 1,
          width: size,
          height: size,
          borderRadius: '50%',
          marginLeft: -13,
          backgroundColor: colors.panelSoft,
          border: `2.5px solid ${colors.panel}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: font.family,
          fontSize: 16,
          fontWeight: font.weight.semibold,
          color: colors.textDim,
          opacity: Math.min(1, counterS),
          transform: `scale(${counterS})`,
        }}
      >
        +212
      </div>
    </div>
  );
};

const TopicChip: React.FC<{label: string; index: number}> = ({label, index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({
    frame: frame - (CHIPS_AT + index * 5),
    fps,
    config: {damping: 13, stiffness: 150, mass: 0.7},
  });
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 15px',
        borderRadius: radii.pill,
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: `1px solid ${colors.stroke}`,
        fontFamily: font.family,
        fontSize: 17,
        fontWeight: font.weight.medium,
        color: colors.textDim,
        whiteSpace: 'nowrap',
        opacity: Math.min(1, s),
        transform: `translateY(${(1 - s) * 20}px)`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: colors.blue,
        }}
      />
      {label}
    </span>
  );
};

const NextCallCard: React.FC = () => {
  const frame = useCurrentFrame();
  const ctaPulse = (Math.sin(frame * 0.18) + 1) / 2;

  return (
    <Reveal
      at={CARD_AT}
      from="right"
      dist={70}
      style={{position: 'absolute', left: 952, top: 300, width: 470}}
    >
      <Panel glow="blue" padding={30}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span
            style={{
              fontSize: 17,
              fontWeight: font.weight.semibold,
              letterSpacing: '0.18em',
              color: colors.textFaint,
            }}
          >
            LIVE-CALL
          </span>
          <EqBars />
        </div>

        <div
          style={{
            fontSize: 34,
            fontWeight: font.weight.black,
            letterSpacing: '-0.01em',
            marginTop: 10,
          }}
        >
          Gold-Analyse &amp; Q&amp;A
        </div>

        <div style={{fontSize: 21, color: colors.textDim, marginTop: 8}}>
          Heute · 18:00 Uhr{' '}
          <span style={{color: colors.up, fontWeight: font.weight.semibold}}>
            · läuft gerade
          </span>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            marginTop: spacing(2.5),
            paddingTop: spacing(2.5),
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: font.weight.semibold,
              letterSpacing: '0.14em',
              color: colors.textFaint,
              marginBottom: 12,
            }}
          >
            TEILNEHMER IM CALL
          </div>
          <AvatarRow />
        </div>

        <div style={{display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: spacing(2.5)}}>
          <TopicChip label="Marktanalyse" index={0} />
          <TopicChip label="Q&A" index={1} />
          <TopicChip label="Trade-Reviews" index={2} />
        </div>

        <div
          style={{
            marginTop: spacing(3),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 28px',
            borderRadius: radii.pill,
            backgroundColor: colors.orange,
            color: colors.black,
            fontSize: 21,
            fontWeight: font.weight.bold,
            boxShadow: `0 0 ${16 + ctaPulse * 20}px rgba(240,140,30,0.5)`,
            transform: `scale(${1 + ctaPulse * 0.015})`,
            transformOrigin: 'left center',
          }}
        >
          Jetzt beitreten
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12 H20 M13 5 L20 12 L13 19"
              stroke={colors.black}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Panel>
    </Reveal>
  );
};

/* --------------------------- Cosmo rechts -------------------------- */

const SpeechBubble: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({
    frame: frame - BUBBLE_AT,
    fps,
    config: {damping: 12, stiffness: 130, mass: 0.8},
  });
  const bob = Math.sin(frame * 0.07) * 4;

  return (
    <div
      style={{
        position: 'absolute',
        right: 30,
        top: -34,
        padding: '13px 24px',
        borderRadius: radii.pill,
        backgroundColor: colors.panelSoft,
        border: `1px solid ${colors.strokeStrong}`,
        boxShadow: `${shadows.soft}, 0 0 24px rgba(117,185,245,0.18)`,
        fontFamily: font.family,
        fontSize: 22,
        fontWeight: font.weight.semibold,
        color: colors.text,
        whiteSpace: 'nowrap',
        opacity: Math.min(1, s),
        transform: `translateY(${(1 - s) * 20 + bob}px) scale(${0.9 + Math.min(1, s) * 0.1})`,
      }}
    >
      Stell deine Fragen live!
      <svg
        width={16}
        height={10}
        viewBox="0 0 16 10"
        style={{position: 'absolute', bottom: -9, left: '50%', marginLeft: -8}}
      >
        <path d="M0 0 L16 0 L8 10 Z" fill={colors.panelSoft} />
      </svg>
    </div>
  );
};

/** Cosmo halbgroß rechts, Erklär-Geste (sanftes Schwanken + Nicken). */
const CosmoExplain: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const s = spring({
    frame: frame - COSMO_AT,
    fps,
    config: {damping: 14, stiffness: 90, mass: 1.05},
  });
  const y = (1 - s) * 420;

  // Erklär-Geste: langsames Schwanken um die Fußachse + leichtes Nicken.
  const t = Math.max(0, frame - COSMO_AT);
  const sway = Math.sin(t * 0.05) * 1.4 * s;
  const nod = Math.sin(t * 0.11) * 2.5 * s;

  return (
    <div
      style={{
        position: 'absolute',
        right: 48,
        bottom: -18,
        transform: `translateY(${y}px)`,
      }}
    >
      {/* Rim-Glow hinter Cosmo */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 40,
          width: 560,
          height: 560,
          marginLeft: -280,
          background:
            'radial-gradient(circle, rgba(117,185,245,0.16) 0%, transparent 62%)',
        }}
      />
      {/* Bodenschatten */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 2,
          width: 320,
          height: 44,
          marginLeft: -160,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 68%)',
          transform: `scale(${0.7 + s * 0.3})`,
        }}
      />
      <div
        style={{
          transform: `rotate(${sway}deg) translateY(${nod}px)`,
          transformOrigin: 'bottom center',
        }}
      >
        <Cosmo height={620} flip idleSeed={5} />
      </div>
      <SpeechBubble />
    </div>
  );
};

/* ---------------------------- Akt-2-Bühne -------------------------- */

const LiveStage: React.FC = () => (
  <AbsoluteFill style={{fontFamily: font.family, color: colors.text}}>
    <div style={{position: 'absolute', left: 130, top: 84}}>
      <Reveal at={HEADER_B_AT}>
        <div
          style={{
            fontSize: 21,
            fontWeight: font.weight.semibold,
            letterSpacing: '0.22em',
            color: colors.orange,
            marginBottom: 14,
          }}
        >
          LIVE-SESSIONS
        </div>
      </Reveal>
      <Reveal at={HEADER_B_AT + 6}>
        <Heading size={62}>Live Calls mit dem Team</Heading>
      </Reveal>
      <Reveal at={HEADER_B_AT + 14}>
        <div
          style={{
            fontSize: 26,
            fontWeight: font.weight.medium,
            color: colors.textDim,
            marginTop: 12,
          }}
        >
          Stell deine Fragen direkt an unsere Trader — jede Woche live.
        </div>
      </Reveal>
    </div>

    <CalendarPanel />
    <NextCallCard />

    <Reveal
      at={NOTE_AT}
      style={{position: 'absolute', left: 956, top: 856, width: 460}}
    >
      <div style={{fontSize: 19, color: colors.textFaint, lineHeight: 1.45}}>
        Verpasst? Alle Aufzeichnungen findest du danach in der Academy.
      </div>
    </Reveal>

    <CosmoExplain />
  </AbsoluteFill>
);

/* ================================================================== */
/* Scene                                                               */
/* ================================================================== */

export const Scene4Education: React.FC = () => {
  const frame = useCurrentFrame();

  // AF-Wobble an den Scroll-Landungen (Akt 1) bzw. vorm finalen Push (Akt 2).
  const wobbleA = afPump(frame, [206, 300], {maxBlur: 2.5, attack: 10, release: 12});
  const wobbleB = afPump(frame, [546], {maxBlur: 3, attack: 12, release: 16});

  const fadeIn = interpolate(frame, [0, 12], [1, 0], CLAMP);

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, fontFamily: font.family}}>
      {/* Tiefen-Ebene: Glows + Raster + Watermark, gedämpfte Parallaxe */}
      <CameraRig keyframes={CAM_BG} shake={0.18} shakeSeed={3}>
        <BackgroundLayer />
      </CameraRig>

      {/* Haupt-Ebene: Akt 1 (Lesson-Grid) → Schnitt im Blur-Peak → Akt 2 (Live) */}
      {frame < SWAP ? (
        <CameraRig keyframes={CAM_A} shake={0.5} shakeSeed={7} extraBlur={wobbleA}>
          <AcademyStage />
        </CameraRig>
      ) : (
        <CameraRig keyframes={CAM_B} shake={0.45} shakeSeed={13} extraBlur={wobbleB}>
          <LiveStage />
        </CameraRig>
      )}

      {/* Vordergrund: Bokeh-Orbs mit verstärkter Parallaxe */}
      <CameraRig keyframes={CAM_FG} shake={0.25} shakeSeed={21}>
        <BokehLayer />
      </CameraRig>

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
