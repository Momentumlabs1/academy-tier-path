import { createFileRoute } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { CURRENT_MEMBER, TIERS, tierForDeposit } from "@/lib/academy-data";
import { TierBadge } from "@/components/academy/TierBadge";

export const Route = createFileRoute("/_app/tier")({
  head: () => ({
    meta: [
      { title: "My Tier — Agent Trading Academy" },
      { name: "description", content: "Tier perks and how to climb." },
    ],
  }),
  component: TierPage,
});

function TierPage() {
  const tier = tierForDeposit(CURRENT_MEMBER.deposit);
  const myRank = TIERS.findIndex((t) => t.key === tier.key);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Membership tiers</h1>
        <p className="mt-1 text-muted-foreground">
          Tier is set automatically by your verified deposit. Add funds with your broker to climb.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((t, idx) => {
          const current = idx === myRank;
          const unlocked = idx <= myRank;
          return (
            <div
              key={t.key}
              className="relative flex flex-col rounded-2xl border p-6"
              style={{
                borderColor: current ? t.color : "var(--border)",
                background: current ? "var(--gradient-card)" : "var(--card)",
                boxShadow: current ? "var(--shadow-glow)" : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <TierBadge tier={t.key} />
                {current && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold">${t.minDeposit.toLocaleString()}+</div>
                <div className="text-xs text-muted-foreground">verified deposit</div>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {t.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    {unlocked ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
                    ) : (
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={unlocked ? "" : "text-muted-foreground"}>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}