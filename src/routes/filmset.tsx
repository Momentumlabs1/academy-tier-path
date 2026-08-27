/**
 * /filmset — Aufnahmestudio fuer Marketingmaterial.
 *
 * WOFUER
 * Fuer Werbevideos muss die Mitglieder-Oberflaeche gefilmt werden. Das darf
 * NICHT ueber einen echten Account laufen: dessen Ansicht traegt echten Namen,
 * echte E-Mail und echte Einzahlung, und all das landete sonst in einem
 * oeffentlichen Video. Diese Route zeigt dieselben Seiten mit einem klar als
 * Demo erkennbaren Mitgliedsstand.
 *
 * WARUM SIE NICHT UNTER _app HAENGT
 * Unter _app sitzt die RegistrationGate. Statt sie zu umgehen — was von aussen
 * wie ein Auth-Bypass aussieht und es im Zweifel auch waere — steht diese Route
 * daneben und bringt ihren eigenen Kontext mit. An der Absicherung des echten
 * Mitgliederbereichs aendert sich damit nichts.
 *
 * ES WERDEN DIESELBEN KOMPONENTEN GERENDERT wie im Produkt (Dashboard,
 * LessonsPage, TierPage, SignalsPage). Kein Nachbau, der auseinanderlaeuft:
 * aendert sich die echte Seite, aendert sich das Filmset mit.
 *
 * BENUTZUNG
 *   /filmset                 -> Dashboard
 *   /filmset?view=lessons    -> Lektionskatalog
 *   /filmset?view=tier       -> Stufen
 *   /filmset?view=signals    -> Signale
 *   &chrome=0                -> ohne Seitenleiste/Kopfzeile (nur der Inhalt)
 */
import { createFileRoute } from "@tanstack/react-router";
import { MemberProvider, type MemberOverride } from "@/hooks/useMemberState";
import { Sidebar } from "@/components/academy/layout/Sidebar";
import { TopNav } from "@/components/academy/layout/TopNav";
import { RightRail } from "@/components/academy/layout/RightRail";
import { Dashboard } from "./_app.index";
import { LessonsPage } from "./_app.lessons.index";
import { TierPage } from "./_app.tier";
import { SignalsPage } from "./_app.signals";

interface FilmsetSearch {
  view?: "dashboard" | "lessons" | "tier" | "signals";
  chrome?: string;
}

export const Route = createFileRoute("/filmset")({
  head: () => ({ meta: [{ title: "Filmset — Cosmos Candles Academy" }, { name: "robots", content: "noindex, nofollow" }] }),
  validateSearch: (s: Record<string, unknown>): FilmsetSearch => {
    const views: FilmsetSearch["view"][] = ["dashboard", "lessons", "tier", "signals"];
    return {
      view: views.find((v) => v === s.view) ?? "dashboard",
      chrome: typeof s.chrome === "string" ? s.chrome : undefined,
    };
  },
  component: Filmset,
});

/**
 * Erkennbar erfunden, aber plausibel: Operator-Stufe (2.000 EUR Schwelle),
 * aktiv gehandelt, ein paar Benachrichtigungen. Keine echte Person.
 */
const DEMO: MemberOverride = {
  memberId: "filmset",
  profile: {
    name: "Demo Member",
    email: "demo@cosmoscandles.academy",
    telegramHandle: "@demo",
    joinedAt: new Date(Date.now() - 62 * 864e5).toISOString(),
    avatarUrl: "",
  },
  deposit: 2400,
  monthlyLots: 1.8,
  activityStatus: "active",
  disabled: false,
  tierOverride: null,
  notifications: [
    { id: "f1", type: "announcement", title: "New signal — XAU/USD", body: "Entry 2,318.40 · SL 2,309.10 · TP1 2,331.00", createdAt: new Date(Date.now() - 36e5).toISOString(), readAt: null },
    { id: "f2", type: "tier_unlocked", title: "Operator unlocked", body: "Copy-trading and the live trading room are now open.", createdAt: new Date(Date.now() - 3 * 864e5).toISOString(), readAt: null },
    { id: "f3", type: "new_lesson", title: "New lesson published", body: "Order flow: reading the tape.", createdAt: new Date(Date.now() - 6 * 864e5).toISOString(), readAt: new Date().toISOString() },
  ],
};

function Filmset() {
  const { view, chrome } = Route.useSearch();
  const withChrome = chrome !== "0";

  const Page =
    view === "lessons" ? LessonsPage :
    view === "tier" ? TierPage :
    view === "signals" ? SignalsPage :
    Dashboard;

  return (
    <MemberProvider override={DEMO}>
      <div className="min-h-screen p-3 pb-24 lg:p-4 lg:pb-4">
        <div className="flex gap-6">
          {withChrome && <Sidebar />}
          <main className="min-w-0 flex-1 overflow-x-hidden">
            {withChrome && <TopNav />}
            <Page />
          </main>
          {withChrome && <RightRail />}
        </div>
      </div>
    </MemberProvider>
  );
}
