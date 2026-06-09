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
];

export function getTenant(slug: string): TenantConfig | undefined {
  return TENANTS.find((t) => t.slug === slug);
}
