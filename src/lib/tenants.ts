export interface TenantTierOverride {
  name: string;
  minDeposit: number;
  perks: string[];
  color: string;
}

export interface TenantConfig {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logoInitials: string;
  primaryColor: string;
  accentColor: string;
  bgFrom: string;
  bgTo: string;
  brokerName: string;
  brokerUrl: string;
  telegramChannel: string;
  affiliateEmail: string;
  stats: { label: string; value: string }[];
  features: { icon: string; title: string; body: string }[];
  /** Optional richer content ------------------------------------------------ */
  mascot?: "zeko";
  headline?: string; // overrides the big hero line if set
  subhead?: string;  // short line under the headline
  testimonials?: { name: string; handle: string; text: string; result: string }[];
  faq?: { q: string; a: string }[];
}

export const TENANTS: TenantConfig[] = [
  {
    slug: "agent-trading",
    name: "Agent Trading Academy",
    tagline: "Trade smarter. Every day.",
    description: "Join the education platform used by serious retail traders. Real signals, real lessons, real results.",
    logoInitials: "AT",
    primaryColor: "oklch(0.9 0.2 140)",
    accentColor: "oklch(0.7 0.18 270)",
    bgFrom: "oklch(0.18 0.09 290)",
    bgTo: "oklch(0.13 0.06 290)",
    brokerName: "Your Broker",
    brokerUrl: "#",
    telegramChannel: "https://t.me/agent_trading_signals",
    affiliateEmail: "kontakt@momentumlabs.at",
    stats: [
      { label: "Active members", value: "200+" },
      { label: "Signal accuracy", value: "74%" },
      { label: "Avg. monthly lots", value: "0.8" },
      { label: "Years live", value: "3+" },
    ],
    features: [
      { icon: "📡", title: "Live Telegram Signals", body: "Real-time trade calls from our desk, direct to your phone." },
      { icon: "📚", title: "Structured Curriculum", body: "12 lessons from basics to elite-level edge building." },
      { icon: "🤖", title: "Auto-Trader", body: "Copy our master account trades automatically (Operator+)." },
    ],
  },
  {
    slug: "crypto-masters",
    name: "Crypto Masters Club",
    tagline: "Master crypto before the next bull run.",
    description: "The private club for crypto traders who want structure, signals, and a real edge in the market.",
    logoInitials: "CM",
    primaryColor: "oklch(0.82 0.2 60)",
    accentColor: "oklch(0.72 0.16 30)",
    bgFrom: "oklch(0.15 0.08 30)",
    bgTo: "oklch(0.11 0.04 30)",
    brokerName: "Bybit / Binance",
    brokerUrl: "#",
    telegramChannel: "https://t.me/agent_trading_signals",
    affiliateEmail: "crypto@momentumlabs.at",
    stats: [
      { label: "BTC signals sent", value: "1,400+" },
      { label: "Win rate", value: "68%" },
      { label: "Members trading", value: "85+" },
      { label: "Live since", value: "2024" },
    ],
    features: [
      { icon: "₿", title: "Crypto-First Signals", body: "BTC, ETH, SOL — timed entries with clear SL/TP levels." },
      { icon: "🎓", title: "Crypto Curriculum", body: "DeFi, on-chain analysis, orderflow — not just TA." },
      { icon: "⚡", title: "Speed Advantage", body: "Signals reach you in under 3 seconds via Telegram bot." },
    ],
  },
  {
    slug: "fx-elite",
    name: "FX Elite Network",
    tagline: "Institutional edges for retail traders.",
    description: "Built for serious FX traders. Learn what banks know, trade like a prop firm.",
    logoInitials: "FX",
    primaryColor: "oklch(0.75 0.18 250)",
    accentColor: "oklch(0.65 0.2 200)",
    bgFrom: "oklch(0.14 0.07 240)",
    bgTo: "oklch(0.10 0.04 240)",
    brokerName: "IC Markets / XM",
    brokerUrl: "#",
    telegramChannel: "https://t.me/agent_trading_signals",
    affiliateEmail: "fx@momentumlabs.at",
    stats: [
      { label: "FX pairs covered", value: "28" },
      { label: "Avg. R:R", value: "1:2.4" },
      { label: "Active traders", value: "60+" },
      { label: "Monthly pips avg.", value: "340" },
    ],
    features: [
      { icon: "🏦", title: "Institutional Flow Analysis", body: "Smart money concepts — no retail nonsense." },
      { icon: "📊", title: "Session Briefings", body: "London & NY open analysis every trading day." },
      { icon: "🤝", title: "Prop Firm Prep", body: "Challenge-ready risk rules and position sizing." },
    ],
  },
  {
    slug: "zekoglobal",
    name: "Zeko Global",
    tagline: "Build your first $10k month — from zero.",
    description: "Learn what the wealthy actually do with money. Real trade signals, a step-by-step playbook, and a community of 155K+ — no fluff, no gurus.",
    logoInitials: "Z",
    primaryColor: "oklch(0.76 0.06 158)",
    accentColor: "oklch(0.9 0.035 85)",
    bgFrom: "oklch(0.14 0.006 150)",
    bgTo: "oklch(0.09 0.004 150)",
    brokerName: "Your Broker",
    brokerUrl: "#",
    telegramChannel: "https://t.me/zekoglobal",
    affiliateEmail: "zekoglobalhq@gmail.com",
    stats: [
      { label: "Community", value: "155K+" },
      { label: "Signal accuracy", value: "74%" },
      { label: "Target", value: "$10k / mo" },
      { label: "Cost to join", value: "€0" },
    ],
    features: [
      { icon: "📡", title: "Live Wealth Signals", body: "Real-time trade calls straight to your phone — copy the desk, not the hype." },
      { icon: "🔑", title: "The Wealth Playbook", body: "What wealthy people actually do with money — a clear path from zero to your first $10k month." },
      { icon: "💸", title: "Free to Join", body: "Fund with our partner broker and unlock every signal and lesson for free." },
    ],
    mascot: "zeko",
    headline: "Build your first $10k month — from zero.",
    subhead: "155,000 people already follow Zeko for one reason: no fluff, no gurus — just what actually moves money.",
    testimonials: [
      { name: "Marco R.", handle: "@marco.trades", text: "Followed the free signals for 3 weeks before I even deposited. Once I saw they were real, I went all in.", result: "+€1,240 first month" },
      { name: "Sofia L.", handle: "@sofdoestrades", text: "The playbook finally made order flow click for me. I stopped gambling and started actually managing risk.", result: "First green month" },
      { name: "Dennis K.", handle: "@dk_capital", text: "Signals hit my phone, I copy them in seconds. The Telegram community keeps me accountable.", result: "4 months consistent" },
    ],
    faq: [
      { q: "Is it really free?", a: "Yes. You get the signals and the education for free — you only fund a live account with our partner broker (from €100). No course fees, no upsells." },
      { q: "Do I need experience?", a: "No. The playbook starts from zero and the signals tell you exactly what to do — entry, stop-loss and targets. You learn while you trade." },
      { q: "How do the signals reach me?", a: "Through a private Telegram channel. Once your deposit is verified, our bot sends you a personal invite automatically." },
      { q: "Can I stop anytime?", a: "Of course. It's your broker account and your money — withdraw or leave the channel whenever you want." },
    ],
  },
];

export function getTenant(slug: string): TenantConfig | undefined {
  return TENANTS.find((t) => t.slug === slug);
}
