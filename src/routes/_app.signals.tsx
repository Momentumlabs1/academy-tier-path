import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Radio } from "lucide-react";
import { SIGNALS } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
import { SignalOddsCard } from "@/components/academy/right-rail/SignalOddsCard";
import { TelegramConnectCard } from "@/components/academy/signals/TelegramConnectCard";
import { SignalTutorialCard } from "@/components/academy/signals/SignalTutorialCard";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { PopularList } from "@/components/academy/right-rail/PopularList";
import { ProfitWidget } from "@/components/academy/right-rail/ProfitWidget";
import { cn } from "@/lib/utils";

const TELEGRAM_URL = "https://t.me/agent_trading_signals";

export const Route = createFileRoute("/_app/signals")({
  head: () => ({
    meta: [
      { title: "Signals — Cosmos Candles Academy" },
      { name: "description", content: "Real signals are delivered via Telegram." },
    ],
  }),
  component: SignalsPage,
});

function SignalsPage() {
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;
  const state = useMemberState();
  const hasAccess = !!state.currentTier;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Live trade alerts</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance lg:text-4xl">Signals</h1>
        <p className="mt-2 max-w-[65ch] text-muted-foreground">Every signal is posted live to our private Telegram channel — entries, targets, and stops in real time. Open the channel below to get alerts the moment they drop.</p>
      </div>

      <Card variant="hero" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <MessageSquare className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2"><img src="/cosmos-mark.png" alt="" className="h-6 w-6 object-contain" /><span className="font-display text-lg font-bold">Signals</span></span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              hasAccess ? "bg-primary/20 text-primary" : "bg-amber-400/20 text-amber-400")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", hasAccess ? "bg-primary" : "bg-amber-400")} />
              {hasAccess ? "Active" : "Locked"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasAccess
              ? "You have access. Tap the button to open the Telegram channel."
              : "Deposit €100+ to unlock Foundation tier and join the signal group."}
          </p>
        </div>
        {hasAccess ? (
          <a
            href={TELEGRAM_URL}
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
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Last 10 signals</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SIGNALS.map((s) => (
              <SignalOddsCard key={s.id} signal={s} dense={false} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <Card variant="surface" className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Radio className="h-3.5 w-3.5" /> Popular
            </div>
            <PopularList />
          </Card>
          <Card variant="surface" className="p-4">
            <ProfitWidget />
          </Card>
        </aside>
      </div>
    </div>
  );
}
