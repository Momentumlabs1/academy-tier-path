import type { TierKey } from "./academy-data";
export type ProductKind = "telegram" | "lessons" | "page" | "service";
export interface ProductCTA { label: string; href: string; external?: boolean; }
export interface Product {
  id: string; name: string; description: string;
  kind: ProductKind; requires: TierKey; cta?: ProductCTA;
}
export const PRODUCTS: Product[] = [
  { id: "signal_group", name: "Telegram Signal Group", description: "Real-time trade calls delivered straight to Telegram.", kind: "telegram", requires: "foundation",
    cta: { label: "Open in Telegram", href: "https://t.me/agent_trading_signals", external: true } },
  { id: "foundation_track", name: "Foundation lessons", description: "Markets 101, candles, position sizing — the basics done right.", kind: "lessons", requires: "foundation",
    cta: { label: "Start learning", href: "/lessons" } },
  { id: "cosmo_mentor", name: "Cosmo — your AI mentor", description: "Knows the whole course by heart. Ask about Level 2, volume profile, risk — 24/7, in your language.", kind: "service", requires: "foundation" },
  { id: "auto_trader", name: "Automated Telegram Trader", description: "Copy-trading from our master account, executed for you.", kind: "telegram", requires: "operator",
    cta: { label: "Set up", href: "/signals" } },
  { id: "operator_track", name: "Operator lessons", description: "Technical analysis, risk-reward, live trading room.", kind: "lessons", requires: "operator",
    cta: { label: "Start learning", href: "/lessons" } },
  { id: "elite_track", name: "Elite lessons", description: "Building a personal edge, portfolio audit, tail risk.", kind: "lessons", requires: "elite",
    cta: { label: "Start learning", href: "/lessons" } },
  { id: "elite_lounge", name: "Elite lounge", description: "Private room for Elite members.", kind: "page", requires: "elite" },
  { id: "mentor_1on1", name: "1:1 with the desk", description: "Monthly call with our head trader.", kind: "service", requires: "elite" },
];
export function productsForTier(tier: TierKey): Product[] {
  return PRODUCTS.filter((p) => p.requires === tier);
}
