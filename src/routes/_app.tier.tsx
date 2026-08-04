import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import artDune from "@/assets/art-dune.jpg";
import { TIERS } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
import { DepositLadder } from "@/components/academy/tier/DepositLadder";
import { BrokerTrustStrip } from "@/components/academy/tier/BrokerTrustStrip";
import { PageHero } from "@/components/academy/primitives/PageHero";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tier")({
  head: () => ({
    meta: [
      { title: "Tier — Cosmos Candles Academy" },
      { name: "description", content: "Membership tiers and perks." },
    ],
  }),
  component: TierPage,
});

function TierPage() {
  const state = useMemberState();
  const myRank = state.currentTier ? TIERS.findIndex((t) => t.key === state.currentTier!.key) : -1;
  const nextTier = TIERS[myRank + 1];
  const toNext = nextTier ? Math.max(0, nextTier.minDeposit - state.lifetimeDeposits) : 0;

  return (
    <div className="space-y-6">
      {/* ── Status header: where you stand, in one glance ── */}
      <PageHero
        eyebrow="Your membership"
        title="Membership Tiers"
        art={artDune}
        tint={state.currentTier?.color}
        aside={
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Verified deposit</div>
            <div className="font-display text-4xl font-black leading-none">{formatMoney(state.lifetimeDeposits, "€")}</div>
            {state.currentTier ? (
              <div
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: `color-mix(in oklch, ${state.currentTier.color} 18%, transparent)`, color: state.currentTier.color }}
              >
                <Sparkles className="h-3 w-3" /> {state.currentTier.name} member
              </div>
            ) : (
              <div className="mt-2 inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                No tier yet
              </div>
            )}
          </div>
        }
        footer={
          nextTier ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{formatMoney(toNext, "€")}</span> more to reach{" "}
              <span className="font-semibold" style={{ color: nextTier.color }}>{nextTier.name}</span>.
            </p>
          ) : undefined
        }
      >
        Tiers unlock automatically once your deposit is verified at our partner broker — no codes, no waiting.
      </PageHero>

      <BrokerTrustStrip />

      <DepositLadder compact />

      {/* ── The three tiers, each with its own identity ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((t, idx) => {
          const isCurrent = idx === myRank;
          const unlocked = idx <= myRank;
          const gap = Math.max(0, t.minDeposit - state.lifetimeDeposits);

          return (
            <div
              key={t.key}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-[var(--radius)] border p-6 transition-all duration-300",
                isCurrent ? "-translate-y-1" : "hover:-translate-y-0.5",
              )}
              style={{
                borderColor: isCurrent
                  ? `color-mix(in oklch, ${t.color} 55%, transparent)`
                  : unlocked
                    ? `color-mix(in oklch, ${t.color} 22%, transparent)`
                    : "rgba(255,255,255,0.07)",
                background: isCurrent
                  ? `linear-gradient(165deg, color-mix(in oklch, ${t.color} 14%, transparent), transparent 65%), var(--surface-2)`
                  : "color-mix(in oklch, var(--surface-2) 70%, transparent)",
                boxShadow: isCurrent ? `0 18px 50px -22px ${t.color}` : undefined,
              }}
            >
              {/* tier colour bar across the top — instant identity */}
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: unlocked ? t.color : "rgba(255,255,255,0.08)" }}
                aria-hidden
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={
                      unlocked
                        ? { background: t.color, color: "#0b1220" }
                        : { background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)" }
                    }
                  >
                    {unlocked ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-display text-lg font-bold">{t.name}</span>
                </div>
                {isCurrent && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide"
                    style={{ background: t.color, color: "#0b1220" }}
                  >
                    You are here
                  </span>
                )}
              </div>

              <div className="mt-4 font-display text-3xl font-black">{formatMoney(t.minDeposit, "€")}+</div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">verified deposit</div>

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {t.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    {unlocked ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.color }} />
                    ) : (
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={unlocked ? "" : "text-muted-foreground"}>{perk}</span>
                  </li>
                ))}
              </ul>

              {/* Locked tiers get a concrete next step instead of just looking dim */}
              {!unlocked && (
                <Link
                  to="/unlocks"
                  className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-4 py-2.5 text-xs font-bold transition-colors hover:bg-white/10"
                >
                  {formatMoney(gap, "€")} to unlock <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {unlocked && !isCurrent && (
                <div className="mt-5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Included in your membership
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
