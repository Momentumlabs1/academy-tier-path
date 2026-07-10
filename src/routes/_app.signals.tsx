import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Radio } from "lucide-react";
import { SIGNALS } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
import { SignalOddsCard } from "@/components/academy/right-rail/SignalOddsCard";
import { TelegramConnectCard } from "@/components/academy/signals/TelegramConnectCard";
import { PopularList } from "@/components/academy/right-rail/PopularList";
import { ProfitWidget } from "@/components/academy/right-rail/ProfitWidget";
import { cn } from "@/lib/utils";

const TELEGRAM_URL = "https://t.me/agent_trading_signals";

export const Route = createFileRoute("/_app/signals")({
  head: () => ({
    meta: [
      { title: "Signals — Agent Trading Academy" },
      { name: "description", content: "Real signals are delivered via Telegram." },
    ],
  }),
  component: SignalsPage,
});

function SignalsPage() {
  const state = useMemberState();
  const hasAccess = !!state.currentTier;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Signals</h1>
        <p className="mt-1 text-muted-foreground">Real signals are delivered via Telegram. Open the channel to get live alerts.</p>
      </div>

      <Card variant="hero" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <MessageSquare className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold">Agent Trading · Signals</span>
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
