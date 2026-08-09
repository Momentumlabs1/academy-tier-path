/**
 * EarningsEstimator — three questions, one number.
 *
 * Earlier versions asked a creator for their funding rate, their average deposit,
 * or how many "funded accounts" they expect. Nobody knows those about their own
 * audience, and the last one was jargon — the label alone stopped a reader cold.
 *
 * So the page asks only what someone genuinely knows about their own channel:
 * how many views they get, what they post about, and how hard they intend to push
 * this. The model turns that into customers; the reader never has to.
 *
 *   views × BASE × niche.pull × effort.factor  →  paying customers / month
 *   customers × niche.lots                     →  lots traded / month
 *   customers × AVG_DEPOSIT                    →  volume booked, which sets the rate
 *
 * The constants are directional, not measured, and BASE is deliberately low: at
 * 0.01% of monthly views a 100k-view trading channel posting regularly lands
 * around ten customers a month, which is a number a partner can actually hit. An
 * estimate that flatters gets found out in month one and costs more trust than it
 * won — which is also why the rate is taken from a single month's volume rather
 * than an annualised one.
 */
import { useMemo, useState } from "react";
import { levelForVolume } from "@/lib/commission";
import { formatMoney, formatNumber } from "@/lib/format";

/**
 * Share of monthly views that become a paying customer, before the modifiers.
 * 0.01% — around ten customers per 100k views for a trading channel posting
 * regularly. Deliberately on the low side.
 */
const BASE = 0.0001;

/** What we assume a customer starts with. Shown in the result so it is not hidden. */
const AVG_DEPOSIT = 1000;

/**
 * `pull` — how readily this audience opens a live trading account.
 * `lots` — how actively they then trade, which is what actually pays.
 */
const NICHES = [
  { key: "trading", label: "Trading & finance", pull: 1.0, lots: 14 },
  { key: "crypto", label: "Crypto", pull: 0.85, lots: 11 },
  { key: "betting", label: "Sports & betting", pull: 0.7, lots: 9 },
  { key: "business", label: "Business & entrepreneurship", pull: 0.6, lots: 8 },
  { key: "other", label: "Something else", pull: 0.45, lots: 6 },
  { key: "lifestyle", label: "Lifestyle & motivation", pull: 0.35, lots: 5 },
] as const;

const EFFORT = [
  { key: "light", label: "Now and then", note: "a mention, link in bio", factor: 0.4 },
  { key: "regular", label: "Regularly", note: "part of your normal content", factor: 1.0 },
  { key: "focus", label: "Main focus", note: "you build content around it", factor: 2.0 },
] as const;

const DEFAULTS = { views: 100_000, niche: "trading", effort: "regular" };

export function EarningsEstimator() {
  const [v, setV] = useState<{ views: number; niche: string; effort: string }>(DEFAULTS);

  const calc = useMemo(() => {
    const niche = NICHES.find((n) => n.key === v.niche) ?? NICHES[0];
    const effort = EFFORT.find((e) => e.key === v.effort) ?? EFFORT[1];
    const customers = Math.max(0, Math.round(v.views * BASE * niche.pull * effort.factor));
    // Rated on ONE month of volume, not an annualised figure. The staircase reads
    // volume actually booked, and a new partner starts at zero — annualising put
    // almost every input straight onto the top rate, which both flattered the
    // result and made the staircase below look decorative.
    const level = levelForVolume(customers * AVG_DEPOSIT);
    const lots = customers * niche.lots;
    return { customers, lots, level, monthly: lots * level.usdPerLot };
  }, [v]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.13_0.035_258)]">
      <div className="grid lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6 border-b border-white/8 p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground/90">Views you get per month</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                {formatNumber(v.views)}
              </span>
            </span>
            <input
              type="range" min={5_000} max={3_000_000} step={5_000} value={v.views}
              onChange={(e) => setV({ ...v, views: Number(e.target.value) })}
              aria-label="Views you get per month"
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[oklch(0.72_0.17_244)]"
            />
            <span className="mt-1.5 block text-[11px] text-muted-foreground">
              Across everything you post — reels, shorts, stories, video.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground/90">What you post about</span>
            <select
              value={v.niche}
              onChange={(e) => setV({ ...v, niche: e.target.value })}
              className="w-full rounded-xl border border-white/12 bg-[oklch(0.10_0.028_258)] px-3 py-2.5 text-sm text-foreground"
            >
              {NICHES.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-foreground/90">How hard you'll push it</span>
            <div className="grid gap-2">
              {EFFORT.map((e) => {
                const on = v.effort === e.key;
                return (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => setV({ ...v, effort: e.key })}
                    aria-pressed={on}
                    className={`flex items-baseline justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                      on
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/10 bg-[oklch(0.10_0.028_258)] hover:border-white/20"
                    }`}
                  >
                    <span className={`text-sm font-medium ${on ? "text-primary" : ""}`}>{e.label}</span>
                    <span className="text-[11px] text-muted-foreground">{e.note}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between p-5 sm:p-7">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Your commission
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold tabular-nums leading-none text-primary sm:text-6xl">
                {formatMoney(Math.round(calc.monthly))}
              </span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <div className="mt-2 text-sm text-foreground/60">
              At level {calc.level.level} — {formatMoney(calc.level.usdPerLot)} per lot. Your rate
              climbs as volume accumulates, so this is the starting point, not the ceiling.
            </div>

            <div className="mt-6 space-y-0 text-sm">
              {[
                ["New paying customers / month", formatNumber(calc.customers)],
                ["Lots they trade / month", formatNumber(calc.lots)],
                ["Assumed first deposit", formatMoney(AVG_DEPOSIT, "€")],
              ].map(([k, val], i) => (
                <div
                  key={k}
                  className={`flex items-baseline justify-between gap-4 py-2.5 ${i > 0 ? "border-t border-white/6" : ""}`}
                >
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono tabular-nums text-foreground/90">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 border-t border-white/8 pt-4 text-[11px] leading-relaxed text-muted-foreground">
            A directional estimate from your own inputs — not a forecast and not a promise of
            earnings. Real income depends on how many people join, whether they fund, and how much
            they actually trade. Trading involves risk; most retail accounts lose money.
          </p>
        </div>
      </div>
    </div>
  );
}
