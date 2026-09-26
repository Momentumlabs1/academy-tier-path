/**
 * /preview — die ECHTE Akademie, gesperrt, ohne Anmeldung.
 *
 * Ansage Diego 19.09.: "Man sollte doch dann in der echten Academy landen, die
 * aber noch gesperrt ist, mit dem Video von Cosmo als Opener. Man soll auf dem
 * Handy auch unten schon die Menueleiste sehen, um das Gefuehl zu bekommen, man
 * ist da in was — dann leitet es zu Telegram."
 *
 * Bis dahin war /preview eine eigene Seite (Film, Knopf, darunter ein Bild des
 * Dashboards hinter einem Schloss). Jetzt ist es das Dashboard selbst: dieselbe
 * Seitenleiste, dieselbe Kopfzeile, auf dem Handy dieselbe Leiste unten, und
 * darin das Dashboard eines Mitglieds, das noch nicht eingezahlt hat. Cosmos
 * Film kommt als Willkommensfenster (WelcomeModal, fuer Besucher ueber einen
 * Partner), danach fuehrt alles nach Telegram.
 *
 * WIE DAS OHNE KONTO GEHT
 * Wie /filmset: MemberProvider mit festem Stand (override) — ein Gast mit 0 €
 * Einzahlung. Es wird nichts angelegt und nichts gelesen; das Konto entsteht
 * spaeter aus der Einzahlung (bot-unlock). RegistrationGate laeuft hier nicht,
 * sonst wuerde der Besucher zu /signup umgeleitet.
 *
 * ALLE KLICKS BLEIBEN HIER
 * Die Menuepunkte zeigen auf Seiten, die eine Anmeldung brauchen. Ein Klick
 * darauf wuerde den Besucher aus dem Gefuehl "ich bin drin" reissen. Deshalb
 * faengt die Seite jeden Link ab: Telegram-Links gehen an den Telegram-Link des
 * PARTNERS (dort reist seine Herkunft mit — tenant_invite_links), alles andere
 * zeigt kurz "gesperrt, oeffnet sich ueber Telegram".
 *
 * DIE HERKUNFT WIRD HIER NICHT NEU GESETZT (stampAttribution laeuft nicht): der
 * Besucher kommt von der Partnerseite, sein cosmo_ref steht bereits.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Lock, Send, X } from "lucide-react";
import { MemberProvider, type MemberOverride } from "@/hooks/useMemberState";
import { Sidebar } from "@/components/academy/layout/Sidebar";
import { TopNav } from "@/components/academy/layout/TopNav";
import { RightRail } from "@/components/academy/layout/RightRail";
import { MobileNav } from "@/components/academy/layout/MobileNav";
import { usePartnerBrand } from "@/lib/partner-brand";
import { TELEGRAM_ENTRY } from "@/lib/broker";
import { COSMOS_MASTER } from "@/lib/tenants";
import { Dashboard } from "./_app.index";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Your academy — Cosmos Candles" },
      { name: "description", content: "Everything is ready. One step opens it." },
    ],
  }),
  component: Preview,
});

function Preview() {
  const brand = usePartnerBrand();
  const primary = brand?.primaryColor ?? COSMOS_MASTER.primaryColor;
  // Derselbe Vorrang wie auf der Partnerseite: der Partner zuerst, sonst wir.
  // Faellt der Partner hier weg, gehoert der Kunde spaeter dem Haus.
  const telegram = brand?.telegramChannel || COSMOS_MASTER.telegramChannel || TELEGRAM_ENTRY.url;
  const [gesperrt, setGesperrt] = useState(false);

  // Ein Gast: nichts eingezahlt, Willkommen noch nicht gesehen. Cosmos Film ist
  // hier IMMER der Opener (Ansage 19.09.) — das WelcomeModal zeigt ihn jedem,
  // dessen Herkunft nicht "cosmos-candles" ist, also steht hier der Partner
  // oder, ohne Partner, "preview". Die Marke kommt erst nach dem ersten Render
  // (Cookie), deshalb useMemo auf brand statt eines einmaligen Anfangswerts.
  const gast = useMemo<MemberOverride>(() => ({
    memberId: "preview",
    profile: { name: "You", email: "", telegramHandle: "", joinedAt: new Date().toISOString(), avatarUrl: "" },
    deposit: 0,
    monthlyLots: 0,
    activityStatus: "active",
    disabled: false,
    tierOverride: null,
    referredBy: brand?.slug || "preview",
    onboardingSeenAt: null,
    notifications: [],
  }), [brand?.slug]);

  function abfangen(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    const href = a.getAttribute("href") ?? "";
    if (/t\.me\//i.test(href) || a.dataset.telegram !== undefined) {
      window.open(telegram, "_blank", "noopener,noreferrer");
      return;
    }
    setGesperrt(true);
  }

  return (
    <MemberProvider override={gast}>
      {/* Derselbe Grund wie die Seite davor: der Uebergang von der Partnerseite
          hierher soll unsichtbar sein, nicht wie ein Seitenwechsel wirken. */}
      <div onClickCapture={abfangen}
           className="min-h-screen bg-[color:var(--surface-public)] p-3 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:p-4 lg:pb-4">
        <div className="flex gap-6">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-x-hidden">
            <TopNav />

            {/* Wer den Besucher hergeschickt hat, bleibt sichtbar — er hat wegen
                dieser Person geklickt. Und der eine Schritt, der alles oeffnet. */}
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              {brand ? (
                <div className="flex items-center gap-2 text-sm">
                  {brand.mascotHeadUrl ? (
                    <img src={brand.mascotHeadUrl} alt={brand.name} className="h-7 w-7 rounded-lg bg-white object-contain"
                         style={{ boxShadow: `0 0 0 1.5px ${primary}` }} />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black text-black"
                          style={{ background: primary }}>{brand.logoInitials}</span>
                  )}
                  <span className="font-semibold">{brand.name}</span>
                  <span className="text-white/30">×</span>
                  <span className="text-white/55">Cosmos Candles</span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5 text-xs text-white/55">
                <Lock className="h-3.5 w-3.5" /> Your academy is ready — one step opens it.
              </div>
              <a href={telegram} data-telegram
                 className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-black"
                 style={{ background: `linear-gradient(180deg, color-mix(in oklch, ${primary} 88%, white), ${primary})` }}>
                <Send className="h-4 w-4" /> Connect Telegram <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <Dashboard />
          </main>
          <RightRail />
        </div>
        <MobileNav />
      </div>

      {gesperrt && (
        <div className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-md rounded-2xl border border-white/10 bg-[oklch(0.16_0.04_258)] p-4 shadow-2xl lg:bottom-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: primary }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">Unlocks on Telegram</div>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                Everything in here opens once you're in: signals, lessons and tools. It all starts on Telegram.
              </p>
              <a href={telegram} target="_blank" rel="noopener noreferrer" onClick={() => setGesperrt(false)}
                 className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-black"
                 style={{ background: primary }}>
                Connect Telegram <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <button onClick={() => setGesperrt(false)} aria-label="Close" className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </MemberProvider>
  );
}
