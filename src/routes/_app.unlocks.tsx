import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, Lock, Radio, Sparkles, Users } from "lucide-react";
import artDome from "@/assets/art-dome.jpg";
import { TIERS } from "@/lib/academy-data";
import { PRODUCTS, type ProductKind } from "@/lib/products";
import { PageHero } from "@/components/academy/primitives/PageHero";
import { useMemberState } from "@/hooks/useMemberState";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/unlocks")({
  head: () => ({
    meta: [
      { title: "Unlocks — Cosmos Candles Academy" },
      { name: "description", content: "Products and perks unlocked by your deposit tier." },
    ],
  }),
  component: UnlocksPage,
});

/** Each product kind gets its own glyph so the grid reads at a glance instead of
 *  being eight identical check-marks. */
const KIND_ICON: Record<ProductKind, typeof Radio> = {
  telegram: Radio,
  lessons: BookOpen,
  page: Users,
  service: Sparkles,
};

function UnlocksPage() {
  const state = useMemberState();
  const unlockedIds = new Set(state.unlockedProducts.map((p) => p.id));
  const myRank = state.currentTier ? TIERS.findIndex((t) => t.key === state.currentTier!.key) : -1;

  const total = PRODUCTS.length;
  const have = PRODUCTS.filter((p) => unlockedIds.has(p.id)).length;
  const pct = Math.round((have / total) * 100);
  const nextTier = TIERS[myRank + 1];
  const toNext = nextTier ? Math.max(0, nextTier.minDeposit - state.accessDeposit) : 0;

  return (
    <div className="space-y-8">
      {/* ── Header + progress: turns a checklist into a collection you're filling ── */}
      <PageHero
        eyebrow="Perks & products"
        title="Unlocks"
        art={artDome}
        tint={state.currentTier?.color}
        aside={
          <div>
            <div className="font-display text-4xl font-black leading-none">
              {have}
              <span className="text-xl font-bold text-muted-foreground">/{total}</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">unlocked</div>
          </div>
        }
        footer={
          <>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${TIERS[0].color}, ${state.currentTier?.color ?? TIERS[0].color})`,
                }}
              />
            </div>
            {nextTier && (
              <p className="mt-2.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{formatMoney(toNext, "€")}</span> more unlocks{" "}
                <span className="font-semibold" style={{ color: nextTier.color }}>{nextTier.name}</span>.{" "}
                <Link to="/tier" className="text-primary hover:underline">See the ladder →</Link>
              </p>
            )}
          </>
        }
      >
        Every tool, room and perk you earn as you climb the deposit ladder. Reach a tier and its unlocks activate
        instantly — no codes, no waiting.
      </PageHero>

      {/* ── One band per tier ── */}
      {TIERS.map((tier, tierIdx) => {
        const products = PRODUCTS.filter((p) => p.requires === tier.key);
        const reached = tierIdx <= myRank;
        const gap = Math.max(0, tier.minDeposit - state.accessDeposit);

        return (
          <section key={tier.key}>
            {/* Tier header — carries the tier's own colour so the page has rhythm */}
            <div
              className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3"
              style={{
                borderColor: reached ? `color-mix(in oklch, ${tier.color} 35%, transparent)` : "rgba(255,255,255,0.07)",
                background: reached
                  ? `linear-gradient(90deg, color-mix(in oklch, ${tier.color} 12%, transparent), transparent 60%)`
                  : "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
                style={{
                  background: reached ? tier.color : "rgba(255,255,255,0.06)",
                  color: reached ? "#0b1220" : "var(--muted-foreground)",
                }}
              >
                {reached ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              </span>
              <h2 className="font-display text-xl font-bold">{tier.name}</h2>
              <span className="font-mono text-xs text-muted-foreground">{formatMoney(tier.minDeposit, "€")}+ lifetime</span>

              <span className="ml-auto flex items-center gap-3">
                <span className="text-xs font-semibold" style={{ color: reached ? tier.color : "var(--muted-foreground)" }}>
                  {products.filter((p) => unlockedIds.has(p.id)).length}/{products.length} unlocked
                </span>
                {!reached && (
                  <Link
                    to="/tier"
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
                  >
                    {formatMoney(gap, "€")} to go <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const unlocked = unlockedIds.has(product.id);
                const Icon = KIND_ICON[product.kind] ?? Sparkles;
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius)] border p-4 transition-all duration-300",
                      unlocked
                        ? "border-white/8 bg-[color:var(--surface-2)]/70 hover:-translate-y-0.5 hover:border-white/15"
                        : "border-dashed border-white/10 bg-white/[0.015]",
                    )}
                  >
                    {/* left colour rail marks which tier the perk belongs to */}
                    <span
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ background: unlocked ? tier.color : "rgba(255,255,255,0.08)" }}
                      aria-hidden
                    />

                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={
                        unlocked
                          ? { background: `color-mix(in oklch, ${tier.color} 16%, transparent)`, color: tier.color }
                          : { background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)" }
                      }
                    >
                      {unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className={cn("font-semibold leading-tight", !unlocked && "text-foreground/70")}>{product.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{product.description}</div>
                      {!unlocked && (
                        <div className="mt-1.5 text-[11px] font-semibold" style={{ color: tier.color }}>
                          Unlocks at {formatMoney(tier.minDeposit, "€")}
                        </div>
                      )}
                    </div>

                    {unlocked && product.cta && (
                      product.cta.external ? (
                        <a
                          href={product.cta.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-transform hover:scale-[1.04]"
                        >
                          {product.cta.label}
                        </a>
                      ) : (
                        <Link
                          to={product.cta.href as "/"}
                          className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-transform hover:scale-[1.04]"
                        >
                          {product.cta.label}
                        </Link>
                      )
                    )}
                    {unlocked && !product.cta && (
                      <span className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-foreground/60">
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
