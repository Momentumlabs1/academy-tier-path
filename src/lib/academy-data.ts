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
    perks: ["Telegram signal group access", "Foundation lessons", "Cosmo — your 24/7 AI mentor", "Weekly market recap", "Community chat"] },
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
  category: "Foundations" | "Mindset" | "Risk" | "Orderflow" | "Practice";
  completed?: boolean;
  /** YouTube video id for the lesson recording. Placeholder until the real course recordings are uploaded — swap per lesson. */
  youtubeId?: string;
  /** Object name in the private `academy-videos` Supabase bucket. When set, the
   *  lesson plays this gated recording (time-limited signed URL) instead of the
   *  YouTube placeholder. Access is enforced server-side by the `video-url` fn. */
  videoObject?: string;
  /** Custom preview image (served from /public). Overrides the YouTube/branded
   *  thumbnail as the pre-play poster — used for lessons with a bespoke cover. */
  poster?: string;
  /** Concrete, per-lesson learning outcomes shown on the detail page. */
  objectives: string[];
}


/** Preview image for a lesson: the custom poster if set, else the YouTube thumbnail. */
export function lessonThumb(l: Pick<Lesson, "poster" | "youtubeId">, size: "mq" | "maxres" = "maxres"): string {
  if (l.poster) return l.poster;
  return `https://i.ytimg.com/vi/${l.youtubeId}/${size === "mq" ? "mqdefault" : "maxresdefault"}.jpg`;
}

// Curriculum based on the head trader's course script (Level-2 / orderflow strategy).
const ALL_LESSONS: Lesson[] = [
  { id: "l1", title: "What Is Trading?", description: "Long & short, the markets, and why trading is not investing.", durationMin: 4, tier: "foundation", category: "Foundations", completed: true, videoObject: "lesson-01.mp4", poster: "/posters/l1.jpg",
    objectives: ["Trading = actively buying & selling — profit in both directions (long & short)", "The markets: stocks, indices (DAX, S&P 500, NASDAQ), commodities, currencies", "Why trading ≠ investing: investors only profit from rising prices", "Profiting from short-term and long-term price moves"] },
  { id: "l2", title: "Trading vs. a Traditional Business", description: "Freedom, scalability, performance — the most capital-efficient business model.", durationMin: 12, tier: "foundation", category: "Foundations", completed: true,
    objectives: ["The 3 reasons: freedom (location & time independent), scalability, only performance counts", "No employees, no inventory, no customers, tiny startup costs — a few hundred euros is enough", "Why more trading does NOT mean more profit — 1–3 focused hours a day is all it takes", "Full self-responsibility: you alone own your results"] },
  { id: "l3", title: "Why 90% of Traders Lose", description: "The avoidable mistakes: no plan, overtrading, revenge trading.", durationMin: 9, tier: "foundation", category: "Risk", completed: false, videoObject: "lesson-03.mp4", poster: "/posters/l3.jpg",
    objectives: ["The majority doesn't lose because of the market — but because of their decisions", "Mistake #1: no clear rulebook — gut feeling is not a system", "Overtrading & revenge trading: how accounts get destroyed fast", "Strategy hopping: a strategy needs 3–12 months before it truly sticks"] },
  { id: "l4", title: "The Formula for Profitability", description: "Knowledge + experience + discipline + execution.", durationMin: 10, tier: "foundation", category: "Foundations",
    objectives: ["The 4 building blocks: knowledge → experience → discipline → execution", "Knowing is not doing: practice works like learning to drive", "Unrealistic expectations: social media shows the end result, never the road", "Trading is no get-rich-quick scheme — but what's possible in 2–3 years exists almost nowhere else"] },
  { id: "l5", title: "The 4 Emotions That Destroy Accounts", description: "Fear, greed, hope, frustration — and how to control them.", durationMin: 15, tier: "operator", category: "Mindset",
    objectives: ["Fear: closing winners too early, skipping setups, not entering at all", "The 2 kinds of greed: feeling 'untouchable' after win streaks & 'I want it back' after losses", "Hope: removing the stop-loss and letting losers run — the account killer", "Whoever doesn't control their emotions gets controlled by the market"] },
  { id: "l6", title: "What Profitable Traders Do Differently", description: "System, risk management, statistics, long-term thinking.", durationMin: 14, tier: "operator", category: "Mindset",
    objectives: ["A system: fixed rules and a repeatable, explainable process", "Risk management: protecting capital comes BEFORE making profits", "Trading is calculated betting — everything is probability, no trade is certain", "Never judge a day or a week — monthly and yearly performance is what counts"] },
  { id: "l7", title: "The Trading Journal", description: "Log trades, analyse mistakes, collect data.", durationMin: 11, tier: "operator", category: "Practice",
    objectives: ["Why nearly all profitable traders document their trading", "Data is gold: the more data on your system, the better you can improve it", "Log setup, reasoning, execution quality and emotions — not just P&L", "Mistake analysis as a weekly routine"] },
  { id: "l8", title: "What Is Retail Money?", description: "How the crowd trades — and why that's the wrong approach.", durationMin: 7, tier: "operator", category: "Orderflow", videoObject: "lesson-04.mp4", poster: "/posters/l8.jpg",
    objectives: ["Retail = private traders like you and me: small capital, limited information", "The problem: everyone learns the same concepts (S/R, trendlines, RSI, MACD) and places the same stops", "Why identical stop-losses become liquidity for the big players", "If the majority loses — why would you trade like the majority?"] },
  { id: "l9", title: "Level 1 vs. Level 2 Data", description: "The information gap between retail and institutions.", durationMin: 5, tier: "operator", category: "Orderflow", videoObject: "lesson-05.mp4", poster: "/posters/l9.jpg",
    objectives: ["Level 1: price, candles, indicators — shows only the RESULT (speculation)", "Level 2: order book, liquidity, market participants — shows the CAUSE of the move", "Retail sees the price; institutions see every order, liquidity and your stops", "The market moves through orders — nothing else"] },
  { id: "l10", title: "The Order Book: Active vs. Passive Orders", description: "How to see where the big money steps in.", durationMin: 18, tier: "elite", category: "Orderflow",
    objectives: ["Every order routed through an official exchange is recorded in the order book", "Passive orders (limit/stop) vs. active market executions", "Bubbles: market executions of 30+ contracts = institutional money made visible", "Why this insight fundamentally changes your entry timing"] },
  { id: "l11", title: "Volume Profile: Value Area, HVN & LVN", description: "Where the market feels comfortable — and where the fast moves happen.", durationMin: 14, tier: "elite", category: "Orderflow", videoObject: "lesson-06.mp4", poster: "/posters/l11.jpg",
    objectives: ["Value Area: the zone holding 70% of the day's volume (VAH above, VAL below)", "The market returns to the Value Area — breaks out and comes straight back in", "Avoid High Volume Nodes (market feels at home), trade Low Volume Nodes (market fills them fast)", "The volume profile defines WHERE you enter — your point of interest"] },
  { id: "l12", title: "The Footprint Chart: Timing Precise Entries", description: "Delta, buy vs. sell pressure — reading candles from the inside.", durationMin: 22, tier: "elite", category: "Orderflow",
    objectives: ["The footprint shows per candle how many contracts were bought vs. sold", "Reading delta: a bullish candle with negative delta = passive buyers absorbing — a strong signal", "Volume profile (WHERE) + footprint & bubbles (WHEN) = precisely timed entries", "This alone means trading with data 90% of market participants never use"] },
];
/**
 * What the app ships. A lesson without its own recording is not shown at all —
 * showing a foreign placeholder video instead was worse than showing nothing.
 * The other entries stay in ALL_LESSONS so their copy and quizzes survive until
 * the recording exists; add `videoObject` and the lesson reappears.
 */
export const LESSONS: Lesson[] = ALL_LESSONS.filter((l) => Boolean(l.videoObject));

export const CURRENT_MEMBER = {
  name: "Demo Trader",
  email: "demo@trader.dev",
  deposit: 1500,
  monthlyLots: 0.14,
  joinedAt: "2026-04-18",
  telegramHandle: "@demo_trader",
};
// Deployable build: real data comes from Supabase via useMemberState. Flip this
// to true only for local UI demos with the static CURRENT_MEMBER/NOTIFICATIONS.
export const DEMO_MODE = false;
export interface Signal {
  id: string; asset: string; pair: string; side: "LONG" | "SHORT";
  confidence: number; payoutMultiple: number; draw?: number; loss?: number; timeLabel: string;
}
/**
 * EMPTY ON PURPOSE — and it must stay empty until a real feed exists.
 *
 * Four hardcoded calls used to live here (BTC LONG confidence 0.83, and so on),
 * rendered to members as live desk signals with a "Trade this signal" button
 * beside them. Every number was typed by hand: the confidence scores, the payout
 * multiples, the "Today · 20:00" timestamps that never moved. A member acting on
 * an invented confidence score is risking real money on a number someone made up,
 * and if they lose it, that number is the evidence against us.
 *
 * The real signals are delivered in the private Telegram channel. The UI now says
 * so instead of faking a feed.
 */
export const SIGNALS: Signal[] = [];
/* POPULAR was removed with the component that rendered it.
   It held three hand-written rankings — "1. Scalping (Top Strategy)",
   "2. Breakouts (Trending)", "3. Mean Reversion" — presented on the dashboard
   and the signals page as if something had measured them. Nothing had: no
   member ever picked a strategy anywhere in this app, so there was nothing to
   rank. The rail now shows the desk's real calls instead. */
// PROFIT_THIS_MONTH (1452.23) and PROFIT_TRADERS were removed, along with the
// ProfitWidget that rendered them. A hardcoded constant was displayed under the
// label "Profit", behind a gate reading "Community profit unlocks at Foundation"
// — which framed an invented figure as what members had actually earned, on a
// leveraged product, on every page a logged-in member sees. No data source
// exists that could ever have made it true.
export interface Notification {
  id: string;
  type: "tier_unlocked" | "close_to_next_tier" | "inactive_warning" | "new_lesson" | "announcement";
  title: string; body: string; link?: string; createdAt: string; readAt?: string | null;
}
export const NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "close_to_next_tier", title: "€500 to Operator", body: "You're closing in on Operator. Top up to unlock the automated Telegram trader.", link: "/tier", createdAt: "2026-06-05T08:12:00Z", readAt: null },
  { id: "n2", type: "new_lesson", title: "New lesson: Volume Profile — Value Area, HVN & LVN", body: "Just published in Elite → Orderflow.", link: "/lessons", createdAt: "2026-06-04T14:30:00Z", readAt: null },
  { id: "n3", type: "tier_unlocked", title: "Foundation unlocked", body: "Signal group access is live. Tap to open Telegram.", link: "/signals", createdAt: "2026-05-22T10:02:00Z", readAt: "2026-05-22T10:05:00Z" },
  { id: "n4", type: "announcement", title: "Live session Friday 19:00 CET", body: "Live trading room — bring questions.", link: "/", createdAt: "2026-05-18T09:00:00Z", readAt: "2026-05-19T07:00:00Z" },
  { id: "n5", type: "inactive_warning", title: "Stay active this month", body: "Trade at least 0.1 lots before the month ends to keep your access active.", link: "/", createdAt: "2026-05-12T18:00:00Z", readAt: "2026-05-13T07:30:00Z" },
];
