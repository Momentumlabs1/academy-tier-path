/**
 * PartnerPrimer — was ein Partner als Erstes verstehen muss: wo er gelandet
 * ist, wie hier Geld entsteht, und woran er es selbst nachrechnen kann.
 *
 * WARUM DAS DAS ABFRAGE-FORMULAR ERSETZT
 * Vorher stand an dieser Stelle „Sag uns, wo dein Publikum ist" — sechs
 * Eingabefelder, bevor der Partner überhaupt wusste, was das hier ist. Das ist
 * die falsche Richtung: am ersten Tag hat er eine Frage („was springt dabei
 * raus und wie läuft das?"), nicht den Wunsch, ein Profil auszufüllen. Erst
 * erklären, dann fragen.
 *
 * DIE RECHNUNG IST BEWUSST NACHVOLLZIEHBAR, KEIN VERSPRECHEN
 * Genau ein Wert ist gesetzt: 6 USD pro Lot — das ist der echte Satz aus
 * COMMISSION_LADDER, derselbe bei beiden Brokern. Alles andere schiebt der
 * Partner selbst: wie viele Leute handeln, und wie viel sie handeln. So sieht
 * er die Kette statt einer Zahl, die wir ihm hinstellen:
 *
 *     Kunden × Lots je Kunde × 6 $ = dein Monat
 *
 * Deshalb steht auch nirgends ein „du verdienst X". Die Voreinstellung ist
 * absichtlich klein (5 Kunden, 8 Lots) — eine geschönte Voreinstellung wäre
 * genau die Sorte Zahl, die später als Zusage gelesen wird.
 */
import { useMemo, useState } from "react";
import { ArrowRight, Calculator, MessageSquare, Radio, Wallet } from "lucide-react";
import { COMMISSION_LADDER } from "@/lib/commission";

const USD_PER_LOT = COMMISSION_LADDER[0].usdPerLot; // 6 — eine Rate, beide Broker

const money = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

/**
 * Die drei Glieder der Kette, in der Reihenfolge, in der sie passieren.
 *
 * WER ZAHLT: der Broker, direkt an den Partner. Hier stand "Der Broker rechnet
 * uns ab, wir dir" — das war schlicht falsch. Der Partner haengt als eigener
 * IB unter dem Master, seine 6 $/Lot kommen vom Broker auf sein Konto, nicht
 * ueber uns. Eine falsche Aussage darueber, WOHER das Geld kommt, ist die
 * Sorte Satz, an die sich jemand erinnert, wenn eine Zahlung ausbleibt.
 */
const CHAIN = [
  {
    icon: MessageSquare,
    title: "Your people come through your link",
    body: "They land on your own page — your name, your colors. Nothing from us shows up there.",
  },
  {
    icon: Wallet,
    title: "They open their account with the broker",
    body: "In their own name. Their money stays theirs, they can withdraw it any time. You never hold anyone else's money.",
  },
  {
    icon: Radio,
    title: "They trade — and every lot pays you",
    body: `The broker pays you directly — $${USD_PER_LOT} per lot your people trade. It never passes through us. No subscription, no fee for your people.`,
  },
];

export function PartnerPrimer({ name }: { name?: string }) {
  const [customers, setCustomers] = useState(5);
  const [lots, setLots] = useState(8);

  const calc = useMemo(() => {
    const totalLots = customers * lots;
    return { totalLots, monthly: totalLots * USD_PER_LOT, yearly: totalLots * USD_PER_LOT * 12 };
  }, [customers, lots]);

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* ── Wo du hier bist ────────────────────────────────────────────── */}
      <div className="border-b border-white/8 p-5 sm:p-7">
        <h3 className="font-display text-lg font-bold sm:text-xl">
          {name ? `${name} — this is your control room.` : "This is your control room."}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          We build you a complete trading academy under your name: your own page, your own
          Telegram channels, your own bot, the same signals and lessons that run on ours.
          You bring your audience — the desk, the tech and the settlement with the broker are on us.
          Later, this page shows you how many people came, who traded, and what has added up
          for you.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {CHAIN.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
                  {i + 1}
                </span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2.5 text-[13px] font-bold leading-snug">{s.title}</div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rechne es selbst nach ──────────────────────────────────────── */}
      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-bold">Run the numbers yourself</h4>
        </div>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          A lot is the size of a trade. Only the rate is fixed — ${USD_PER_LOT} per lot.
          The other two numbers are yours to move:
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium">People who actually trade</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">{customers}</span>
            </span>
            <input
              type="range" min={1} max={100} step={1} value={customers}
              onChange={(e) => setCustomers(Number(e.target.value))}
              aria-label="People who actually trade"
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-primary"
            />
          </label>

          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium">Lots per person per month</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">{lots}</span>
            </span>
            <input
              type="range" min={1} max={60} step={1} value={lots}
              onChange={(e) => setLots(Number(e.target.value))}
              aria-label="Lots per person per month"
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-primary"
            />
          </label>
        </div>

        {/* Die Kette sichtbar ausgeschrieben — nicht nur das Ergebnis. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-white/8 bg-black/25 px-4 py-3 font-mono text-[13px]">
          <span className="tabular-nums">{customers}</span>
          <span className="text-muted-foreground">people</span>
          <span className="text-muted-foreground">×</span>
          <span className="tabular-nums">{lots}</span>
          <span className="text-muted-foreground">lots</span>
          <span className="text-muted-foreground">×</span>
          <span className="tabular-nums">${USD_PER_LOT}</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
          <span className="font-sans text-base font-black text-primary tabular-nums">{money(calc.monthly)}</span>
          <span className="font-sans text-muted-foreground">/ month</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["Lots per month", calc.totalLots.toLocaleString("en-US")],
            ["Per month", money(calc.monthly)],
            ["Over a year", money(calc.yearly)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
              <div className="mt-0.5 font-display text-xl font-black tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          This is a calculation, not a promise. How much someone trades is up to them — and
          trading is risky; many people lose money. The broker pays on what was actually traded,
          and that is exactly what this page will show.
        </p>
      </div>
    </div>
  );
}
