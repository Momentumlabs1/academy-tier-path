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
import { LevelRail } from "./LevelRail";
import type { TenantConfig } from "@/lib/tenants";


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
    // Kein Zoom (Diego, 06.09.): Pinch/Doppeltipp zerreisst die Scroll-Szenen.
    // iOS ignoriert user-scalable=no seit Jahren; touch-action + gesturestart
    // greifen dort, das Meta-Tag (in __root) deckt Android/Chrome.
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", block, { passive: false });
    document.addEventListener("gesturechange", block, { passive: false });
    document.documentElement.style.touchAction = "pan-y";
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
      <span className="relative">Start Level 1 · see your academy</span>
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
        /* Der Film kippt beim Hereinscrollen aus der Tiefe ein (3D, scroll-getrieben). */
        @keyframes brTilt { from { transform: perspective(1200px) rotateX(12deg) scale(.94); opacity: .55; } to { transform: none; opacity: 1; } }
        @supports (animation-timeline: view()) {
          .br-tilt { animation: brTilt cubic-bezier(.22,1,.36,1) both; animation-timeline: view(); animation-range: entry 0% entry 85%; transform-origin: 50% 100%; }
        }
        @media (prefers-reduced-motion: reduce) { .br-in, .br-tilt { animation: none !important; } }
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
            {/* Ein Satz, kein Absatz (Diego, 06.09.: "viel zu lang"). Die
                Substanz steht im Telefon darunter, nicht hier. */}
            <p className={cn("text-[16px] leading-relaxed", t.gedaempft)}>
              Every trade from a live desk, straight to your phone. Copy it or don't — it costs you nothing.
            </p>
          </div>

          {/* ── Sein Film, falls er einen hat ───────────────────────────
              Groesse pro Partner (tenant.bridgeVideo): "hero" = volle Breite,
              randlos am Handy, grosser Play (Zeko: sein Film IST die Seite);
              "card" = Karte wie bisher; "none" = reine Typo-Fassung. */}
          {tenant.pitchVideo && videoModus !== "none" && (
            <div
              className={cn(
                "br-tilt overflow-hidden border bg-black shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]",
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
              <SignalStory primary={primary} accent={accent} partnerName={tenant.name} onPrimary={knopfText} tone={hell ? "light" : "dark"} />
            </div>
          </section>

          {/* ── 3 · Dein Zug — direkt nach der Story ────────────────────────
              Diego, 06.09.: die Partnerseite soll beeindrucken, aber nicht
              festhalten. Deshalb keine Punkte-Liste und kein Beweis-Block
              mehr zwischen Story und Knopf: Story → Level → weiter. */}
          <section className="mt-6">
            <Kicker>Your turn</Kicker>
            <h2 className="mt-2 font-display text-[1.35rem] font-black leading-tight sm:text-[1.6rem]">
              Three levels. No form, no card.
            </h2>
            {/* Dieselbe Leiste laeuft auf /preview weiter (Level 1 geschafft). */}
            <LevelRail current={1} primary={primary} onPrimary={knopfText} tone={hell ? "light" : "dark"} className="mt-6" />
          </section>

          {/* ── Der einzige Weg von hier ───────────────────────────────────
              <a> statt Router: ein voller Seitenaufruf stellt sicher, dass
              /preview den gerade gesetzten Cookie liest. Der Beweis ist eine
              Zeile darunter — geprüfte Zahl, kein eigener Block. */}
          <div className="mt-8">
            {/* Am Handy uebernimmt die feste Leiste unten — sonst standen am
                Seitenende zwei identische Knoepfe uebereinander (06.09.). */}
            <Knopf className="hidden sm:inline-flex" />
            <p className={cn("text-[13px] leading-relaxed sm:mt-5", t.gedaempft)}>
              <span className="font-semibold" style={{ color: hell ? "#141210" : primary }}>Last week at the desk:</span>{" "}
              {DESK_WEEK.tpPips} pips at target · {DESK_WEEK.signals} {DESK_WEEK.instrument} signals · every entry posted before it happened.
            </p>
            <p className={cn("mt-3 text-[12.5px] leading-relaxed", t.leise)}>
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
