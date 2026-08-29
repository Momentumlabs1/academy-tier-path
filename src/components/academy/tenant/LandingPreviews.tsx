/**
 * LandingPreviews — animated, self-contained product mockups shown on the
 * landing page. Each one is a faithful mini-slice of a real feature (signals,
 * auto-trader, academy, quizzes, rewards, white-label) so the page SHOWS the
 * product instead of describing it. Pure CSS/SVG animation — SSR-safe, no libs.
 *
 * All previews take the tenant's `primary`/`accent` so partner pages render
 * their own colors. Deterministic data only (no random) for hydration safety.
 */
import { useRef, useState } from "react";
import {
  TrendingUp, TrendingDown, Radio, CheckCircle2, PlayCircle, Bot, Flame,
  Trophy, Zap, Sparkles, Lock, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";


const UP = "oklch(0.82 0.17 150)";
const DOWN = "oklch(0.66 0.2 22)";

/** Shared keyframes for every preview — emitted once per preview instance
 *  (duplicate <style> tags are harmless and keep each preview drop-in). */
function PreviewStyles() {
  return (
    <style>{`
      @keyframes lpDraw { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
      @keyframes lpRise { 0% { transform: translateY(8px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      @keyframes lpFill { from { width: 0; } }
      @keyframes lpPulse { 0%,100% { opacity: .4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
      @keyframes lpPop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes lpFlash { 0%,45% { background: rgba(255,255,255,.03); } 55%,100% { background: color-mix(in oklch, ${UP} 16%, transparent); } }
      @keyframes lpCount { 0%,40% { opacity:0; transform: translateY(6px);} 55%,100% { opacity:1; transform: translateY(0);} }
      @keyframes lpFlame { 0%,100% { transform: rotate(-4deg) scale(1);} 50% { transform: rotate(4deg) scale(1.08);} }
      /* Dauerleben. Die One-Shot-Animationen (Kurve zeichnen, Balken fuellen)
         waren laengst fertig, wenn der Besucher hinscrollte — die Kacheln
         wirkten tot. Alles Sichtbare loopt jetzt mit langer Haltephase:
         zeichnen, stehen lassen, kurz ausblenden, von vorn. */
      @keyframes lpDrawLoop { 0% { stroke-dashoffset: 620; opacity: 1; } 26% { stroke-dashoffset: 0; } 88% { stroke-dashoffset: 0; opacity: 1; } 96% { opacity: 0; } 100% { stroke-dashoffset: 620; opacity: 0; } }
      @keyframes lpCountLoop { 0%,20% { opacity: 0; transform: translateY(6px); } 30%,88% { opacity: 1; transform: translateY(0); } 96%,100% { opacity: 0; } }
      @keyframes lpDot { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.8); opacity: .3; } }
      @keyframes lpKen { 0% { transform: scale(1.06) translate(0,0); } 100% { transform: scale(1.14) translate(-2.5%,-1.5%); } }
      @keyframes lpHit { 0%,55% { background: rgba(255,255,255,.02); } 62%,86% { background: color-mix(in oklch, ${UP} 13%, transparent); } 100% { background: rgba(255,255,255,.02); } }
      @keyframes lpHitCheck { 0%,55% { transform: scale(1); } 62% { transform: scale(1.5); } 72%,100% { transform: scale(1); } }
      @keyframes lpSheen { 0%,55% { transform: translateX(-120%); } 90%,100% { transform: translateX(340%); } }
      @keyframes lpBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes lpGlow { 0%,100% { box-shadow: 0 0 0 3px rgba(0,0,0,.45), 0 0 16px -2px var(--lp-glow), 0 0 32px -8px var(--lp-glow); } 50% { box-shadow: 0 0 0 3px rgba(0,0,0,.45), 0 0 26px 0px var(--lp-glow), 0 0 52px -4px var(--lp-glow); } }
      /* ── Scroll-Scrub (Progressive Enhancement) ─────────────────────────
         Die Basisklassen unten tragen den Zeit-Loop als Fallback; wo der
         Browser animation-timeline: view() kann, uebernimmt der Scrub: die
         Kurve zeichnet sich MIT dem Scrollen, Bubbles/Balken/Ring/Faecher
         bauen sich auf. Keyframes lassen das "to" weg, wo der Endzustand
         der Inline-Basis-Stil ist — so animiert CSS automatisch dorthin. */
      @keyframes scDraw    { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
      @keyframes scRing    { from { stroke-dashoffset: var(--ring-c); } }
      @keyframes scFillX   { from { transform: scaleX(0); } }
      @keyframes scFade    { from { opacity: 0; } }
      @keyframes scBub     { from { opacity: 0; transform: translateY(12px) scale(.95); } }
      @keyframes scGatherL { from { opacity: .35; transform: translateX(78%) scale(.9) rotate(-3deg); } }
      @keyframes scGatherR { from { opacity: .35; transform: translateX(-78%) scale(.9) rotate(3deg); } }
      @keyframes scUnstack { from { opacity: 0; transform: none; } }
      @keyframes lpDash    { to { stroke-dashoffset: -14; } }
      .lp-eq     { animation: lpDrawLoop 12s ease-in-out infinite; }
      .lp-eqfill { animation: lpCountLoop 12s ease-in-out infinite; }
      @supports (animation-timeline: view()) {
        .lp-eq     { animation: scDraw linear both; animation-timeline: view(); animation-range: entry 15% contain 55%; }
        .lp-eqfill { animation: scFade linear both; animation-timeline: view(); animation-range: entry 35% contain 55%; }
        .lp-chat > :nth-child(2) { animation: scBub cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 15% entry 55%; }
        .lp-chat > :nth-child(3) { animation: scBub cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 28% entry 68%; }
        .lp-chat > :nth-child(4) { animation: scBub cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 41% entry 81%; }
        .lp-prog   { transform-origin: left; animation: scFillX linear both; animation-timeline: view(); animation-range: entry 20% contain 50%; }
        .lp-ring   { animation: scRing linear both; animation-timeline: view(); animation-range: entry 15% contain 55%; }
        .lp-stack-a { animation: scUnstack linear both; animation-timeline: view(); animation-range: entry 5% entry 45%; }
        .lp-stack-b { animation: scUnstack linear both; animation-timeline: view(); animation-range: entry 12% entry 52%; }
        .lp-skin-l { animation: scGatherL cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 8% entry 55%; }
        .lp-skin-r { animation: scGatherR cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 8% entry 55%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .lp-draw,.lp-rise,.lp-fill,.lp-pulse,.lp-pop,.lp-slide,.lp-flash,.lp-count,.lp-flame,.lp-ken,.lp-hit,.lp-sheen,.lp-bob,.lp-dot,.lp-glow,.lp-eq,.lp-eqfill,.lp-chat > *,.lp-prog,.lp-ring,.lp-stack-a,.lp-stack-b,.lp-skin-l,.lp-skin-r,.lp-beam { animation: none !important; }
        .lp-draw,.lp-eq { stroke-dashoffset: 0 !important; } .lp-fill span { width: var(--w) !important; }
      }
    `}</style>
  );
}

/**
 * Der Wiedererkennungs-Anker aller Rahmen-Typen: Pulspunkt + Uppercase-Label.
 *
 * Vorher trugen alle sechs Previews dasselbe Mac-Fenster — "die Illustrationen
 * sehen zu gleich aus". Jetzt bekommt jede Karte den Rahmen ihres Mediums
 * (Handy, Terminal-Fenster, Kursplayer, Kartenstapel, offene Komposition,
 * Skin-Faecher); dieses eine Element stiftet die gemeinsame Handschrift.
 */
function ChromeStrap({ label, primary, className }: { label: string; primary: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40", className)}>
      <span className="lp-pulse h-1.5 w-1.5 rounded-full" style={{ background: primary, animation: "lpPulse 2s ease-in-out infinite" }} />{label}
    </span>
  );
}

function Frame({ label, children, primary }: { label: string; children: React.ReactNode; primary: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d16] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-white/8 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <ChromeStrap label={label} primary={primary} className="ml-2" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Handy-Rahmen fuer die Signal-Karte: Signale leben in Telegram, also zeigt
 *  die Vorschau ein Telefon — nicht ein weiteres Desktop-Fenster. */
function PhoneFrame({ label, children, primary }: { label: string; children: React.ReactNode; primary: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#0a0d16] shadow-2xl">
      {/* Notch-Pille */}
      <div className="flex items-center justify-center pt-2.5">
        <span className="h-[18px] w-24 rounded-full bg-black/80 ring-1 ring-white/10" />
      </div>
      <div className="flex items-center justify-between border-b border-white/8 px-4 pb-2.5 pt-2">
        <ChromeStrap label={label} primary={primary} />
      </div>
      {children}
    </div>
  );
}

/** Kursplayer-Rahmen fuer die Academy: kein Fenster-Chrome, das Video ist der Star. */
function PlayerFrame({ label, children, primary }: { label: string; children: React.ReactNode; primary: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d16] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
        <ChromeStrap label={label} primary={primary} />
      </div>
      {children}
    </div>
  );
}

/**
 * Echte Bildschirmfotos statt gezeichneter Attrappen.
 *
 * Die Aufnahmen stammen aus dem eigenen Material (Orderflow-Terminal, Footprint
 * mit Liquiditäts-Cluster). Sie tragen aber an den Rändern Cosmo-Branding —
 * unten rechts die Sprechblase, oben rechts der Akademie-Schriftzug. Auf der
 * Seite eines White-Label-Partners darf das nicht auftauchen, sonst steht in
 * Zekos Produktkachel unsere Marke.
 *
 * Deshalb wird NICHT das ganze Bild gezeigt, sondern über `object-position` nur
 * der Chart-Ausschnitt: links das Kerzenbild, rechts das Zahlengitter. Beides
 * ist echtes Terminal und in jeder Marke unverfänglich. Kein Zuschneiden nötig,
 * jederzeit umstellbar.
 */
function Shot({ src, pos, primary, className }: { src: string; pos: string; primary: string; className?: string }) {
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className={cn("lp-ken absolute inset-0 h-full w-full object-cover", className)}
        // Leicht heruntergeregelt, damit das Bild in den dunklen Kartengrund
        // einsinkt statt dagegen zu leuchten. Das helle Terminal-Panel war
        // sonst der hellste Fleck der ganzen Seite.
        // Ken-Burns: eine kaum merkliche Kamerafahrt — das eine Detail, das
        // ein Standbild von einem laufenden Terminal unterscheidet.
        style={{ objectPosition: pos, opacity: 0.62, animation: "lpKen 24s ease-in-out infinite alternate" }}
      />
      {/* Markenschleier. Die Rohaufnahmen sind grelles Terminal-Weiss und
          Neon-Pink — nebeneinander auf einer dunkelblauen Seite beissen sie.
          `color` faerbt den Farbton um und laesst die Helligkeit stehen, sodass
          Kerzen und Zahlen lesbar bleiben, das Bild aber in der Markenfarbe
          liegt; der Multiply-Verlauf darueber zieht die weissen Flaechen ins
          Dunkle, statt sie auszubrennen. */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: primary, mixBlendMode: "color", opacity: 0.55 }}
      />
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "linear-gradient(160deg, rgba(8,13,26,.78), rgba(8,13,26,.42))",
          mixBlendMode: "multiply",
        }}
      />
    </>
  );
}

/**
 * CosmoCam — der runde Kamera-Einwurf, wie ihn Streamer über ihr Bild legen.
 *
 * Auf den Rohaufnahmen sass Cosmo als winzige Blase in der Ecke; auf einer
 * Produktkachel war er kaum zu erkennen. Hier bekommt er stattdessen den
 * Platz, den eine Webcam bekommt: fester Kreis, leuchtender Ring in der
 * Markenfarbe, klarer Abstand zum Bildrand.
 *
 * Der Bildausschnitt sitzt bewusst auf Kopf und Schultern (`object-position`
 * 50%/26%) — im Originalbild sitzt Cosmo mittig hinter der Tastatur, ein
 * zentrierter Kreis würde den Schreibtisch zeigen und nicht sein Gesicht.
 *
 * NUR AUF DER COSMOS-SEITE. Cosmo ist unsere Figur; auf der Seite eines
 * Partners hat er nichts verloren — deshalb rendert der Aufrufer ihn nur,
 * wenn die Marke unsere eigene ist.
 */
function CosmoCam({ primary, className }: { primary: string; className?: string }) {
  return (
    <div
      className={cn("lp-glow absolute overflow-hidden rounded-full", className)}
      style={{
        border: `2px solid color-mix(in oklch, ${primary} 75%, white)`,
        ["--lp-glow" as string]: primary,
        boxShadow: `0 0 0 3px rgba(0,0,0,.45), 0 0 22px -2px ${primary}, 0 0 42px -8px ${primary}`,
        // Atmender Ring — wie die On-Air-Leuchte einer Webcam.
        animation: "lpGlow 3.2s ease-in-out infinite",
      }}
    >
      <img
        src="/cosmo/cosmo-desk.jpg"
        alt="Cosmo"
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
        style={{ objectPosition: "50% 26%", transform: "scale(1.6)" }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,.55), transparent)" }}
      />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-[0.16em] text-white/90">
        Cosmo
      </span>
    </div>
  );
}

/* ── 1. Live signals — echter Chart, darauf der Ruf, der gerade reinkam ── */
export function SignalsPreview({ primary, showCosmo }: { primary: string; showCosmo?: boolean }) {
  return (
    <PhoneFrame label="Signals · live" primary={primary}>
      <PreviewStyles />
      {/* Signale leben in Telegram — die Vorschau ist der Chat selbst. Die
          Bubbles (Kinder 2–4 von .lp-chat) poppen beim Scrollen nacheinander
          rein, als kaeme die Nachricht gerade an. */}
      <div className="lp-chat relative space-y-2 p-3 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-black" style={{ background: primary }}>S</span>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-white/90">Signal Desk</div>
            <div className="text-[10px] text-white/40">channel</div>
          </div>
        </div>
        {/* Bubble 1: der Ruf, komplett mit Entry/SL/TP. */}
        <div className="rounded-2xl rounded-tl-md border border-white/12 bg-white/[0.05] p-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold" style={{ color: UP }}>
              <TrendingUp className="h-3.5 w-3.5" /> LONG · XAU/USD
            </span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/70">now</span>
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-2 font-mono text-[10px]">
            <div><div className="text-white/40">Entry</div><div className="text-white">2,318.4</div></div>
            <div><div className="text-white/40">SL</div><div style={{ color: DOWN }}>2,311.0</div></div>
            <div><div className="text-white/40">TP</div><div style={{ color: UP }}>2,334.0</div></div>
          </div>
        </div>
        {/* Bubble 2: der Treffer — blitzt zusaetzlich im Zeit-Takt auf. */}
        <div className="lp-hit flex items-center justify-between rounded-2xl rounded-tl-md border border-white/10 px-3 py-2" style={{ animation: "lpHit 7s ease-in-out 1.5s infinite" }}>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold" style={{ color: DOWN }}><TrendingDown className="h-3.5 w-3.5" /> SHORT · NAS100</span>
          <span className="lp-pop inline-block font-mono text-[10px]" style={{ color: UP, animation: "lpHitCheck 7s ease-in-out 1.5s infinite" }}>✓ TP1 hit</span>
        </div>
        {/* Bubble 3: Chart-Foto, wie der Desk es postet. Rechts unten im
            Rohbild sitzt die Cosmo-Sprechblase — object-position kann sie
            nicht verstecken, weil das Bild horizontal gar nicht beschnitten
            wird. Deshalb: innerer Traeger auf 140 % Breite, links verankert,
            aussen geclippt — das rechte Viertel (mit der Blase) faellt raus.
            Auf Partner-Seiten darf unsere Figur NIE auftauchen. */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl rounded-tl-md border border-white/10">
          <div className="absolute inset-y-0 left-0 w-[140%]">
            <Shot src="/partner/footprint.jpg" pos="0% 50%" primary={primary} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d16]/70 via-transparent to-transparent" />
        </div>
        {/* Tipp-Indikator = Zeit-Leben: der Desk schreibt weiter. */}
        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="lp-pulse h-1 w-1 rounded-full bg-white/60" style={{ animation: `lpPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        {showCosmo && <CosmoCam primary={primary} className="bottom-3 right-3 h-12 w-12" />}
      </div>
    </PhoneFrame>
  );
}

/* ── 2. Auto-trader — echtes Terminal, daneben was in dein Konto gespiegelt wird ── */
export function BotPreview({ primary }: { primary: string }) {
  return (
    <Frame label="Auto-Trader · copying desk" primary={primary}>
      <PreviewStyles />
      {/* Master → Dein Konto: der marschierende Strahl IST die Produktaussage
          — Trades fliessen vom Desk in dein Konto. Nur stroke-dashoffset. */}
      <div className="mb-2.5 flex items-center gap-2">
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/80"><Bot className="h-3.5 w-3.5" style={{ color: primary }} /> Master</div>
        <svg aria-hidden className="h-3 min-w-0 flex-1" preserveAspectRatio="none" viewBox="0 0 100 12">
          <line className="lp-beam" x1="0" y1="6" x2="100" y2="6" stroke={primary} strokeWidth="1.5" strokeDasharray="5 9" style={{ animation: "lpDash 1.1s linear infinite" }} />
        </svg>
        <div className="inline-flex shrink-0 items-center rounded-lg px-2 py-1 text-[10px] font-bold" style={{ border: `1px solid color-mix(in oklch, ${primary} 45%, transparent)`, color: primary, background: `color-mix(in oklch, ${primary} 10%, transparent)` }}>Your account</div>
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/70">
          <span className="lp-pulse h-1.5 w-1.5 rounded-full" style={{ background: UP, animation: "lpPulse 2s ease-in-out infinite" }} /> ON
        </div>
      </div>
      {/* Das Zahlengitter des Master-Kontos — rechter Bildausschnitt, kein Branding. */}
      <div className="relative aspect-[16/8] overflow-hidden rounded-xl border border-white/10">
        <Shot src="/partner/orderflow-lesson.jpg" pos="80% 42%" primary={primary} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d16] via-transparent to-[#0a0d16]/40" />
        {/* Die Equity-Kurve des Master-Kontos liegt darüber. */}
        <svg viewBox="0 0 320 96" className="absolute inset-x-0 bottom-0 h-2/3 w-full" preserveAspectRatio="none">
          <defs><linearGradient id="lpArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={primary} stopOpacity="0.35" /><stop offset="100%" stopColor={primary} stopOpacity="0" /></linearGradient></defs>
          {/* Loop statt One-Shot: zeichnen (3s), lange stehen lassen, weich
              raus, von vorn — so ist die Kurve IMMER in Bewegung, egal wann
              der Besucher hinscrollt. */}
          {/* Scrub: die Kurve zeichnet sich MIT dem Scrollen (Klasse .lp-eq,
              Fallback = Zeit-Loop). Inline steht bewusst KEINE animation mehr
              — Inline wuerde die Scrub-Klasse ueberstimmen. */}
          <path className="lp-eqfill" d="M0,80 L40,72 L80,76 L120,58 L160,62 L200,40 L240,44 L280,22 L320,10 L320,96 L0,96 Z" fill="url(#lpArea)" />
          <path className="lp-eq" d="M0,80 L40,72 L80,76 L120,58 L160,62 L200,40 L240,44 L280,22 L320,10" fill="none" stroke={primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ strokeDasharray: 620 }} />
          {/* Pulsierender Endpunkt: die Kurve lebt am aktuellen Kurs. */}
          <circle className="lp-dot" cx="316" cy="12" r="3.5" fill={primary} style={{ transformOrigin: "316px 12px", animation: "lpDot 1.8s ease-in-out infinite" }} />
        </svg>
        <div className="lp-eqfill absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[11px] font-bold backdrop-blur-sm" style={{ color: UP }}>+18.4%</div>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {/* Gespiegelte Trades blitzen versetzt auf — der Bot arbeitet sichtbar. */}
        {[["XAU/USD", "LONG", "+1.4%", true], ["EUR/USD", "SHORT", "+0.6%", true]].map(([p, d, r, u], i) => (
          <div key={i} className="lp-hit flex items-center justify-between rounded-lg px-2.5 py-1.5 font-mono text-[11px]" style={{ animation: `lpHit 8s ease-in-out ${i * 4}s infinite` }}>
            <span className="text-white/80">{p}</span>
            <span className="text-white/40">{d}</span>
            <span style={{ color: u ? UP : DOWN }}>{r}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── 3. Academy — die echte Lektion, hier abspielbar ──────────────────────
 *
 * Die anderen Kacheln zeigen das Produkt; diese HAT es. Statt eines
 * gezeichneten Play-Knopfes liegt hier die fertige Lektion „Signale kopieren"
 * (2:59) und läuft auf Klick. Wer wissen will, ob der Kurs etwas taugt, muss
 * sich dafür nicht anmelden — er sieht es.
 *
 * Nirgends steht, dass das ein Geschenk ist. Es einfach abspielbar zu machen
 * sagt mehr als ein Etikett.
 *
 * `preload="none"` ist wichtig: die Datei ist 11 MB und sitzt weit unten auf
 * der Seite — ohne das lädt sie bei jedem Besucher mit, der nie so weit
 * scrollt. Das Poster ist der erste Frame des Videos, damit Standbild und
 * Anfang nahtlos ineinander übergehen.
 */
export function AcademyPreview({ primary, accent }: { primary: string; accent: string }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <PlayerFrame label="Academy · Lesson 06" primary={primary}>
      <PreviewStyles />
      {/* Video randlos im Player — es ist der Star, kein Fenster-Inhalt. */}
      <div className="relative aspect-video overflow-hidden bg-black">
        <video
          ref={vid}
          controls
          playsInline
          preload="none"
          poster="/posters/copysignals.jpg"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="h-full w-full object-cover"
        >
          <source src="/lesson-copysignals.mp4" type="video/mp4" />
        </video>
        {!playing && (
          <button
            type="button"
            onClick={() => vid.current?.play()}
            aria-label="Play lesson"
            className="group absolute inset-0 flex cursor-pointer items-center justify-center bg-black/25"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-1 ring-white/25 transition-transform duration-200 group-hover:scale-105"
              style={{ background: primary, boxShadow: `0 0 28px -4px ${primary}` }}
            >
              <PlayCircle className="h-7 w-7 text-black" />
            </span>
          </button>
        )}
        {!playing && (
          <>
            <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/80">02:59</span>
            <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-black" style={{ background: primary, animation: "lpBob 3.4s ease-in-out infinite" }}><Zap className="h-3 w-3" /> +80 XP</span>
          </>
        )}
      </div>
      {/* Playlist-Leiste — die Sprache eines Kursplayers, nicht eines Fensters. */}
      <div className="border-t border-white/8 px-3.5 py-3">
        <div className="flex items-center justify-between text-[11px] text-white/60"><span className="font-semibold text-white/85">Lesson 06 · Copy signals like a pro</span><span>6 / 12</span></div>
        <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
          {/* Scrub via scaleX (Klasse .lp-prog): fuellt sich beim Scrollen,
              ohne Layout-Thrash; der statische width-Wert ist der Endzustand. */}
          <span className="lp-prog block h-full rounded-full" style={{ width: "50%", background: primary }} />
          <span aria-hidden className="lp-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-full" style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent)", animation: "lpSheen 4.6s ease-in-out infinite" }} />
        </div>
        <div className="mt-3 flex gap-1.5">
          {[true, true, true, true, true, false].map((done, i) => (
            <span key={i} className="flex h-6 flex-1 items-center justify-center rounded-md text-[10px] font-bold" style={done ? { background: `color-mix(in oklch, ${primary} 22%, transparent)`, color: primary } : { background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.3)" }}>{done ? <Check className="h-3 w-3" /> : <Lock className="h-2.5 w-2.5" />}</span>
          ))}
        </div>
      </div>
    </PlayerFrame>
  );
}

/* ── 4. Live quiz — ANFASSBAR, nicht animiert ─────────────────────────────
 *
 * Die anderen Kacheln laufen von selbst ab. Diese wartet auf den Besucher:
 * echte Fragen aus dem Kurs, er tippt eine Antwort an, bekommt sofort Recht
 * oder Unrecht — bei einer falschen wird die richtige mitgezeigt, wie in der
 * Akademie auch — die XP zählen hoch, dann die nächste Frage.
 *
 * Warum das mehr wert ist als eine Endlosschleife: wer einmal geklickt hat,
 * hat das Produkt benutzt statt es angesehen. Und wer die Frage falsch hat,
 * merkt in dem Moment, dass er hier etwas lernen kann.
 *
 * Am Ende steht kein Werbespruch, sondern sein Ergebnis — und „nochmal",
 * damit die Kachel nicht verbraucht ist.
 */
const QUIZ = [
  {
    q: "Your trade hits the stop-loss. What's the plan?",
    a: ["Cut the loss and re-assess", "Add to the losing position", "Remove the stop-loss"],
    correct: 0,
    why: "The stop is the plan. Moving it turns a small loss into the one that hurts.",
  },
  {
    q: "Price stalls into a heavy sell wall on the DOM. What does that tell you?",
    a: ["Buyers are about to win", "Sellers are absorbing — wait for the break", "Nothing, DOM is noise"],
    correct: 1,
    why: "Absorption first, direction second. You trade the break, not the guess.",
  },
  {
    q: "The desk fires a call. Your account is half the size of the master.",
    a: ["Copy the exact lot size", "Skip it, too risky", "Scale the size to your own risk"],
    correct: 2,
    why: "Same trade, your risk. Position size is what makes a signal survivable.",
  },
];

export function QuizPreview({ primary }: { primary: string }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [right, setRight] = useState(0);

  const done = step >= QUIZ.length;
  const item = QUIZ[Math.min(step, QUIZ.length - 1)];
  const isRight = picked !== null && picked === item.correct;

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === item.correct) { setXp((x) => x + 50); setRight((r) => r + 1); }
  }
  function next() { setPicked(null); setStep((s) => s + 1); }
  function reset() { setStep(0); setPicked(null); setXp(0); setRight(0); }

  return (
    <div className="relative">
      <PreviewStyles />
      {/* Karten-Stapel: zwei Blanko-Karten faechern beim Scrollen hinter der
          echten auf — Quiz-Sprache statt Fenster-Sprache. aria-hidden und
          unter der Top-Karte, also nie im Weg der Klicks. */}
      <div aria-hidden className="lp-stack-a absolute inset-0 rounded-2xl border border-white/8 bg-white/[0.03]" style={{ transform: "rotate(-3deg) translate(-7px, 9px)" }} />
      <div aria-hidden className="lp-stack-b absolute inset-0 rounded-2xl border border-white/8 bg-white/[0.02]" style={{ transform: "rotate(2deg) translate(8px, 5px)" }} />
      <div className="relative rounded-2xl border border-white/12 bg-[#0a0d16] p-4 shadow-2xl">
      <ChromeStrap label="Live quiz · try it" primary={primary} className="mb-3" />

      {/* Kopf: Fortschritt + laufende XP */}
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
          <Sparkles className="h-3.5 w-3.5" style={{ color: primary }} />
          {done ? "Done" : `Question ${step + 1} / ${QUIZ.length}`}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] font-bold" style={{ color: xp > 0 ? primary : "rgba(255,255,255,.45)" }}>
          <Zap className="h-3 w-3" /> {xp} XP
        </span>
      </div>
      <div className="mb-3 flex gap-1">
        {QUIZ.map((_, i) => (
          <span key={i} className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < step ? primary : i === step && !done ? `color-mix(in oklch, ${primary} 45%, transparent)` : "rgba(255,255,255,.09)" }} />
        ))}
      </div>

      {done ? (
        <div className="py-2 text-center">
          <div className="lp-pop mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `color-mix(in oklch, ${primary} 18%, transparent)`, animation: "lpPop .5s ease-out" }}>
            <Trophy className="h-6 w-6" style={{ color: primary }} />
          </div>
          <p className="mt-2 text-sm font-bold text-white/90">{right} / {QUIZ.length} correct</p>
          <p className="mt-1 text-[12px] text-white/55">
            {right === QUIZ.length ? "That's the level the lessons build on." : "That gap is exactly what lesson 06 covers."}
          </p>
          <button type="button" onClick={reset} className="mt-3 rounded-full border border-white/15 px-4 py-1.5 text-[12px] font-semibold text-white/80 hover:bg-white/5">
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold leading-snug text-white/90">{item.q}</p>
          <div className="mt-3 space-y-2">
            {item.a.map((t, i) => {
              const chosen = picked === i;
              const reveal = picked !== null && i === item.correct;
              const wrong = chosen && !isRight;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={picked !== null}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-all duration-200",
                    picked === null && "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
                    picked !== null && !reveal && !wrong && "border-white/8 bg-white/[0.02] opacity-45",
                  )}
                  style={
                    reveal ? { borderColor: `color-mix(in oklch, ${UP} 55%, transparent)`, background: `color-mix(in oklch, ${UP} 12%, transparent)` }
                    : wrong ? { borderColor: `color-mix(in oklch, ${DOWN} 55%, transparent)`, background: `color-mix(in oklch, ${DOWN} 12%, transparent)` }
                    : undefined
                  }
                >
                  <span className={reveal || wrong ? "font-semibold text-white" : "text-white/75"}>{t}</span>
                  {reveal && <CheckCircle2 className="lp-pop h-4 w-4 shrink-0" style={{ color: UP, animation: "lpPop .4s ease-out" }} />}
                  {wrong && <span className="shrink-0 font-mono text-sm font-black" style={{ color: DOWN }}>×</span>}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="lp-rise mt-3 flex items-start gap-2 rounded-xl border px-3 py-2"
              style={{ animation: "lpRise .35s ease-out both", borderColor: "rgba(255,255,255,.09)", background: "rgba(255,255,255,.03)" }}>
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
              <p className="text-[12px] leading-relaxed text-white/70">{item.why}</p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/35">{picked === null ? "Tap an answer" : isRight ? "+50 XP" : "No XP this time"}</span>
            <button
              type="button"
              onClick={next}
              disabled={picked === null}
              className="rounded-full px-4 py-1.5 text-[12px] font-bold transition-opacity disabled:opacity-25"
              style={{ background: primary, color: "#000" }}
            >
              {step === QUIZ.length - 1 ? "See result" : "Next"}
            </button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

/* ── 5. Rewards / earning — level bar, streak, tier ladder, unlock ── */
export function RewardsPreview({ primary, accent, showCosmo }: { primary: string; accent: string; showCosmo?: boolean }) {
  const tiers = [{ n: "Foundation", on: true }, { n: "Operator", on: true }, { n: "Elite", on: false }];
  // Ringumfang 2πr bei r=52 ≈ 326.7; 72 % gefuellt heisst Offset 326.7 · 0.28.
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0a0d16] p-4 shadow-2xl">
      <PreviewStyles />
      <div className="flex items-center justify-between">
        <ChromeStrap label="Rewards · your progress" primary={primary} />
        <span className="lp-flame inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-white/80" style={{ animation: "lpFlame 2.2s ease-in-out infinite" }}><Flame className="h-3.5 w-3.5" style={{ color: accent }} /> 12-day streak</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        {/* XP-Ring: fuellt sich beim Scrollen von leer auf 72 % (Scrub). */}
        <div className="relative h-[110px] w-[110px] shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <defs><linearGradient id="lpRingGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={accent} /><stop offset="100%" stopColor={primary} /></linearGradient></defs>
            <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,.08)" strokeWidth="9" fill="none" />
            <circle className="lp-ring" cx="60" cy="60" r="52" stroke="url(#lpRingGrad)" strokeWidth="9" fill="none"
              strokeLinecap="round" strokeDasharray="326.7" strokeDashoffset="91.5"
              style={{ ["--ring-c" as string]: "326.7" }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-lg font-black leading-none text-white/95">Lv 7</div>
              <div className="mt-0.5 text-[10px] font-bold text-white/45">72%</div>
            </div>
          </div>
          {showCosmo && (
            <img src="/cosmo/cosmo-head.png" alt="" loading="lazy" decoding="async"
              className="cosmo-float absolute -right-2 -top-2 h-10 w-10" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2"><Trophy className="h-4 w-4" style={{ color: primary }} /><span className="text-sm font-bold text-white/90">Level 7</span></div>
          <div className="mt-1.5 text-[11px] text-white/50">1,840 / 2,000 XP → Level 8</div>
          <div className="mt-3 flex items-center gap-1.5">
            {tiers.map((t, i) => (
              <div key={i} className="flex flex-1 items-center gap-1.5">
                <div className="flex-1 rounded-lg px-2 py-1.5 text-center text-[10px] font-bold" style={t.on ? { background: `color-mix(in oklch, ${primary} 20%, transparent)`, color: primary } : { background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.35)" }}>{t.n}</div>
                {i < tiers.length - 1 && <span className="text-white/20">›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="lp-rise mt-3 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: `color-mix(in oklch, ${primary} 30%, transparent)`, background: `color-mix(in oklch, ${primary} 8%, transparent)`, animation: "lpRise 1s ease-out .6s both" }}>
        <CheckCircle2 className="h-4 w-4" style={{ color: primary }} /><span className="text-[11px] font-semibold text-white/85">Unlocked: Live trading room</span>
      </div>
    </div>
  );
}

/* ── 6. White-label — the same academy, three partner skins ── */
export function WhitelabelPreview({ primary }: { primary: string }) {
  // Mitte = die EIGENE Marke der aktuellen Seite (primary-Prop) — auf einer
  // Partner-Seite ist "Yours" also wirklich seine Farbe, links/rechts zwei
  // Beispiel-Marken als Kontrast.
  const skins = [
    { name: "Crypto Masters", c: "oklch(0.82 0.2 60)", a: "oklch(0.72 0.16 30)" },
    { name: "Yours", c: primary, a: primary },
    { name: "FX Elite", c: "oklch(0.75 0.18 250)", a: "oklch(0.65 0.2 200)" },
  ];
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0a0d16] p-4 shadow-2xl">
      <PreviewStyles />
      <ChromeStrap label="White-label · your brand" primary={primary} />
      {/* Die drei Marken liegen anfangs gestapelt in der Mitte und FAECHERN
          beim Scrollen auf — dieselbe Plattform, drei Haendeschriften. Die
          mittlere Karte ist "deine" (primary-Ring). */}
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {skins.map((s, i) => (
          <div key={i}
            className={cn("overflow-hidden rounded-xl border bg-[#070a13]",
              i === 0 && "lp-skin-l", i === 2 && "lp-skin-r",
              i === 1 ? "border-transparent" : "border-white/10")}
            style={{
              ...(i === 1 ? { boxShadow: `0 0 0 1.5px ${primary}, 0 0 18px -6px ${primary}` } : {}),
              animation: `lpBob 5s ease-in-out ${1 + i * 0.6}s infinite`,
            }}>
            <div className="h-8" style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${s.a} 45%, #070a13), #070a13)` }} />
            <div className="space-y-1.5 p-2">
              <div className="h-1.5 w-2/3 rounded-full" style={{ background: s.c }} />
              <div className="h-1 w-full rounded-full bg-white/10" />
              <div className="h-1 w-4/5 rounded-full bg-white/10" />
              <div className="mt-1.5 h-3 w-full rounded" style={{ background: `color-mix(in oklch, ${s.c} 30%, transparent)` }} />
              <div className="pt-0.5 text-center text-[8px] font-bold" style={i === 1 ? { color: primary } : { color: "rgba(255,255,255,.5)" }}>{s.name}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-white/50">One platform · every partner their own colours, broker & mascot</p>
    </div>
  );
}
