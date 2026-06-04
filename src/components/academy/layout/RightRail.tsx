import { SIGNALS } from "@/lib/academy-data";
import { SignalOddsCard } from "../right-rail/SignalOddsCard";
import { PopularList } from "../right-rail/PopularList";
import { ProfitWidget } from "../right-rail/ProfitWidget";

export function RightRail() {
  return (
    <aside className="hidden xl:flex w-[320px] shrink-0 flex-col gap-8 sticky top-4 h-fit">
      <section>
        <h3 className="mb-4 font-display text-lg font-bold">Best Signal</h3>
        <div className="space-y-3">
          {SIGNALS.slice(0, 2).map((s) => (
            <SignalOddsCard key={s.id} signal={s} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 font-display text-lg font-bold">Popular</h3>
        <PopularList />
      </section>

      <section>
        <ProfitWidget />
      </section>
    </aside>
  );
}