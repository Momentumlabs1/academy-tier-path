/**
 * SignalStory — "so fühlt sich ein Signal an", als Scroll-Geschichte im Telefon.
 *
 * WARUM (Diego, 06.09.)
 * Der alte Block war ein generisches Telefon mit einem Zufalls-Trade: "zieht
 * nicht". Was ziehen soll, ist der MOMENT: eine Benachrichtigung kommt rein,
 * du wirst gefragt, ob du kopieren willst, du drückst Ja, der Gewinn läuft.
 * Der Besucher scrollt und erlebt genau diese vier Stufen in dieser Reihenfolge.
 *
 * ZAHLEN SIND ECHT — Desk 04.09.2026, Signal #20 (signal_relays):
 *   15:47 "Sell jetzt" · 15:48 Karte SELL 4 430 / SL 4 441 / TP1 4 420 / TP2 4 410
 *   15:52 "50 Pips & BE ziehen" · 15:58 "TP1 hit ✅" · 15:59 "200 pips profit ✅"
 * Nichts davon ist erfunden; wer nachrechnet, findet es im Kanal.
 *
 * MECHANIK (wie im Bestand, LandingPreviews.tsx)
 * Die Telefon-Wurzel definiert eine BENANNTE View-Timeline (--ss). Die Stufen
 * scrubben daran gestaffelt — view() direkt geht nicht, weil das Telefon
 * overflow-hidden ist und damit selbst als Scroll-Container zählt.
 * Ohne Browser-Unterstützung läuft ein Zeit-Loop mit langer Haltephase;
 * bei prefers-reduced-motion steht sofort der Endzustand. SSR paintet den
 * Endzustand, weil alle Keyframes nur `from` definieren.
 */
const UP = "oklch(0.82 0.17 150)";
const DOWN = "oklch(0.66 0.2 22)";

/** Gewinnkurve (P&L, nicht Kurs): ein Short verdient, wenn der Kurs fällt —
 *  die Linie, die der Besucher sieht, soll trotzdem steigen: es ist SEIN Gewinn. */
const PATH = "M0,88 C18,86 30,84 44,80 S70,74 84,66 S104,50 120,40 S148,26 168,20 S196,10 220,4";

function Styles() {
  return (
    <style>{`
      @keyframes ssNotif { from { opacity: 0; transform: translateY(-28px) scale(.96); } }
      @keyframes ssFade  { from { opacity: 0; } }
      @keyframes ssUp    { from { opacity: 0; transform: translateY(10px); } }
      @keyframes ssFillX { from { transform: scaleX(0); } }
      @keyframes ssPress { 0% { transform: scale(1); } 60% { transform: scale(.96); } 100% { transform: scale(1); } }
      @keyframes ssDraw  { from { stroke-dashoffset: 360; } to { stroke-dashoffset: 0; } }
      @keyframes ssPop   { from { opacity: 0; transform: scale(.6); } 70% { transform: scale(1.1); } to { opacity: 1; transform: scale(1); } }
      @keyframes ssDot   { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.7); opacity: .35; } }

      /* Zeit-Loop als Fallback: 14 s, jede Stufe kommt nacheinander, alles
         bleibt lange stehen, dann von vorn. */
      @keyframes ssLoopNotif { 0%,3% { opacity: 0; transform: translateY(-28px) scale(.96); } 9%,90% { opacity: 1; transform: none; } 96%,100% { opacity: 0; } }
      @keyframes ssLoopFade  { 0%,14% { opacity: 0; } 20%,90% { opacity: 1; } 96%,100% { opacity: 0; } }
      @keyframes ssLoopFill  { 0%,22% { transform: scaleX(0); } 30%,100% { transform: scaleX(1); } }
      @keyframes ssLoopUp    { 0%,30% { opacity: 0; transform: translateY(10px); } 36%,90% { opacity: 1; transform: none; } 96%,100% { opacity: 0; } }
      @keyframes ssLoopDraw  { 0%,36% { stroke-dashoffset: 360; } 60%,100% { stroke-dashoffset: 0; } }
      @keyframes ssLoopPop1  { 0%,48% { opacity: 0; transform: scale(.6); } 53%,90% { opacity: 1; transform: scale(1); } 96%,100% { opacity: 0; } }
      @keyframes ssLoopPop2  { 0%,58% { opacity: 0; transform: scale(.6); } 63%,90% { opacity: 1; transform: scale(1); } 96%,100% { opacity: 0; } }
      @keyframes ssLoopUp2   { 0%,64% { opacity: 0; transform: translateY(10px); } 70%,90% { opacity: 1; transform: none; } 96%,100% { opacity: 0; } }

      .ss-notif { animation: ssLoopNotif 14s ease-out infinite; }
      .ss-ask   { animation: ssLoopFade 14s ease-out infinite; }
      .ss-yes   { transform-origin: left; animation: ssLoopFill 14s cubic-bezier(.22,1,.36,1) infinite; }
      .ss-done  { animation: ssLoopUp 14s ease-out infinite; }
      .ss-line  { stroke-dasharray: 360; animation: ssLoopDraw 14s ease-in-out infinite; }
      .ss-tp1   { animation: ssLoopPop1 14s ease-out infinite; }
      .ss-tp2   { animation: ssLoopPop2 14s ease-out infinite; }
      .ss-final { animation: ssLoopUp2 14s ease-out infinite; }
      .ss-live  { animation: ssDot 1.6s ease-in-out infinite; }

      @supports (animation-timeline: view()) {
        .ss-scope { view-timeline: --ss block; }
        /* Staffelung über den Eintritt des Telefons: Notification sobald das
           obere Drittel sichtbar ist, Frage danach, Ja-Knopf füllt sich,
           Kurve zeichnet, Treffer poppen, Abschluss zuletzt. */
        .ss-notif { animation: ssNotif cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 18% entry 42%; }
        .ss-ask   { animation: ssFade  linear both;                  animation-timeline: --ss; animation-range: entry 36% entry 55%; }
        .ss-yes   { animation: ssFillX cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 48% entry 68%; }
        .ss-done  { animation: ssUp    cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 62% entry 78%; }
        .ss-line  { animation: ssDraw  linear both;                  animation-timeline: --ss; animation-range: entry 66% entry 100%; }
        .ss-tp1   { animation: ssPop   cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 80% entry 92%; }
        .ss-tp2   { animation: ssPop   cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 92% contain 15%; }
        .ss-final { animation: ssUp    cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 96% contain 30%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .ss-notif,.ss-ask,.ss-yes,.ss-done,.ss-line,.ss-tp1,.ss-tp2,.ss-final,.ss-live { animation: none !important; opacity: 1 !important; transform: none !important; }
        .ss-line { stroke-dashoffset: 0 !important; }
      }
    `}</style>
  );
}

export function SignalStory({ primary, accent, partnerName }: { primary: string; accent?: string; partnerName?: string }) {
  const glow = accent ?? primary;
  return (
    <div
      className="ss-scope relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#0a0d16] text-white shadow-2xl"
      style={{ boxShadow: `0 30px 80px -30px ${glow}55, 0 0 0 1px rgba(255,255,255,.04)` }}
    >
      <Styles />
      {/* Notch + Statuszeile */}
      <div className="flex items-center justify-center pt-2.5">
        <span className="h-[18px] w-24 rounded-full bg-black/80 ring-1 ring-white/10" />
      </div>
      <div className="flex items-center justify-between px-4 pb-2 pt-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          <span className="ss-live h-1.5 w-1.5 rounded-full" style={{ background: primary }} />
          Signals · live
        </span>
        <span className="font-mono text-[10px] text-white/35">15:48</span>
      </div>

      <div className="space-y-2.5 px-3 pb-4">
        {/* ── 1 · Die Benachrichtigung ───────────────────────────────── */}
        <div className="ss-notif rounded-2xl border border-white/12 bg-white/[0.07] p-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-black text-black"
              style={{ background: primary }}
            >
              S
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold text-white/90">Signal Desk</span>
                <span className="text-[9px] text-white/40">now</span>
              </div>
              <div className="truncate text-[11px] text-white/75">New Gold short just went live</div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-xl bg-black/30 p-2 font-mono text-[9.5px]">
            <div><div className="text-white/40">Entry</div><div className="text-white">4 430</div></div>
            <div><div className="text-white/40">SL</div><div style={{ color: DOWN }}>4 441</div></div>
            <div><div className="text-white/40">TP1</div><div style={{ color: UP }}>4 420</div></div>
            <div><div className="text-white/40">TP2</div><div style={{ color: UP }}>4 410</div></div>
          </div>
        </div>

        {/* ── 2 · Die Frage — und dein Ja ─────────────────────────────── */}
        <div className="ss-ask rounded-2xl border border-white/12 bg-white/[0.04] p-2.5">
          <div className="text-[12px] font-bold text-white/90">Copy this trade?</div>
          <div className="mt-0.5 text-[10.5px] text-white/50">Same entry, same stop, same targets — in your account.</div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <span className="flex h-9 items-center justify-center rounded-full border border-white/12 text-[11px] font-semibold text-white/55">
              Not now
            </span>
            <span className="relative flex h-9 items-center justify-center overflow-hidden rounded-full border text-[11px] font-black" style={{ borderColor: primary, color: "#000" }}>
              <span className="ss-yes absolute inset-0" style={{ background: primary }} />
              <span className="relative">Yes, copy ✓</span>
            </span>
          </div>
          <div className="ss-done mt-2 flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: UP }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: UP }} />
            Copied · short 4 430 · stop 4 441
          </div>
        </div>

        {/* ── 3 · Dein Gewinn läuft ────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-black/30 p-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Your position</span>
            <span className="font-mono text-[10px] text-white/35">Gold · short</span>
          </div>
          <div className="relative mt-1.5 h-[96px]">
            <svg viewBox="0 0 220 96" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="ssGlow" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={UP} stopOpacity=".28" />
                  <stop offset="1" stopColor={UP} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="ss-line" d={PATH} fill="none" stroke={UP} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path className="ss-line" d={`${PATH} L220,96 L0,96 Z`} fill="url(#ssGlow)" stroke="none" style={{ animationName: "ssLoopFade" }} />
            </svg>
            <span
              className="ss-tp1 absolute left-[46%] top-[52%] rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold"
              style={{ color: UP, borderColor: `${UP}`, background: "#0a0d16" }}
            >
              ✓ TP1 · +100 pips
            </span>
            <span
              className="ss-tp2 absolute right-1 top-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-black text-black"
              style={{ background: UP }}
            >
              ✓ TP2 · +200 pips
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-white/35">
            <span>posted 15:48</span><span>TP1 15:58</span><span>TP2 15:59</span>
          </div>
        </div>

        {/* ── 4 · Abschluss ────────────────────────────────────────────── */}
        <div className="ss-final rounded-2xl px-1 pb-1 pt-1.5">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-[26px] font-black leading-none tabular-nums" style={{ color: UP }}>+200 pips</div>
              <div className="mt-1 text-[10px] text-white/50">in 11 minutes · Friday, 4 Sep</div>
            </div>
            <div className="text-right text-[9.5px] leading-tight text-white/45">
              posted before<br />it happened
            </div>
          </div>
          {partnerName && (
            <div className="mt-2 text-[10px] text-white/40">
              That's what {partnerName}'s followers get. Every day the desk trades.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
