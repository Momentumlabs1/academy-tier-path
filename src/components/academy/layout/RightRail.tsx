import { SIGNALS, TIERS } from "@/lib/academy-data";
import { SignalOddsCard } from "../right-rail/SignalOddsCard";
import { PopularList } from "../right-rail/PopularList";
import { ProfitWidget } from "../right-rail/ProfitWidget";
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
        <h3 className="mb-4 font-display text-lg font-bold">Best Signal</h3>
        <LockedGate locked={locked} label="Signals unlock at Foundation (€100)">
          <div className="space-y-3">
            {SIGNALS.slice(0, 2).map((s) => (
              <SignalOddsCard key={s.id} signal={s} />
            ))}
          </div>
        </LockedGate>
      </section>

      <section>
        <BrokerRailCard />
      </section>

      <section>
        <h3 className="mb-4 font-display text-lg font-bold">Popular</h3>
        <PopularList />
      </section>

      <section>
        <LockedGate locked={locked} label="Community profit unlocks at Foundation">
          <ProfitWidget />
        </LockedGate>
      </section>
    </aside>
  );
}