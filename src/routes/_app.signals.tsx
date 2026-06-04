import { createFileRoute } from "@tanstack/react-router";
import { SIGNALS } from "@/lib/academy-data";
import { SignalOddsCard } from "@/components/academy/right-rail/SignalOddsCard";

export const Route = createFileRoute("/_app/signals")({
  head: () => ({
    meta: [
      { title: "Signals — Agent Trading Academy" },
      { name: "description", content: "Live trading signals and entries." },
    ],
  }),
  component: SignalsPage,
});

function SignalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Live Signals</h1>
        <p className="mt-1 text-muted-foreground">
          Tier-gated entries with confidence multipliers. Tap any card to size your position.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SIGNALS.map((s) => (
          <SignalOddsCard key={s.id} signal={s} dense={false} />
        ))}
      </div>
    </div>
  );
}