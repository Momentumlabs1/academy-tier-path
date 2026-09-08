/**
 * SignalStory — drei Bilder, ein Gedanke pro Bild, am Scroll gescrubbt.
 *
 * WARUM DIESE FASSUNG (Diego, 08.09., auf einem iPhone 16 Pro Max gemessen)
 * "Die Seite ruckelt, oben verrutscht beim ersten Scrollen alles, die
 * Animation im Handy ist basic und langweilig." Drei echte Ursachen:
 *
 * 1. DIE ANIMATION LIEF GAR NICHT AM SCROLL. Sie hing an
 *    `animation-timeline: view()`. Wo der Browser das nicht kann — und das ist
 *    auf iOS und auf vielen Android-Geraeten der Fall — griff der Zeit-Loop:
 *    die Szenen wechselten alle 12 s von selbst, voellig unabhaengig vom
 *    Finger. Genau das sieht "basic" aus. Jetzt scrubbt EIN rAF-Handler eine
 *    CSS-Variable (`--p`), und alle Animationen haengen als PAUSIERTE
 *    Animation mit negativem `animation-delay` daran. Das laeuft auf jedem
 *    Browser identisch, laeuft im Compositor und kostet nichts.
 *
 * 2. RUCKELN durch grosse Weichzeichner. `blur(70px)` auf einem Element von
 *    Bildschirmgroesse muss auf dem Telefon in jedem Frame neu gerechnet
 *    werden. Ersetzt durch radiale Verlaeufe — optisch dasselbe, Kosten null.
 *    Auch `backdrop-blur` ist raus; die Karten tragen jetzt Deckfarben.
 *
 * 3. SPRINGEN beim ersten Scrollen: `svh` ist auf iOS stabil, aber das
 *    Zusammenspiel aus fixed-Ebenen und einklappender URL-Leiste verschob
 *    alles. Die Buehne rechnet ihren Fortschritt jetzt gegen
 *    `window.innerHeight` und misst bei jedem Frame neu — eine sich aendernde
 *    Fensterhoehe ist damit kein Bruch mehr, sondern nur ein neuer Messwert.
 *
 * DIE DREI SZENEN (je EIN Gedanke)
 *   1  Sperrbildschirm, eine Benachrichtigung faellt rein.  "A signal lands."
 *   2  Ein grosser Knopf, ein Finger drueckt ihn.           "You copy it."
 *   3  Eine Zahl, die hochzaehlt.                           "You earn."
 *
 * ZAHLEN SIND ECHT — Desk 04.09.2026, Signal #20 (signal_relays): Sell 4 430,
 * TP1 15:58, "200 pips profit" 15:59. 200 Gold-Pips bei 0,1 Lot = 200 $.
 */
import { useEffect, useRef } from "react";

const UP = "oklch(0.82 0.17 150)";
const INK = "#141210";

function Styles() {
  return (
    <style>{`
      /* ── Gescrubbte Animationen ─────────────────────────────────────────
         Jede haengt an ihrer Fortschritts-Variable. "paused" plus negatives
         "animation-delay" setzt den Abspielkopf exakt auf den Fortschritt. */
      .ss-scrub { animation-duration: 1s; animation-timing-function: linear; animation-fill-mode: both; animation-play-state: paused; }
      .ss-p     { animation-delay: calc(var(--p, 0) * -1s); }
      .ss-p1    { animation-delay: calc(var(--p1, 0) * -1s); }
      .ss-p2    { animation-delay: calc(var(--p2, 0) * -1s); }
      .ss-p3    { animation-delay: calc(var(--p3, 0) * -1s); }

      /* Das Telefon dreht sich ueber die ganze Buehne durch den Raum. */
      @keyframes ssTilt {
        0%   { transform: perspective(1400px) rotateY(-17deg) rotateX(7deg) translate3d(0,26px,0) scale(.945); }
        30%  { transform: perspective(1400px) rotateY(-8deg)  rotateX(3deg) translate3d(0,6px,0)  scale(.98); }
        58%  { transform: perspective(1400px) rotateY(0deg)   rotateX(0deg) translate3d(0,0,0)    scale(1); }
        100% { transform: perspective(1400px) rotateY(8deg)   rotateX(-3deg) translate3d(0,-8px,0) scale(1.035); }
      }
      /* Das Licht wandert gegenlaeufig — Verlauf statt Weichzeichner. */
      @keyframes ssLight {
        0%   { transform: translate3d(-14%, 6%, 0) scale(.92); opacity: .40; }
        55%  { transform: translate3d(0, -2%, 0)   scale(1.06); opacity: .60; }
        100% { transform: translate3d(13%, -8%, 0) scale(1.1);  opacity: .45; }
      }

      /* Szene 1 — steht zuerst, geht am Ende ihres Fensters weg. */
      @keyframes ssS1 { 0%,68% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translate3d(0,-12px,0) scale(.985); } }
      @keyframes ssBanner {
        0%   { opacity: 0; transform: translate3d(0,-34px,0) scale(.94); }
        22%  { opacity: 1; transform: translate3d(0,3px,0)   scale(1.01); }
        32%, 100% { opacity: 1; transform: none; }
      }
      @keyframes ssBanner2 { 0%,34% { opacity: 0; transform: translate3d(0,-16px,0) scale(.96); } 52%,100% { opacity: .55; transform: none; } }
      @keyframes ssWake    { 0% { opacity: .25; } 18%,100% { opacity: 1; } }

      /* Szene 2 — kommt rein, Knopf wird gedrueckt, Haken erscheint. */
      @keyframes ssS2 { 0% { opacity: 0; transform: scale(.97); } 18%,72% { opacity: 1; transform: none; } 100% { opacity: 0; transform: scale(1.03); } }
      @keyframes ssBtn { 0%,38% { transform: scale(1); } 52% { transform: scale(.93); } 66%,100% { transform: scale(1); } }
      @keyframes ssTap {
        0%   { opacity: 0; transform: translate(-50%,-50%) scale(1.9); }
        34%  { opacity: .9; transform: translate(-50%,-50%) scale(1.05); }
        52%  { opacity: .9; transform: translate(-50%,-50%) scale(.78); }
        72%,100% { opacity: 0; transform: translate(-50%,-50%) scale(1.2); }
      }
      @keyframes ssRipple { 0%,50% { opacity: 0; transform: scale(.6); } 58% { opacity: .55; } 100% { opacity: 0; transform: scale(1.9); } }
      @keyframes ssCopied { 0%,58% { opacity: 0; transform: translate3d(0,10px,0) scale(.8); } 74%,100% { opacity: 1; transform: none; } }
      @keyframes ssCheck  { 0%,58% { stroke-dashoffset: 26; } 80%,100% { stroke-dashoffset: 0; } }

      /* Szene 3 — Zahl zaehlt hoch, Kurve zeichnet sich, Glanz wandert. */
      @keyframes ssS3   { 0% { opacity: 0; transform: scale(.97); } 22%,100% { opacity: 1; transform: none; } }
      @keyframes ssRise { 0% { opacity: 0; transform: translate3d(0,22px,0); } 30%,100% { opacity: 1; transform: none; } }
      @keyframes ssDraw { 0% { stroke-dashoffset: 430; } 92%,100% { stroke-dashoffset: 0; } }
      @keyframes ssArea { 0%,15% { opacity: 0; } 70%,100% { opacity: 1; } }
      @keyframes ssSub  { 0%,45% { opacity: 0; transform: translate3d(0,8px,0); } 65%,100% { opacity: 1; transform: none; } }

      /* Dauerleben, unabhaengig vom Scroll — winzig und billig. */
      @keyframes ssPing { 0% { transform: scale(.85); opacity: .55; } 100% { transform: scale(2); opacity: 0; } }
      .ss-ping { animation: ssPing 2s ease-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .ss-scrub, .ss-ping { animation: none !important; }
        .ss-s1, .ss-s2 { opacity: 0 !important; }
        .ss-s3 { opacity: 1 !important; }
        .ss-line { stroke-dashoffset: 0 !important; }
        .ss-area { opacity: 1 !important; }
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
  const stage = useRef<HTMLDivElement>(null);
  const zahl = useRef<HTMLDivElement>(null);

  /**
   * Der einzige Taktgeber: ein rAF-gedrosselter Scroll-Handler, der den
   * Fortschritt der Buehne als CSS-Variablen setzt. Bewusst kein
   * IntersectionObserver und kein `animation-timeline` — Ersteres liefert
   * keinen kontinuierlichen Wert, Letzteres kann iOS nicht.
   */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const messen = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const strecke = r.height - window.innerHeight;
      const p = strecke > 0 ? Math.min(1, Math.max(0, -r.top / strecke)) : 0;
      const teil = (a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--p1", teil(0.00, 0.34).toFixed(4));
      el.style.setProperty("--p2", teil(0.30, 0.66).toFixed(4));
      const p3 = teil(0.62, 0.96);
      el.style.setProperty("--p3", p3.toFixed(4));
      // Die Zahl zaehlt mit dem Daumen hoch. Bewusst hier und nicht per
      // CSS-Counter: der braucht @property, und das koennen aeltere
      // Android-Browser nicht — dort staende dann "+$0" auf der Seite.
      if (zahl.current) zahl.current.textContent = `+$${Math.round(p3 * 200)}`;
    };
    const anstossen = () => { if (!raf) raf = requestAnimationFrame(messen); };

    messen();
    window.addEventListener("scroll", anstossen, { passive: true });
    window.addEventListener("resize", anstossen);
    return () => {
      window.removeEventListener("scroll", anstossen);
      window.removeEventListener("resize", anstossen);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const c = hell
    ? {
        screen: `radial-gradient(120% 75% at 50% 0%, ${glow}55 0%, transparent 60%), linear-gradient(180deg, #FBF8F0 0%, #EFEADC 100%)`,
        frame: "linear-gradient(160deg, #f6f3ec 0%, #d8d3c8 38%, #bdb7ab 62%, #efebe2 100%)",
        frameShadow: `0 40px 80px -34px rgba(20,18,16,.42), inset 0 0 0 1px rgba(255,255,255,.7)`,
        text: INK, muted: "rgba(20,18,16,.55)", faint: "rgba(20,18,16,.4)",
        card: "rgba(255,255,255,.86)", cardBorder: "rgba(20,18,16,.07)",
        neutral: "rgba(20,18,16,.07)", neutralText: "rgba(20,18,16,.62)",
        island: "#0b0c10", side: "#b9b3a7", chrome: "rgba(20,18,16,.75)",
      }
    : {
        screen: `radial-gradient(120% 75% at 50% 0%, ${primary}55 0%, transparent 58%), radial-gradient(90% 55% at 100% 100%, ${glow}33 0%, transparent 60%), linear-gradient(180deg, #0c1018 0%, #06080f 100%)`,
        frame: "linear-gradient(160deg, #3a3d45 0%, #14161b 38%, #0b0c10 62%, #2c2f36 100%)",
        frameShadow: `0 40px 80px -34px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,255,255,.08)`,
        text: "#fff", muted: "rgba(255,255,255,.6)", faint: "rgba(255,255,255,.42)",
        card: "rgba(255,255,255,.13)", cardBorder: "rgba(255,255,255,.16)",
        neutral: "rgba(255,255,255,.1)", neutralText: "rgba(255,255,255,.72)",
        island: "#000", side: "#2a2d34", chrome: "rgba(255,255,255,.85)",
      };

  /** Der Satz ueber dem Telefon — drei Fassungen, eine sichtbar. */
  const Satz = ({ k, kf, n, text }: { k: string; kf: string; n: string; text: string }) => (
    <div
      className={`ss-scrub ${k} absolute inset-0 flex items-baseline justify-center gap-3`}
      style={{ animationName: kf }}
    >
      <span className="font-display text-[13px] font-black tabular-nums" style={{ color: hell ? INK : primary }}>{n}</span>
      <span className="font-display text-[1.6rem] font-black leading-none tracking-[-0.02em] sm:text-[1.9rem]">{text}</span>
    </div>
  );

  /** Statusleiste — die kleinen Details, die ein Telefon echt machen. */
  const StatusBar = () => (
    <div className="absolute inset-x-0 top-3 z-10 flex items-center justify-between px-6 text-[11px] font-semibold" style={{ color: c.chrome }}>
      <span className="tabular-nums">15:48</span>
      <span className="flex items-center gap-1.5">
        <svg width="15" height="10" viewBox="0 0 15 10" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4} y={7 - i * 2.2} width="2.6" height={3 + i * 2.2} rx="1" fill="currentColor" opacity={i === 3 ? .4 : 1} />
          ))}
        </svg>
        <svg width="13" height="10" viewBox="0 0 13 10" aria-hidden>
          <path d="M1 3.6a8 8 0 0 1 11 0M3.2 5.9a5 5 0 0 1 6.6 0M6.5 8.4l.01 0" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
        <span className="relative inline-block h-[10px] w-[18px] rounded-[3px]" style={{ border: `1px solid ${c.chrome}` }}>
          <span className="absolute inset-[1.5px] right-[5px] rounded-[1px]" style={{ background: c.chrome }} />
        </span>
      </span>
    </div>
  );

  return (
    <div
      ref={stage}
      className="ss-stage relative mx-auto w-full max-w-[420px] [overflow-x:clip]"
      style={{ height: "215svh" }}
    >
      <Styles />
      {/* pb: am Handy liegt die feste Knopfleiste ueber dem unteren Rand —
          ohne diesen Abstand schnitt sie die Partnerzeile ab (08.09. gemessen). */}
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center pb-24 sm:pb-0">

        {/* Der Satz */}
        <div className="relative mb-6 h-9 w-full">
          <Satz k="ss-p1" kf="ssS1" n="01" text="A signal lands." />
          <Satz k="ss-p2" kf="ssS2" n="02" text="You copy it." />
          <Satz k="ss-p3" kf="ssS3" n="03" text="You earn." />
        </div>

        {/* Licht: reiner Verlauf, kein Weichzeichner (Telefon-Leistung). */}
        <div
          aria-hidden
          className="ss-scrub ss-p pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[135%] -translate-x-1/2 -translate-y-1/2"
          style={{
            animationName: "ssLight",
            background: `radial-gradient(closest-side, ${glow}66 0%, ${hell ? glow : primary}33 45%, transparent 72%)`,
          }}
        />

        {/* ── Das Telefon ─────────────────────────────────────────────── */}
        <div
          className="ss-scrub ss-p relative w-full max-w-[290px]"
          style={{ animationName: "ssTilt", transformOrigin: "50% 55%", willChange: "transform" }}
        >
          {[["-left-[3px]", "top-[86px]", "h-7", "rounded-l"], ["-left-[3px]", "top-[124px]", "h-11", "rounded-l"], ["-left-[3px]", "top-[178px]", "h-11", "rounded-l"], ["-right-[3px]", "top-[142px]", "h-16", "rounded-r"]].map(([x, y, h, r]) => (
            <span key={x + y} aria-hidden className={`absolute ${x} ${y} ${h} w-[3px] ${r}`} style={{ background: c.side }} />
          ))}

          <div className="relative rounded-[44px] p-[9px]" style={{ background: c.frame, boxShadow: c.frameShadow }}>
            <div
              className="relative overflow-hidden rounded-[36px]"
              style={{ background: c.screen, color: c.text, aspectRatio: "9 / 19" }}
            >
              {/* Glasreflex — statischer Verlauf, kein Filter. */}
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(138deg, ${hell ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.09)"} 0%, transparent 42%)` }} />
              <span aria-hidden className="absolute left-1/2 top-2.5 z-20 h-[25px] w-[88px] -translate-x-1/2 rounded-full" style={{ background: c.island }} />
              <StatusBar />

              {/* ── Szene 1 · Sperrbildschirm ─────────────────────────── */}
              <div className="ss-scrub ss-p1 absolute inset-0 flex flex-col items-center px-3.5 pt-16" style={{ animationName: "ssS1" }}>
                <div className="ss-scrub ss-p1 flex flex-col items-center" style={{ animationName: "ssWake" }}>
                  <div className="text-[12.5px] font-medium" style={{ color: c.muted }}>Friday, 4 September</div>
                  <div className="font-display text-[60px] font-black leading-none tracking-[-0.04em]">15:48</div>
                </div>

                <div className="relative mt-7 w-full">
                  {/* Zweite Karte dahinter: es ist nicht das einzige Signal. */}
                  <div
                    className="ss-scrub ss-p1 absolute inset-x-3 -bottom-2.5 h-14 rounded-[20px]"
                    style={{ animationName: "ssBanner2", background: c.card, border: `1px solid ${c.cardBorder}` }}
                  />
                  <div
                    className="ss-scrub ss-p1 relative rounded-[22px] p-3.5"
                    style={{ animationName: "ssBanner", background: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: "0 16px 34px -22px rgba(0,0,0,.7)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="relative shrink-0">
                        <span aria-hidden className="ss-ping absolute inset-0 rounded-[12px]" style={{ background: hell ? "rgba(20,18,16,.16)" : `${primary}55` }} />
                        <span
                          className="relative flex h-10 w-10 items-center justify-center rounded-[12px] text-[14px] font-black"
                          style={{ color: onPrimary, background: `linear-gradient(160deg, color-mix(in oklch, ${primary} 84%, white), ${primary})` }}
                        >
                          S
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[13px] font-semibold">Signal Desk</span>
                          <span className="text-[11px]" style={{ color: c.faint }}>now</span>
                        </div>
                        <div className="text-[14px] leading-snug">New Gold trade is live.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sperrbildschirm-Fuss: Schloss und Griffleiste. Ohne sie
                    wirkte die untere Haelfte wie ein Loch statt wie ein
                    Telefon. */}
                <div className="mt-auto flex w-full flex-col items-center gap-3 pb-3">
                  <span className="text-[11px] font-medium" style={{ color: c.faint }}>Swipe up to open</span>
                  <span className="h-[5px] w-[110px] rounded-full" style={{ background: c.chrome, opacity: .55 }} />
                </div>
              </div>

              {/* ── Szene 2 · Ein Knopf ───────────────────────────────── */}
              <div className="ss-scrub ss-p2 absolute inset-0 flex flex-col items-center justify-center px-6" style={{ animationName: "ssS2" }}>
                <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: c.faint }}>Gold · short</div>

                <div className="relative mt-7">
                  <span
                    aria-hidden
                    className="ss-scrub ss-p2 absolute inset-0 rounded-full"
                    style={{ animationName: "ssRipple", background: primary, opacity: 0 }}
                  />
                  <div
                    className="ss-scrub ss-p2 relative flex h-[86px] w-[212px] items-center justify-center rounded-full font-display text-[21px] font-black"
                    style={{
                      animationName: "ssBtn",
                      color: onPrimary,
                      background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 88%, white), ${primary})`,
                      boxShadow: `0 22px 50px -26px ${primary}`,
                    }}
                  >
                    Copy trade
                  </div>
                  <span
                    aria-hidden
                    className="ss-scrub ss-p2 pointer-events-none absolute left-1/2 top-1/2 h-11 w-11 rounded-full"
                    style={{ animationName: "ssTap", background: "rgba(255,255,255,.55)", boxShadow: "0 0 0 2px rgba(255,255,255,.8)" }}
                  />
                </div>

                <div className="ss-scrub ss-p2 mt-7 flex items-center gap-2 text-[15px] font-semibold" style={{ animationName: "ssCopied", color: hell ? INK : UP }}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: gewinn }}>
                    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
                      <path
                        className="ss-scrub ss-p2"
                        style={{ animationName: "ssCheck" }}
                        d="M2.5 7.5 L6 11 L11.5 3.5"
                        fill="none" stroke={hell ? INK : "#000"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                        strokeDasharray="26"
                      />
                    </svg>
                  </span>
                  Copied
                </div>
                <div className="ss-scrub ss-p2 mt-1.5 text-[12px]" style={{ animationName: "ssCopied", color: c.faint }}>
                  Same entry, same stop, same targets.
                </div>
              </div>

              {/* ── Szene 3 · Eine Zahl ───────────────────────────────── */}
              <div className="ss-scrub ss-p3 absolute inset-0 flex flex-col items-center justify-center px-6" style={{ animationName: "ssS3" }}>
                <svg viewBox="0 0 300 200" className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] w-full" preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id="ssArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor={gewinn} stopOpacity={hell ? ".5" : ".33"} />
                      <stop offset="1" stopColor={gewinn} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path className="ss-area ss-scrub ss-p3" style={{ animationName: "ssArea" }} d="M0,190 C60,186 110,170 150,130 S230,50 300,20 L300,200 L0,200 Z" fill="url(#ssArea)" />
                  <path
                    className="ss-line ss-scrub ss-p3"
                    style={{ animationName: "ssDraw" }}
                    d="M0,190 C60,186 110,170 150,130 S230,50 300,20"
                    fill="none" stroke={hell ? INK : gewinn} strokeWidth="4" strokeLinecap="round" strokeDasharray="430"
                  />
                </svg>

                <div className="ss-scrub ss-p3 absolute top-[13%] text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ animationName: "ssSub", color: c.faint }}>
                  Real trade · Fri 4 Sep · 0.1 lot
                </div>

                <div className="relative text-center">
                  {/* Die Zahl zaehlt mit dem Daumen hoch. */}
                  {/* SSR und Browser ohne JS zeigen den Endwert — nie eine 0. */}
                  <div
                    ref={zahl}
                    className="font-display text-[62px] font-black leading-none tabular-nums"
                    style={
                      hell
                        ? { color: INK, background: `linear-gradient(transparent 58%, ${gewinn} 58%)`, padding: "0 6px" }
                        : { color: UP, textShadow: `0 0 36px ${UP}55` }
                    }
                  >
                    +$200
                  </div>
                  <div className="ss-scrub ss-p3 mt-3 text-[14px] font-medium" style={{ animationName: "ssRise", color: c.muted }}>
                    11 minutes later
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {partnerName && (
          <div className="mt-6 max-w-[300px] text-center text-[12.5px] leading-snug" style={{ color: c.faint }}>
            That's what {partnerName}'s followers get. Every day the desk trades.
          </div>
        )}
      </div>
    </div>
  );
}
