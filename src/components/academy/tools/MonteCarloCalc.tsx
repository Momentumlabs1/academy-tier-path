/**
 * MonteCarloCalc — "kann mich diese Strategie ruinieren?"
 *
 * Die drei bestehenden Rechner sagen, wie GROSS ein Trade sein darf. Keiner
 * sagt, was 200 solche Trades hintereinander mit dem Konto machen. Genau das
 * ist die Frage, die Anfaenger wirklich haben, und genau das fuehren TradeZella,
 * Myfxbook und Co. als Aushaengeschild — 1.000 zufaellige Equity-Kurven aus
 * Trefferquote und CRV.
 *
 * Alles laeuft lokal: keine Kurse, keine API, kein Backend. Nur Statistik.
 *
 * Der Kern in einem Satz: Wer bei 1 % Risiko pro Trade bleibt, geht praktisch
 * nie pleite — wer 10 % riskiert, mit derselben Strategie sehr wohl. Der
 * Simulator macht diesen Satz sichtbar, statt ihn zu behaupten.
 */
import { useMemo, useState } from "react";
import { Dices } from "lucide-react";
import { Area, AreaChart, Line, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";
import { Card } from "@/components/academy/primitives/Card";

const RUNS = 1000;

/** Mulberry32 — kleiner, schneller PRNG mit Seed, damit dieselbe Eingabe
 *  immer dasselbe Ergebnis liefert. Sonst springt die Grafik bei jedem
 *  Tastendruck und wirkt beliebig. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Sim = {
  bands: { i: number; p05: number; p25: number; p50: number; p75: number; p95: number }[];
  ruin: number;        // Anteil der Laeufe, die unter die Ruinschwelle fielen
  medianEnd: number;   // Median-Endkapital in Prozent des Starts
  worstDD: number;     // median. groesster Rueckgang vom Hoch
  expectancy: number;  // Erwartungswert je Trade in R
};

function simulate(winRate: number, rr: number, risk: number, trades: number, ruinAt: number): Sim {
  const w = winRate / 100, r = risk / 100, ruinLevel = 1 - ruinAt / 100;
  const rand = rng(Math.round(winRate * 1000 + rr * 97 + risk * 13 + trades));
  const curves: number[][] = [];
  const dds: number[] = [];
  let ruined = 0;

  for (let run = 0; run < RUNS; run++) {
    let eq = 1, peak = 1, maxDD = 0, dead = false;
    const path = [1];
    for (let t = 0; t < trades; t++) {
      // Geometrisch, nicht additiv: real riskiert man einen Prozentsatz des
      // AKTUELLEN Kontos, deshalb wird nach Verlusten automatisch kleiner.
      eq *= rand() < w ? 1 + r * rr : 1 - r;
      if (eq > peak) peak = eq;
      maxDD = Math.max(maxDD, 1 - eq / peak);
      if (!dead && eq <= ruinLevel) { dead = true; ruined++; }
      path.push(eq);
    }
    curves.push(path);
    dds.push(maxDD);
  }

  const at = (i: number) => {
    const col = curves.map((c) => c[i]).sort((a, b) => a - b);
    const q = (p: number) => col[Math.min(col.length - 1, Math.floor(p * col.length))];
    return { i, p05: q(0.05), p25: q(0.25), p50: q(0.5), p75: q(0.75), p95: q(0.95) };
  };
  const step = Math.max(1, Math.round(trades / 60));
  const bands = [];
  for (let i = 0; i <= trades; i += step) bands.push(at(i));
  if (bands[bands.length - 1].i !== trades) bands.push(at(trades));

  dds.sort((a, b) => a - b);
  return {
    bands,
    ruin: (ruined / RUNS) * 100,
    medianEnd: bands[bands.length - 1].p50 * 100,
    worstDD: dds[Math.floor(dds.length * 0.5)] * 100,
    expectancy: (w * rr - (1 - w)),
  };
}

function Slider({ label, value, onChange, min, max, step, fmt }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; fmt: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <span className="font-display text-sm font-bold tabular-nums">{fmt(value)}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
      />
    </label>
  );
}

export function MonteCarloCalc() {
  const [winRate, setWinRate] = useState(45);
  const [rr, setRr] = useState(2);
  const [risk, setRisk] = useState(1);
  const [trades, setTrades] = useState(200);

  const sim = useMemo(
    () => simulate(winRate, rr, risk, trades, 50),
    [winRate, rr, risk, trades],
  );

  const edge = sim.expectancy > 0;
  const ruinTone = sim.ruin < 1 ? "text-primary" : sim.ruin < 5 ? "text-amber-400" : "text-rose-400";

  return (
    <Card variant="surface" className="space-y-5 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Dices className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">Can this strategy ruin you?</h2>
          <p className="text-xs text-muted-foreground">
            {RUNS.toLocaleString()} random runs of the same edge — because one good month proves nothing.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Slider label="Win rate" value={winRate} onChange={setWinRate} min={20} max={80} step={1} fmt={(v) => `${v}%`} />
        <Slider label="Reward : risk" value={rr} onChange={setRr} min={0.5} max={5} step={0.1} fmt={(v) => `1 : ${v.toFixed(1)}`} />
        <Slider label="Risk per trade" value={risk} onChange={setRisk} min={0.25} max={10} step={0.25} fmt={(v) => `${v}%`} />
        <Slider label="Trades" value={trades} onChange={setTrades} min={50} max={500} step={10} fmt={(v) => String(v)} />
      </div>

      {/* Der Faecher: dunkel = die mittleren 50 % der Laeufe, hell = die
          aeusseren 90 %. Die dicke Linie ist der Median. */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sim.bands} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="mcOuter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, (m: number) => Math.max(m, 1.4)]} />
            <ReferenceLine y={1} stroke="rgba(255,255,255,0.28)" strokeDasharray="4 4" />
            <Area dataKey="p95" stroke="none" fill="url(#mcOuter)" isAnimationActive={false} />
            <Area dataKey="p75" stroke="none" fill="var(--color-primary)" fillOpacity={0.16} isAnimationActive={false} />
            <Area dataKey="p25" stroke="none" fill="#0b0f19" fillOpacity={0.55} isAnimationActive={false} />
            <Area dataKey="p05" stroke="none" fill="#0b0f19" fillOpacity={0.75} isAnimationActive={false} />
            <Line dataKey="p50" stroke="var(--color-primary)" strokeWidth={2.4} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Chance of ruin"
          value={sim.ruin < 0.1 ? "<0.1%" : `${sim.ruin.toFixed(1)}%`}
          tone={ruinTone}
          note="losing half the account"
        />
        <Stat
          label="Typical worst drawdown"
          value={`−${sim.worstDD.toFixed(0)}%`}
          note="you will live through this"
        />
        <Stat
          label="Median outcome"
          value={`${sim.medianEnd >= 100 ? "+" : ""}${(sim.medianEnd - 100).toFixed(0)}%`}
          tone={sim.medianEnd >= 100 ? "text-primary" : "text-rose-400"}
          note={`after ${trades} trades`}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {!edge ? (
          <>
            <span className="font-semibold text-rose-400">This edge loses money.</span>{" "}
            At {winRate}% win rate you need better than 1 : {((1 - winRate / 100) / (winRate / 100)).toFixed(1)} just to break even —
            no position size fixes that.
          </>
        ) : sim.ruin >= 5 ? (
          <>
            <span className="font-semibold text-amber-400">The edge is fine, the size is not.</span>{" "}
            Same strategy at 1% risk instead of {risk}% drops the chance of ruin to{" "}
            <span className="font-semibold text-primary">
              {simulate(winRate, rr, 1, trades, 50).ruin.toFixed(1)}%
            </span>. This is why the rule is 1–2%.
          </>
        ) : (
          <>
            <span className="font-semibold text-primary">Survivable.</span>{" "}
            Expectancy is {sim.expectancy.toFixed(2)}R per trade — but expect to sit through a{" "}
            −{sim.worstDD.toFixed(0)}% stretch on the way. That is normal, not a broken strategy.
          </>
        )}
      </p>
    </Card>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${tone ?? ""}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{note}</div>
    </div>
  );
}
