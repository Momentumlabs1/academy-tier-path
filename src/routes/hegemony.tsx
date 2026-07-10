import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useCallback } from "react";

export const Route = createFileRoute("/hegemony")({
  head: () => ({
    meta: [
      { title: "US Hegemony Cycles 1898–2026" },
      { name: "description", content: "Interactive visualization of US global power cycles." },
    ],
  }),
  component: HegemonyPage,
});

// ─── Data ───────────────────────────────────────────────────────────────────

interface DataPoint {
  year: number;
  power: number; // 0–100
}

const DATA: DataPoint[] = [
  { year: 1898, power: 18 },
  { year: 1900, power: 22 },
  { year: 1905, power: 27 },
  { year: 1910, power: 32 },
  { year: 1914, power: 34 },
  { year: 1917, power: 36 },
  { year: 1919, power: 42 },
  { year: 1922, power: 38 },
  { year: 1925, power: 44 },
  { year: 1929, power: 50 },
  { year: 1932, power: 40 },
  { year: 1935, power: 43 },
  { year: 1939, power: 48 },
  { year: 1941, power: 52 },
  { year: 1944, power: 66 },
  { year: 1945, power: 74 },
  { year: 1948, power: 80 },
  { year: 1950, power: 82 },
  { year: 1955, power: 86 },
  { year: 1960, power: 88 },
  { year: 1963, power: 85 },
  { year: 1965, power: 83 },
  { year: 1968, power: 78 },
  { year: 1971, power: 74 },
  { year: 1973, power: 70 },
  { year: 1975, power: 67 },
  { year: 1979, power: 63 },
  { year: 1981, power: 66 },
  { year: 1985, power: 70 },
  { year: 1989, power: 73 },
  { year: 1991, power: 82 },
  { year: 1995, power: 84 },
  { year: 2000, power: 83 },
  { year: 2003, power: 79 },
  { year: 2008, power: 72 },
  { year: 2010, power: 69 },
  { year: 2012, power: 67 },
  { year: 2015, power: 64 },
  { year: 2017, power: 61 },
  { year: 2020, power: 57 },
  { year: 2022, power: 55 },
  { year: 2024, power: 52 },
  { year: 2026, power: 49 },
];

interface Phase {
  from: number;
  to: number;
  label: string;
  sublabel: string;
  colorStop: string; // oklch
}

const PHASES: Phase[] = [
  { from: 1898, to: 1918, label: "Aufstieg", sublabel: "Industrial Rise", colorStop: "oklch(0.55 0.22 295)" },
  { from: 1918, to: 1939, label: "Interkriegszeit", sublabel: "War & Depression", colorStop: "oklch(0.60 0.20 320)" },
  { from: 1939, to: 1955, label: "Hegemoniale Blüte", sublabel: "WWII & Bretton Woods", colorStop: "oklch(0.72 0.18 15)" },
  { from: 1955, to: 1975, label: "Relativer Niedergang", sublabel: "Vietnam & Nixon Shock", colorStop: "oklch(0.78 0.16 60)" },
  { from: 1975, to: 1995, label: "Unipolarer Moment", sublabel: "Reagan & USSR Collapse", colorStop: "oklch(0.80 0.18 140)" },
  { from: 1995, to: 2012, label: "Überdehnungsphase", sublabel: "Iraq & Financial Crisis", colorStop: "oklch(0.72 0.16 190)" },
  { from: 2012, to: 2026, label: "Transition", sublabel: "Multipolar Shift", colorStop: "oklch(0.55 0.18 240)" },
];

interface Event {
  year: number;
  label: string;
  detail: string;
  tier: "major" | "mid" | "minor";
}

const EVENTS: Event[] = [
  { year: 1898, label: "Span.-Am. Krieg", detail: "USA wird zur imperialen Seemacht. Kuba, Puerto Rico, Philippinen.", tier: "major" },
  { year: 1913, label: "Federal Reserve", detail: "Gründung der Fed — Grundstein des Dollar-Imperiums.", tier: "mid" },
  { year: 1914, label: "Erster Weltkrieg", detail: "Europa blutet, USA rüstet und kreditiert beide Seiten.", tier: "major" },
  { year: 1919, label: "Versailles", detail: "USA lehnt Völkerbund ab — erster Rückzug aus globaler Führung.", tier: "mid" },
  { year: 1929, label: "Schwarzer Donnerstag", detail: "Wall-Street-Crash. 25% Arbeitslosigkeit. Globale Depression.", tier: "major" },
  { year: 1941, label: "Pearl Harbor / WK II", detail: "USA tritt in den Weltkrieg ein. Industriemaschinerie auf Hochtouren.", tier: "major" },
  { year: 1944, label: "Bretton Woods", detail: "Dollar = Weltreservewährung. Gold-Dollar-Standard etabliert.", tier: "major" },
  { year: 1950, label: "Koreakrieg", detail: "Erste Intervention im Kalten Krieg. NATO-Ausbau beschleunigt.", tier: "mid" },
  { year: 1962, label: "Kubakrise", detail: "Schärfste nukleare Konfrontation. USA zeigt maximale Stärke.", tier: "mid" },
  { year: 1965, label: "Vietnam-Eskalation", detail: "Beginn des teuersten Krieges in US-Geschichte. Erosion der Glaubwürdigkeit.", tier: "mid" },
  { year: 1971, label: "Nixon-Schock", detail: "USA hebt Gold-Deckung des Dollars auf. Ende von Bretton Woods.", tier: "major" },
  { year: 1973, label: "Ölkrise", detail: "OPEC-Embargo. Stagflation. Vertrauensverlust in Petrodollar.", tier: "mid" },
  { year: 1979, label: "Volcker-Schock", detail: "Fed hebt Zinsen auf 20%. Dollar gerettet, Rezession erzwungen.", tier: "mid" },
  { year: 1989, label: "Mauerfall", detail: "Berlin. Der Kalte Krieg endet. USA auf dem Gipfel.", tier: "major" },
  { year: 1991, label: "USSR-Kollaps", detail: "Sowjetunion aufgelöst. USA = einzige Supermacht.", tier: "major" },
  { year: 2001, label: "9/11 / War on Terror", detail: "Anschläge verändern US-Strategie. Afghanistan, dann Irak.", tier: "major" },
  { year: 2008, label: "Finanzkrise", detail: "Lehman Brothers. Subprime-Kollaps. Globales Vertrauen erschüttert.", tier: "major" },
  { year: 2013, label: "Snowden / NSA", detail: "Überwachungsskandal. Soft-Power-Verlust der USA.", tier: "minor" },
  { year: 2017, label: "Trump I", detail: "America First. Multilateralismus wird geschwächt.", tier: "mid" },
  { year: 2022, label: "Ukraine-Krieg", detail: "NATO-Einheit vs. China-Russland-Achse. Neue Blockbildung.", tier: "major" },
  { year: 2025, label: "Trump II / Zölle", detail: "Handelskrieg mit China. Dollar-Hegemonie unter Druck.", tier: "major" },
];

// ─── SVG helpers ─────────────────────────────────────────────────────────────

function catmullRom(pts: [number, number][], tension = 0.4): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// ─── Component ───────────────────────────────────────────────────────────────

const YEAR_MIN = 1898;
const YEAR_MAX = 2026;

export default function HegemonyPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<(Event & { x: number; y: number }) | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);

  // Layout constants (logical units — SVG viewBox)
  const VW = 1200;
  const VH = 520;
  const MARGIN = { top: 60, right: 30, bottom: 90, left: 54 };
  const PW = VW - MARGIN.left - MARGIN.right;
  const PH = VH - MARGIN.top - MARGIN.bottom;

  const xScale = useCallback((year: number) => ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * PW, []);
  const yScale = useCallback((power: number) => PH - (power / 100) * PH, []);

  // Build path points
  const pts: [number, number][] = DATA.map((d) => [xScale(d.year), yScale(d.power)]);
  const linePath = catmullRom(pts);
  const areaPath = linePath + ` L ${pts[pts.length - 1][0]} ${PH} L ${pts[0][0]} ${PH} Z`;

  // Phase rectangles
  const phaseRects = PHASES.map((p) => ({
    ...p,
    x: xScale(p.from),
    w: xScale(p.to) - xScale(p.from),
  }));

  // Event markers
  const eventMarkers = EVENTS.map((e) => {
    const x = xScale(e.year);
    const ptNear = DATA.reduce((a, b) => (Math.abs(a.year - e.year) <= Math.abs(b.year - e.year) ? a : b));
    const y = yScale(ptNear.power);
    return { ...e, x, y };
  });

  // Y-axis ticks
  const yTicks = [0, 25, 50, 75, 100];
  // X-axis decade ticks
  const xTicks: number[] = [];
  for (let y = 1900; y <= 2026; y += 10) xTicks.push(y);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, oklch(0.14 0.10 295) 0%, oklch(0.10 0.06 270) 50%, oklch(0.08 0.04 250) 100%)",
        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
        color: "white",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "32px 24px 0", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "oklch(0.9 0.2 140)", fontWeight: 700, marginBottom: 6 }}>
              Geopolitische Analyse
            </div>
            <h1 style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              US-Hegemoniezyklen
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 6, fontWeight: 400 }}>
              Relative Weltmacht-Intensität 1898–2026 · Phasenmodell nach Wallerstein / Modelski
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PHASES.map((p) => (
              <button
                key={p.label}
                onMouseEnter={() => setActivePhase(p.label)}
                onMouseLeave={() => setActivePhase(null)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: `1px solid ${activePhase === p.label ? p.colorStop : "rgba(255,255,255,0.1)"}`,
                  background: activePhase === p.label ? `color-mix(in oklch, ${p.colorStop} 18%, transparent)` : "transparent",
                  color: activePhase === p.label ? p.colorStop : "rgba(255,255,255,0.45)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  letterSpacing: "0.04em",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "16px 0 0", position: "relative" }}>
        <div style={{ overflowX: "auto", overflowY: "visible" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ width: "100%", minWidth: 600, height: "auto", display: "block" }}
            onMouseLeave={() => setHoveredEvent(null)}
          >
            <defs>
              {/* Horizontal x-axis gradient fill */}
              <linearGradient id="areaGrad" x1="0" y1="0" x2={PW} y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="oklch(0.55 0.22 295)" stopOpacity="0.55" />
                <stop offset="15%"  stopColor="oklch(0.60 0.22 320)" stopOpacity="0.55" />
                <stop offset="30%"  stopColor="oklch(0.70 0.20 10)"  stopOpacity="0.60" />
                <stop offset="45%"  stopColor="oklch(0.78 0.18 50)"  stopOpacity="0.60" />
                <stop offset="60%"  stopColor="oklch(0.80 0.20 140)" stopOpacity="0.55" />
                <stop offset="75%"  stopColor="oklch(0.72 0.18 190)" stopOpacity="0.50" />
                <stop offset="100%" stopColor="oklch(0.55 0.20 240)" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2={PW} y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="oklch(0.75 0.22 295)" />
                <stop offset="15%"  stopColor="oklch(0.78 0.22 320)" />
                <stop offset="30%"  stopColor="oklch(0.85 0.20 10)"  />
                <stop offset="45%"  stopColor="oklch(0.88 0.18 55)"  />
                <stop offset="60%"  stopColor="oklch(0.90 0.20 140)" />
                <stop offset="75%"  stopColor="oklch(0.80 0.18 190)" />
                <stop offset="100%" stopColor="oklch(0.70 0.20 240)" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <clipPath id="chartClip">
                <rect x={0} y={0} width={PW} height={PH} />
              </clipPath>
            </defs>

            {/* Chart group — offset by margins */}
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

              {/* Phase background bands */}
              {phaseRects.map((p) => (
                <g key={p.label}>
                  <rect
                    x={p.x} y={0} width={p.w} height={PH}
                    fill={activePhase === p.label ? `color-mix(in oklch, ${p.colorStop} 12%, transparent)` : "transparent"}
                    stroke={activePhase === p.label ? p.colorStop : "rgba(255,255,255,0.04)"}
                    strokeWidth={activePhase === p.label ? 1 : 0.5}
                    rx={2}
                    style={{ transition: "fill 0.2s" }}
                    onMouseEnter={() => setActivePhase(p.label)}
                    onMouseLeave={() => setActivePhase(null)}
                    className="cursor-pointer"
                  />
                  {/* Phase label at top */}
                  <text
                    x={p.x + p.w / 2} y={-10}
                    fill={activePhase === p.label ? p.colorStop : "rgba(255,255,255,0.28)"}
                    fontSize={9.5}
                    fontWeight={700}
                    textAnchor="middle"
                    letterSpacing="0.10em"
                    textDecoration="none"
                    style={{ textTransform: "uppercase", transition: "fill 0.2s" }}
                  >
                    {p.label}
                  </text>
                  <text
                    x={p.x + p.w / 2} y={-1}
                    fill={activePhase === p.label ? `color-mix(in oklch, ${p.colorStop} 70%, white)` : "rgba(255,255,255,0.18)"}
                    fontSize={7.5}
                    textAnchor="middle"
                    style={{ transition: "fill 0.2s" }}
                  >
                    {p.sublabel}
                  </text>
                  {/* Vertical divider */}
                  <line
                    x1={p.x} y1={0} x2={p.x} y2={PH}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="3 4"
                  />
                </g>
              ))}

              {/* Y-axis grid lines */}
              {yTicks.map((v) => (
                <g key={v}>
                  <line
                    x1={0} y1={yScale(v)} x2={PW} y2={yScale(v)}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={v === 50 ? 1.5 : 0.75}
                    strokeDasharray={v === 50 ? "6 4" : "3 5"}
                  />
                  <text x={-8} y={yScale(v) + 3.5} fill="rgba(255,255,255,0.3)" fontSize={9.5} textAnchor="end" fontWeight={500}>
                    {v}
                  </text>
                </g>
              ))}

              {/* Area fill */}
              <g clipPath="url(#chartClip)">
                <path d={areaPath} fill="url(#areaGrad)" />
                {/* Glow duplicate behind line */}
                <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={5} strokeOpacity={0.25} filter="url(#softGlow)" />
                {/* Main line */}
                <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
              </g>

              {/* X-axis ticks */}
              {xTicks.map((yr) => (
                <g key={yr} transform={`translate(${xScale(yr)},${PH})`}>
                  <line y1={0} y2={6} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                  <text y={18} fill="rgba(255,255,255,0.38)" fontSize={9.5} textAnchor="middle" fontWeight={500}>{yr}</text>
                </g>
              ))}

              {/* Current year marker */}
              <g transform={`translate(${xScale(2026)},0)`}>
                <line y1={0} y2={PH} stroke="oklch(0.9 0.2 140)" strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.6} />
                <text y={-16} fill="oklch(0.9 0.2 140)" fontSize={9} fontWeight={700} textAnchor="middle" letterSpacing="0.08em">JETZT</text>
              </g>

              {/* Event markers */}
              {eventMarkers.map((e) => {
                const isHovered = hoveredEvent?.year === e.year;
                const markerSize = e.tier === "major" ? 5.5 : e.tier === "mid" ? 4 : 3;
                return (
                  <g
                    key={e.year}
                    transform={`translate(${e.x},${e.y})`}
                    onMouseEnter={() => setHoveredEvent({ ...e })}
                    onMouseLeave={() => setHoveredEvent(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Pulse ring on hover */}
                    {isHovered && (
                      <circle r={markerSize + 7} fill="white" fillOpacity={0.08} />
                    )}
                    {/* Connector line to x-axis label */}
                    <line
                      y1={0} y2={PH - e.y + 8}
                      stroke={isHovered ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
                      strokeWidth={0.8}
                      strokeDasharray="2 3"
                    />
                    {/* Dot */}
                    <circle
                      r={markerSize}
                      fill={isHovered ? "white" : "rgba(255,255,255,0.75)"}
                      stroke={isHovered ? "oklch(0.9 0.2 140)" : "rgba(255,255,255,0.3)"}
                      strokeWidth={isHovered ? 1.5 : 1}
                      filter={isHovered ? "url(#glow)" : undefined}
                    />
                    {/* Year label below x-axis */}
                    <text
                      y={PH - e.y + 22}
                      fill={isHovered ? "white" : "rgba(255,255,255,0.35)"}
                      fontSize={e.tier === "major" ? 8.5 : 7.5}
                      textAnchor="middle"
                      fontWeight={isHovered ? 700 : 500}
                      style={{ transition: "fill 0.1s" }}
                    >
                      {e.year}
                    </text>
                  </g>
                );
              })}

              {/* Y-axis label */}
              <text
                transform={`rotate(-90) translate(${-PH / 2},${-42})`}
                fill="rgba(255,255,255,0.25)"
                fontSize={9}
                textAnchor="middle"
                letterSpacing="0.14em"
                style={{ textTransform: "uppercase" }}
              >
                Relative Macht-Intensität (0–100)
              </text>
            </g>
          </svg>
        </div>

        {/* Hover tooltip */}
        {hoveredEvent && (
          <div
            style={{
              position: "fixed",
              bottom: "env(safe-area-inset-bottom, 0px)",
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 50,
              padding: "12px 18px",
              borderRadius: 16,
              background: "oklch(0.18 0.10 285 / 0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(16px)",
              maxWidth: "min(420px, 90vw)",
              width: "max-content",
              marginBottom: 16,
              boxShadow: "0 8px 32px oklch(0 0 0 / 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, color: "oklch(0.9 0.2 140)",
                letterSpacing: "0.12em", textTransform: "uppercase"
              }}>
                {hoveredEvent.year}
              </span>
              <span style={{
                padding: "2px 8px", borderRadius: 99,
                background: hoveredEvent.tier === "major" ? "oklch(0.72 0.20 10 / 0.25)" : "rgba(255,255,255,0.07)",
                color: hoveredEvent.tier === "major" ? "oklch(0.85 0.18 15)" : "rgba(255,255,255,0.5)",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase"
              }}>
                {hoveredEvent.tier === "major" ? "Schlüsselereignis" : hoveredEvent.tier === "mid" ? "Wendepunkt" : "Ereignis"}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{hoveredEvent.label}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.45 }}>{hoveredEvent.detail}</div>
          </div>
        )}
      </div>

      {/* Power level legend */}
      <div style={{ padding: "8px 24px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 28, height: 2, background: "linear-gradient(90deg, oklch(0.75 0.22 295), oklch(0.88 0.20 60), oklch(0.90 0.20 140), oklch(0.70 0.20 240))", borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>Relative Macht-Kurve</span>
          </div>
          {[
            { label: "Schlüsselereignis", dot: 5.5 },
            { label: "Wendepunkt", dot: 4 },
            { label: "Ereignis", dot: 3 },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width={12} height={12}><circle cx={6} cy={6} r={l.dot} fill="rgba(255,255,255,0.65)" /></svg>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>{l.label}</span>
            </div>
          ))}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginLeft: "auto" }}>
            Hover über Ereignismarker für Details
          </span>
        </div>
      </div>

      {/* Phase detail cards */}
      <div style={{ padding: "0 24px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
        }}>
          {PHASES.map((p) => (
            <div
              key={p.label}
              onMouseEnter={() => setActivePhase(p.label)}
              onMouseLeave={() => setActivePhase(null)}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: `1px solid ${activePhase === p.label ? `color-mix(in oklch, ${p.colorStop} 50%, transparent)` : "rgba(255,255,255,0.06)"}`,
                background: activePhase === p.label ? `color-mix(in oklch, ${p.colorStop} 10%, oklch(0.14 0.06 280 / 0.8))` : "oklch(0.16 0.07 285 / 0.5)",
                cursor: "default",
                transition: "all 0.18s",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: p.colorStop, marginBottom: 4 }}>
                {p.from}–{p.to}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.35 }}>{p.sublabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Source note */}
      <div style={{ padding: "0 24px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em" }}>
          Modell basiert auf Weltsystemtheorie (Wallerstein) & Long-Cycle-Theorie (Modelski) · Daten indexiert, nicht amtlich
        </p>
      </div>
    </div>
  );
}
