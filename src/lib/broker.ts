/**
 * broker.ts — single source of truth for the partner broker (TradeQuo).
 *
 * THE core message of the whole funnel: nobody ever deposits with US. Members
 * fund their OWN account at TradeQuo — a licensed, award-winning global broker
 * — and that verified deposit is what unlocks the academy for free.
 *
 * The deposit URL is env-swappable so the moment our IB referral link is live
 * we set VITE_BROKER_URL in Vercel and every CTA in the app points at it.
 */
export const BROKER = {
  name: "TradeQuo",
  url: ((import.meta.env as Record<string, unknown>).VITE_BROKER_URL as string) || "https://tradequo.com",
  /** Verifiable trust signals from the broker's own site. */
  trust: [
    { icon: "★", label: "4.9 on Trustpilot" },
    { icon: "🛡", label: "Licensed: FSCA · CMA · FSA" },
    { icon: "🏆", label: "International award-winning broker" },
    { icon: "✓", label: "Proof of Reserves" },
  ],
  /** The one-liner every deposit surface repeats. */
  oneLiner:
    "You never deposit with us. You fund your own account at TradeQuo — a licensed, award-winning global broker — and that's what unlocks everything here for free.",
} as const;
