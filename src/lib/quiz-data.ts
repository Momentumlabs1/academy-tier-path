export interface QuizQuestion {
  q: string;
  options: [string, string, string];
  /** index into options */
  correct: 0 | 1 | 2;
  explain: string;
}

/** Bonus XP for passing a lesson quiz (≥ 2/3 correct). */
export const QUIZ_PASS_XP = 50;

// Questions are drawn directly from the course script.
export const QUIZZES: Record<string, QuizQuestion[]> = {
  l1: [
    { q: "What separates trading from investing?", options: ["Trading is only for professionals", "In trading you profit from rising AND falling prices", "Investing is riskier"], correct: 1, explain: "Investors can only buy — traders go long (buy) or short (sell) and profit in any market condition." },
    { q: "What does going short mean?", options: ["Selling — betting on falling prices", "Buying quickly", "Placing a small trade"], correct: 0, explain: "Long = buy, short = sell. That's how you profit even when the market drops." },
    { q: "Which markets can you trade?", options: ["Only stocks", "Only crypto", "Stocks, indices, commodities and currencies"], correct: 2, explain: "DAX, S&P 500, NASDAQ, gold, oil, EUR/USD — the market moves almost every day, offering opportunities almost daily." },
  ],
  l2: [
    { q: "How many hours of effective trading does a day require?", options: ["8–10 hours like a full-time job", "1–3 focused hours", "24/7 market watching"], correct: 1, explain: "In trading, more is not more — the more you actively trade, the worse performance usually gets." },
    { q: "What makes trading so capital-efficient?", options: ["Guaranteed profits", "Tiny startup costs, no employees, no inventory, no customers", "The broker funds your account"], correct: 1, explain: "A few hundred to a few thousand euros is enough to start — no other business model offers this freedom at such low fixed costs." },
    { q: "Who is responsible for your trading success?", options: ["The market", "Your signal provider", "Only you"], correct: 2, explain: "Full self-responsibility is the price of maximum freedom — you depend on no one." },
  ],
  l3: [
    { q: "Why do over 90% of traders lose money?", options: ["The market is rigged", "Because of their own decisions, not the market", "Not enough starting capital"], correct: 1, explain: "The market is the same for everyone — profitable traders simply make different decisions because they follow a system." },
    { q: "What is revenge trading?", options: ["Trying to win losses back immediately with increased risk", "A profitable strategy", "Copying other traders"], correct: 0, explain: "Raising your risk after losses to 'get it back' is the fastest way to destroy an account." },
    { q: "How long does a strategy need before it truly sticks?", options: ["1–2 weeks", "3 to 12 months", "At least 5 years"], correct: 1, explain: "Strategy hopping after 1–2 months is a top reason traders stay unprofitable. Give a system time to establish itself." },
  ],
  l4: [
    { q: "What is the formula for profitability?", options: ["Knowledge + experience + discipline + execution", "Capital + leverage + luck", "Signals + copying + patience"], correct: 0, explain: "First knowledge, then experience from real market situations, then the discipline to follow your plan — and in the end it's all about execution." },
    { q: "Why isn't knowledge alone enough?", options: ["Knowledge doesn't matter", "Knowing is not doing — like driving-school theory without practice", "You only need luck"], correct: 1, explain: "Theory gives you the basics — but you learn trading like driving: through practice." },
    { q: "What does social media show you about trading success?", options: ["The honest road to it", "Only the end result — never the months of work behind it", "Every loss in detail"], correct: 1, explain: "Lambos and fast profits are marketing. Anyone promising you'll be a millionaire in 12 months is lying." },
  ],
  l5: [
    { q: "What are the 2 kinds of greed?", options: ["Buying greed and selling greed", "Feeling 'untouchable' after win streaks & 'I want it back' after losses", "There is only one kind"], correct: 1, explain: "After 3–4 winners you think the market can't touch you — exactly when it brings you to your knees. After losses you want everything back, today, this hour." },
    { q: "What typically happens with the emotion 'hope'?", options: ["You close winners too early", "You remove the stop-loss and let losses run", "You stop trading entirely"], correct: 1, explain: "Hope makes you pull your loss limit and cling to a bias far too long — one of the most expensive mistakes there is." },
    { q: "Whoever doesn't control their emotions…", options: ["…is just unlucky", "…gets controlled by the market", "…needs more capital"], correct: 1, explain: "Emotions → bad decisions → broken rules → losses. You must learn yourself as a person just as much as the market." },
  ],
  l6: [
    { q: "What has priority in risk management?", options: ["Maximising profits", "Protecting capital comes before making profits", "Taking as many trades as possible"], correct: 1, explain: "Profitable traders have a scenario for everything: when to stop, when to continue, how to act when X happens." },
    { q: "At the end of the day, trading is…", options: ["Gambling without control", "Calculated betting — everything is based on probability", "An exact science"], correct: 1, explain: "A system trade has a HIGH probability of working out — not a guarantee. That's why the series matters, not the single trade." },
    { q: "Which performance period actually matters?", options: ["The single day", "The week", "Month, quarter and year"], correct: 2, explain: "A bad day or week is irrelevant. Unprofitable traders fail on a single day — three good weeks gone in one session." },
  ],
  l7: [
    { q: "Why do profitable traders keep a journal?", options: ["For taxes", "Data is gold: the more data on your system, the better you can improve it", "Because the broker requires it"], correct: 1, explain: "Logging trades, analysing mistakes, collecting data — documentation is core behaviour of nearly every profitable trader." },
    { q: "What belongs in the trading journal?", options: ["Only profit and loss", "Setup, reasoning, execution quality and emotions", "Screenshots of winners"], correct: 1, explain: "P&L alone never tells you WHY a result happened. You only improve what you document." },
    { q: "Successful traders focus on…", options: ["…individual trades", "…processes", "…hot tips"], correct: 1, explain: "The process must be explainable and repeatable — single trades are just data points in the statistics." },
  ],
  l8: [
    { q: "What is retail money?", options: ["The banks' money", "Private market participants trading their own capital — traders like you and me", "Only hobby traders without a plan"], correct: 1, explain: "Beginners, hobby traders, small investors: small-to-medium capital, limited information, near-identical education." },
    { q: "What's the problem with the standard education (S/R, trendlines, RSI, MACD)?", options: ["It's too expensive", "Everyone learns the same concepts, sees the same setups and places the same stops", "It's too complicated"], correct: 1, explain: "When everyone trades the same way, the crowd becomes predictable — and its stop-losses are exactly the liquidity the big players need." },
    { q: "If the majority of traders lose, you should…", options: ["…trade exactly like the majority", "…not trade at all", "…trade like the 5%, not the 95%"], correct: 2, explain: "Copying the methods of the losing majority makes no sense. The difference lies in the data and the system." },
  ],
  l9: [
    { q: "What do Level 1 data (candles, indicators, lines) show?", options: ["The cause of the move", "Only the result — we're speculating", "The banks' orders"], correct: 1, explain: "RSI shows what already happened. Support/resistance shows where something COULD happen. Both are speculation, not knowledge." },
    { q: "What do institutions see that retail traders don't?", options: ["The news earlier", "The order book, liquidity — and where your stop-losses sit", "Nothing, everyone sees the same"], correct: 1, explain: "The information gap: retail sees the price, institutions see market-participant data. Level 2 access closes that gap." },
    { q: "What actually moves the market?", options: ["Indicators and trendlines", "Orders — buy and sell executions", "Chart patterns"], correct: 1, explain: "Lines don't move markets. Market moves are created by orders, liquidity and large participants." },
  ],
  l10: [
    { q: "What's the difference between passive and active orders?", options: ["Passive orders rest in the book (limit/stop), active orders execute in the market immediately", "Passive are small, active are large orders", "There is no difference"], correct: 0, explain: "A limit order waits in the order book ('buy automatically at 1.00') — an active order executes right now." },
    { q: "What do the 'bubbles' in orderflow software show?", options: ["Every trade worldwide", "Active market executions of ~30+ contracts — institutional-size money", "Only your own orders"], correct: 1, explain: "30+ contracts takes multi-millions. When an order like that hits exactly at your buy level, that information is a massive edge." },
    { q: "Where is every order routed through an official exchange recorded?", options: ["In the chart", "In the order book", "At broker support"], correct: 1, explain: "The order book records everything — and through professional software, retail traders can now access it too." },
  ],
  l11: [
    { q: "What is the Value Area?", options: ["The zone holding 70% of the day's volume", "The day's highest price", "A trendline"], correct: 0, explain: "Value Area High (VAH) above, Value Area Low (VAL) below — 70% of all transactions happened inside. That's where the market feels at home." },
    { q: "What typically happens when the market leaves the Value Area?", options: ["It runs forever", "It quickly comes straight back into the Value Area", "Trading stops"], correct: 1, explain: "Out of the 70% — and straight back in. That return is a recurring, tradeable pattern." },
    { q: "Why are Low Volume Nodes (LVN) interesting?", options: ["Nothing ever happens there", "The market fills low-volume areas fast — quick moves", "All stop-losses sit there"], correct: 1, explain: "High Volume Nodes = comfort zone (avoid). Low Volume Nodes = the market shoots through — that's what we want to trade." },
  ],
  l12: [
    { q: "What does the footprint chart show?", options: ["Only the closing price", "Per candle, how many contracts were actively bought vs. sold", "The news flow"], correct: 1, explain: "You look inside the candle: buy and sell contracts, delta, and a per-candle summary." },
    { q: "A bullish candle with NEGATIVE delta means…", options: ["A software glitch", "Many active sellers couldn't push the market down → strong passive buyers absorbing", "The market will definitely fall"], correct: 1, explain: "More active sellers, yet price rises? Large passive buy orders are absorbing — information only this view reveals." },
    { q: "How do you combine volume profile and footprint?", options: ["You don't — use only one", "Volume profile = WHERE to enter (POI), footprint & bubbles = WHEN to enter (timing)", "They show the same thing"], correct: 1, explain: "The profile delivers the point of interest, the orderflow the precise timing — together extremely precise. Data 90% never use." },
  ],
};
