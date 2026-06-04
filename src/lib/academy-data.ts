export type TierKey = "bronze" | "silver" | "gold" | "platinum";

export interface Tier {
  key: TierKey;
  name: string;
  minDeposit: number;
  color: string;
  perks: string[];
}

export const TIERS: Tier[] = [
  {
    key: "bronze",
    name: "Bronze",
    minDeposit: 0,
    color: "oklch(0.6 0.1 60)",
    perks: ["Foundations course", "Weekly market recap", "Community chat"],
  },
  {
    key: "silver",
    name: "Silver",
    minDeposit: 500,
    color: "oklch(0.78 0.02 250)",
    perks: ["All Bronze perks", "Technical analysis course", "Daily signals (delayed)"],
  },
  {
    key: "gold",
    name: "Gold",
    minDeposit: 2500,
    color: "oklch(0.82 0.16 80)",
    perks: ["All Silver perks", "Live trading room", "Real-time signals", "1:1 monthly review"],
  },
  {
    key: "platinum",
    name: "Platinum",
    minDeposit: 10000,
    color: "oklch(0.85 0.05 280)",
    perks: ["All Gold perks", "Direct mentor access", "Portfolio audit", "VIP events"],
  },
];

export function tierForDeposit(deposit: number): Tier {
  return [...TIERS].reverse().find((t) => deposit >= t.minDeposit) ?? TIERS[0];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  tier: TierKey;
  category: "Foundations" | "Technical" | "Risk" | "Psychology" | "Advanced";
  completed?: boolean;
}

export const LESSONS: Lesson[] = [
  { id: "l1", title: "What Markets Actually Are", description: "Order books, liquidity, and why price moves.", durationMin: 12, tier: "bronze", category: "Foundations", completed: true },
  { id: "l2", title: "Reading a Candlestick Chart", description: "Open, high, low, close — and what each tells you.", durationMin: 15, tier: "bronze", category: "Foundations", completed: true },
  { id: "l3", title: "Position Sizing 101", description: "Never risk more than 1% per trade.", durationMin: 10, tier: "bronze", category: "Risk", completed: false },
  { id: "l4", title: "Support, Resistance & Trend", description: "The three lines every chart needs.", durationMin: 18, tier: "silver", category: "Technical" },
  { id: "l5", title: "Moving Averages Demystified", description: "EMA, SMA, and the 200-day mythology.", durationMin: 14, tier: "silver", category: "Technical" },
  { id: "l6", title: "Risk-Reward Ratios", description: "Why 1:3 changes everything.", durationMin: 11, tier: "silver", category: "Risk" },
  { id: "l7", title: "The Live Trading Room", description: "Watch our head trader execute in real time.", durationMin: 60, tier: "gold", category: "Advanced" },
  { id: "l8", title: "Reading Smart Money Flow", description: "Volume, open interest, and institutional footprints.", durationMin: 22, tier: "gold", category: "Advanced" },
  { id: "l9", title: "Managing Trader Emotions", description: "The four states that cost you money.", durationMin: 17, tier: "gold", category: "Psychology" },
  { id: "l10", title: "Building a Personal Edge", description: "Mentor-led: design your own system.", durationMin: 45, tier: "platinum", category: "Advanced" },
  { id: "l11", title: "Portfolio Audit Walkthrough", description: "We tear apart a real $50k portfolio.", durationMin: 35, tier: "platinum", category: "Advanced" },
  { id: "l12", title: "Tail Risk & Black Swans", description: "Hedging against the trades you can't see coming.", durationMin: 28, tier: "platinum", category: "Risk" },
];

export const CURRENT_MEMBER = {
  name: "Demo Trader",
  email: "demo@trader.dev",
  deposit: 2750,
  joinedAt: "2026-04-18",
  telegramHandle: "@demo_trader",
};

export const DEMO_MODE = true;

export interface Signal {
  id: string;
  asset: string;
  pair: string;
  side: "LONG" | "SHORT";
  confidence: number;
  payoutMultiple: number;
  draw?: number;
  loss?: number;
  timeLabel: string;
}

export const SIGNALS: Signal[] = [
  { id: "s1", asset: "BTC", pair: "BTC / USDT", side: "LONG", confidence: 0.83, payoutMultiple: 1.83, draw: 3.57, loss: 1.97, timeLabel: "Today · 20:00" },
  { id: "s2", asset: "ETH", pair: "ETH / USDT", side: "LONG", confidence: 0.59, payoutMultiple: 3.59, draw: 2.14, loss: 1.42, timeLabel: "Today · 21:30" },
  { id: "s3", asset: "SOL", pair: "SOL / USDT", side: "SHORT", confidence: 0.71, payoutMultiple: 2.10, draw: 1.95, loss: 1.30, timeLabel: "Tomorrow · 09:00" },
  { id: "s4", asset: "NDX", pair: "NASDAQ 100", side: "LONG", confidence: 0.66, payoutMultiple: 1.78, draw: 2.05, loss: 1.55, timeLabel: "Mon · 15:30" },
];

export interface PopularItem {
  id: string;
  rank: number;
  label: string;
  category: string;
  symbol: string;
  tileTone: "blue" | "lime" | "magenta" | "violet";
}

export const POPULAR: PopularItem[] = [
  { id: "p1", rank: 1, label: "Scalping", category: "Top Strategy", symbol: "S", tileTone: "blue" },
  { id: "p2", rank: 2, label: "Breakouts", category: "Trending", symbol: "B", tileTone: "lime" },
  { id: "p3", rank: 3, label: "Mean Reversion", category: "Strategy", symbol: "M", tileTone: "magenta" },
];

export const PROFIT_THIS_MONTH = 1452.23;
export const PROFIT_TRADERS = ["A", "K", "M"];