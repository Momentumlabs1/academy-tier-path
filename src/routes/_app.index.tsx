import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Calculator, MessageSquare } from "lucide-react";
import { HeroBento } from "@/components/academy/hero/HeroBento";
import { LessonGroup } from "@/components/academy/lessons/LessonGroup";
import { SectionTitle } from "@/components/academy/primitives/SectionTitle";
import { DepositLadder } from "@/components/academy/tier/DepositLadder";
import { ProgressStats } from "@/components/academy/progress/ProgressStats";
import { Card } from "@/components/academy/primitives/Card";
import { LockedGate } from "@/components/academy/onboarding/LockedGate";
import { OnboardingJourney } from "@/components/academy/onboarding/OnboardingJourney";
import { PostDepositWelcome } from "@/components/academy/onboarding/PostDepositWelcome";
import { LESSONS } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
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
  { label: "Open Telegram", sub: "Live signals", icon: MessageSquare, to: "/signals", accent: "oklch(0.78 0.16 150)" },
  { label: "Next lesson", sub: "Continue learning", icon: BookOpen, to: "/lessons", accent: "oklch(0.9 0.2 140)" },
  { label: "Trader tools", sub: "Size & risk calculators", icon: Calculator, to: "/tools", accent: "oklch(0.82 0.16 80)" },
] as const;

function Dashboard() {
  const state = useMemberState();
  // Before the first deposit, everything gated should "breathe" — a gentle pull
  // toward the deposit that unlocks it. Once funded, the glow/veil fall away.
  const notFunded = state.loaded && state.lifetimeDeposits <= 0;
  const tierRank = state.currentTier
    ? ["foundation", "operator", "elite"].indexOf(state.currentTier.key)
    : -1;

  const foundationLessons = LESSONS.filter((l) => l.tier === "foundation").slice(0, 4);
  const unlockedLessons = LESSONS.filter((l) => {
    const rank = ["foundation", "operator", "elite"].indexOf(l.tier);
    return rank <= tierRank;
  }).slice(0, 4);

  return (
    <div className="space-y-6">

      {/* Guided first session: integrated welcome video → deposit ignite strip
          (with live deposit watcher) → celebration + unlock tour. */}
      <OnboardingJourney />

      {/* After the first deposit: the two Cosmo welcome videos light up here. */}
      <PostDepositWelcome />

      {/* Greeting + action launcher — orientation only; tier/deposit/progress live in the Deposit Path card below */}
      <Card variant="hero" className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        {/* Ambient glow blob */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-8 h-40 w-40 rounded-full bg-[oklch(0.7_0.18_270)]/15 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-medium text-muted-foreground">{greeting()},</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {(state.profile.name || state.profile.email).split(/[ @]/)[0] || "Trader"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p>

          {/* Quick-action launcher */}
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-2xl bg-[color:var(--surface-2)]/60 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[color:var(--surface-2)] hover:shadow-[var(--shadow-card)]"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `color-mix(in oklch, ${a.accent} 16%, transparent)`, color: a.accent }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">{a.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{a.sub}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Money — single source of truth for tier, deposits & progress.
          Unfunded → the whole card breathes so the deposit path is the focal point. */}
      <div className={cn("rounded-[var(--radius)]", notFunded && "animate-glow")}>
        <DepositLadder />
      </div>

      {/* Learning — lessons & XP */}
      <ProgressStats />

      {/* Premium tiles — visible but gated (blurred + glowing) until first deposit. */}
      <LockedGate locked={notFunded} label="Live-Signale & Mentoren mit deiner ersten Einzahlung freischalten">
        <HeroBento />
      </LockedGate>

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
