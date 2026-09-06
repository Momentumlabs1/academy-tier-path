/**
 * SignalStory — "so fühlt sich ein Signal an", als Scroll-Geschichte auf einem
 * kinoreifen iPhone.
 *
 * WARUM (Diego, 06.09.)
 * Der alte Block war ein generisches Telefon mit einem Zufalls-Trade: "zieht
 * nicht". Die erste Story-Fassung hatte den richtigen Ablauf, sah aber aus wie
 * ein Dashboard — dunkle Kästen in Kästen, Mono-Schrift, flach. Diegos Wahl:
 * "Cinematic 3D-Phone" — ein grosses, leicht gekipptes iPhone mit Tiefe, Glow
 * und Reflexionen (Keynote-Look), das sich beim Scrollen aufrichtet, und darauf
 * Apple-Material: Milchglas, weiche Schatten, System-Schrift.
 *
 * DER ABLAUF (vier Stufen, bauen sich beim Scrollen auf)
 *   1. Benachrichtigung fällt als Milchglas-Banner rein
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

      @supports (animation-timeline: view()) {
        .ss-stage { view-timeline: --ss block; }
        /* Das Telefon richtet sich beim Hereinscrollen auf und die Lichtquelle
           wandert mit — das ist die Parallaxe. Danach die vier Stufen. */
        .ss-phone { animation: ssTilt  cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 0% entry 90%; }
        .ss-light { animation: ssLight linear both;                  animation-timeline: --ss; animation-range: entry 0% exit 100%; }
        .ss-notif { animation: ssNotif cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 22% entry 46%; }
        .ss-ask   { animation: ssFade  linear both;                  animation-timeline: --ss; animation-range: entry 40% entry 58%; }
        .ss-yes   { animation: ssFillX cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 52% entry 70%; }
        .ss-done  { animation: ssUp    cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 64% entry 80%; }
        .ss-line  { animation: ssDraw  linear both;                  animation-timeline: --ss; animation-range: entry 68% contain 5%; }
        .ss-area  { animation: ssFade  linear both;                  animation-timeline: --ss; animation-range: entry 68% contain 5%; }
        .ss-tp1   { animation: ssPop   cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 82% entry 94%; }
        .ss-tp2   { animation: ssPop   cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 94% contain 18%; }
        .ss-final { animation: ssUp    cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 98% contain 32%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .ss-phone,.ss-light,.ss-notif,.ss-ask,.ss-yes,.ss-done,.ss-line,.ss-area,.ss-tp1,.ss-tp2,.ss-final,.ss-live,.ss-sheen { animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
        .ss-line { stroke-dashoffset: 0 !important; }
      }
    `}</style>
  );
}

/** Milchglas-Material: eine Karte, die aussieht, als läge sie auf dem Wallpaper. */
const GLASS = "rounded-[20px] border border-white/[0.14] bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_10px_30px_-18px_rgba(0,0,0,.8)] backdrop-blur-xl";

export function SignalStory({ primary, accent, partnerName }: { primary: string; accent?: string; partnerName?: string }) {
  const glow = accent ?? primary;
  return (
    <div className="ss-stage relative mx-auto w-full max-w-[360px] py-6 sm:py-8">
      <Styles />

      {/* Lichtquelle hinter dem Telefon — wandert beim Scrollen (Parallaxe). */}
      <div
        aria-hidden
        className="ss-light pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]"
        style={{ opacity: .55, background: `radial-gradient(closest-side, ${glow} 0%, ${primary}66 40%, transparent 72%)` }}
      />

      {/* ── Das Telefon ─────────────────────────────────────────────────
          Titan-Rahmen (Verlauf), Dynamic Island, Seitentasten, Glasreflex.
          Leicht gekippt; richtet sich beim Hereinscrollen auf. */}
      <div
        className="ss-phone relative mx-auto w-full max-w-[318px] will-change-transform"
        style={{ transformOrigin: "50% 60%" }}
      >
        {/* Seitentasten */}
        <span aria-hidden className="absolute -left-[3px] top-[92px] h-7 w-[3px] rounded-l bg-[#2a2d34]" />
        <span aria-hidden className="absolute -left-[3px] top-[132px] h-12 w-[3px] rounded-l bg-[#2a2d34]" />
        <span aria-hidden className="absolute -left-[3px] top-[190px] h-12 w-[3px] rounded-l bg-[#2a2d34]" />
        <span aria-hidden className="absolute -right-[3px] top-[150px] h-16 w-[3px] rounded-r bg-[#2a2d34]" />

        <div
          className="relative rounded-[46px] p-[10px]"
          style={{
            background: "linear-gradient(160deg, #3a3d45 0%, #14161b 38%, #0b0c10 62%, #2c2f36 100%)",
            boxShadow: `0 40px 90px -30px rgba(0,0,0,.85), 0 30px 70px -40px ${glow}, inset 0 0 0 1px rgba(255,255,255,.08)`,
          }}
        >
          {/* Bildschirm */}
          <div
            className="relative overflow-hidden rounded-[38px] text-white"
            style={{
              background: `radial-gradient(120% 70% at 50% -10%, ${primary}55 0%, transparent 60%), radial-gradient(90% 60% at 100% 100%, ${glow}33 0%, transparent 60%), linear-gradient(180deg, #0c1018 0%, #070910 100%)`,
            }}
          >
            {/* Glasreflex + wandernder Lichtstreifen */}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.10] via-transparent to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className="ss-sheen absolute -inset-y-10 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
            </div>

            {/* Dynamic Island + Statusleiste */}
            <div className="relative flex items-center justify-between px-6 pt-3.5">
              <span className="text-[13px] font-semibold tracking-tight">15:48</span>
              <span className="absolute left-1/2 top-2.5 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]" />
              <span className="flex items-center gap-1.5">
                <span className="h-[9px] w-[14px] rounded-[2px] border border-white/60" style={{ boxShadow: "inset 0 0 0 2px #0c1018, inset 0 0 0 9px rgba(255,255,255,.85)" }} />
              </span>
            </div>

            <div className="relative space-y-3 px-3.5 pb-5 pt-4">
              {/* ── 1 · Die Benachrichtigung ─────────────────────────────── */}
              <div className={`ss-notif ${GLASS} p-3`}>
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-black text-black shadow-[0_6px_14px_-6px_rgba(0,0,0,.7)]"
                    style={{ background: `linear-gradient(160deg, color-mix(in oklch, ${primary} 85%, white), ${primary})` }}
                  >
                    S
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] font-semibold">Signal Desk</span>
                      <span className="text-[11px] text-white/45">now</span>
                    </div>
                    <div className="text-[13px] leading-snug text-white/85">New Gold short just went live — entry, stop and targets inside.</div>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-4 gap-1 rounded-[14px] bg-black/25 px-2.5 py-2 text-[12px] tabular-nums">
                  <div><div className="text-[10px] text-white/40">Entry</div><div className="font-semibold">4 430</div></div>
                  <div><div className="text-[10px] text-white/40">Stop</div><div className="font-semibold" style={{ color: DOWN }}>4 441</div></div>
                  <div><div className="text-[10px] text-white/40">TP1</div><div className="font-semibold" style={{ color: UP }}>4 420</div></div>
                  <div><div className="text-[10px] text-white/40">TP2</div><div className="font-semibold" style={{ color: UP }}>4 410</div></div>
                </div>
              </div>

              {/* ── 2 · Die Frage — und dein Ja ──────────────────────────── */}
              <div className={`ss-ask ${GLASS} p-3`}>
                <div className="text-[14px] font-semibold">Copy this trade?</div>
                <div className="mt-0.5 text-[12px] leading-snug text-white/55">Same entry, same stop, same targets — in your account.</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <span className="flex h-10 items-center justify-center rounded-full bg-white/[0.08] text-[13px] font-semibold text-white/70">
                    Not now
                  </span>
                  <span className="relative flex h-10 items-center justify-center overflow-hidden rounded-full text-[13px] font-bold" style={{ color: "#000", boxShadow: `inset 0 0 0 1.5px ${primary}` }}>
                    <span className="ss-yes absolute inset-0" style={{ background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 88%, white), ${primary})` }} />
                    <span className="relative">Yes, copy</span>
                  </span>
                </div>
                <div className="ss-done mt-2.5 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: UP }}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: UP }} />
                  Copied · short 4 430 · stop 4 441
                </div>
              </div>

              {/* ── 3 · Dein Gewinn läuft ─────────────────────────────────── */}
              <div className={`${GLASS} relative overflow-hidden p-3`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Your position</span>
                  <span className="text-[11px] text-white/40">Gold · short</span>
                </div>
                <div className="relative mt-2 h-[104px]">
                  <svg viewBox="0 0 220 96" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
                    <defs>
                      <linearGradient id="ssGlow" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor={UP} stopOpacity=".32" />
                        <stop offset="1" stopColor={UP} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path className="ss-area" d={`${PATH} L220,96 L0,96 Z`} fill="url(#ssGlow)" stroke="none" />
                    <path className="ss-line" d={PATH} fill="none" stroke={UP} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span
                    className="ss-tp1 absolute left-[42%] top-[54%] rounded-full px-2 py-1 text-[11px] font-semibold backdrop-blur"
                    style={{ color: UP, background: "rgba(7,9,16,.85)", boxShadow: `0 0 0 1px ${UP}66` }}
                  >
                    ✓ TP1 · +100 pips
                  </span>
                  <span
                    className="ss-tp2 absolute right-1 top-0 rounded-full px-2 py-1 text-[11px] font-bold text-black"
                    style={{ background: UP, boxShadow: `0 8px 20px -8px ${UP}` }}
                  >
                    ✓ TP2 · +200 pips
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-white/40">
                  <span>posted 15:48</span><span>TP1 15:58</span><span>TP2 15:59</span>
                </div>
              </div>

              {/* ── 4 · Abschluss ─────────────────────────────────────────── */}
              <div className="ss-final px-1 pb-1 pt-1">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-display text-[28px] font-black leading-none tabular-nums" style={{ color: UP, textShadow: `0 0 24px ${UP}55` }}>+200 pips</div>
                    <div className="mt-1 text-[11px] text-white/55">in 11 minutes · Friday, 4 Sep</div>
                  </div>
                  <div className="text-right text-[10.5px] leading-tight text-white/45">
                    posted before<br />it happened
                  </div>
                </div>
                {partnerName && (
                  <div className="mt-2 text-[11px] leading-snug text-white/45">
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
