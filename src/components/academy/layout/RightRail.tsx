/**
 * RightRail — what the member glances at while reading the page.
 *
 * It used to be a 320px column whose headline item was a paragraph behind a
 * blur, followed by "Popular: Scalping / Breakouts / Mean Reversion" — three
 * invented rankings of nothing, which is worse than an empty column because it
 * quietly says the rest of the page might be invented too.
 *
 * Now the rail carries exactly two things, both real: the desk's actual last
 * calls (redacted server-side, see SignalTeaserRail) and the broker card. It is
 * also wider, because the signal panel is the single strongest argument for
 * depositing and it was being whispered.
 */
import { TIERS } from "@/lib/academy-data";
import { SignalTeaserRail } from "../right-rail/SignalTeaserRail";
import { InfoChannelRail } from "../right-rail/InfoChannelRail";
import { BrokerRailCard } from "../tier/BrokerTrustStrip";
import { useMemberState } from "@/hooks/useMemberState";

export function RightRail() {
  // Signals are member content, not decoration: before Foundation they must
  // read as LOCKED, never as usable data for a €0 account. While the member
  // state is still loading we treat them as locked — showing unlocked content
  // for a frame and then snapping it shut is the wrong way round.
  const state = useMemberState();
  const locked = !state.loaded || state.accessDeposit < TIERS[0].minDeposit;

  return (
    <aside className="sticky top-4 hidden h-fit w-[340px] shrink-0 flex-col gap-6 xl:flex 2xl:w-[400px]">
      <SignalTeaserRail locked={locked} />
      <BrokerRailCard />
      <InfoChannelRail />
      {/* The "Community profit" widget was removed: it rendered a hardcoded
          €1,452.23 as what members had earned. See academy-data.ts. */}
    </aside>
  );
}
