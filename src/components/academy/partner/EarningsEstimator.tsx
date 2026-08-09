/**
 * EarningsEstimator — four questions, one number.
 *
 * The first version asked for a sign-up rate, a funding rate, an average deposit
 * and lots traded per account per month. All of that is real and all of it is
 * the wrong question: nobody with an audience knows their funding rate, and a
 * page that opens by demanding five assumptions reads as homework. It was too
 * deep for the moment it sits in.
 *
 * What a creator DOES know is how many people they reach, roughly how many
 * accounts came in this month, what their niche is and where their audience
 * lives. So those are the four inputs, and the model carries the rest:
 *
 *   · niche  → how actively a funded account trades (lots per month)
 *   · country→ what a funded account is typically worth (deposit size, which is
 *              what moves the partner up the staircase)
 *   · reach  → only suggests a plausible account count; it never drives the
 *              result on its own, because reach without conversion is nothing.
 *
 * The multipliers are directional, not measured, and the disclaimer says so. An
 * estimate that flatters gets found out in month one — these sit deliberately on
 * the conservative side of what the desk sees.
 */
import { useMemo, useState } from "react";
import { levelForVolume } from "@/lib/commission";
import { formatMoney, formatNumber } from "@/lib/format";

/** Lots a funded account trades per month, by what the audience is there for. */
const NICHES = [
  { key: "trading", label: "Trading & finance", lots: 14 },
  { key: "crypto", label: "Crypto", lots: 11 },
  { key: "betting", label: "Sports & betting", lots: 9 },
  { key: "business", label: "Business & entrepreneurship", lots: 8 },
  { key: "other", label: "Something else", lots: 6 },
  { key: "lifestyle", label: "Lifestyle & motivation", lots: 5 },
] as const;

/** Typical first deposit, which is what moves you up the staircase. */
const REGIONS = [
  { key: "us", label: "US & Canada", deposit: 1600 },
  { key: "nordics", label: "Nordics", deposit: 1500 },
  { key: "dach", label: "Germany, Austria, Switzerland", deposit: 1400 },
  { key: "uk", label: "UK & Ireland", deposit: 1300 },
  { key: "mena", label: "Middle East", deposit: 1100 },
  { key: "eu", label: "Rest of Europe", deposit: 900 },
  { key: "asia", label: "Asia", deposit: 700 },
  { key: "latam", label: "Latin America", deposit: 400 },
  { key: "africa", label: "Africa", deposit: 300 },
] as const;

const DEFAULTS = { reach: 25_000, accounts: 12, niche: "trading", region: "dach" };

export function EarningsEstimator() {
  const [v, setV] = useState<{ reach: number; accounts: number; niche: string; region: string }>(DEFAULTS);

  const calc = useMemo(() => {
    const niche = NICHES.find((n) => n.key === v.niche) ?? NICHES[0];
    const region = REGIONS.find((r) => r.key === v.region) ?? REGIONS[0];
    // Volume booked under the partner over a year of this pace — that is what the
    // staircase reads, so a monthly figure alone would under-state the rate.
    const yearVolume = v.accounts * 12 * region.deposit;
    const level = levelForVolume(yearVolume);
    const lots = v.accounts * niche.lots;
    return { level, lots, monthly: lots * level.usdPerLot, deposit: region.deposit };
  }, [v]);

  /** A plausible account count for a given reach — a nudge, not a claim. */
  // Clamped to the slider's own maximum — suggesting 202 under a control that stops
  // at 200 offers a number the reader cannot actually select.
  const ACCOUNTS_MAX = 400;
  const suggested = Math.min(ACCOUNTS_MAX, Math.max(1, Math.round(v.reach * 0.0005)));

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.13_0.035_258)]">
      <div className="grid lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6 border-b border-white/8 p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground/90">People you reach</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-primary">{formatNumber(v.reach)}</span>
            </span>
            <input
              type="range" min={1000} max={500_000} step={1000} value={v.reach}
              onChange={(e) => setV({ ...v, reach: Number(e.target.value) })}
              aria-label="People you reach"
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[oklch(0.72_0.17_244)]"
            />
          </label>

          <label className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground/90">New paying customers / month</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-primary">{formatNumber(v.accounts)}</span>
            </span>
            <input
              type="range" min={1} max={ACCOUNTS_MAX} step={1} value={v.accounts}
              onChange={(e) => setV({ ...v, accounts: Number(e.target.value) })}
              aria-label="New paying customers per month"
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[oklch(0.72_0.17_244)]"
            />
            <span className="mt-1.5 block text-[11px] text-muted-foreground">
              People from your audience who open a live account and actually fund it — only
              those earn you anything. Around {formatNumber(suggested)} is typical at your reach.{" "}
              <button
                type="button"
                onClick={() => setV({ ...v, accounts: suggested })}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                use that
              </button>
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground/90">Your niche</span>
            <select
              value={v.niche}
              onChange={(e) => setV({ ...v, niche: e.target.value })}
              className="w-full rounded-xl border border-white/12 bg-[oklch(0.10_0.028_258)] px-3 py-2.5 text-sm text-foreground"
            >
              {NICHES.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground/90">Where your audience is</span>
            <select
              value={v.region}
              onChange={(e) => setV({ ...v, region: e.target.value })}
              className="w-full rounded-xl border border-white/12 bg-[oklch(0.10_0.028_258)] px-3 py-2.5 text-sm text-foreground"
            >
              {REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>
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
              {formatMoney(Math.round(calc.monthly * 12))} a year, at level {calc.level.level} —{" "}
              {formatMoney(calc.level.usdPerLot)} per lot
            </div>

            <div className="mt-6 space-y-0 text-sm">
              {[
                ["Lots traded / month", formatNumber(calc.lots)],
                ["Typical deposit there", formatMoney(calc.deposit, "€")],
              ].map(([k, val], i) => (
                <div key={k} className={`flex items-baseline justify-between gap-4 py-2.5 ${i > 0 ? "border-t border-white/6" : ""}`}>
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
