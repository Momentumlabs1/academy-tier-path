/**
 * EarningsEstimator — the one thing a prospective partner actually came for.
 *
 * The recruitment page used to state the payout as a staircase from $5 to $10
 * per lot. That is the correct number and it is useless on its own: nobody with
 * an audience knows what a "lot" is worth to them, so the figure that decides
 * whether they say yes was left for them to guess.
 *
 * So the page computes it with them. Every input is theirs to move, and the
 * whole chain — reach, sign-ups, funded accounts, volume, level, payout — stays
 * on screen while they move it. Showing the arithmetic is the point: a single
 * confident number would read as a sales claim, whereas a visible chain invites
 * them to argue with the assumptions, which is exactly the conversation that
 * converts a serious partner.
 *
 * The defaults are deliberately modest — a 2% sign-up rate on reach and 10 lots
 * per funded account per month sit well under the desk's own observed pattern.
 * An estimate that flatters gets found out in month one; one that undershoots
 * survives contact with reality. The disclaimer is not decoration either: this
 * is a projection of trading-linked income, and it must never read as a promise.
 */
import { useMemo, useState } from "react";
import { COMMISSION_LADDER, levelForVolume } from "@/lib/commission";
import { formatMoney, formatNumber } from "@/lib/format";

interface Knob {
  key: "reach" | "signupRate" | "fundRate" | "avgDeposit" | "lotsPerAccount";
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const KNOBS: Knob[] = [
  {
    key: "reach", label: "People you reach", hint: "followers, list, group — the ones who actually see a post",
    min: 1_000, max: 500_000, step: 1_000, format: (v) => formatNumber(v),
  },
  {
    key: "signupRate", label: "Sign up", hint: "share of that reach who create a free account",
    min: 0.5, max: 10, step: 0.5, format: (v) => `${v}%`,
  },
  {
    key: "fundRate", label: "Fund an account", hint: "share of sign-ups who deposit and go live",
    min: 2, max: 40, step: 1, format: (v) => `${v}%`,
  },
  {
    key: "avgDeposit", label: "Average deposit", hint: "what a funded customer starts with",
    min: 100, max: 10_000, step: 100, format: (v) => formatMoney(v, "€"),
  },
  {
    key: "lotsPerAccount", label: "Lots per account / month", hint: "how actively a funded customer trades",
    min: 1, max: 60, step: 1, format: (v) => formatNumber(v),
  },
];

const DEFAULTS = { reach: 25_000, signupRate: 2, fundRate: 15, avgDeposit: 1_000, lotsPerAccount: 10 };

export function EarningsEstimator() {
  const [v, setV] = useState(DEFAULTS);

  const calc = useMemo(() => {
    const signups = Math.round(v.reach * (v.signupRate / 100));
    const funded = Math.round(signups * (v.fundRate / 100));
    const volume = funded * v.avgDeposit;
    const level = levelForVolume(volume);
    const monthlyLots = funded * v.lotsPerAccount;
    return { signups, funded, volume, level, monthlyLots, monthly: monthlyLots * level.usdPerLot };
  }, [v]);

  const chain = [
    { label: "Sign-ups", value: formatNumber(calc.signups) },
    { label: "Funded accounts", value: formatNumber(calc.funded) },
    { label: "Customer volume", value: formatMoney(calc.volume, "€") },
    { label: "Lots / month", value: formatNumber(calc.monthlyLots) },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.13_0.035_258)]">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        {/* Controls */}
        <div className="border-b border-white/8 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Your assumptions
          </div>
          <div className="space-y-5">
            {KNOBS.map((k) => (
              <label key={k.key} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-foreground/90">{k.label}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-primary">{k.format(v[k.key])}</span>
                </div>
                <input
                  type="range" min={k.min} max={k.max} step={k.step} value={v[k.key]}
                  onChange={(e) => setV({ ...v, [k.key]: Number(e.target.value) })}
                  aria-label={k.label}
                  className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/12 accent-[oklch(0.72_0.17_244)]"
                />
                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{k.hint}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setV(DEFAULTS)}
            className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Reset to defaults
          </button>
        </div>

        {/* Result */}
        <div className="flex flex-col justify-between p-6 sm:p-8">
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
            <div className="mt-1.5 text-sm text-foreground/60">
              {formatMoney(Math.round(calc.monthly * 12))} per year, at level {calc.level.level} — {formatMoney(calc.level.usdPerLot)} per lot
            </div>

            <div className="mt-7 space-y-0">
              {chain.map((c, i) => (
                <div
                  key={c.label}
                  className={`flex items-baseline justify-between gap-4 py-2.5 text-sm ${i > 0 ? "border-t border-white/6" : ""}`}
                >
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-mono tabular-nums text-foreground/90">{c.value}</span>
                </div>
              ))}
            </div>

            {/* Where this lands on the staircase */}
            <div className="mt-6">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Level</div>
              <div className="flex gap-1.5">
                {COMMISSION_LADDER.map((l) => {
                  const reached = l.level <= calc.level.level;
                  return (
                    <div key={l.level} className="flex-1">
                      <div
                        className="h-1.5 rounded-full transition-colors"
                        style={{ background: reached ? "oklch(0.72 0.17 244)" : "oklch(1 0 0 / 0.10)" }}
                      />
                      <div className={`mt-1.5 font-mono text-[11px] tabular-nums ${reached ? "text-foreground/80" : "text-muted-foreground/50"}`}>
                        {formatMoney(l.usdPerLot)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-7 border-t border-white/8 pt-4 text-[11px] leading-relaxed text-muted-foreground">
            An illustration built from your own inputs, not a forecast and not a promise of earnings.
            Real income depends on how many people join, whether they fund, and how much they actually
            trade — all of which vary. Trading involves risk; most retail accounts lose money.
          </p>
        </div>
      </div>
    </div>
  );
}
