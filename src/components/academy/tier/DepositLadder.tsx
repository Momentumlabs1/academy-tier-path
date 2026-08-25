/**
 * DepositLadder — where the member stands on the deposit path, and what the next
 * milestone actually buys them.
 *
 * The rail used to be decoration: four dots, three labels, and a caption saying
 * "€100 to go". Nowhere did it say what €100 unlocks, which is the only reason
 * anyone would care. And the milestones the member had not reached looked
 * exactly like the ones they had, minus a fill colour — they did not read as
 * LOCKED, they read as unfinished.
 *
 * Two changes carry the weight:
 *
 * 1. The unreached part of the track is drawn as a barred bar (a hatch), and
 *    every unreached node carries a padlock. You can tell at a glance where the
 *    gate is.
 * 2. Selecting a milestone — hover on a mouse, tap on a phone — opens a panel
 *    underneath listing exactly what it unlocks. It defaults to the next
 *    milestone, so the answer to "what do I get" is on screen without anyone
 *    having to discover the interaction.
 *
 * The panel sits BELOW the rail rather than floating over it on purpose: the
 * card clips its children (overflow-hidden for the glow), and a popover would be
 * cut off at the card edge — which is precisely the kind of "Formatierungsfehler"
 * this component already shipped once.
 */
import { useState } from "react";
import { ArrowUpRight, Check, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TIERS, type Tier } from "@/lib/academy-data";
import { PRODUCTS } from "@/lib/products";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BrokerTrustStrip } from "./BrokerTrustStrip";

const NODES = [{ key: "start", name: "Start", minDeposit: 0, color: "oklch(0.65 0.02 250)" }, ...TIERS];
/** "an Elite member", not "a Elite member" — tier names start with a vowel half the time. */
const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");
const scale = (a: number) => Math.log10(1 + a);
const MIN = scale(0);
const MAX = scale(NODES[NODES.length - 1].minDeposit);
const positionPct = (a: number) => ((scale(Math.max(0, Math.min(a, NODES[NODES.length - 1].minDeposit))) - MIN) / (MAX - MIN)) * 100;

/** The hatch that says "barred", used on the track and on locked nodes. */
const HATCH =
  "repeating-linear-gradient(115deg, rgba(255,255,255,0.13) 0 6px, rgba(255,255,255,0.035) 6px 12px)";

export function DepositLadder({ compact = false }: { compact?: boolean }) {
  const state = useMemberState();
  const userPct = positionPct(state.accessDeposit);
  // What the member is working towards is the useful default — nobody should
  // have to hunt for the interaction to learn what the next €100 is for.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = selectedKey ?? state.nextTier?.key ?? state.currentTier?.key ?? TIERS[0].key;
  const activeTier = TIERS.find((t) => t.key === activeKey);

  return (
    <Card variant="hero" className={cn("relative overflow-hidden", compact ? "p-5" : "p-6 lg:p-8")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Your Deposit Path</div>
          <h2 className={cn("font-display font-bold leading-tight", compact ? "mt-1 text-xl" : "mt-1.5 text-2xl lg:text-3xl")}>
            {state.currentTier
              ? `You're ${article(state.currentTier.name)} ${state.currentTier.name} member`
              : "Make your first deposit to begin"}
          </h2>
        </div>
        {state.nextTier && (
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next milestone</div>
            <div className="font-display text-base font-bold">{state.nextTier.name}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {formatMoney(state.nextTierRemaining, "€")} to go
            </div>
          </div>
        )}
      </div>

      <div className={cn("relative w-full", compact ? "mt-5 h-20" : "mt-7 h-24")}>
        {/* The end nodes sit at 0% and 100% and their labels are centred on them,
            so the track has to be inset — otherwise "Start / €0" and
            "Elite / €50,000" hang over the card's padding. */}
        <div className="absolute inset-0 flex items-start px-8 pt-3 sm:px-10">
          <div className="relative h-2 w-full overflow-visible rounded-full" style={{ backgroundImage: HATCH }}>
            {/* Earned part of the path: solid, so the barred remainder reads as
                the thing standing between the member and the rest. */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
              style={{ width: `${userPct}%` }}
            />
            {NODES.map((n) => {
              const pct = positionPct(n.minDeposit);
              const isStart = n.key === "start";
              const isReached = userPct >= pct - 0.1;
              const isActive = n.key === activeKey;
              return (
                <button
                  key={n.key}
                  type="button"
                  disabled={isStart}
                  onClick={() => setSelectedKey(n.key)}
                  onMouseEnter={() => !isStart && setSelectedKey(n.key)}
                  onFocus={() => !isStart && setSelectedKey(n.key)}
                  aria-label={isStart ? "Start" : `${(n as Tier).name} — ${formatMoney(n.minDeposit, "€")}`}
                  aria-pressed={isActive}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 disabled:cursor-default"
                  style={{ left: `${pct}%` }}
                >
                  <span
                    className={cn(
                      "relative flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                      isReached
                        ? "border-white/25 shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
                        : "border-white/15 bg-[color:var(--surface-1)]",
                      isActive && !isReached && "scale-110 border-primary/60",
                    )}
                    style={isReached ? { backgroundColor: n.color } : undefined}
                  >
                    {isReached
                      ? (!isStart && <Check className="h-3.5 w-3.5 text-[#0b1220]" />)
                      : <Lock className="h-3 w-3 text-white/45" />}
                  </span>
                  <span className="absolute left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap text-center">
                    <span className={cn(
                      "block text-[10px] font-semibold uppercase tracking-[0.14em]",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}>
                      {isStart ? "Start" : (n as Tier).name}
                    </span>
                    <span className="block font-mono text-[11px] font-semibold text-foreground/90">
                      {isStart ? "€0" : formatMoney(n.minDeposit, "€")}
                    </span>
                  </span>
                </button>
              );
            })}
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${userPct}%` }}>
              <span className="relative block">
                <span className="absolute inset-0 -m-2 rounded-full bg-primary/40 blur-md" />
                <span className="relative block h-3.5 w-3.5 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--background)_60%,transparent)]" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {activeTier && <MilestonePanel tier={activeTier} compact={compact} />}

      <div className={cn("grid gap-3", compact ? "mt-4 grid-cols-3" : "mt-5 grid-cols-1 sm:grid-cols-3")}>
        <StatTile label="Lifetime deposits" value={formatMoney(state.lifetimeDeposits, "€")} sub="verified at broker" />
        <StatTile
          label="Activity"
          value={state.isActive ? "Active" : "Inactive"}
          tone={state.isActive ? "ok" : "warn"}
          sub={`${state.monthlyLots.toFixed(2)} / ${state.monthlyLotsRequired.toFixed(2)} lots this month`}
        />
        <StatTile
          label="Products unlocked"
          value={`${state.unlockedProducts.length} of ${state.unlockedProducts.length + state.lockedProducts.length}`}
          sub="across all tiers"
        />
      </div>

      {!compact && <BrokerTrustStrip compact className="mt-5" />}
    </Card>
  );
}

/**
 * What the selected milestone unlocks. Perks come from the tier, and the
 * products that require it are appended — the tier copy names them loosely
 * ("Foundation lessons"), the product list is what actually appears in the app.
 */
function MilestonePanel({ tier, compact }: { tier: Tier; compact: boolean }) {
  const state = useMemberState();
  const rank = TIERS.findIndex((t) => t.key === tier.key);
  const myRank = state.currentTier ? TIERS.findIndex((t) => t.key === state.currentTier!.key) : -1;
  const unlocked = rank <= myRank;
  const gap = Math.max(0, tier.minDeposit - state.accessDeposit);
  const items = tier.perks.length
    ? tier.perks
    : PRODUCTS.filter((p) => p.requires === tier.key).map((p) => p.name);

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        compact ? "mt-4" : "mt-5",
        unlocked ? "border-white/10 bg-white/[0.03]" : "border-primary/20 bg-primary/[0.04]",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={unlocked
            ? { background: tier.color, color: "#0b1220" }
            : { backgroundImage: HATCH, color: "rgba(255,255,255,0.55)" }}
        >
          {unlocked ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
        </span>
        <span className="font-display text-sm font-bold">
          {unlocked ? `${tier.name} — included` : `Unlocks at ${tier.name}`}
        </span>
        {!unlocked && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
            {formatMoney(gap, "€")} to go
          </span>
        )}
      </div>

      <ul className="mt-3 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[13px] leading-snug">
            {unlocked
              ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: tier.color }} />
              : <Lock className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />}
            <span className={unlocked ? "text-foreground/85" : "text-muted-foreground"}>{item}</span>
          </li>
        ))}
      </ul>

      {!unlocked && (
        <Link
          to="/tier"
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          How to unlock it <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
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
