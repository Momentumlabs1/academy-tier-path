import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, Scale, TrendingUp } from "lucide-react";
import { Card } from "@/components/academy/primitives/Card";
import { MonteCarloCalc } from "@/components/academy/tools/MonteCarloCalc";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tools")({
  head: () => ({
    meta: [
      { title: "Trader Tools — Agent Trading Academy" },
      { name: "description", content: "Position size, risk-reward, compounding — and a 1,000-run Monte Carlo simulation of your edge." },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Trader Tools</h1>
        <p className="mt-1 text-muted-foreground">Size the trade, judge the odds, then see what a few hundred of them do to your account.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PositionSizeCalc />
        <RiskRewardCalc />
      </div>
      <CompoundingCalc />

      {/* Die drei Rechner oben sagen, wie GROSS ein Trade sein darf. Dieser
          sagt, was 200 davon mit dem Konto machen — die Frage, die zaehlt. */}
      <MonteCarloCalc />
    </div>
  );
}

/* ── shared inputs ───────────────────────────────────────────────── */

function Field({ label, value, onChange, step = "any", suffix, min = 0 }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: string; suffix?: string; min?: number;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="mt-1 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 focus-within:ring-2 focus-within:ring-primary/50">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full min-w-0 bg-transparent font-mono text-sm font-semibold outline-none"
        />
        {suffix && <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

function Result({ label, value, tone = "default", big = false }: {
  label: string; value: string; tone?: "default" | "primary" | "warn"; big?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[color:var(--surface-2)]/60 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-1 font-display font-bold tabular-nums",
        big ? "text-2xl" : "text-lg",
        tone === "primary" && "text-primary",
        tone === "warn" && "text-amber-400",
      )}>{value}</div>
    </div>
  );
}

function ToolHead({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/* ── 1 · Position size ───────────────────────────────────────────── */

function PositionSizeCalc() {
  const [account, setAccount] = useState(10_000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(1.085);
  const [stop, setStop] = useState(1.081);

  const r = useMemo(() => {
    const riskAmount = (account * riskPct) / 100;
    const dist = Math.abs(entry - stop);
    if (!account || !riskPct || !dist || !Number.isFinite(dist)) return null;
    const units = riskAmount / dist;
    return { riskAmount, dist, units, lots: units / 100_000 };
  }, [account, riskPct, entry, stop]);

  return (
    <Card variant="surface" className="space-y-4 p-6">
      <ToolHead icon={Calculator} title="Position Size" sub="Never guess your lot size again — it follows from risk and stop distance." />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account size" value={account} onChange={setAccount} suffix="€" />
        <Field label="Risk per trade" value={riskPct} onChange={setRiskPct} suffix="%" step="0.1" />
        <Field label="Entry price" value={entry} onChange={setEntry} step="0.0001" />
        <Field label="Stop-loss price" value={stop} onChange={setStop} step="0.0001" />
      </div>
      {r ? (
        <div className="grid grid-cols-3 gap-3">
          <Result label="Max risk" value={formatMoney(Math.round(r.riskAmount), "€")} tone={riskPct > 2 ? "warn" : "default"} />
          <Result label="Units" value={Math.round(r.units).toLocaleString()} />
          <Result label="FX lots" value={r.lots >= 0.01 ? r.lots.toFixed(2) : r.lots.toFixed(4)} tone="primary" big />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Enter valid values — entry and stop can't be equal.</p>
      )}
      {riskPct > 2 && <p className="text-xs font-semibold text-amber-400">⚠ Above 2% per trade — that's gambling territory (see Position Sizing 101).</p>}
    </Card>
  );
}

/* ── 2 · Risk : Reward ───────────────────────────────────────────── */

function RiskRewardCalc() {
  const [entry, setEntry] = useState(1.085);
  const [stop, setStop] = useState(1.081);
  const [target, setTarget] = useState(1.097);

  const r = useMemo(() => {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    if (!risk || !Number.isFinite(risk) || !Number.isFinite(reward)) return null;
    const rr = reward / risk;
    return { rr, breakeven: (1 / (1 + rr)) * 100 };
  }, [entry, stop, target]);

  return (
    <Card variant="surface" className="space-y-4 p-6">
      <ToolHead icon={Scale} title="Risk : Reward" sub="Know your required win rate before you click buy." />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Entry" value={entry} onChange={setEntry} step="0.0001" />
        <Field label="Stop" value={stop} onChange={setStop} step="0.0001" />
        <Field label="Target" value={target} onChange={setTarget} step="0.0001" />
      </div>
      {r && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Result label="Risk : Reward" value={`1 : ${r.rr.toFixed(2)}`} tone={r.rr >= 2 ? "primary" : r.rr < 1 ? "warn" : "default"} big />
            <Result label="Break-even win rate" value={`${r.breakeven.toFixed(0)}%`} />
          </div>
          {/* visual bar: risk vs reward */}
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            <div className="bg-red-400/70" style={{ width: `${(1 / (1 + r.rr)) * 100}%` }} title="Risk" />
            <div className="bg-primary" style={{ width: `${(r.rr / (1 + r.rr)) * 100}%` }} title="Reward" />
          </div>
          <p className="text-xs text-muted-foreground">
            {r.rr >= 3 ? "Excellent — you only need to win 1 in 4." : r.rr >= 2 ? "Solid setup — a 40% hit rate is profitable." : r.rr >= 1 ? "Thin edge — you need to win most trades." : "Negative asymmetry — skip this trade."}
          </p>
        </>
      )}
    </Card>
  );
}

/* ── 3 · Compounding ─────────────────────────────────────────────── */

function CompoundingCalc() {
  const [start, setStart] = useState(2_000);
  const [monthly, setMonthly] = useState(4);
  const [months, setMonths] = useState(24);

  const series = useMemo(() => {
    const out: number[] = [];
    let v = start;
    for (let i = 0; i <= Math.min(Math.max(months, 1), 120); i++) {
      out.push(v);
      v *= 1 + monthly / 100;
    }
    return out;
  }, [start, monthly, months]);

  const final = series[series.length - 1] ?? 0;
  const max = Math.max(...series, 1);

  return (
    <Card variant="surface" className="space-y-4 p-6">
      <ToolHead icon={TrendingUp} title="Compounding" sub="What consistent, boring returns actually become over time." />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Start capital" value={start} onChange={setStart} suffix="€" />
        <Field label="Return / month" value={monthly} onChange={setMonthly} suffix="%" step="0.5" />
        <Field label="Months" value={months} onChange={setMonths} step="1" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Result label="Final capital" value={formatMoney(Math.round(final), "€")} tone="primary" big />
        <Result label="Total growth" value={`${start > 0 ? Math.round(((final - start) / start) * 100).toLocaleString() : 0}%`} />
        <Result label="Profit" value={formatMoney(Math.round(final - start), "€")} />
      </div>
      {/* mini bar chart */}
      <div className="flex h-20 items-end gap-[2px]" aria-hidden="true">
        {series.filter((_, i) => i % Math.ceil(series.length / 48) === 0).map((v, i) => (
          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary/80" style={{ height: `${(v / max) * 100}%` }} />
        ))}
      </div>
      {monthly > 10 && <p className="text-xs font-semibold text-amber-400">⚠ Sustained {monthly}%/month is unrealistic — the world's best funds do 2–4%.</p>}
    </Card>
  );
}
