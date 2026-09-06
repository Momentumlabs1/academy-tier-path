/**
 * SignalStory — drei Bilder, ein Gedanke pro Bild.
 *
 * WARUM DIESER NEUENTWURF (Diego, 06.09., dritte Runde)
 * "Zu viel Text, zu viele Zahlen, zu viel Info, der Chart unten — nicht
 * scanbar. Es soll aussehen, als haette ein Mensch fuenf Tage ueber die Logik
 * des Designs nachgedacht." Die vorigen Fassungen stapelten drei Karten mit
 * Level-Tabelle, Zeitstempeln und Achsen in EIN Telefon. Jetzt gilt:
 *
 *   EIN Telefon, das beim Scrollen stehen bleibt (sticky). Der Bildschirm
 *   wechselt drei Szenen, jede zeigt genau EIN Ding:
 *     1  Lockscreen, eine Benachrichtigung faellt rein.   "A signal lands."
 *     2  Ein grosser Knopf, ein Finger drueckt ihn.        "You copy it."
 *     3  Eine grosse Zahl.                                "You earn."
 *   Der Satz steht ueber dem Telefon und wechselt mit der Szene. Zahlen im
 *   Bild: die Uhrzeit, "+$200", sonst nichts. Alles andere steht darunter
 *   in den drei Punkten der Seite.
 *
 * ZAHLEN SIND ECHT — Desk 04.09.2026, Signal #20 (signal_relays): Sell 4 430 →
 * TP1 15:58, "200 pips profit" 15:59. 200 Gold-Pips bei 0,1 Lot = 200 $ —
 * deshalb "+$200", als Beispiel (0,1 Lot) beschriftet.
 *
 * MECHANIK
 * Die Buehne (.ss-stage) ist 2,3 Bildschirmhoehen hoch und traegt die benannte
 * View-Timeline --ss. Waehrend sie den Viewport fuellt ("contain"), steht das
 * Telefon sticky, und die Szenen scrubben ueber contain 0 % → 100 %. Ohne
 * Scroll-Timelines laeuft ein 12-s-Zeit-Loop; bei prefers-reduced-motion
 * steht Szene 3. Basis-CSS blendet Szene 1+2 aus, damit SSR nie drei Szenen
 * uebereinander malt.
 */

const UP = "oklch(0.82 0.17 150)";
const INK = "#141210";

function Styles() {
  return (
    <style>{`
      /* ── Scrub-Keyframes: from = Anfang, to = Ende (fuer Auftritt+Abgang beide) ── */
      /* Das Telefon dreht sich ueber die ganze Story im Raum (Apple-Keynote):
         kommt von links gekippt, steht bei Szene 2 frontal, dreht bei Szene 3
         leicht nach rechts und kommt naeher. Die Lichtquelle wandert gegenlaeufig. */
      @keyframes ssTilt  {
        0%   { transform: perspective(1400px) rotateY(-18deg) rotateX(8deg) translateY(30px) scale(.94); }
        30%  { transform: perspective(1400px) rotateY(-9deg)  rotateX(4deg) translateY(6px)  scale(.98); }
        55%  { transform: perspective(1400px) rotateY(0deg)   rotateX(0deg) translateY(0)    scale(1); }
        100% { transform: perspective(1400px) rotateY(9deg)   rotateX(-3deg) translateY(-6px) scale(1.03); }
      }
      @keyframes ssLightMove { from { transform: translate(-70%, -40%) scale(.9); } to { transform: translate(-30%, -60%) scale(1.15); } }
      @keyframes ssIn    { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
      @keyframes ssOut   { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-14px); } }
      @keyframes ssBanner{ from { opacity: 0; transform: translateY(-40px) scale(.94); filter: blur(8px); } to { opacity: 1; transform: none; filter: none; } }
      @keyframes ssScene { 0% { opacity: 0; transform: scale(.97); } 18% { opacity: 1; transform: none; } 82% { opacity: 1; transform: none; } 100% { opacity: 0; transform: scale(1.03); } }
      @keyframes ssTap   { 0% { opacity: 0; transform: translate(-50%,-50%) scale(1.7); } 40% { opacity: .95; transform: translate(-50%,-50%) scale(1); } 65% { opacity: .95; transform: translate(-50%,-50%) scale(.8); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(1.15); } }
      @keyframes ssPress { 0%,60% { transform: scale(1); } 75% { transform: scale(.94); } 100% { transform: scale(1); } }
      @keyframes ssCount { from { opacity: 0; transform: translateY(18px) scale(.9); letter-spacing: .04em; } to { opacity: 1; transform: none; letter-spacing: -.03em; } }
      @keyframes ssDraw  { from { stroke-dashoffset: 420; } to { stroke-dashoffset: 0; } }
      @keyframes ssPing  { 0% { transform: scale(.9); opacity: .8; } 100% { transform: scale(2.2); opacity: 0; } }

      /* ── Zeit-Loop (Fallback), 12 s: Szene 1 (0–33 %), 2 (33–66 %), 3 (66–100 %) ── */
      @keyframes ssL1  { 0%,2% { opacity: 0; } 6%,30% { opacity: 1; } 34%,100% { opacity: 0; } }
      @keyframes ssL2  { 0%,34% { opacity: 0; } 38%,63% { opacity: 1; } 67%,100% { opacity: 0; } }
      @keyframes ssL3  { 0%,67% { opacity: 0; } 71%,97% { opacity: 1; } 100% { opacity: 0; } }
      @keyframes ssLBanner { 0%,6% { opacity: 0; transform: translateY(-40px) scale(.94); } 12%,30% { opacity: 1; transform: none; } 34%,100% { opacity: 0; } }
      @keyframes ssLTap { 0%,42% { opacity: 0; transform: translate(-50%,-50%) scale(1.7); } 46% { opacity: .95; transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(.8); } 54%,100% { opacity: 0; transform: translate(-50%,-50%) scale(1.15); } }
      @keyframes ssLCopied { 0%,52% { opacity: 0; transform: scale(.8); } 56%,63% { opacity: 1; transform: none; } 67%,100% { opacity: 0; } }
      @keyframes ssLCount { 0%,70% { opacity: 0; transform: translateY(18px) scale(.9); } 78%,97% { opacity: 1; transform: none; } 100% { opacity: 0; } }
      @keyframes ssLDraw { 0%,68% { stroke-dashoffset: 420; } 88%,100% { stroke-dashoffset: 0; } }

      /* Basis: Szene 1+2 und ihre Saetze sind AUS, Szene 3 ist AN (SSR, Reduced Motion). */
      .ss-s1, .ss-s2, .ss-c1, .ss-c2, .ss-banner, .ss-tap, .ss-copied { opacity: 0; }
      .ss-s3, .ss-c3 { opacity: 1; }
      .ss-phone { transform: perspective(1400px) rotateY(-7deg) rotateX(3deg); }
      .ss-line  { stroke-dasharray: 420; }
      .ss-ping  { animation: ssPing 1.8s ease-out infinite; }

      /* Fallback-Loop */
      .ss-s1     { animation: ssL1 12s linear infinite; }
      .ss-c1     { animation: ssL1 12s linear infinite; }
      .ss-banner { animation: ssLBanner 12s cubic-bezier(.22,1,.36,1) infinite; }
      .ss-s2     { animation: ssL2 12s linear infinite; }
      .ss-c2     { animation: ssL2 12s linear infinite; }
      .ss-tap    { animation: ssLTap 12s ease-out infinite; }
      .ss-copied { animation: ssLCopied 12s cubic-bezier(.22,1,.36,1) infinite; }
      .ss-s3     { animation: ssL3 12s linear infinite; }
      .ss-c3     { animation: ssL3 12s linear infinite; }
      .ss-count  { animation: ssLCount 12s cubic-bezier(.22,1,.36,1) infinite; }
      .ss-line   { animation: ssLDraw 12s ease-in-out infinite; }

      @supports (animation-timeline: view()) {
        .ss-stage { view-timeline: --ss block; }
        .ss-phone  { animation: ssTilt linear both; animation-timeline: --ss; animation-range: entry 40% contain 100%; }
        .ss-light  { animation: ssLightMove linear both; animation-timeline: --ss; animation-range: entry 40% contain 100%; }
        /* Szene 1: sichtbar bis ~30 % der Standzeit */
        .ss-s1     { animation: ssScene linear both; animation-timeline: --ss; animation-range: entry 60% contain 34%; }
        .ss-c1     { animation: ssScene linear both; animation-timeline: --ss; animation-range: entry 60% contain 34%; }
        .ss-banner { animation: ssBanner cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: entry 85% contain 10%; }
        /* Szene 2: 30–64 % */
        .ss-s2     { animation: ssScene linear both; animation-timeline: --ss; animation-range: contain 28% contain 66%; }
        .ss-c2     { animation: ssScene linear both; animation-timeline: --ss; animation-range: contain 28% contain 66%; }
        .ss-tap    { animation: ssTap ease-out both; animation-timeline: --ss; animation-range: contain 38% contain 52%; }
        .ss-btn    { animation: ssPress linear both; animation-timeline: --ss; animation-range: contain 38% contain 52%; }
        .ss-copied { animation: ssIn cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: contain 50% contain 58%; }
        /* Szene 3: ab 64 %, bleibt */
        .ss-s3     { animation: ssIn linear both; animation-timeline: --ss; animation-range: contain 62% contain 72%; }
        .ss-c3     { animation: ssIn linear both; animation-timeline: --ss; animation-range: contain 62% contain 72%; }
        .ss-line   { animation: ssDraw linear both; animation-timeline: --ss; animation-range: contain 64% contain 92%; }
        .ss-count  { animation: ssCount cubic-bezier(.22,1,.36,1) both; animation-timeline: --ss; animation-range: contain 70% contain 86%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .ss-phone,.ss-light,.ss-s1,.ss-s2,.ss-s3,.ss-c1,.ss-c2,.ss-c3,.ss-banner,.ss-tap,.ss-btn,.ss-copied,.ss-count,.ss-line,.ss-ping { animation: none !important; }
        .ss-s3,.ss-c3,.ss-count { opacity: 1 !important; transform: none !important; }
        .ss-line { stroke-dashoffset: 0 !important; }
      }
    `}</style>
  );
}

type Tone = "dark" | "light";

export function SignalStory({
  primary, accent, partnerName, onPrimary = "#000", tone = "dark",
}: { primary: string; accent?: string; partnerName?: string; onPrimary?: string; tone?: Tone }) {
  const hell = tone === "light";
  const glow = accent ?? primary;
  const accentIstTinte = !accent || accent.toLowerCase() === INK || accent.toLowerCase() === primary.toLowerCase();
  const gewinn = hell && !accentIstTinte ? accent! : UP;

  const c = hell
    ? {
        screen: `radial-gradient(120% 80% at 50% 0%, ${glow}66 0%, transparent 62%), linear-gradient(180deg, #FBF8F0 0%, #EFEADC 100%)`,
        frame: "linear-gradient(160deg, #f6f3ec 0%, #d8d3c8 38%, #bdb7ab 62%, #efebe2 100%)",
        frameShadow: `0 40px 90px -30px rgba(20,18,16,.45), 0 30px 70px -40px ${glow}, inset 0 0 0 1px rgba(255,255,255,.7)`,
        text: INK, muted: "rgba(20,18,16,.55)", faint: "rgba(20,18,16,.38)",
        glass: "rgba(255,255,255,.72)", glassBorder: "rgba(255,255,255,.9)",
        island: "#0b0c10", side: "#b9b3a7", reflex: "rgba(255,255,255,.5)",
      }
    : {
        screen: `radial-gradient(120% 80% at 50% 0%, ${primary}66 0%, transparent 62%), radial-gradient(90% 60% at 100% 100%, ${glow}40 0%, transparent 60%), linear-gradient(180deg, #0c1018 0%, #070910 100%)`,
        frame: "linear-gradient(160deg, #3a3d45 0%, #14161b 38%, #0b0c10 62%, #2c2f36 100%)",
        frameShadow: `0 40px 90px -30px rgba(0,0,0,.85), 0 30px 70px -40px ${glow}, inset 0 0 0 1px rgba(255,255,255,.08)`,
        text: "#fff", muted: "rgba(255,255,255,.6)", faint: "rgba(255,255,255,.4)",
        glass: "rgba(255,255,255,.12)", glassBorder: "rgba(255,255,255,.18)",
        island: "#000", side: "#2a2d34", reflex: "rgba(255,255,255,.10)",
      };

  /** Der Satz ueber dem Telefon — drei Fassungen uebereinander, eine sichtbar. */
  const Satz = ({ k, n, text }: { k: string; n: string; text: string }) => (
    <div className={`${k} absolute inset-0 flex items-baseline justify-center gap-3`}>
      <span className="font-display text-[13px] font-black tabular-nums" style={{ color: hell ? INK : primary }}>{n}</span>
      <span className="font-display text-[1.6rem] font-black leading-none tracking-[-0.02em] sm:text-[1.9rem]">{text}</span>
    </div>
  );

  return (
    <div className="ss-stage relative mx-auto w-full max-w-[420px]" style={{ height: "200svh" }}>
      <Styles />
      <div className="sticky flex flex-col items-center justify-center" style={{ top: "4svh", height: "92svh" }}>

        {/* Der Satz */}
        <div className="relative mb-6 h-9 w-full">
          <Satz k="ss-c1" n="01" text="A signal lands." />
          <Satz k="ss-c2" n="02" text="You copy it." />
          <Satz k="ss-c3" n="03" text="You earn." />
        </div>

        {/* Lichtquelle */}
        <div
          aria-hidden
          className="ss-light pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[130%] rounded-full blur-[70px]"
          style={{ opacity: .5, transform: "translate(-50%,-50%)", background: `radial-gradient(closest-side, ${glow} 0%, ${hell ? glow : primary}55 40%, transparent 72%)` }}
        />

        {/* ── Das Telefon ─────────────────────────────────────────────── */}
        <div className="ss-phone relative w-full max-w-[300px] will-change-transform" style={{ transformOrigin: "50% 55%" }}>
          {[["-left-[3px]", "top-[92px]", "h-7", "rounded-l"], ["-left-[3px]", "top-[132px]", "h-12", "rounded-l"], ["-left-[3px]", "top-[190px]", "h-12", "rounded-l"], ["-right-[3px]", "top-[150px]", "h-16", "rounded-r"]].map(([x, y, h, r]) => (
            <span key={x + y} aria-hidden className={`absolute ${x} ${y} ${h} w-[3px] ${r}`} style={{ background: c.side }} />
          ))}
          <div className="relative rounded-[46px] p-[10px]" style={{ background: c.frame, boxShadow: c.frameShadow }}>
            <div className="relative overflow-hidden rounded-[38px]" style={{ background: c.screen, color: c.text, aspectRatio: "9 / 19" }}>
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(135deg, ${c.reflex} 0%, transparent 45%)` }} />

              {/* Dynamic Island */}
              <span aria-hidden className="absolute left-1/2 top-3 h-[26px] w-[92px] -translate-x-1/2 rounded-full" style={{ background: c.island }} />

              {/* ── Szene 1 · Lockscreen + Benachrichtigung ───────────── */}
              <div className="ss-s1 absolute inset-0 flex flex-col items-center px-4 pt-14">
                <div className="text-[13px] font-medium" style={{ color: c.muted }}>Friday, 4 September</div>
                <div className="font-display text-[64px] font-black leading-none tracking-[-0.04em]">15:48</div>
                <div
                  className="ss-banner mt-8 w-full rounded-[22px] p-3.5 backdrop-blur-xl"
                  style={{ background: c.glass, border: `1px solid ${c.glassBorder}`, boxShadow: "0 18px 40px -20px rgba(0,0,0,.6)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative shrink-0">
                      <span aria-hidden className="ss-ping absolute inset-0 rounded-[12px]" style={{ background: hell ? "rgba(20,18,16,.18)" : `${primary}55`, filter: "blur(2px)" }} />
                      <span
                        className="relative flex h-11 w-11 items-center justify-center rounded-[12px] text-[15px] font-black"
                        style={{ color: onPrimary, background: `linear-gradient(160deg, color-mix(in oklch, ${primary} 85%, white), ${primary})` }}
                      >
                        S
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[14px] font-semibold">Signal Desk</span>
                        <span className="text-[12px]" style={{ color: c.faint }}>now</span>
                      </div>
                      <div className="text-[15px] leading-snug">New Gold trade is live.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Szene 2 · Ein Knopf ───────────────────────────────── */}
              <div className="ss-s2 absolute inset-0 flex flex-col items-center justify-center px-6">
                <div className="text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: c.faint }}>Gold · short</div>
                <div className="relative mt-6">
                  <div
                    className="ss-btn flex h-[92px] w-[220px] items-center justify-center rounded-full font-display text-[22px] font-black"
                    style={{ color: onPrimary, background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 88%, white), ${primary})`, boxShadow: `0 24px 60px -24px ${primary}` }}
                  >
                    Copy trade
                  </div>
                  <span
                    aria-hidden
                    className="ss-tap pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 rounded-full"
                    style={{ background: "rgba(255,255,255,.6)", boxShadow: "0 0 0 2px rgba(255,255,255,.85), 0 10px 30px rgba(0,0,0,.35)" }}
                  />
                </div>
                <div className="ss-copied mt-6 flex items-center gap-2 text-[16px] font-semibold" style={{ color: hell ? INK : UP }}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[13px]" style={{ background: gewinn, color: hell ? INK : "#000" }}>✓</span>
                  Copied
                </div>
              </div>

              {/* ── Szene 3 · Eine Zahl ───────────────────────────────── */}
              <div className="ss-s3 absolute inset-0 flex flex-col items-center justify-center px-6">
                <svg viewBox="0 0 300 200" className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full" preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id="ssArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor={gewinn} stopOpacity={hell ? ".55" : ".35"} />
                      <stop offset="1" stopColor={gewinn} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,190 C60,186 110,170 150,130 S230,50 300,20 L300,200 L0,200 Z" fill="url(#ssArea)" />
                  <path className="ss-line" d="M0,190 C60,186 110,170 150,130 S230,50 300,20" fill="none" stroke={hell ? INK : gewinn} strokeWidth="4" strokeLinecap="round" />
                </svg>
                <div className="ss-count relative text-center">
                  <div
                    className="font-display text-[68px] font-black leading-none tabular-nums"
                    style={hell ? { color: INK, background: `linear-gradient(transparent 58%, ${gewinn} 58%)`, padding: "0 6px" } : { color: UP, textShadow: `0 0 40px ${UP}66` }}
                  >
                    +$200
                  </div>
                  <div className="mt-3 text-[15px] font-medium" style={{ color: c.muted }}>11 minutes later</div>
                </div>
                <div className="absolute top-14 text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: c.faint }}>Real trade · Fri 4 Sep · 0.1 lot</div>
              </div>
            </div>
          </div>
        </div>

        {partnerName && (
          <div className="mt-6 text-center text-[13px]" style={{ color: hell ? "rgba(20,18,16,.5)" : "rgba(255,255,255,.45)" }}>
            That's what {partnerName}'s followers get. Every day the desk trades.
          </div>
        )}
      </div>
    </div>
  );
}
