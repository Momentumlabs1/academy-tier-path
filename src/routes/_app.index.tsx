import { createFileRoute, Link } from "@tanstack/react-router";
import { HeroBento } from "@/components/academy/hero/HeroBento";
import { LessonGroup } from "@/components/academy/lessons/LessonGroup";
import { SectionTitle } from "@/components/academy/primitives/SectionTitle";
import { DepositLadder } from "@/components/academy/tier/DepositLadder";
import { LESSONS } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Agent Trading Academy" },
      { name: "description", content: "Your live trading education hub." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useMemberState();
  const foundationLessons = LESSONS.filter((l) => l.tier === "foundation").slice(0, 4);
  const tierRank = state.currentTier
    ? ["foundation", "operator", "elite"].indexOf(state.currentTier.key)
    : -1;
  const unlockedLessons = LESSONS.filter((l) => {
    const rank = ["foundation", "operator", "elite"].indexOf(l.tier);
    return rank <= tierRank;
  }).slice(0, 4);

  return (
    <div className="space-y-10">
      <DepositLadder />

      <HeroBento />

      <section>
        <SectionTitle
          action={
            <Link to="/lessons" className="text-sm font-medium text-primary hover:underline">
              All lessons →
            </Link>
          }
        >
          Continue learning
        </SectionTitle>
        <LessonGroup title="Foundation" lessons={foundationLessons} />
      </section>

      {unlockedLessons.length > 0 && (
        <section>
          <SectionTitle>Your tier unlocks</SectionTitle>
          <LessonGroup title="Available to you" lessons={unlockedLessons} />
        </section>
      )}
    </div>
  );
}
