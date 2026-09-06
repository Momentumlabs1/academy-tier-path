/**
 * SignalStory — "so fühlt sich ein Signal an", als Scroll-Geschichte auf einem
 * kinoreifen iPhone.
 *
 * WARUM (Diego, 06.09.)
 * Der alte Block war ein generisches Telefon mit einem Zufalls-Trade: "zieht
 * nicht". Die erste Story-Fassung hatte den richtigen Ablauf, sah aber aus wie
 * ein Dashboard. Diegos Wahl: "Cinematic 3D-Phone" — ein grosses, leicht
 * gekipptes iPhone mit Tiefe, Glow und Reflexionen, das sich beim Scrollen
 * aufrichtet, und darauf Apple-Material: Milchglas, weiche Schatten,
 * System-Schrift.
 *
 * ZWEI TÖNE (Diego, 06.09.: "Handy soll mehr aussehen wie sein Content")
 * Dunkle Marken (Cosmos, Zeko) bekommen den dunklen Screen. Helle Marken
 * (SmartEggface, Agent Stick — Tinte auf Papier) bekommen ihr PAPIER als
 * Screen: cremefarbener Hintergrund, Tinte statt Weiss, weisse iOS-Karten wie
 * im Light Mode, die Akzentfarbe als Marker und Kurve, helles Titan-Gehäuse.
 * Das Telefon soll aussehen, als käme es aus dem Reel, nicht aus unserem Haus.
 *
 * DER ABLAUF (vier Stufen, bauen sich beim Scrollen auf)
 *   1. Benachrichtigung fällt als Banner rein
 *   2. "Copy this trade?" — der Ja-Knopf füllt sich, "Copied" erscheint
 *   3. Gewinnkurve zeichnet sich steil, TP1/TP2 poppen
 *   4. "+200 pips" — posted before it happened
 *
 * ZAHLEN SIND ECHT — Desk 04.09.2026, Signal #20 (signal_relays):
 *   15:47 "Sell jetzt" · 15:48 Karte SELL 4 430 / SL 4 441 / TP1 4 420 / TP2 4 410
 *   15:52 "50 Pips & BE ziehen" · 15:58 "TP1 hit ✅" · 15:59 "200 pips profit ✅"
 *
 * MECHANIK
 * Die Bühne (.ss-stage, KEIN overflow-hidden) definiert eine benannte
 * View-Timeline (--ss); Telefon-Neigung, Lichtquelle und alle Stufen scrubben
 * daran. view() direkt ginge nicht: das Telefon selbst ist overflow-hidden und
 * zählt damit als Scroll-Container ohne Scrollweg (siehe LandingPreviews).
 * Ohne Unterstützung läuft ein Zeit-Loop mit langer Haltephase; bei
 * prefers-reduced-motion steht sofort der Endzustand (alle Keyframes nur `from`).
 */

const UP = "oklch(0.82 0.17 150)";
const DOWN = "oklch(0.66 0.2 22)";
const INK = "#141210";

/** Gewinnkurve (P&L, nicht Kurs): ein Short verdient, wenn der Kurs fällt —
 *  die Linie, die der Besucher sieht, soll trotzdem steigen: es ist SEIN Gewinn. */
const PATH = "M0,88 C18,86 30,84 44,80 S70,74 84,66 S104,50 120,40 S148,26 168,20 S196,10 220,4";

function Styles() {
  return (
    <style>{`
      @keyframes ssTilt  { from { transform: perspective(1400px) rotateY(-16deg) rotateX(7deg) translateY(28px); } }
      @keyframes ssLight { from { transform: translate(-30%, 30%) scale(.8); opacity: .35; } }
      @keyframes ssNotif { from { opacity: 0; transform: translateY(-34px) scale(.94); filter: blur(6px); } }
      @keyframes ssFade  { from { opacity: 0; } }
      @keyframes ssUp    { from { opacity: 0; transform: translateY(12px); } }
      @keyframes ssFillX { from { transform: scaleX(0); } }
      @keyframes ssDraw  { from { stroke-dashoffset: 360; } to { stroke-dashoffset: 0; } }
      @keyframes ssPop   { from { opacity: 0; transform: scale(.5); } 70% { transform: scale(1.12); } to { opacity: 1; transform: scale(1); } }
      @keyframes ssDot   { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.7); opacity: .35; } }
      @keyframes ssSheen { 0%,60% { transform: translateX(-140%) rotate(12deg); } 100% { transform: translateX(160%) rotate(12deg); } }
      /* Der Finger: kommt gross und durchsichtig, drueckt (kleiner), verschwindet. */
      @keyframes ssTap   { 0% { opacity: 0; transform: translate(-50%,-50%) scale(1.6); } 35% { opacity: .95; transform: translate(-50%,-50%) scale(1); } 60% { opacity: .95; transform: translate(-50%,-50%) scale(.82); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(1.1); } }
      @keyframes ssPing  { 0% { transform: scale(.9); opacity: .9; } 100% { transform: scale(2.1); opacity: 0; } }
      @keyframes ssLoopTap { 0%,20% { opacity: 0; transform: translate(-50%,-50%) scale(1.6); } 24% { opacity: .95; transform: translate(-50%,-50%) scale(1); } 28% { transform: translate(-50%,-50%) scale(.82); } 32%,100% { opacity: 0; transform: translate(-50%,-50%) scale(1.1); } }

      /* Zeit-Loop als Fallback: 14 s, Stufen nacheinander, lange Haltephase. */
      @keyframes ssLoopNotif { 0%,3% { opacity: 0; transform: translateY(-34px) scale(.94); } 9%,90% { opacity: 1; transform: none; } 96%,100% { opacity: 0; } }
      @keyframes ssLoopFade  { 0%,14% { opacity: 0; } 20%,90% { opacity: 1; } 96%,100% { opacity: 0; } }
      @keyframes ssLoopFill  { 0%,22% { transform: scaleX(0); } 30%,100% { transform: scaleX(1); } }
      @keyframes ssLoopUp    { 0%,30% { opacity: 0; transform: translateY(12px); } 36%,90% { opacity: 1; transform: none; } 96%,100% { opacity: 0; } }
      @keyframes ssLoopDraw  { 0%,36% { stroke-dashoffset: 360; } 60%,100% { stroke-dashoffset: 0; } }
      @keyframes ssLoopPop1  { 0%,48% { opacity: 0; transform: scale(.5); } 53%,90% { opacity: 1; transform: scale(1); } 96%,100% { opacity: 0; } }
      @keyframes ssLoopPop2  { 0%,58% { opacity: 0; transform: scale(.5); } 63%,90% { opacity: 1; transform: scale(1); } 96%,100% { opacity: 0; } }
      @keyframes ssLoopUp2   { 0%,64% { opacity: 0; transform: translateY(12px); } 70%,90% { opacity: 1; transform: none; } 96%,100% { opacity: 0; } }

      .ss-phone { transform: perspective(1400px) rotateY(-9deg) rotateX(4deg); }
      .ss-notif { animation: ssLoopNotif 14s ease-out infinite; }
      .ss-ask   { animation: ssLoopFade 14s ease-out infinite; }
      .ss-yes   { transform-origin: left; animation: ssLoopFill 14s cubic-bezier(.22,1,.36,1) infinite; }
      .ss-done  { animation: ssLoopUp 14s ease-out infinite; }
      .ss-line  { stroke-dasharray: 360; animation: ssLoopDraw 14s ease-in-out infinite; }
      .ss-area  { animation: ssLoopFade 14s ease-in-out infinite; }
      .ss-tp1   { animation: ssLoopPop1 14s ease-out infinite; }
      .ss-tp2   { animation: ssLoopPop2 14s ease-out infinite; }
      .ss-final { animation: ssLoopUp2 14s ease-out infinite; }
      .ss-live  { animation: ssDot 1.6s ease-in-out infinite; }
      .ss-sheen { animation: ssSheen 9s ease-in-out infinite; }
      .ss-tap   { animation: ssLoopTap 14s ease-out infinite; }
      .ss-ping  { animation: ssPing 1.8s ease-out infinite; }
      .ss-money { animation: ssLoopUp2 14s ease-out infinite; }

      @supports (animation-timeline: view()) {
        .ss-stage { view-timeline: --ss block; }
        /* Diego, 06.09.: "etwas zu spaet" — alles kommt frueh und dicht;
           die letzte Stufe steht, sobald das Telefon ganz im Bild ist. */
        .ss-phone { animation: ssTilt  cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 0% entry 70%; }
        .ss-light { animation: ssLight linear both;                  animation-timeline: --ss; animation-range: entry 0% exit 100%; }
        .ss-notif { animation: ssNotif cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 8% entry 26%; }
        .ss-ask   { animation: ssFade  linear both;                  animation-timeline: --ss; animation-range: entry 20% entry 34%; }
        .ss-yes   { animation: ssFillX cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 30% entry 44%; }
        .ss-done  { animation: ssUp    cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 40% entry 52%; }
        .ss-line  { animation: ssDraw  linear both;                  animation-timeline: --ss; animation-range: entry 44% entry 76%; }
        .ss-area  { animation: ssFade  linear both;                  animation-timeline: --ss; animation-range: entry 44% entry 76%; }
        .ss-tp1   { animation: ssPop   cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 60% entry 72%; }
        .ss-tp2   { animation: ssPop   cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 72% entry 84%; }
        .ss-final { animation: ssUp    cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 80% entry 96%; }
        .ss-tap   { animation: ssTap   ease-out both;                animation-timeline: --ss; animation-range: entry 26% entry 46%; }
        .ss-money { animation: ssUp    cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 74% entry 88%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .ss-phone,.ss-light,.ss-notif,.ss-ask,.ss-yes,.ss-done,.ss-line,.ss-area,.ss-tp1,.ss-tp2,.ss-final,.ss-live,.ss-sheen,.ss-money,.ss-ping { animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
        .ss-tap { animation: none !important; opacity: 0 !important; }
        .ss-line { stroke-dashoffset: 0 !important; }
      }
    `}</style>
  );
}

type Tone = "dark" | "light";

/**
 * onPrimary = Schriftfarbe AUF der Partnerfarbe (die Bruecke rechnet den
 * Kontrast als knopfText und reicht ihn durch). tone = dunkler Screen (Haus)
 * oder Papier-Screen (helle Marken) — folgt tenant.theme.
 */
export function SignalStory({
  primary, accent, partnerName, onPrimary = "#000", tone = "dark",
}: { primary: string; accent?: string; partnerName?: string; onPrimary?: string; tone?: Tone }) {
  const hell = tone === "light";
  const glow = accent ?? primary;
  /** Akzent fuer Kurve/Marker im hellen Modus: die Markenfarbe, die NICHT Tinte
   *  ist (SmartEggface: Gelb). Ist auch der Akzent Tinte (Agent Stick), bleibt
   *  Gruen — Tinte als Gewinnfarbe liest niemand. */
  const accentIstTinte = !accent || accent.toLowerCase() === INK || accent.toLowerCase() === primary.toLowerCase();
  const gewinn = hell && !accentIstTinte ? accent! : UP;

  const c = hell
    ? {
        // Papier-Screen
        screen: `radial-gradient(120% 70% at 50% -10%, ${glow}55 0%, transparent 60%), linear-gradient(180deg, #FBF8F0 0%, #F1ECDF 100%)`,
        frame: "linear-gradient(160deg, #f6f3ec 0%, #d8d3c8 38%, #bdb7ab 62%, #efebe2 100%)",
        frameShadow: `0 40px 90px -30px rgba(20,18,16,.45), 0 30px 70px -40px ${glow}, inset 0 0 0 1px rgba(255,255,255,.7)`,
        text: INK, muted: "rgba(20,18,16,.55)", faint: "rgba(20,18,16,.38)",
        card: "rounded-[20px] border border-white/80 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_10px_30px_-18px_rgba(20,18,16,.35)] backdrop-blur-xl",
        cardDeep: "rgba(20,18,16,.06)",
        neutral: "rgba(20,18,16,.08)", neutralText: "rgba(20,18,16,.7)",
        reflex: "bg-gradient-to-br from-white/[0.55] via-transparent to-transparent",
        sheen: "via-white/[0.35]",
        battery: INK, island: "#0b0c10",
        glowOpacity: .5,
      }
    : {
        screen: `radial-gradient(120% 70% at 50% -10%, ${primary}55 0%, transparent 60%), radial-gradient(90% 60% at 100% 100%, ${glow}33 0%, transparent 60%), linear-gradient(180deg, #0c1018 0%, #070910 100%)`,
        frame: "linear-gradient(160deg, #3a3d45 0%, #14161b 38%, #0b0c10 62%, #2c2f36 100%)",
        frameShadow: `0 40px 90px -30px rgba(0,0,0,.85), 0 30px 70px -40px ${glow}, inset 0 0 0 1px rgba(255,255,255,.08)`,
        text: "#fff", muted: "rgba(255,255,255,.55)", faint: "rgba(255,255,255,.4)",
        card: "rounded-[20px] border border-white/[0.14] bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_10px_30px_-18px_rgba(0,0,0,.8)] backdrop-blur-xl",
        cardDeep: "rgba(0,0,0,.25)",
        neutral: "rgba(255,255,255,.08)", neutralText: "rgba(255,255,255,.7)",
        reflex: "bg-gradient-to-br from-white/[0.10] via-transparent to-transparent",
        sheen: "via-white/[0.07]",
        battery: "#fff", island: "#000",
        glowOpacity: .55,
      };

  /** Schritt-Etikett auf jeder Karte — damit der Ablauf (Signal → kopieren →
   *  verdienen) nicht in der Optik untergeht (Diego, 06.09.). */
  const Step = ({ n, t }: { n: number; t: string }) => (
    <div className="mb-2 flex items-center gap-2">
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-black tabular-nums"
        style={hell ? { background: INK, color: "#fff" } : { background: primary, color: onPrimary }}
      >
        {n}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: hell ? INK : primary }}>{t}</span>
    </div>
  );

  return (
    <div className="ss-stage relative mx-auto w-full max-w-[360px] py-6 sm:py-8">
      <Styles />

      {/* Lichtquelle hinter dem Telefon — wandert beim Scrollen (Parallaxe). */}
      <div
        aria-hidden
        className="ss-light pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]"
        style={{ opacity: c.glowOpacity, background: `radial-gradient(closest-side, ${glow} 0%, ${hell ? glow : primary}66 40%, transparent 72%)` }}
      />

      {/* ── Das Telefon ─────────────────────────────────────────────────
          Titan-Rahmen (dunkel oder hell), Dynamic Island, Seitentasten,
          Glasreflex. Leicht gekippt; richtet sich beim Hereinscrollen auf. */}
      <div className="ss-phone relative mx-auto w-full max-w-[318px] will-change-transform" style={{ transformOrigin: "50% 60%" }}>
        {[["-left-[3px]", "top-[92px]", "h-7", "rounded-l"], ["-left-[3px]", "top-[132px]", "h-12", "rounded-l"], ["-left-[3px]", "top-[190px]", "h-12", "rounded-l"], ["-right-[3px]", "top-[150px]", "h-16", "rounded-r"]].map(([x, y, h, r]) => (
          <span key={x + y} aria-hidden className={`absolute ${x} ${y} ${h} w-[3px] ${r}`} style={{ background: hell ? "#b9b3a7" : "#2a2d34" }} />
        ))}

        <div className="relative rounded-[46px] p-[10px]" style={{ background: c.frame, boxShadow: c.frameShadow }}>
          {/* Bildschirm */}
          <div className="relative overflow-hidden rounded-[38px]" style={{ background: c.screen, color: c.text }}>
            <div aria-hidden className={`pointer-events-none absolute inset-0 ${c.reflex}`} />
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className={`ss-sheen absolute -inset-y-10 left-0 w-1/3 bg-gradient-to-r from-transparent ${c.sheen} to-transparent`} />
            </div>

            {/* Dynamic Island + Statusleiste */}
            <div className="relative flex items-center justify-between px-6 pt-3.5">
              <span className="text-[13px] font-semibold tracking-tight">15:48</span>
              <span className="absolute left-1/2 top-2.5 h-[26px] w-[92px] -translate-x-1/2 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]" style={{ background: c.island }} />
              <span className="h-[9px] w-[14px] rounded-[2px]" style={{ border: `1px solid ${c.battery}99`, boxShadow: `inset 0 0 0 2px transparent, inset 0 0 0 9px ${c.battery}d9` }} />
            </div>

            <div className="relative space-y-3 px-3.5 pb-5 pt-4">
              {/* ── 1 · Die Benachrichtigung ─────────────────────────────── */}
              <div className={`ss-notif ${c.card} p-3`}>
                <Step n={1} t="A signal lands" />
                <div className="flex items-start gap-2.5">
                  <span className="relative shrink-0">
                    <span aria-hidden className="ss-ping absolute inset-0 rounded-[10px]" style={{ boxShadow: `0 0 0 2px ${hell ? INK : primary}` }} />
                    <span
                      className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-black shadow-[0_6px_14px_-6px_rgba(0,0,0,.45)]"
                      style={{ color: onPrimary, background: `linear-gradient(160deg, color-mix(in oklch, ${primary} 85%, white), ${primary})` }}
                    >
                      S
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] font-semibold">Signal Desk</span>
                      <span className="text-[11px]" style={{ color: c.faint }}>now</span>
                    </div>
                    <div className="text-[13px] leading-snug" style={{ color: hell ? "rgba(20,18,16,.8)" : "rgba(255,255,255,.85)" }}>
                      New Gold short just went live — entry, stop and targets inside.
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-4 gap-1 rounded-[14px] px-2.5 py-2 text-[12px] tabular-nums" style={{ background: c.cardDeep }}>
                  <div><div className="text-[10px]" style={{ color: c.faint }}>Entry</div><div className="font-semibold">4 430</div></div>
                  <div><div className="text-[10px]" style={{ color: c.faint }}>Stop</div><div className="font-semibold" style={{ color: DOWN }}>4 441</div></div>
                  <div><div className="text-[10px]" style={{ color: c.faint }}>TP1</div><div className="font-semibold" style={{ color: hell ? INK : UP }}>4 420</div></div>
                  <div><div className="text-[10px]" style={{ color: c.faint }}>TP2</div><div className="font-semibold" style={{ color: hell ? INK : UP }}>4 410</div></div>
                </div>
              </div>

              {/* ── 2 · Die Frage — und dein Ja ──────────────────────────── */}
              <div className={`ss-ask ${c.card} p-3`}>
                <Step n={2} t="You tap copy" />
                <div className="text-[14px] font-semibold">Copy this trade?</div>
                <div className="mt-0.5 text-[12px] leading-snug" style={{ color: c.muted }}>Same entry, same stop, same targets — in your account.</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <span className="flex h-10 items-center justify-center rounded-full text-[13px] font-semibold" style={{ background: c.neutral, color: c.neutralText }}>
                    Not now
                  </span>
                  <span className="relative flex h-10 items-center justify-center overflow-hidden rounded-full text-[13px] font-bold" style={{ color: onPrimary, boxShadow: `inset 0 0 0 1.5px ${onPrimary === "#fff" ? "rgba(255,255,255,.35)" : primary}` }}>
                    <span className="ss-yes absolute inset-0" style={{ background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 88%, white), ${primary})` }} />
                    <span className="relative">Yes, copy</span>
                    {/* Der Finger, der drueckt — die Apple-Demo-Geste. */}
                    <span
                      aria-hidden
                      className="ss-tap pointer-events-none absolute left-1/2 top-1/2 h-9 w-9 rounded-full"
                      style={{ background: "rgba(255,255,255,.55)", boxShadow: "0 0 0 2px rgba(255,255,255,.8), 0 8px 24px rgba(0,0,0,.35)" }}
                    />
                  </span>
                </div>
                <div className="ss-done mt-2.5 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: hell ? INK : UP }}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: gewinn }} />
                  Copied · short 4 430 · stop 4 441
                </div>
              </div>

              {/* ── 3 · Dein Gewinn läuft ─────────────────────────────────── */}
              <div className={`${c.card} relative overflow-hidden p-3`}>
                <div className="flex items-start justify-between">
                  <Step n={3} t="You earn" />
                  <span className="text-[11px]" style={{ color: c.faint }}>Gold · short</span>
                </div>
                <div className="relative mt-2 h-[104px]">
                  <svg viewBox="0 0 220 96" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
                    <defs>
                      <linearGradient id="ssGlow" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor={gewinn} stopOpacity={hell ? ".45" : ".32"} />
                        <stop offset="1" stopColor={gewinn} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path className="ss-area" d={`${PATH} L220,96 L0,96 Z`} fill="url(#ssGlow)" stroke="none" />
                    <path className="ss-line" d={PATH} fill="none" stroke={hell ? INK : UP} strokeWidth={hell ? "3" : "2.6"} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {/* Marker-Stil im hellen Modus: Gelb hinter Tinte, wie ein Textmarker. */}
                  <span
                    className="ss-tp1 absolute left-[42%] top-[54%] rounded-full px-2 py-1 text-[11px] font-semibold backdrop-blur"
                    style={hell ? { color: INK, background: gewinn } : { color: UP, background: "rgba(7,9,16,.85)", boxShadow: `0 0 0 1px ${UP}66` }}
                  >
                    ✓ TP1 · +100 pips
                  </span>
                  <span
                    className="ss-tp2 absolute right-1 top-0 rounded-full px-2 py-1 text-[11px] font-bold"
                    style={hell ? { color: "#fff", background: INK, boxShadow: `0 8px 20px -8px ${INK}` } : { color: "#000", background: UP, boxShadow: `0 8px 20px -8px ${UP}` }}
                  >
                    ✓ TP2 · +200 pips
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10.5px]" style={{ color: c.faint }}>
                  <span>posted 15:48</span><span>TP1 15:58</span><span>TP2 15:59</span>
                </div>
                {/* Das Geld, das dahintersteht — echter Trade, Beispielgroesse 0,1 Lot
                    (Gold: 1 Pip = 1 $ bei 0,1 Lot). Als Beispiel gekennzeichnet, kein
                    Versprechen. */}
                <div
                  className="ss-money mt-2.5 flex items-center justify-between rounded-[14px] px-2.5 py-2 text-[12px] tabular-nums"
                  style={{ background: c.cardDeep }}
                >
                  <span style={{ color: c.muted }}>Your account</span>
                  <span className="font-semibold">
                    <span style={{ color: c.faint }}>$1,000</span>
                    <span style={{ color: c.faint }}> → </span>
                    <span style={hell ? { background: `linear-gradient(transparent 60%, ${gewinn} 60%)`, padding: "0 3px" } : { color: UP }}>$1,200</span>
                  </span>
                </div>
                <div className="mt-1 text-right text-[9.5px]" style={{ color: c.faint }}>example · 0.1 lot</div>
              </div>

              {/* ── 4 · Abschluss ─────────────────────────────────────────── */}
              <div className="ss-final px-1 pb-1 pt-1">
                <div className="flex items-end justify-between">
                  <div>
                    <div
                      className="inline-block font-display text-[28px] font-black leading-none tabular-nums"
                      style={hell
                        ? { color: INK, background: `linear-gradient(transparent 55%, ${gewinn} 55%)`, padding: "0 4px" }
                        : { color: UP, textShadow: `0 0 24px ${UP}55` }}
                    >
                      +200 pips
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: c.muted }}>= +$200 at 0.1 lot · in 11 minutes · Friday, 4 Sep</div>
                  </div>
                  <div className="text-right text-[10.5px] leading-tight" style={{ color: c.faint }}>
                    posted before<br />it happened
                  </div>
                </div>
                {partnerName && (
                  <div className="mt-2 text-[11px] leading-snug" style={{ color: c.faint }}>
                    That's what {partnerName}'s followers get. Every day the desk trades.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
