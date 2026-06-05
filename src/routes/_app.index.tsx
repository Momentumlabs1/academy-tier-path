import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, MessageSquare, TrendingUp } from "lucide-react";
import { HeroBento } from "@/components/academy/hero/HeroBento";
import { LessonGroup } from "@/components/academy/lessons/LessonGroup";
import { SectionTitle } from "@/components/academy/primitives/SectionTitle";
import { DepositLadder } from "@/components/academy/tier/DepositLadder";
import { Card } from "@/components/academy/primitives/Card";
import { LESSONS, CURRENT_MEMBER } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Agent Trading Academy" },
      { name: "description", content: "Your live trading education hub." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const QUICK_ACTIONS = [
  { label: "Open Telegram", sub: "Live signals", icon: MessageSquare, to: "/signals", color: "text-[oklch(0.78_0.16_150)]", bg: "bg-[oklch(0.78_0.16_150)]/10" },
  { label: "Next lesson", sub: "Continue learning", icon: BookOpen, to: "/lessons", color: "text-primary", bg: "bg-primary/10" },
  { label: "View progress", sub: "Deposit ladder", icon: TrendingUp, to: "/tier", color: "text-[oklch(0.82_0.16_80)]", bg: "bg-[oklch(0.82_0.16_80)]/10" },
];

function Dashboard() {
  const state = useMemberState();
  const tierRank = state.currentTier
    ? ["foundation", "operator", "elite"].indexOf(state.currentTier.key)
    : -1;

  const foundationLessons = LESSONS.filter((l) => l.tier === "foundation").slice(0, 4);
  const unlockedLessons = LESSONS.filter((l) => {
    const rank = ["foundation", "operator", "elite"].indexOf(l.tier);
    return rank <= tierRank;
  }).slice(0, 4);

  const pct = Math.round(state.progressPctToNext * 100);

  return (
    <div className="space-y-8">

      {/* Greeting hero */}
      <Card variant="hero" className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        {/* Ambient glow blob */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-8 h-40 w-40 rounded-full bg-[oklch(0.7_0.18_270)]/15 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-medium text-muted-foreground">{greeting()},</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {CURRENT_MEMBER.name.split(" ")[0]} 👋
          </h1>

          {state.currentTier && (
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ backgroundColor: `color-mix(in oklch, ${state.currentTier.color} 20%, transparent)`, color: state.currentTier.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: state.currentTier.color }} />
                {state.currentTier.name} Member
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatMoney(state.lifetimeDeposits, "€")} deposited
              </span>
            </div>
          )}

          {state.nextTier && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Progress to {state.nextTier.name}</span>
                <span className="font-semibold text-foreground">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {formatMoney(state.nextTierRemaining, "€")} more to unlock {state.nextTier.name}
              </p>
            </div>
          )}
        </div>

        {/* Quick-action chips */}
        <div className="relative mt-5 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-80",
                  a.bg, a.color,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {a.label}
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Deposit Ladder */}
      <DepositLadder />

      {/* Hero bento */}
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
