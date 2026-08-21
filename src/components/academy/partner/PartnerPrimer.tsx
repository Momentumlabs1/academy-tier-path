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

/** Die drei Glieder der Kette, in der Reihenfolge, in der sie passieren. */
const CHAIN = [
  {
    icon: MessageSquare,
    title: "Deine Leute kommen über deinen Link",
    body: "Sie landen auf deiner eigenen Seite — dein Name, deine Farben. Von uns steht dort nichts.",
  },
  {
    icon: Wallet,
    title: "Sie eröffnen ihr Konto beim Broker",
    body: "Auf ihren eigenen Namen. Ihr Geld bleibt ihres, sie können es jederzeit abheben. Du hältst nie fremdes Geld.",
  },
  {
    icon: Radio,
    title: "Sie handeln — und jeder Lot zahlt dir",
    body: `Der Broker rechnet uns ab, wir dir: ${USD_PER_LOT} $ pro gehandeltem Lot. Kein Abo, keine Gebühr für deine Leute.`,
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
          {name ? `${name} — das hier ist deine Schaltzentrale.` : "Das hier ist deine Schaltzentrale."}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Wir bauen dir eine komplette Trading-Akademie unter deinem Namen: eigene Seite, eigene
          Telegram-Kanäle, eigener Bot, dieselben Signale und Lektionen, die auch bei uns laufen.
          Du bringst dein Publikum mit — Desk, Technik und die Abrechnung mit dem Broker machen wir.
          Auf dieser Seite siehst du später, wie viele Leute gekommen sind, wer gehandelt hat und
          was für dich zusammengekommen ist.
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
          <h4 className="text-sm font-bold">Rechne es selbst nach</h4>
        </div>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Ein Lot ist die Größe eines Trades. Fest ist nur der Satz — {USD_PER_LOT} $ pro Lot.
          Die zwei anderen Zahlen schiebst du:
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium">Leute, die wirklich handeln</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">{customers}</span>
            </span>
            <input
              type="range" min={1} max={100} step={1} value={customers}
              onChange={(e) => setCustomers(Number(e.target.value))}
              aria-label="Leute, die wirklich handeln"
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-primary"
            />
          </label>

          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium">Lots pro Person im Monat</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">{lots}</span>
            </span>
            <input
              type="range" min={1} max={60} step={1} value={lots}
              onChange={(e) => setLots(Number(e.target.value))}
              aria-label="Lots pro Person im Monat"
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-primary"
            />
          </label>
        </div>

        {/* Die Kette sichtbar ausgeschrieben — nicht nur das Ergebnis. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-white/8 bg-black/25 px-4 py-3 font-mono text-[13px]">
          <span className="tabular-nums">{customers}</span>
          <span className="text-muted-foreground">Personen</span>
          <span className="text-muted-foreground">×</span>
          <span className="tabular-nums">{lots}</span>
          <span className="text-muted-foreground">Lots</span>
          <span className="text-muted-foreground">×</span>
          <span className="tabular-nums">{USD_PER_LOT} $</span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
          <span className="font-sans text-base font-black text-primary tabular-nums">{money(calc.monthly)}</span>
          <span className="font-sans text-muted-foreground">/ Monat</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["Lots im Monat", calc.totalLots.toLocaleString("de-DE")],
            ["Pro Monat", money(calc.monthly)],
            ["Auf ein Jahr", money(calc.yearly)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
              <div className="mt-0.5 font-display text-xl font-black tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Das ist eine Rechnung, keine Zusage. Wie viel jemand handelt, entscheidet er selbst — und
          Trading ist riskant; viele verlieren Geld. Ausgezahlt wird, was tatsächlich gehandelt wurde,
          und genau das steht dann auf dieser Seite.
        </p>
      </div>
    </div>
  );
}
