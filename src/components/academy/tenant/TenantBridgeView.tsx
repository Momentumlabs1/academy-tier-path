/**
 * Die Partner-Brücke — eine Bildschirmhöhe, ein Knopf, kein Scrollen.
 *
 * WARUM DIESE SEITE KURZ IST
 * Die lange Partnerseite erklärt, was Trading ist und was alles enthalten ist.
 * Das ist für jemanden geschrieben, der schon weiß, wonach er sucht. Über ein
 * Partner-Reel kommt aber jemand, der gerade "TRADE" unter ein Video
 * geschrieben hat — oft ohne Vorwissen, oft nicht auf Englisch zu Hause. Für
 * den ist jede zusätzliche Zeile eine Hürde, keine Information.
 *
 * Also genau drei Aussagen und ein Knopf:
 *   1. Du musst Trading nicht können.
 *   2. Lernen kannst du es trotzdem, umsonst.
 *   3. Du zahlst uns nichts.
 *
 * DIE REIHENFOLGE IST DIE BOTSCHAFT. Die Akademie steht bewusst an zweiter
 * Stelle: Vordergrund ist die Signalgruppe, weil das der Grund ist, aus dem
 * jemand klickt. Wer die Akademie nach vorne stellt, verkauft einen Kurs an
 * Leute, die keinen Kurs wollten.
 *
 * WARUM ES HIER KEINE EMOJI-LISTE MEHR GIBT (Ansage 05.09.)
 * Die erste Fassung hatte 📲 🎓 💸 vor den drei Punkten. Emoji als
 * Aufzählungszeichen sind das billigste verfügbare Signal — sie stehen in jeder
 * schnell zusammengeklickten Seite. Bei einem Angebot, bei dem es um Geld geht,
 * kostet das Vertrauen. Nummern mit Haarlinien tragen dieselbe Struktur und
 * sehen aus, als hätte jemand nachgedacht.
 *
 * DAS VIDEO läuft nur, wenn der Partner ein EIGENES hat. Cosmos' Film gehört
 * hier nicht hin — ihn hier zu zeigen hieße, ihn als den des Partners
 * auszugeben. Wer keins hat, bekommt die reine Typo-Fassung; die trägt sich.
 *
 * DIE HERKUNFT MUSS HIER GESETZT WERDEN. Der Besucher verlässt diese Seite
 * sofort. Passiert das Setzen erst eine Seite später, ist der Partner verloren —
 * und `members.referred_by_tenant` ist nach dem Anlegen gesperrt.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { stampAttribution } from "@/lib/partner-brand";
import type { TenantConfig } from "@/lib/tenants";

const PUNKTE = [
  {
    title: "Every trade, as it happens",
    body: "The moment our traders go in, it's on your phone — entry, stop and target. Nothing to work out yourself.",
  },
  {
    title: "Learn it if you want to",
    body: "A full academy comes with it, free. Most people just follow the calls. That works too.",
  },
  {
    title: "Nothing to pay us",
    body: "No fees, no subscription. You fund your own broker account and the money stays yours.",
  },
];

export function TenantBridgeView({ tenant }: { tenant: TenantConfig }) {
  const primary = tenant.primaryColor;
  const accent = tenant.accentColor;

  /**
   * Hell oder dunkel — und zwar an EINER Stelle entschieden.
   *
   * Vorher war die Seite fest dunkel. Das ist unsere Buehne, nicht die des
   * Partners: wer aus einem Reel mit cremefarbenem Papier kommt und auf
   * Tiefschwarz landet, erlebt einen Bruch genau in dem Moment, in dem er
   * entscheidet, ob das hier noch dieselbe Person ist.
   *
   * Die Werte stehen als Objekt und nicht als verstreute Bedingungen im JSX:
   * ein Ton, den man an neun Stellen einzeln umschaltet, bleibt irgendwann an
   * einer davon stehen, und genau die faellt niemandem auf.
   */
  /**
   * Die Schrift AUF dem Knopf folgt der Helligkeit der Knopffarbe.
   *
   * Vorher stand hier `text-black` fest. Das stimmte, solange jeder Partner
   * eine helle Signalfarbe hatte. SmartEggface zeichnet mit schwarzer Tinte —
   * sein Knopf ist tintenschwarz, und die Beschriftung waere unsichtbar
   * gewesen. Ein Knopf ohne lesbare Beschriftung ist auf einer Seite, die genau
   * einen Knopf hat, das Ende des Trichters.
   *
   * Grobe Helligkeit nach Rec.601 reicht: wir entscheiden nur zwischen zwei
   * Textfarben, nicht ueber eine Palette.
   */
  const knopfText = (() => {
    const hex = (tenant.primaryColor || "").trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return "#000";                       // oklch o.ae.: bisheriges Verhalten
    const n = parseInt(m[1], 16);
    const helligkeit = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
    return helligkeit > 140 ? "#000" : "#fff";
  })();

  const hell = tenant.theme === "light";
  const t = hell
    ? {
        grund: "#F3EFE4",          // sein Papier
        text: "text-[#141210]",
        gedaempft: "text-[#141210]/65",
        leise: "text-[#141210]/45",
        linie: "border-[#141210]/12",
        teiler: "divide-[#141210]/10",
        rahmen: "border-[#141210]/12",
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
        koernung: 0.05,
        leuchten: 0.22,
      };
  const video = useRef<HTMLVideoElement>(null);
  const [laeuft, setLaeuft] = useState(false);

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

  // KEIN overflow-hidden am Wurzelelement.
  //
  // Es stand hier, um das Leuchten am Rand abzuschneiden. Sobald der Inhalt
  // hoeher wurde als der Bildschirm — mit dem Partnervideo ist er das —, schnitt
  // es stattdessen die halbe Seite ab: der Knopf lag bei 2613px und die Seite
  // liess sich ueberhaupt nicht scrollen. Gemessen am 05.09.
  //
  // Noetig ist es nicht mehr: die beiden Schmuckschichten sind `fixed` und
  // haengen am Fenster, nicht an diesem Kasten.
  return (
    <div className={cn("relative min-h-screen font-sans", t.text)} style={{ background: t.grund }}>
      {/* ATMOSPHÄRE STATT FARBFLÄCHE.
          Eine einzelne weiche Lichtquelle in der Partnerfarbe, dazu ein feines
          Rauschen darüber. Das Rauschen ist der Unterschied zwischen "dunkler
          Hintergrund" und "Oberfläche": ohne es wirkt jede dunkle Seite flach
          und billig, und zwar auf jedem Bildschirm. */}
      {/* FEST STATT MITSCROLLEND, UND OHNE MISCHMODUS.
          Beide Schichten lagen vorher `absolute` im scrollenden Kasten, die
          Koernung zusaetzlich mit mix-blend-overlay. Beim Scrollen zeichnete
          Chromium daraus einen harten navyfarbenen Block ueber die halbe Seite
          — ein Kompositions-Fehler, den Mischmodus plus grosse Weichzeichnung
          zuverlaessig ausloesen. Am 05.09. auf Telefon UND Rechner gesehen.

          `fixed` haelt die Atmosphaere ruhig stehen, waehrend der Inhalt
          darueber laeuft; das sieht ohnehin besser aus als eine mitfahrende
          Lichtquelle. Die Koernung traegt ihre Wirkung ueber Deckkraft allein. */}
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

      {/* MITTIG NUR SOLANGE ES PASST.
          Vorher stand hier `justify-center` auf einem min-h-screen-Kasten. Ist
          der Inhalt hoeher als der Bildschirm — mit dem Partnervideo ist er das
          —, schiebt zentriertes Flexbox den Ueberhang aus dem scrollbaren
          Bereich heraus: Punkt 03 und der Knopf waren schlicht nicht mehr
          erreichbar, obwohl die Seite bis zum Ende gescrollt war. Gemessen am
          05.09. bei 375x812.

          `my-auto` auf dem Inhalt macht dasselbe, ohne den Fehler: es zentriert,
          wenn Platz ist, und faellt auf normalen Fluss zurueck, wenn nicht. */}
      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col sm:max-w-2xl">
        <div className="my-auto w-full px-5 pb-44 pt-8 sm:px-8 sm:pb-24 sm:pt-12">

        {/* ── Absender ────────────────────────────────────────────────────
            Wessen Seite das ist, und mit wem. Eine Haarlinie darunter statt
            einer Kastenfläche: sie trennt, ohne ein Element zu behaupten. */}
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

        {/* ── Die Aussage ─────────────────────────────────────────────────
            Unbounded läuft breit; auf dem Telefon trägt die Zeile deshalb
            weniger Wörter als man erwartet. Der zweite Teil steht in der
            Partnerfarbe — EIN Akzent, nicht drei. */}
        <h1 className="mt-9 font-display text-[1.75rem] font-black leading-[1.12] tracking-[-0.02em] sm:text-[2.4rem]">
          You don't have to learn trading
          <br />
          <span style={{ color: primary }}>to make money from it.</span>
        </h1>

        <p className={cn("mt-5 max-w-lg text-[15px] leading-relaxed", t.gedaempft)}>
          Our desk trades live every day. You see every position the second it opens —
          entry, stop, target. Follow it or don't. It costs you nothing.
        </p>

        {/* ── Sein Film, falls er einen hat ───────────────────────────────
            Er steht NACH der Aussage, nicht davor: wer aus einem Reel kommt,
            hat gerade ein Video gesehen und braucht erst einen Satz, der sagt,
            worum es hier geht. Ein zweites Video als Erstes wäre eine Zumutung. */}
        {tenant.pitchVideo && (
          <div className={cn("mt-8 overflow-hidden rounded-xl border bg-black shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]", t.rahmen)}>
            <div className="relative aspect-video bg-black">
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
                    className="flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-white/25 transition-transform duration-200 group-hover:scale-105"
                    style={{ background: primary, boxShadow: `0 12px 34px -12px ${primary}` }}
                  >
                    <PlayCircle className="h-7 w-7" style={{ color: knopfText }} />
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Die drei Punkte ─────────────────────────────────────────────
            Nummeriert, mit Haarlinien getrennt. Die Ziffer steht in der
            Display-Schrift und in gedämpfter Partnerfarbe — sie ordnet, ohne
            um Aufmerksamkeit zu bitten. */}
        <ul className={cn("mt-9 divide-y border-y", t.teiler, t.linie)}>
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

        {/* ── Der einzige Weg von hier ────────────────────────────────────
            Absichtlich ein <a> und keine Router-Navigation: ein voller
            Seitenaufruf stellt sicher, dass /preview den gerade gesetzten
            Cookie liest. */}
        <a
          href="/preview"
          className="group relative mt-9 inline-flex min-h-[56px] items-center justify-center gap-2.5 overflow-hidden rounded-full px-8 text-[15px] font-black transition-transform duration-200 active:scale-[0.985]"
          style={{
            color: knopfText,
            background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 90%, white), ${primary})`,
            boxShadow: `0 14px 38px -16px ${primary}, inset 0 1px 0 rgba(255,255,255,0.5)`,
          }}
        >
          {/* Ein Lichtstreifen, der beim Überfahren einmal durchläuft. Eine
              Bewegung auf der ganzen Seite, an der Stelle, auf die es ankommt. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] transition-all duration-700 ease-out group-hover:left-[150%]"
            style={{ background: knopfText === "#fff" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.28)" }}
          />
          <span className="relative">See what's waiting for you</span>
          <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>

        <p className={cn("mt-4 text-[12.5px] leading-relaxed", t.leise)}>
          {tenant.name} runs this with Cosmos Candles — that's where you get in.
        </p>
        </div>
      </div>
    </div>
  );
}
