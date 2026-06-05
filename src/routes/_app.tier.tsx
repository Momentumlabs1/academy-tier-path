import { createFileRoute } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { TIERS } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
import { DepositLadder } from "@/components/academy/tier/DepositLadder";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tier")({
  head: () => ({
    meta: [
      { title: "Tier — Agent Trading Academy" },
      { name: "description", content: "Membership tiers and perks." },
    ],
  }),
  component: TierPage,
});

function TierPage() {
  const state = useMemberState();
  const myRank = state.currentTier ? TIERS.findIndex((t) => t.key === state.currentTier!.key) : -1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Membership Tiers</h1>
        <p className="mt-1 text-muted-foreground">
          Verified deposit: <span className="font-semibold text-foreground">{formatMoney(state.lifetimeDeposits, "€")}</span>. Climb tiers by depositing through your broker.
        </p>
      </div>

      <DepositLadder compact />

      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((t, idx) => {
          const isCurrent = idx === myRank;
          const unlocked = idx <= myRank;
          return (
            <Card
              key={t.key}
              variant={isCurrent ? "hero" : "surface"}
              className={cn("relative flex flex-col p-6 micro-lift", isCurrent && "ring-2 ring-primary shadow-[var(--shadow-lime)]")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="font-display text-lg font-bold">{t.name}</span>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Current</span>
                )}
              </div>
              <div className="mt-4 font-display text-3xl font-bold">{formatMoney(t.minDeposit, "€")}+</div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">verified deposit</div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {t.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    {unlocked ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={unlocked ? "" : "text-muted-foreground"}>{perk}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
