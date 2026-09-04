/**
 * Die Partner-Brücke — eine Bildschirmhöhe, ein Knopf, kein Scrollen.
 *
 * WARUM DIESE SEITE KURZ IST
 * Die lange Partnerseite erklärt, was Trading ist, was alles enthalten ist und
 * warum es kostenlos sein kann. Das ist geschrieben für jemanden, der schon
 * weiß, wonach er sucht. Über einen Partner-Reel kommt aber jemand herein, der
 * gerade "TRADE" unter ein Video geschrieben hat — oft ohne Vorwissen, oft
 * nicht auf Englisch zu Hause. Für den ist jede zusätzliche Zeile eine Hürde,
 * keine Information.
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
 * KEIN VIDEO HIER. Der Film liegt auf der Cosmos-Seite, wohin der Knopf führt —
 * er ist Cosmos' Film, und ihn hier zu zeigen hieße, ihn als den des Partners
 * auszugeben. Diese Seite ist der Übergang, nicht das Ziel.
 *
 * DIE HERKUNFT MUSS HIER GESETZT WERDEN. Der Besucher verlässt diese Seite
 * sofort Richtung Cosmos. Passiert das Setzen des cosmo_ref-Cookies erst dort,
 * ist der Partner verloren — und `members.referred_by_tenant` ist nach dem
 * Anlegen gesperrt, das lässt sich später nicht reparieren.
 */
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { writePartnerBrand } from "@/lib/partner-brand";
import type { TenantConfig } from "@/lib/tenants";

const PUNKTE = [
  {
    icon: "📲",
    title: "Every trade, as it happens",
    body: "The moment our traders go in, it's on your phone — entry, stop and target. Nothing to work out yourself.",
  },
  {
    icon: "🎓",
    title: "Learn it if you want to",
    body: "A full academy comes with it, free. Most people just follow the calls. That works too.",
  },
  {
    icon: "💸",
    title: "Nothing to pay us",
    body: "No fees, no subscription. You fund your own broker account and the money stays yours.",
  },
];

export function TenantBridgeView({ tenant }: { tenant: TenantConfig }) {
  const primary = tenant.primaryColor;
  const accent = tenant.accentColor;

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Identisch zur langen Seite — siehe Kopfkommentar: die Herkunft muss
    // gesetzt sein, BEVOR der Besucher weiterklickt.
    document.cookie = `cosmo_ref=${encodeURIComponent(tenant.slug)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    writePartnerBrand(tenant);

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070e] font-sans text-white">
      {/* Zwei weiche Lichter in der Partnerfarbe. Die lange Seite trägt ihre
          Marke über Abschnitte; hier gibt es nur einen Bildschirm, also muss
          der Hintergrund die Markenfarbe tragen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full opacity-25 blur-[110px]"
        style={{ background: primary }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -right-24 h-[30rem] w-[30rem] rounded-full opacity-20 blur-[120px]"
        style={{ background: accent }}
      />

      {/* pb-44 auf dem Telefon: der Cookie-Balken sitzt fest am unteren Rand und
          deckte den Knopf zu — auf einer Seite, deren einziger Zweck dieser
          Knopf ist. Gemessen bei 375x812; auf sm faellt der Balken schmaler
          aus und die Reserve schrumpft. */}
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 pb-44 pt-8 sm:px-8 sm:pb-24 sm:pt-10">
        {/* Absender: wessen Seite das ist, und mit wem. Beides klein — der
            Besucher kennt den Partner schon, deshalb hat er geklickt. */}
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-black text-black"
            style={{ background: primary }}
          >
            {tenant.logoInitials}
          </span>
          <span className="text-sm font-semibold">{tenant.name}</span>
          <span className="text-sm text-white/30">×</span>
          <span className="text-sm text-white/55">Cosmos Candles</span>
        </div>

        <h1 className="mt-7 font-display text-[2rem] font-black leading-[1.08] tracking-tight sm:text-[2.75rem]">
          You don't have to learn trading
          <br />
          <span
            style={{
              background: `linear-gradient(100deg, ${primary}, ${accent})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            to make money from it.
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-base">
          Our desk trades live every day. You see every position the second it opens —
          entry, stop, target. Follow it or don't. It costs you nothing.
        </p>

        <ul className="mt-8 space-y-3.5">
          {PUNKTE.map((p) => (
            <li key={p.title} className="flex gap-3.5">
              <span className="mt-0.5 text-xl leading-none">{p.icon}</span>
              <div>
                <div className="text-[15px] font-bold">{p.title}</div>
                <div className="mt-1 text-sm leading-relaxed text-white/60">{p.body}</div>
              </div>
            </li>
          ))}
        </ul>

        {/* Ein einziger Weg von dieser Seite. Absichtlich ein <a> auf "/" statt
            einer Router-Navigation: der Wechsel soll sich wie ein Übergang zu
            einer anderen Seite anfühlen, und ein voller Seitenaufruf stellt
            sicher, dass die Cosmos-Seite den gerade gesetzten Cookie liest. */}
        <a
          href="/"
          className="group mt-9 inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-full px-8 text-[15px] font-black text-black transition-transform active:scale-[0.98]"
          style={{
            background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 88%, white), ${primary})`,
            boxShadow: `0 10px 30px -14px ${primary}, inset 0 1px 0 rgba(255,255,255,0.45)`,
          }}
        >
          Continue to Cosmos Candles
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>

        <p className="mt-4 text-[13px] text-white/45">
          {tenant.name} runs this with Cosmos Candles — that's where you get in.
        </p>
      </div>
    </div>
  );
}
