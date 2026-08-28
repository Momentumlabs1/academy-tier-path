/**
 * FirstMissions — "Your first week": three concrete first actions for a freshly
 * funded member, as a checklist in the staged-unlock idiom of the celebration
 * tour. Each mission IS the action (deep link / opens Cosmo), not a lecture:
 *
 *   1. Copy your first signal  → /signals (tutorial video lives there)
 *   2. Size it right           → /tools (position size & risk calculators)
 *   3. Ask Cosmo anything      → opens the mentor chat via the existing
 *                                `cosmo:open` event (same one MobileNav fires)
 *
 * A mission is checked off the moment the member takes the action — honest
 * enough for a first-session checklist, no server round-trip. Flags are per
 * account (onb_mission_*:email). When all three are done the card retires
 * itself for good.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calculator, MessageCircle, Radio } from "lucide-react";
import { useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { readFlag, writeFlag, readSeen } from "@/components/academy/onboarding/OnboardingJourney";
import { Card } from "@/components/academy/primitives/Card";
import { cn } from "@/lib/utils";

const MISSIONS = [
  {
    flag: "mission_signal",
    icon: Radio,
    title: "Copy your first signal",
    body: "Open Signals, take the newest call, mirror it exactly.",
    to: "/signals" as const,
  },
  {
    flag: "mission_tools",
    icon: Calculator,
    title: "Size it right",
    body: "One minute with the risk calculator before any trade.",
    to: "/tools" as const,
  },
  {
    flag: "mission_cosmo",
    icon: MessageCircle,
    title: "Ask Cosmo anything",
    body: "Your 24/7 mentor — try “How do I read a signal?”",
    to: null,
  },
];

export function FirstMissions() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.primaryColor;
  const email = state.profile.email;
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!email) return;
    setDone(Object.fromEntries(MISSIONS.map((m) => [m.flag, readFlag(email, m.flag)])));
  }, [email]);

  const doneCount = MISSIONS.filter((m) => done[m.flag]).length;

  // Funded members only; stay out of the way while the celebration overlay is
  // unacknowledged (same sequencing as PostDepositWelcome); retire when done.
  if (!state.loaded || !email || state.lifetimeDeposits < 100) return null;
  if (state.lifetimeDeposits > readSeen(email)) return null;
  if (doneCount === MISSIONS.length) return null;

  const complete = (flag: string) => {
    writeFlag(email, flag);
    setDone((d) => ({ ...d, [flag]: true }));
  };

  return (
    <Card variant="hero" className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full blur-3xl" style={{ background: `color-mix(in oklch, ${accent} 16%, transparent)` }} />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Your first week</div>
            <h2 className="font-display text-lg font-bold sm:text-xl">Three moves and you're trading</h2>
          </div>
          <span className="shrink-0 font-mono text-sm font-bold tabular-nums" style={{ color: accent }}>
            {doneCount}/{MISSIONS.length}
          </span>
        </div>

        <div className="mt-4 grid gap-2.5">
          {MISSIONS.map((m) => {
            const isDone = !!done[m.flag];
            const inner = (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklch, ${accent} 14%, transparent)`, color: accent }}>
                  <m.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className={cn("block text-sm font-bold leading-tight", isDone && "line-through opacity-60")}>{m.title}</span>
                  <span className="block text-[11px] text-foreground/55">{m.body}</span>
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-black transition-colors",
                    isDone ? "border-transparent" : "border-white/20 text-transparent",
                  )}
                  style={isDone ? { background: `color-mix(in oklch, ${accent} 20%, transparent)`, color: accent } : undefined}
                  aria-hidden
                >
                  ✓
                </span>
              </>
            );
            const rowClass = cn(
              "flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 transition-colors",
              !isDone && "hover:border-white/20 hover:bg-white/[0.07]",
            );
            return m.to ? (
              <Link key={m.flag} to={m.to} onClick={() => complete(m.flag)} className={rowClass}>
                {inner}
              </Link>
            ) : (
              <button
                key={m.flag}
                type="button"
                onClick={() => {
                  complete(m.flag);
                  // Same event MobileNav's "Cosmo" tab fires; MentorChat listens.
                  window.dispatchEvent(new CustomEvent("cosmo:open"));
                }}
                className={rowClass}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
