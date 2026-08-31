import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Radio } from "lucide-react";
import artSignals from "@/assets/a-signals.jpg";
import { SIGNALS } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
import { PageHero } from "@/components/academy/primitives/PageHero";
import { SignalOddsCard } from "@/components/academy/right-rail/SignalOddsCard";
import { TelegramConnectCard } from "@/components/academy/signals/TelegramConnectCard";
import { SignalTutorialCard } from "@/components/academy/signals/SignalTutorialCard";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { SignalTeaserRail } from "@/components/academy/right-rail/SignalTeaserRail";
import { RiskWarning } from "@/components/academy/legal/RiskWarning";
import { TELEGRAM_ENTRY } from "@/lib/broker";
import { cn } from "@/lib/utils";

// One source for the entry point. The literal that used to sit here pointed at
// a different brand's channel, inherited with the template.
//
// DER KANAL DES PARTNERS, DURCH DEN ER GEKOMMEN IST.
// Die Akademie ist fuer alle dieselbe — es gibt keine gebrandete Akademie, und
// das soll auch so bleiben. Der Telegram-Kanal ist die Ausnahme: dort laufen
// die Signale, und die kommen bei einem Zeko-Kunden aus Zekos Kanal. Hier stand
// fest unser Kanal, damit waere jeder Zeko-Kunde in unserem Chat gelandet
// statt in seinem — und Zeko haette den Kunden, den er gebracht hat, nie
// gesehen. Ohne Partner (Direktzugang) bleibt es unser Kanal.

export const Route = createFileRoute("/_app/signals")({
  head: () => ({
    meta: [
      { title: "Signals — Cosmos Candles Academy" },
      { name: "description", content: "Real signals are delivered via Telegram." },
    ],
  }),
  component: SignalsPage,
});

export function SignalsPage() {
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;
  // Unser Kanal, auch fuer Partner-Mitglieder (31.08.2026). Dieser Knopf ist
  // NICHT der persoenliche Signalzugang — der laeuft eine Karte tiefer ueber
  // TelegramConnectCard/create-telegram-link und bleibt partnerweise. Er ist
  // eine geteilte Kanaladresse, und die des Partners ist leer: ein
  // Zeko-Mitglied landete in "Zekoglobal Info" ohne eine einzige Nachricht.
  const telegramUrl = TELEGRAM_ENTRY.url;
  const state = useMemberState();
  const hasAccess = !!state.currentTier;
  // Locked until the first deposit clears — and while the member state is still
  // loading, so the feed never flashes open and then shuts.
  const signalsLocked = !state.loaded || !hasAccess;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Live trade alerts"
        title="Signals"
        art={artSignals}
        aside={
          /* Access status belongs in the header: it is the one thing that decides
             whether the rest of this page is usable to you. */
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide",
              hasAccess ? "bg-primary/15 text-primary" : "bg-amber-400/15 text-amber-400",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", hasAccess ? "bg-primary" : "bg-amber-400")} />
            {hasAccess ? "Channel active" : "Locked"}
          </div>
        }
      >
        Every signal is posted live to our private Telegram channel — entries, targets, and stops in real time.
        Open the channel below to get alerts the moment they drop.
      </PageHero>

      <Card variant="hero" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <MessageSquare className="h-7 w-7" />
        </div>
        {/* The status pill lives in the page header now, so this card is purely
            the door into the channel — no repeated title, no repeated badge. */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <img src="/cosmos-mark.png" alt="" className="h-6 w-6 object-contain" />
            <span className="font-display text-lg font-bold">The private signal channel</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasAccess
              ? "You have access. Tap the button to open the Telegram channel."
              : "Deposit €100+ to unlock Foundation tier and join the signal group."}
          </p>
        </div>
        {hasAccess ? (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] hover:opacity-90"
          >
            <Radio className="h-4 w-4 group-icon-wiggle" /> Open in Telegram
          </a>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-muted-foreground cursor-not-allowed">
            Locked
          </span>
        )}
      </Card>

      {/* Onboarding into the gated channel */}
      <TelegramConnectCard />

      {/* Wie man ein Signal uebernimmt — dauerhaft hier, nicht nur einmalig in
          der Willkommenskarte. Die war wegklickbar und merkte sich das; damit
          war das einzige Video zur Kernmechanik fuer immer verschwunden. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
        <SignalTutorialCard accent={accent} />
        <div className="flex flex-col justify-center gap-3">
          <h2 className="font-display text-xl font-bold">New here? Start with this.</h2>
          <p className="max-w-[52ch] text-sm text-muted-foreground">
            Two minutes: read a signal, place it in your own account, and set the
            stop-loss and targets so the trade manages itself.
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/70">
            <li>· Entry, stop-loss and take-profit — what each number does</li>
            <li>· How to size the position so one loss never hurts</li>
            <li>· What to do when a target is hit</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {SIGNALS.length > 0 ? "Last 10 signals" : "Where the signals are"}
          </div>
          {/* SIGNALS is empty by design (see academy-data.ts) — the four that used
              to render here were invented, each with a "Trade this signal" button.
              An honest empty state beats a fabricated feed. */}
          {SIGNALS.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {SIGNALS.map((s) => (
                <SignalOddsCard key={s.id} signal={s} dense={false} />
              ))}
            </div>
          ) : (
            <Card variant="surface" className="p-6">
              <p className="text-sm leading-relaxed text-foreground/70">
                Signals are sent live in your private Telegram channel — each one with entry,
                stop-loss and take-profit. Connect Telegram above and they arrive on your phone
                the moment the desk calls them. Nothing is posted here first.
              </p>
              <RiskWarning variant="compact" className="mt-4" />
            </Card>
          )}
        </div>

        {/* Was "Popular — Scalping / Breakouts / Mean Reversion": a ranking of
            three strategies by nothing at all, on the one page where a member
            comes looking for what the desk actually called. Replaced with the
            real feed, redacted server-side for anyone who has not deposited. */}
        <aside className="space-y-4">
          <SignalTeaserRail locked={signalsLocked} />
        </aside>
      </div>
    </div>
  );
}
