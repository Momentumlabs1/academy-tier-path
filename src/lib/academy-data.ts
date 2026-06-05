export type TierKey = "foundation" | "operator" | "elite";
export interface Tier {
  key: TierKey;
  name: string;
  minDeposit: number;
  color: string;
  perks: string[];
}
export const TIERS: Tier[] = [
  { key: "foundation", name: "Foundation", minDeposit: 100,
    color: "oklch(0.78 0.16 150)",
    perks: ["Telegram signal group access", "Foundation lessons", "Weekly market recap", "Community chat"] },
  { key: "operator", name: "Operator", minDeposit: 2_000,
    color: "oklch(0.7 0.18 270)",
    perks: ["All Foundation perks", "Automated Telegram trader (copy-trading from master account)", "Operator lessons", "Live trading room"] },
  { key: "elite", name: "Elite", minDeposit: 50_000,
    color: "oklch(0.82 0.16 80)",
    perks: ["All Operator perks", "Elite lounge", "1:1 with the desk", "Portfolio audit", "VIP events"] },
];
export const ACTIVITY_MIN_LOTS_PER_MONTH = 0.1;
export function tierForDeposit(deposit: number): Tier | undefined {
  return [...TIERS].reverse().find((t) => deposit >= t.minDeposit);
}
export function nextTierFor(deposit: number): Tier | undefined {
  return TIERS.find((t) => deposit < t.minDeposit);
}
export interface Lesson {
  id: string; title: string; description: string; durationMin: number;
  tier: TierKey;
  category: "Foundations" | "Technical" | "Risk" | "Psychology" | "Advanced";
  completed?: boolean;
}
export const LESSONS: Lesson[] = [
  { id: "l1", title: "What Markets Actually Are", description: "Order books, liquidity, and why price moves.", durationMin: 12, tier: "foundation", category: "Foundations", completed: true },
  { id: "l2", title: "Reading a Candlestick Chart", description: "Open, high, low, close — and what each tells you.", durationMin: 15, tier: "foundation", category: "Foundations", completed: true },
  { id: "l3", title: "Position Sizing 101", description: "Never risk more than 1% per trade.", durationMin: 10, tier: "foundation", category: "Risk", completed: false },
  { id: "l4", title: "Support, Resistance & Trend", description: "The three lines every chart needs.", durationMin: 18, tier: "operator", category: "Technical" },
  { id: "l5", title: "Moving Averages Demystified", description: "EMA, SMA, and the 200-day mythology.", durationMin: 14, tier: "operator", category: "Technical" },
  { id: "l6", title: "Risk-Reward Ratios", description: "Why 1:3 changes everything.", durationMin: 11, tier: "operator", category: "Risk" },
  { id: "l7", title: "The Live Trading Room", description: "Watch our head trader execute in real time.", durationMin: 60, tier: "operator", category: "Advanced" },
  { id: "l8", title: "Reading Smart Money Flow", description: "Volume, open interest, and institutional footprints.", durationMin: 22, tier: "operator", category: "Advanced" },
  { id: "l9", title: "Managing Trader Emotions", description: "The four states that cost you money.", durationMin: 17, tier: "operator", category: "Psychology" },
  { id: "l10", title: "Building a Personal Edge", description: "Mentor-led: design your own system.", durationMin: 45, tier: "elite", category: "Advanced" },
  { id: "l11", title: "Portfolio Audit Walkthrough", description: "We tear apart a real €50k portfolio.", durationMin: 35, tier: "elite", category: "Advanced" },
  { id: "l12", title: "Tail Risk & Black Swans", description: "Hedging against the trades you can't see coming.", durationMin: 28, tier: "elite", category: "Risk" },
];
export const CURRENT_MEMBER = {
  name: "Demo Trader",
  email: "demo@trader.dev",
  deposit: 1500,
  monthlyLots: 0.14,
  joinedAt: "2026-04-18",
  telegramHandle: "@demo_trader",
};
export const DEMO_MODE = true;
export interface Signal {
  id: string; asset: string; pair: string; side: "LONG" | "SHORT";
  confidence: number; payoutMultiple: number; draw?: number; loss?: number; timeLabel: string;
}
export const SIGNALS: Signal[] = [
  { id: "s1", asset: "BTC", pair: "BTC / USDT", side: "LONG", confidence: 0.83, payoutMultiple: 1.83, draw: 3.57, loss: 1.97, timeLabel: "Today · 20:00" },
  { id: "s2", asset: "ETH", pair: "ETH / USDT", side: "LONG", confidence: 0.59, payoutMultiple: 3.59, draw: 2.14, loss: 1.42, timeLabel: "Today · 21:30" },
  { id: "s3", asset: "SOL", pair: "SOL / USDT", side: "SHORT", confidence: 0.71, payoutMultiple: 2.10, draw: 1.95, loss: 1.30, timeLabel: "Tomorrow · 09:00" },
  { id: "s4", asset: "NDX", pair: "NASDAQ 100", side: "LONG", confidence: 0.66, payoutMultiple: 1.78, draw: 2.05, loss: 1.55, timeLabel: "Mon · 15:30" },
];
export interface PopularItem { id: string; rank: number; label: string; category: string; symbol: string; tileTone: "blue" | "lime" | "magenta" | "violet"; }
export const POPULAR: PopularItem[] = [
  { id: "p1", rank: 1, label: "Scalping", category: "Top Strategy", symbol: "S", tileTone: "blue" },
  { id: "p2", rank: 2, label: "Breakouts", category: "Trending", symbol: "B", tileTone: "lime" },
  { id: "p3", rank: 3, label: "Mean Reversion", category: "Strategy", symbol: "M", tileTone: "magenta" },
];
export const PROFIT_THIS_MONTH = 1452.23;
export const PROFIT_TRADERS = ["A", "K", "M"];
export interface Notification {
  id: string;
  type: "tier_unlocked" | "close_to_next_tier" | "inactive_warning" | "new_lesson" | "announcement";
  title: string; body: string; link?: string; createdAt: string; readAt?: string | null;
}
export const NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "close_to_next_tier", title: "€500 to Operator", body: "You're closing in on Operator. Top up to unlock the automated Telegram trader.", link: "/tier", createdAt: "2026-06-05T08:12:00Z", readAt: null },
  { id: "n2", type: "new_lesson", title: "New lesson: Support, Resistance & Trend", body: "Just published in Operator → Technical.", link: "/lessons", createdAt: "2026-06-04T14:30:00Z", readAt: null },
  { id: "n3", type: "tier_unlocked", title: "Foundation unlocked", body: "Signal group access is live. Tap to open Telegram.", link: "/signals", createdAt: "2026-05-22T10:02:00Z", readAt: "2026-05-22T10:05:00Z" },
  { id: "n4", type: "announcement", title: "Live session Friday 19:00 CET", body: "Live trading room — bring questions.", link: "/", createdAt: "2026-05-18T09:00:00Z", readAt: "2026-05-19T07:00:00Z" },
  { id: "n5", type: "inactive_warning", title: "Stay active this month", body: "Trade at least 0.1 lots before the month ends to keep your access active.", link: "/", createdAt: "2026-05-12T18:00:00Z", readAt: "2026-05-13T07:30:00Z" },
];
