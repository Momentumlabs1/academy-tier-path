import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, TrendingUp, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { CURRENT_MEMBER, LESSONS, TIERS, tierForDeposit } from "@/lib/academy-data";
import { TierBadge } from "@/components/academy/TierBadge";
import { LessonCard } from "@/components/academy/LessonCard";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Agent Trading Academy" },
      { name: "description", content: "Your trading education hub." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const tier = tierForDeposit(CURRENT_MEMBER.deposit);
  const nextTier = TIERS[TIERS.findIndex((t) => t.key === tier.key) + 1];
  const progress = nextTier
    ? Math.min(100, ((CURRENT_MEMBER.deposit - tier.minDeposit) / (nextTier.minDeposit - tier.minDeposit)) * 100)
    : 100;

  const completed = LESSONS.filter((l) => l.completed).length;
  const continueLessons = LESSONS.filter((l) => !l.completed).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome */}
      <section>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Welcome back
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">
          Hello, {CURRENT_MEMBER.name.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pick up where you left off, or explore lessons unlocked by your tier.
        </p>
      </section>

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={Award} label="Current tier" value={tier.name} accent />
        <Kpi icon={BookOpen} label="Lessons completed" value={`${completed} / ${LESSONS.length}`} />
        <Kpi icon={TrendingUp} label="Deposit verified" value={`$${CURRENT_MEMBER.deposit.toLocaleString()}`} />
      </section>

      {/* Tier progress */}
      <section
        className="relative overflow-hidden rounded-2xl border border-border p-6"
        style={{ background: "var(--gradient-card)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <TierBadge tier={tier.key} />
            <h2 className="mt-2 text-xl font-semibold">
              {nextTier ? `Climb to ${nextTier.name}` : "You're at the top tier"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextTier
                ? `Deposit $${(nextTier.minDeposit - CURRENT_MEMBER.deposit).toLocaleString()} more to unlock ${nextTier.name} perks.`
                : "Enjoy all academy perks at the Platinum level."}
            </p>
          </div>
          <Link
            to="/tier"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
          >
            View tier perks <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {nextTier && (
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: "var(--gradient-gold)" }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>${tier.minDeposit.toLocaleString()}</span>
              <span>${nextTier.minDeposit.toLocaleString()}</span>
            </div>
          </div>
        )}
      </section>

      {/* Continue learning */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Continue learning</h2>
          <Link to="/lessons" className="text-sm text-primary hover:underline">
            All lessons
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {continueLessons.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-5"
      style={accent ? { background: "var(--gradient-card)", boxShadow: "var(--shadow-glow)" } : undefined}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}