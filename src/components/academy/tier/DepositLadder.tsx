import { ArrowUpRight, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TIERS } from "@/lib/academy-data";
import { PRODUCTS } from "@/lib/products";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const NODES = [{ key: "start", name: "Start", minDeposit: 0, color: "oklch(0.65 0.02 250)" }, ...TIERS];
const scale = (a: number) => Math.log10(1 + a);
const MIN = scale(0);
const MAX = scale(NODES[NODES.length - 1].minDeposit);
const positionPct = (a: number) => ((scale(Math.max(0, Math.min(a, NODES[NODES.length - 1].minDeposit))) - MIN) / (MAX - MIN)) * 100;

export function DepositLadder({ compact = false }: { compact?: boolean }) {
  const state = useMemberState();
  const userPct = positionPct(state.lifetimeDeposits);
  const nextProduct = state.nextTier ? PRODUCTS.find((p) => p.requires === state.nextTier!.key) : undefined;

  return (
    <Card variant="hero" className={cn("relative overflow-hidden", compact ? "p-5" : "p-6 lg:p-8")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Your Deposit Path</div>
          <h2 className={cn("font-display font-bold leading-tight", compact ? "mt-1 text-xl" : "mt-1.5 text-2xl lg:text-3xl")}>
            {state.currentTier ? `You're a ${state.currentTier.name} member` : "Make your first deposit to begin"}
          </h2>
        </div>
        {state.nextTier && (
          <div className="hidden sm:block text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next milestone</div>
            <div className="font-display text-base font-bold">{state.nextTier.name}</div>
            <div className="font-mono text-xs text-muted-foreground">{formatMoney(state.nextTierRemaining, "€")} to go</div>
          </div>
        )}
      </div>

      <div className={cn("relative w-full", compact ? "mt-5 h-20" : "mt-7 h-28")}>
        <div className="absolute inset-0 flex items-center">
          <div className="relative h-1.5 w-full rounded-full bg-white/10">
            <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary/70 to-primary" style={{ width: `${userPct}%` }} />
            {NODES.map((n) => {
              const pct = positionPct(n.minDeposit);
              const isStart = n.key === "start";
              const isReached = userPct >= pct - 0.1;
              const isNext = !isReached && NODES.find((m) => positionPct(m.minDeposit) > userPct)?.key === n.key;
              return (
                <div key={n.key} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct}%` }}>
                  <div
                    className={cn(
                      "relative flex h-5 w-5 items-center justify-center rounded-full border-2 transition-shadow",
                      isReached ? "border-white/20 shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_18%,transparent)]" : "border-white/10 bg-[color:var(--surface-1)]",
                      isNext && "animate-pulse",
                    )}
                    style={isReached ? { backgroundColor: n.color } : undefined}
                  >
                    {isReached && !isStart && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="absolute left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isStart ? "Start" : (n as { name: string }).name}</div>
                    <div className="font-mono text-[11px] font-semibold text-foreground/90">{isStart ? "€0" : formatMoney(n.minDeposit, "€")}</div>
                  </div>
                </div>
              );
            })}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${userPct}%` }}>
              <div className="relative">
                <span className="absolute inset-0 -m-2 rounded-full bg-primary/40 blur-md" />
                <span className="relative block h-3.5 w-3.5 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--background)_60%,transparent)]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-3", compact ? "mt-4 grid-cols-3" : "mt-6 grid-cols-1 sm:grid-cols-3")}>
        <StatTile label="Lifetime deposits" value={formatMoney(state.lifetimeDeposits, "€")} sub="verified at broker" />
        <StatTile
          label="Current tier"
          value={state.currentTier?.name ?? "Below Foundation"}
          dot={state.currentTier?.color}
          sub={state.nextTier ? `${formatMoney(state.nextTierRemaining, "€")} to ${state.nextTier.name}` : "Top tier reached"}
        />
        <StatTile
          label="Activity"
          value={state.isActive ? "Active" : "Inactive"}
          tone={state.isActive ? "ok" : "warn"}
          sub={`${state.monthlyLots.toFixed(2)} / ${state.monthlyLotsRequired.toFixed(2)} lots this month`}
        />
      </div>

      {!compact && nextProduct && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[color:var(--surface-2)]/60 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Unlocks at {state.nextTier!.name}</div>
            <div className="truncate text-sm font-semibold">{nextProduct.name}</div>
            <div className="truncate text-xs text-muted-foreground">{nextProduct.description}</div>
          </div>
          <Link to="/tier" className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
            See tiers <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </Card>
  );
}

function StatTile({ label, value, sub, dot, tone }: { label: string; value: string; sub?: string; dot?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-2xl bg-[color:var(--surface-2)]/60 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
        <span className={cn("font-display text-lg font-bold", tone === "ok" && "text-primary", tone === "warn" && "text-amber-400")}>{value}</span>
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
