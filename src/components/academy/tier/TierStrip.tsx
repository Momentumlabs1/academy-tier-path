import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useMemberState } from "@/hooks/useMemberState";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * TierStrip — der Stufenstand als EINE Zeile, fuer Mitglieder, die schon
 * eingezahlt haben.
 *
 * WARUM DIE GROSSE LEITER DANN VERSCHWINDET
 * "Your Deposit Path" ist am ersten Tag die wichtigste Flaeche der Seite: sie
 * sagt einem Besucher, was ihn 100 EUR weiter erwartet. Ab dem Moment, in dem
 * er eingezahlt hat, ist genau diese Frage beantwortet — und ein
 * bildschirmfuellender Balken ueber einer Sache, die man erledigt hat, draengt
 * alles weg, was jetzt zaehlt: Signale, Lektionen, Werkzeuge.
 *
 * Deshalb zwei Zustaende statt einer Groesse fuer beide:
 *   nicht eingezahlt -> DepositLadder, gross, oben, leuchtend
 *   eingezahlt       -> diese Zeile, klein, weiter unten
 *
 * Was hier stehen bleibt, ist das Wenige, das ein Mitglied spaeter wirklich
 * noch wissen will: welche Stufe gilt, wie weit zur naechsten, was insgesamt
 * eingezahlt wurde. Der Rest lebt auf /tier, einen Klick entfernt.
 */
export function TierStrip() {
  const state = useMemberState();
  const tier = state.currentTier;
  const next = state.nextTier;
  if (!state.loaded || !tier) return null;

  const pct = Math.round((state.progressPctToNext ?? 0) * 100);

  return (
    <Link
      to="/tier"
      className={cn(
        "group flex items-center gap-4 rounded-[var(--radius)] border border-white/8",
        "bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.05]",
        "sm:px-5",
      )}
    >
      {/* Stufe — der einzige Teil, der Farbe bekommt */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "color-mix(in oklch, var(--primary) 18%, transparent)",
          border: "1px solid color-mix(in oklch, var(--primary) 45%, transparent)",
        }}
      >
        <Check className="h-4 w-4 text-primary" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display text-sm font-bold">{tier.name}</span>
          <span className="text-[11px] text-muted-foreground">
            {formatMoney(state.lifetimeDeposits, "€")} deposited
          </span>
        </div>

        {/* Der Balken nur, WENN es noch etwas zu erreichen gibt. Auf der
            hoechsten Stufe waere ein voller Balken reine Deko. */}
        {next ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: "var(--primary)" }}
              />
            </span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
              {formatMoney(state.nextTierRemaining, "€")} to {next.name}
            </span>
          </div>
        ) : (
          <div className="mt-1 text-[11px] text-muted-foreground">
            Highest level — everything is unlocked.
          </div>
        )}
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
