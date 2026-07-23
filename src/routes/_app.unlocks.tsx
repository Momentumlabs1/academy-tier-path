import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { TIERS } from "@/lib/academy-data";
import { PRODUCTS } from "@/lib/products";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
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

function UnlocksPage() {
  const state = useMemberState();
  const unlockedIds = new Set(state.unlockedProducts.map((p) => p.id));

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Perks &amp; products</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance lg:text-4xl">Unlocks</h1>
        <p className="mt-2 max-w-[65ch] text-muted-foreground">Every tool, room, and perk you earn as you climb the deposit ladder. Reach a tier and its unlocks activate instantly — no codes, no waiting.</p>
      </div>

      {TIERS.map((tier) => {
        const products = PRODUCTS.filter((p) => p.requires === tier.key);
        const tierReached = state.currentTier
          ? TIERS.findIndex((t) => t.key === tier.key) <= TIERS.findIndex((t) => t.key === state.currentTier!.key)
          : false;

        return (
          <section key={tier.key}>
            <div className="mb-3 flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
              <h2 className="font-display text-xl font-bold">{tier.name}</h2>
              <span className="font-mono text-sm text-muted-foreground">{formatMoney(tier.minDeposit, "€")}+ lifetime</span>
              {!tierReached && (
                <Link to="/tier" className="ml-auto text-xs font-medium text-primary hover:underline">
                  How to unlock →
                </Link>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const unlocked = unlockedIds.has(product.id);
                return (
                  <Card key={product.id} variant="surface" className={cn("flex items-center gap-4 p-4", !unlocked && "opacity-60")}>
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", unlocked ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground")}>
                      {unlocked ? <Check className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-tight">{product.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{product.description}</div>
                    </div>
                    {unlocked && product.cta && (
                      product.cta.external ? (
                        <a
                          href={product.cta.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >
                          {product.cta.label}
                        </a>
                      ) : (
                        <Link
                          to={product.cta.href as "/"}
                          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >
                          {product.cta.label}
                        </Link>
                      )
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
