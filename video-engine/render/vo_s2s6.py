import os, sys, subprocess, json, pathlib

# Generate S2..S6 Harry VO from the locked script spine (.render/v6/script_en.md §S2..S6).
# Texts must stay verbatim = the approved condensed EN script.

VOICE = "SOYHLrjzK2X1ezoPC6cr"  # Harry
MODEL = "eleven_multilingual_v2"
HERE = pathlib.Path(__file__).resolve().parent.parent
OUT = HERE / ".render/v6/vo"

TEXTS = {
"s2": ("This is TradingView — where most traders analyze the market. On the left, my favorites bar: "
"every drawing tool I use. Up here, the Volume Profile — Fixed Range — which we can use right on "
"TradingView to read the volume of any range we choose. And we have different views of the market: "
"the line chart, the candle chart — the most popular — and the Volume Footprint chart, where we see "
"delta volume and the orders themselves. For TradingView, that's genuinely good. But the footprint "
"in the professional software is another level — more precise, more accurate — because it pulls data "
"TradingView simply doesn't have: data from one of the largest exchanges. We'll start on "
"TradingView, then move to the software."),

"s3": ("Let's start with the volume profile — because if you master this one tool, you can already "
"achieve a lot. The market is moved by volume, by orders. So how do we use it? We draw the volume "
"profile from the low to the current point in the market — not low to high, because that leaves a "
"big gap. From that we get three things: the Value Area Low, the Value Area High, and the Point of "
"Control — where the most volume traded. "
"Here's the rule. We do NOT trade at the Point of Control. We wait for the Value Area Low to be "
"swept — taken out. Structure here is bullish — we broke the high — so we look for longs. "
"Watch: price sweeps the Value Area Low... but at the exact moment of that candle, on the one-minute, "
"we were NOT at the Value Area Low yet — so we don't cheat, we wait. The profile keeps changing, so "
"we keep redrawing it. Value Area High of the down-move taken — continuation short. Then the Value "
"Area Low taken, and we come into a low-volume node — an imbalance zone — a very strong criterion. "
"Now, the entry. The market consolidates, we draw the value area of that consolidation, and we wait "
"for a sustainable break of the resistance plus the prior Value Area Low. There it is — sustainable. "
"And to time the entry, we read the footprint: here we have a negative delta, but a positive candle. "
"Delta tells us how many active orders hit the market — negative means more aggressive sells than "
"buys. So what pushed price up? Passive buy orders — sixty-one buys down here absorbed the sells and "
"lifted the market. That's absorption — our entry. Tight stop, and within seconds it runs into "
"profit. One to two-point-eight. One to four-point-six. Super simple — just the volume profile, plus "
"the footprint for the entry."),

"s4": ("Of course, full orderflow trading is more than that. We watch a heatmap, we watch the deep "
"trades, and we watch a real footprint. The single most important entry confirmation is absorption. "
"Absorption looks like this: lots of short orders hit the market — but the market doesn't drop. "
"Those aggressive market sells are being absorbed by passive orders sitting in the book. We see where "
"those passive orders are through the heatmap. Here — a hundred and one sell contracts come in, then "
"two buys, and the candle closes bullish. Absorption. "
"Compare it to health: buy orders come in, market goes up. Buys in — up. Buys in — up. Until the "
"sellers step back in aggressively. Now watch a top forming. Up here buyers keep getting absorbed — "
"they cannot break the ceiling. When that happens at a higher-timeframe point of interest — say the "
"Value Area High of the day — that's your signal to look for shorts. "
"Now the footprint, on the right — same area of the market, a different view of the orders. Look at "
"the top: trapped buyers. Two-fourteen, two-oh-two, two-ninety buy orders trying to break — and "
"nothing happens. Positive delta of eleven percent — eleven percent more aggressive buyers than "
"sellers — and yet the very next candle sells off. Trapped buyers. "
"So the trade: we wait for large sell orders to come in AND for the prior sell orders to break. "
"A hundred and five sell contracts hit, absorption, trapped buyers above, then we break with buyers — "
"short after the break. Stop above the absorption, target the next low, or the Value Area Low of the "
"long move. One to one-and-a-half — up to one to six if we target the daily volume profile."),

"s5": ("One more thing — why absorption matters so much. Say five hundred short contracts are sitting "
"in the market. Think about what happens when a short closes — whether in profit or in loss, closing "
"a short is an active buy. So when those five hundred shorts get closed out up here, they act as pure "
"buying power, pushing our way. That's why we want to see absorption: it tells us passive orders have "
"entered that we otherwise can't see."),

"s6": ("That's it. Simple — just the volume profile and a few entry confirmations that give us "
"momentum. And the beauty is: these are either instant losses — you know within two minutes you were "
"wrong — or momentum trades with almost zero drawdown. If you already trade a strategy, add the "
"volume profile and see if it sharpens your edge. If you're new — you're starting with something "
"that actually works, long term. These are the systems traded by world champions, for years. I "
"learned them from the best, and now this knowledge is yours."),
}

env = os.environ.copy()
for line in open(HERE / ".render/.voice.env"):
    line = line.strip()
    if line and "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k] = v

only = sys.argv[1:] or list(TEXTS)
for name in only:
    base = str(OUT / name)
    if os.path.exists(base + ".mp3") and os.path.exists(base + ".words.json"):
        d = json.load(open(base + ".words.json"))
        print(f"SKIP {name} (exists, dur={d['dur']}s)")
        continue
    r = subprocess.run([sys.executable, str(HERE / "render/tts_ts.py"),
                        TEXTS[name], VOICE, base, MODEL], env=env)
    if r.returncode != 0:
        sys.exit(f"FAIL {name}")
print("done")
