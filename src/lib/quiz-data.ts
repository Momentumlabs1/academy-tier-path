export interface QuizQuestion {
  q: string;
  options: [string, string, string];
  /** index into options */
  correct: 0 | 1 | 2;
  explain: string;
}

/** Bonus XP for passing a lesson quiz (≥ 2/3 correct). */
export const QUIZ_PASS_XP = 50;

export const QUIZZES: Record<string, QuizQuestion[]> = {
  l1: [
    { q: "What actually moves price in a market?", options: ["News headlines directly", "Imbalance between buy and sell orders", "The exchange setting prices"], correct: 1, explain: "Price moves when market orders consume the liquidity resting on one side of the order book." },
    { q: "The bid/ask spread is…", options: ["A broker bonus", "The cost of instant execution", "Only relevant for stocks"], correct: 1, explain: "Crossing the spread is the price you pay to fill immediately instead of waiting with a limit order." },
    { q: "A limit order…", options: ["Fills instantly at any price", "Rests in the book until price reaches it", "Is only for institutions"], correct: 1, explain: "Limit orders add liquidity and wait; market orders take liquidity and fill now." },
  ],
  l2: [
    { q: "A candle's wick (shadow) shows…", options: ["Volume traded", "Prices that were rejected", "The spread"], correct: 1, explain: "Wicks mark where price traveled but couldn't hold — rejection zones." },
    { q: "A long body with tiny wicks signals…", options: ["Indecision", "Strong directional momentum", "Low volume"], correct: 1, explain: "Openers to closers with little pushback = one side is in control." },
    { q: "A doji candle means…", options: ["Buyers and sellers closed near balance", "Guaranteed reversal", "Market holiday"], correct: 0, explain: "Open ≈ close = indecision. It needs context, it is not a signal on its own." },
  ],
  l3: [
    { q: "With €10,000 and 1% risk, your max loss per trade is…", options: ["€1,000", "€100", "€10"], correct: 1, explain: "1% of €10,000 = €100. Position size derives from this and your stop distance." },
    { q: "Your position size is determined by…", options: ["Gut feeling and conviction", "Risk amount ÷ stop distance", "Always the same lot size"], correct: 1, explain: "Size = risk € divided by distance to stop. Wider stop → smaller size." },
    { q: "Why does the 1% rule keep you alive?", options: ["It maximizes profit", "10 losses in a row only cost ~10%", "Brokers require it"], correct: 1, explain: "Losing streaks are inevitable. Small risk per trade makes them survivable." },
  ],
  l4: [
    { q: "A support level is strongest when…", options: ["It was touched and defended multiple times", "You draw it perfectly", "It's a round number"], correct: 0, explain: "Each defended touch shows real buying interest at that price." },
    { q: "The higher-probability entry is usually…", options: ["Chasing the breakout candle", "Waiting for the retest of the level", "Averaging into a falling knife"], correct: 1, explain: "Retests confirm the level flipped and offer a defined invalidation point." },
    { q: "Your invalidation level should be set…", options: ["After entering", "Before entering", "Never — hold and hope"], correct: 1, explain: "If you don't know where you're wrong before entry, you don't have a trade plan." },
  ],
  l5: [
    { q: "EMA vs SMA — the EMA…", options: ["Weights recent prices more heavily", "Is always better", "Ignores recent candles"], correct: 0, explain: "The exponential MA reacts faster because recent data counts more." },
    { q: "The 200-day MA is best used as…", options: ["An exact entry trigger", "A regime filter (bull vs bear)", "A profit target"], correct: 1, explain: "Above = bullish regime, below = bearish. It filters direction, not timing." },
    { q: "Most MA crossover signals in ranging markets are…", options: ["Highly reliable", "Noise that chops you up", "Buy signals"], correct: 1, explain: "MAs lag. In a range they cross constantly and whipsaw you." },
  ],
  l6: [
    { q: "With 1:3 risk-reward, what win rate breaks even?", options: ["50%", "25%", "75%"], correct: 1, explain: "1 / (1 + 3) = 25%. You can lose 3 of 4 trades and still not lose money." },
    { q: "Targets are best placed at…", options: ["Round numbers you like", "Market structure (prior highs/lows, liquidity)", "Exactly 2× the stop"], correct: 1, explain: "Price reacts to structure. Arbitrary targets get front-run by real levels." },
    { q: "Expectancy is…", options: ["Your win rate alone", "(Win% × avg win) − (Loss% × avg loss)", "Profit of your best trade"], correct: 1, explain: "Only the combination of hit rate and payoff tells you if a system makes money." },
  ],
  l7: [
    { q: "The main value of watching a live session is…", options: ["Copying entries blindly", "Seeing decision-making as conditions change", "Entertainment"], correct: 1, explain: "The reasoning between entry and exit is the skill — not the fills themselves." },
    { q: "A professional session journal captures…", options: ["Only P&L", "Setup, reasoning, execution quality, emotions", "Screenshots of wins"], correct: 1, explain: "You improve what you review. P&L alone hides why results happened." },
    { q: "When conditions change mid-trade, a pro…", options: ["Freezes and hopes", "Re-evaluates against the original thesis", "Doubles the position"], correct: 1, explain: "If the reason for the trade is gone, the trade is gone." },
  ],
  l8: [
    { q: "Rising price on falling volume suggests…", options: ["Strong healthy trend", "Weakening participation — caution", "Institutional buying"], correct: 1, explain: "Fewer participants pushing price up = the move is running on fumes." },
    { q: "Open interest rising while price rises means…", options: ["New money confirming the move", "Shorts covering only", "Nothing"], correct: 0, explain: "New contracts opening alongside the trend = fresh conviction behind it." },
    { q: "Accumulation typically looks like…", options: ["Violent breakouts", "Quiet ranging with absorption at lows", "Straight-line selloffs"], correct: 1, explain: "Big players build positions quietly where sellers get absorbed without price falling." },
  ],
  l9: [
    { q: "Revenge trading usually starts after…", options: ["A winning streak", "A loss you refuse to accept", "A weekend"], correct: 1, explain: "The urge to 'win it back' immediately is the most expensive emotion in trading." },
    { q: "The fastest way to regain control when tilted is…", options: ["Doubling size to recover", "Sizing down or stopping", "Switching markets"], correct: 1, explain: "Reducing stakes lowers emotional temperature and protects the account." },
    { q: "A pre-trade checklist works because it…", options: ["Guarantees wins", "Forces System-2 thinking before commitment", "Impresses others"], correct: 1, explain: "It inserts a deliberate pause between impulse and execution." },
  ],
  l10: [
    { q: "An edge is…", options: ["A secret indicator", "A repeatable condition with positive expectancy", "High leverage"], correct: 1, explain: "Edge = a situation where, over many repetitions, you make more than you lose." },
    { q: "The biggest backtesting trap is…", options: ["Too much data", "Curve-fitting rules to the past", "Testing too few markets"], correct: 1, explain: "Rules tuned perfectly to history usually collapse on unseen data." },
    { q: "A playbook should define…", options: ["Only entries", "Setup, trigger, size, stop, target, invalidation", "Your yearly goal"], correct: 1, explain: "If every element is written down, execution becomes repeatable and reviewable." },
  ],
  l11: [
    { q: "Two positions in EURUSD and GBPUSD are…", options: ["Fully independent", "Highly correlated — nearly one doubled trade", "Perfect hedges"], correct: 1, explain: "Correlated pairs move together; your real exposure is bigger than it looks." },
    { q: "Hidden concentration risk means…", options: ["Too much cash", "Many positions sharing one driver (e.g. USD)", "Low leverage"], correct: 1, explain: "Ten trades that all lose when the dollar rallies are one big trade in disguise." },
    { q: "Rebalancing should be triggered by…", options: ["Boredom", "Predefined thresholds/rules", "News headlines"], correct: 1, explain: "Rules remove emotion from the decision — exactly where emotion does the most damage." },
  ],
  l12: [
    { q: "Fat tails mean extreme moves happen…", options: ["Less often than a normal distribution predicts", "More often than a normal distribution predicts", "Never"], correct: 1, explain: "Markets crash and squeeze far more often than the bell curve says they should." },
    { q: "Sizing for survival means…", options: ["Betting big on conviction", "No single event can take you out", "Using max leverage with a stop"], correct: 1, explain: "The first rule of compounding: stay in the game through the unexpected." },
    { q: "A stress test asks…", options: ["What if 2008/2020 happened to my book today?", "How much I'd make in a bull market", "Which broker is cheapest"], correct: 0, explain: "You test the portfolio against historical shocks before the market does it for you." },
  ],
};
