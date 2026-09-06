/**
 * Die Partner-Brücke — die Seite, auf der ein Partner-Zuschauer landet.
 *
 * WARUM SIE SO GEBAUT IST (Diego, 06.09.)
 * Die erste Fassung war eine Bildschirmhöhe mit drei Sätzen und einem Knopf —
 * "viel zu basic". Cosmos' eigene Seite bleibt die große Bühne; die
 * Partnerseiten müssen dasselbe Niveau haben, nur verständlicher. Ein Mensch,
 * der gerade "TRADE" unter ein Reel geschrieben hat, muss ohne Vorwissen vier
 * Dinge sofort wissen:
 *
 *   1. WAS IST HIER LOS      → Titel + ein Satz (der Titel bleibt: er sitzt)
 *   2. WAS BEKOMME ICH       → die Signalvorschau als Telefon + drei Punkte
 *   3. WAS PASSIERT ALS NÄCHSTES → drei Schritte, "du bist hier" markiert
 *   4. BEWEISE               → die geprüften Desk-Zahlen der letzten Woche
 *
 * und dann genau EINEN Weg weiter. Die Reihenfolge ist die Botschaft:
 * Vordergrund ist die Signalgruppe, weil das der Grund ist, aus dem jemand
 * klickt. Die Akademie kommt mit, wird aber nicht verkauft.
 *
 * Was sich NICHT geändert hat und nicht ändern darf:
 * - Die Herkunft wird HIER gesetzt (stampAttribution + record_affiliate_click).
 *   Der Besucher verlässt diese Seite sofort; eine Seite später ist der Partner
 *   verloren, und members.referred_by_tenant ist nach dem Anlegen gesperrt.
 * - Hell/dunkel folgt dem Partner (theme), die Knopfschrift der Knopffarbe.
 * - Das Video läuft nur, wenn der Partner ein EIGENES hat.
 * - Keine Emoji-Aufzählungen: Nummern und Haarlinien.
 * - Kein overflow-hidden am Wurzelelement (schnitt am 05.09. die halbe Seite ab).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { stampAttribution } from "@/lib/partner-brand";
import { DESK_WEEK } from "@/lib/desk-results";
import { SignalStory } from "./SignalStory";
import type { TenantConfig } from "@/lib/tenants";

const PUNKTE = [
  {
    title: "Every trade, as it happens",
    body: "The moment our desk goes in, it's on your phone — entry, stop and targets. Nothing to work out yourself. 3–6 trades a day, Gold and NASDAQ.",
  },
  {
    title: "Learn it if you want to",
    body: "A full academy comes with it, free — plus Cosmo, your mentor in the chat. Most people just follow the calls. That works too.",
  },
  {
    title: "Nothing to pay us",
    body: "No fees, no subscription. You fund your own trading account and the money stays yours, in your name, the whole time.",
  },
];

/**
 * Der Weg von hier — in der Reihenfolge, in der er wirklich passiert.
 * Schritt 1 ist der Knopf unten; deshalb steht er als "du bist hier".
 */
const SCHRITTE = [
  {
    you: "1 tap",
    title: "See your academy",
    body: "It's already set up for you — lessons, signal room, Cosmo. Locked until step 3.",
  },
  {
    you: "2 minutes",
    title: "Connect Telegram",
    body: "You get your personal invite. From then on every trade lands on your phone.",
  },
  {
    you: "5 minutes",
    title: "Open your trading account",
    body: "With our partner broker, from $100. That deposit stays in YOUR account — and it's what unlocks the signals and the academy.",
  },
];

export function TenantBridgeView({ tenant }: { tenant: TenantConfig }) {
  const primary = tenant.primaryColor;
  const accent = tenant.accentColor;

  /**
   * Die Schrift AUF dem Knopf folgt der Helligkeit der Knopffarbe.
   * SmartEggface zeichnet mit schwarzer Tinte — sein Knopf ist tintenschwarz,
   * `text-black` wäre unsichtbar. Grobe Helligkeit nach Rec.601 reicht.
   */
  const knopfText = (() => {
    const hex = (tenant.primaryColor || "").trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return "#000";
    const n = parseInt(m[1], 16);
    const helligkeit = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
    return helligkeit > 140 ? "#000" : "#fff";
  })();

  /** Hell oder dunkel — an EINER Stelle entschieden, nicht an neun im JSX. */
  const hell = tenant.theme === "light";
  const t = hell
    ? {
        grund: "#F3EFE4",
        text: "text-[#141210]",
        gedaempft: "text-[#141210]/65",
        leise: "text-[#141210]/45",
        linie: "border-[#141210]/12",
        teiler: "divide-[#141210]/10",
        rahmen: "border-[#141210]/12",
        flaeche: "bg-[#141210]/[0.035]",
        koernung: 0.05,
        leuchten: 0.16,
      }
    : {
        grund: "#05070e",
        text: "text-white",
        gedaempft: "text-white/65",
        leise: "text-white/40",
        linie: "border-white/[0.07]",
        teiler: "divide-white/[0.06]",
        rahmen: "border-white/[0.09]",
        flaeche: "bg-white/[0.025]",
        koernung: 0.05,
        leuchten: 0.22,
      };
  const video = useRef<HTMLVideoElement>(null);
  const [laeuft, setLaeuft] = useState(false);
  const videoModus: "hero" | "card" | "none" = tenant.bridgeVideo ?? (tenant.pitchVideo ? "card" : "none");

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Eine Regel, an einer Stelle: das Haus überschreibt nie einen Partner.
    stampAttribution(tenant);

    const key = `cc_click_${tenant.slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const [k, v] of params) if (k.startsWith("utm_") || k === "ref") utm[k] = v;
    void supabase
      .rpc("record_affiliate_click", {
        p_slug: tenant.slug,
        p_referrer: document.referrer || null,
        p_utm: Object.keys(utm).length ? utm : null,
        p_user_agent: navigator.userAgent.slice(0, 300),
      })
      .then(({ error }) => { if (error) console.warn("[click]", error.message); });
  }, [tenant]);

  /** Der einzige Weg von hier — einmal im Fluss, einmal als Leiste am Handy-Rand. */
  const Knopf = ({ className }: { className?: string }) => (
    <a
      href="/preview"
      className={cn(
        "group relative inline-flex min-h-[56px] items-center justify-center gap-2.5 overflow-hidden rounded-full px-8 text-[15px] font-black transition-transform duration-200 active:scale-[0.985]",
        className,
      )}
      style={{
        color: knopfText,
        background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 90%, white), ${primary})`,
        boxShadow: `0 14px 38px -16px ${primary}, inset 0 1px 0 rgba(255,255,255,0.5)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] transition-all duration-700 ease-out group-hover:left-[150%]"
        style={{ background: knopfText === "#fff" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.28)" }}
      />
      <span className="relative">See what's waiting for you</span>
      <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </a>
  );

  const Kicker = ({ children }: { children: ReactNode }) => (
    <div className="text-[11px] font-black uppercase tracking-[0.28em]" style={{ color: primary }}>
      {children}
    </div>
  );

  return (
    <div className={cn("relative min-h-screen font-sans", t.text)} style={{ background: t.grund }}>
      <style>{`
        @keyframes brIn { from { opacity: 0; transform: translateY(14px); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
        .br-in { animation: brIn .7s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .br-in { animation: none !important; } }
      `}</style>
      {/* Atmosphäre: eine weiche Lichtquelle in Partnerfarbe + feines Rauschen,
          beides `fixed` (mitscrollend + Mischmodus zeichnete Chromium am 05.09.
          als harten Block über die halbe Seite). */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-52 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ opacity: t.leuchten, background: `radial-gradient(circle, ${primary} 0%, ${accent} 55%, transparent 72%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          opacity: t.koernung,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-xl sm:max-w-2xl">
        <div className="w-full px-5 pb-32 pt-8 sm:px-8 sm:pb-24 sm:pt-12">

          {/* ── Absender ─────────────────────────────────────────────── */}
          <div className={cn("flex items-center gap-3 border-b pb-5", t.linie)}>
            {tenant.mascotHeadUrl ? (
              <img
                src={tenant.mascotHeadUrl}
                alt={tenant.name}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
                style={{ boxShadow: `0 0 0 1.5px ${primary}, 0 0 22px -6px ${primary}` }}
              />
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-black"
                style={{ background: primary, color: knopfText }}
              >
                {tenant.logoInitials}
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold leading-tight">{tenant.name}</div>
              <div className={cn("text-[11px] uppercase tracking-[0.16em]", t.leise)}>
                with Cosmos Candles
              </div>
            </div>
          </div>

          {/* ── 1 · Was ist hier los ───────────────────────────────────
              Diego, 06.09.: der Hero wirkte "lost" neben dem 3D-Telefon.
              Deshalb dieselbe Materialsprache: Kicker in Partnerfarbe, Titel
              mit Verlauf und Leuchten, drei Milchglas-Chips als Substanz, und
              ein gestaffelter Einstieg (br-in) statt eines statischen Blocks.
              Der Titel selbst bleibt Wort fuer Wort. */}
          <div className="br-in mt-9 text-[11px] font-black uppercase tracking-[0.28em]" style={{ color: primary, animationDelay: "0s" }}>
            Live signals · Gold &amp; NASDAQ
          </div>
          <h1
            className="br-in mt-3 font-display text-[2.05rem] font-black leading-[1.06] tracking-[-0.025em] sm:text-[2.7rem]"
            style={{ animationDelay: ".08s" }}
          >
            You don't have to learn trading
            <br />
            <span
              className="[text-wrap:balance]"
              style={{
                backgroundImage: `linear-gradient(100deg, color-mix(in oklch, ${primary} 78%, white) 0%, ${primary} 55%, ${accent} 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: `drop-shadow(0 0 18px color-mix(in oklch, ${primary} 45%, transparent))`,
              }}
            >
              to make money from it.
            </span>
          </h1>

          <div className="br-in mt-5 flex max-w-lg items-start gap-3.5" style={{ animationDelay: ".16s" }}>
            {tenant.mascotAskUrl && (
              <img src={tenant.mascotAskUrl} alt="" aria-hidden className="mt-0.5 h-9 w-9 shrink-0 opacity-90" />
            )}
            <p className={cn("text-[16px] leading-relaxed", t.gedaempft)}>
              {tenant.name} teamed up with a real trading desk. It trades live every day, and
              every position is on your phone the second it opens — entry, stop, targets.
              Follow it or don't. It costs you nothing.
            </p>
          </div>

          {/* Drei Chips in Telefon-Material: die Substanz hinter dem Satz. */}
          <div className="br-in mt-5 flex flex-wrap gap-2" style={{ animationDelay: ".24s" }}>
            {["3–6 trades a day", "Entry · stop · targets", "$0 to us — your money stays yours"].map((c) => (
              <span
                key={c}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-semibold backdrop-blur",
                  hell ? "border-[#141210]/12 bg-[#141210]/[0.05] text-[#141210]/80" : "border-white/[0.14] bg-white/[0.07] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,.14)]",
                )}
              >
                {c}
              </span>
            ))}
          </div>

          {/* ── Sein Film, falls er einen hat ───────────────────────────
              Groesse pro Partner (tenant.bridgeVideo): "hero" = volle Breite,
              randlos am Handy, grosser Play (Zeko: sein Film IST die Seite);
              "card" = Karte wie bisher; "none" = reine Typo-Fassung. */}
          {tenant.pitchVideo && videoModus !== "none" && (
            <div
              className={cn(
                "overflow-hidden border bg-black shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]",
                videoModus === "hero" ? "-mx-5 mt-7 rounded-none border-x-0 sm:mx-0 sm:rounded-2xl sm:border-x" : "mt-8 rounded-xl",
                t.rahmen,
              )}
            >
              <div className="relative aspect-video bg-black">
                {/* Kleine Einordnung, damit der Film nicht "einfach da" ist. */}
                {!laeuft && (
                  <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">
                    ▶ Watch first · {tenant.name} explains it
                  </span>
                )}
                <video
                  ref={video}
                  controls
                  playsInline
                  preload="metadata"
                  poster={tenant.pitchPoster}
                  onPlay={() => setLaeuft(true)}
                  className="h-full w-full object-contain"
                >
                  <source src={tenant.pitchVideo} type="video/mp4" />
                </video>
                {!laeuft && (
                  <button
                    type="button"
                    onClick={() => video.current?.play()}
                    aria-label="Play video"
                    className="group absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/10"
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-full ring-1 ring-white/25 transition-transform duration-200 group-hover:scale-105",
                        videoModus === "hero" ? "h-[72px] w-[72px]" : "h-14 w-14",
                      )}
                      style={{ background: primary, boxShadow: `0 12px 34px -12px ${primary}` }}
                    >
                      <PlayCircle className={videoModus === "hero" ? "h-9 w-9" : "h-7 w-7"} style={{ color: knopfText }} />
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── 2 · Was du bekommst ──────────────────────────────────────
              Erst das Bild (so sieht es auf deinem Telefon aus), dann die
              drei Punkte. Die Telefon-Vorschau ist dieselbe wie auf Cosmos'
              Seite — die Partnerseite darf nicht ärmer aussehen. */}
          <section className="mt-12">
            <Kicker>What you get</Kicker>
            <h2 className="mt-2 font-display text-[1.35rem] font-black leading-tight sm:text-[1.6rem]">
              This is what lands on your phone.
            </h2>
            {/* Bühne statt Karte: das Telefon steht frei im Licht, randlos am
                Handy — kein Kasten um den Kasten (Diego: "zu generisch"). */}
            <div className="relative -mx-5 mt-4 sm:mx-0">
              <SignalStory primary={primary} accent={accent} partnerName={tenant.name} />
            </div>
            <ul className={cn("mt-6 divide-y border-y", t.teiler, t.linie)}>
              {PUNKTE.map((p, i) => (
                <li key={p.title} className="flex gap-4 py-4">
                  <span
                    className="mt-[3px] font-display text-[11px] font-black tabular-nums"
                    style={{ color: primary, opacity: 0.55 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold leading-snug">{p.title}</div>
                    <div className={cn("mt-1 text-[13.5px] leading-relaxed", t.gedaempft)}>{p.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 3 · Was als Nächstes passiert ─────────────────────────────
              Drei Schritte an einer Linie; der erste Punkt ist gefüllt und
              heißt "you are here" — der Knopf unten IST dieser Schritt. */}
          <section className="mt-12">
            <Kicker>What happens next</Kicker>
            <h2 className="mt-2 font-display text-[1.35rem] font-black leading-tight sm:text-[1.6rem]">
              Three steps. No form, no card.
            </h2>
            <ol className="mt-6">
              {SCHRITTE.map((s, i) => {
                const hier = i === 0;
                const letzter = i === SCHRITTE.length - 1;
                return (
                  <li key={s.title} className="relative flex gap-5 pb-7 last:pb-0">
                    {!letzter && (
                      <span
                        aria-hidden
                        className="absolute left-[13px] top-7 bottom-0 w-px"
                        style={{ background: hell ? "rgba(20,18,16,0.14)" : "rgba(255,255,255,0.10)" }}
                      />
                    )}
                    <span
                      className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-black tabular-nums"
                      style={
                        hier
                          ? { background: primary, color: knopfText, boxShadow: `0 0 0 4px color-mix(in oklch, ${primary} 22%, transparent)` }
                          : { border: `1.5px solid ${primary}`, color: primary, opacity: 0.8 }
                      }
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <div className="text-[15px] font-bold leading-snug">{s.title}</div>
                        <div className={cn("text-[11px] uppercase tracking-[0.16em]", t.leise)}>{s.you}</div>
                        {hier && (
                          <div
                            className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em]"
                            style={{ background: `color-mix(in oklch, ${primary} 16%, transparent)`, color: primary }}
                          >
                            you are here
                          </div>
                        )}
                      </div>
                      <div className={cn("mt-1 text-[13.5px] leading-relaxed", t.gedaempft)}>{s.body}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* ── 4 · Beweis ─────────────────────────────────────────────────
              Die geprüften Zahlen der letzten Woche, inklusive der roten und
              leeren Tage. Keine Gewinnversprechen, keine Trefferquote. */}
          <section className="mt-12">
            <Kicker>Proof</Kicker>
            <h2 className="mt-2 font-display text-[1.35rem] font-black leading-tight sm:text-[1.6rem]">
              Last week at the desk.
            </h2>
            <div className={cn("mt-6 rounded-2xl border p-5", t.rahmen, t.flaeche)}>
              <div className={cn("flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em]", t.leise)}>
                <span>{DESK_WEEK.label} · {DESK_WEEK.instrument}</span>
                <span>{DESK_WEEK.range}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { n: DESK_WEEK.signals, l: "signals" },
                  { n: DESK_WEEK.tpPips, l: "pips at target" },
                  { n: DESK_WEEK.slPips, l: "pips stopped" },
                ].map((z) => (
                  <div key={z.l}>
                    <div className="font-display text-[1.7rem] font-black leading-none tabular-nums sm:text-[2rem]">{z.n}</div>
                    <div className={cn("mt-1.5 text-[11.5px] leading-tight", t.gedaempft)}>{z.l}</div>
                  </div>
                ))}
              </div>
              <div className={cn("mt-5 border-t pt-4 text-[13px] leading-relaxed", t.linie, t.gedaempft)}>
                {DESK_WEEK.note} Every entry was posted before it happened — that's the only
                result we count.
              </div>
            </div>
          </section>

          {/* ── Der einzige Weg von hier ───────────────────────────────────
              <a> statt Router: ein voller Seitenaufruf stellt sicher, dass
              /preview den gerade gesetzten Cookie liest. */}
          <div className="mt-12">
            <Knopf />
            <p className={cn("mt-4 text-[12.5px] leading-relaxed", t.leise)}>
              {tenant.name} runs this with Cosmos Candles — that's where you get in. No account
              needed to look around.
            </p>
          </div>
        </div>
      </div>

      {/* Am Handy bleibt der Knopf immer erreichbar — die Seite ist jetzt länger
          als ein Bildschirm, und der Weg weiter darf nie außer Sicht sein. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 px-5 pb-5 pt-10 sm:hidden"
        style={{ background: `linear-gradient(180deg, transparent, ${t.grund} 55%)` }}
      >
        <Knopf className="w-full" />
      </div>
    </div>
  );
}
