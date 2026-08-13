import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SIGNALS, TIERS } from "@/lib/academy-data";
import { SignalOddsCard } from "../right-rail/SignalOddsCard";
import { PopularList } from "../right-rail/PopularList";
import { LockedGate } from "../onboarding/LockedGate";
import { BrokerRailCard } from "../tier/BrokerTrustStrip";
import { useMemberState } from "@/hooks/useMemberState";

export function RightRail() {
  // Signals/profit are member content, not decoration: before Foundation they
  // must read as LOCKED teasers, never as usable data for a €0 account.
  const state = useMemberState();
  const locked = state.loaded && state.lifetimeDeposits < TIERS[0].minDeposit;

  return (
    <aside className="hidden xl:flex w-[320px] shrink-0 flex-col gap-8 sticky top-4 h-fit">
      <section>
        <h3 className="mb-4 font-display text-lg font-bold">Signals</h3>
        <LockedGate locked={locked} label="Signals unlock at Foundation (€100)">
          {/* SIGNALS is empty by design — see academy-data.ts. Until a real feed
              exists this points at where the signals actually are, rather than
              rendering an invented one. */}
          {SIGNALS.length > 0 ? (
            <div className="space-y-3">
              {SIGNALS.slice(0, 2).map((s) => (
                <SignalOddsCard key={s.id} signal={s} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Every call goes out in your private Telegram channel — entry, stop-loss and targets.
              </p>
              <Link
                to="/signals"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Open signals <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </LockedGate>
      </section>

      <section>
        <BrokerRailCard />
      </section>

      <section>
        <h3 className="mb-4 font-display text-lg font-bold">Popular</h3>
        <PopularList />
      </section>

      {/* The "Community profit" widget was removed: it rendered a hardcoded
          €1,452.23 as what members had earned. See academy-data.ts. */}
    </aside>
  );
}