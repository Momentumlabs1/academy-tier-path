import { createFileRoute } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useState } from "react";
import { Calculator, Scale, TrendingUp, Radio, Clock, RotateCcw } from "lucide-react";
import { Card } from "@/components/academy/primitives/Card";
import { MonteCarloCalc } from "@/components/academy/tools/MonteCarloCalc";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tools")({
  head: () => ({
    meta: [
      { title: "Trader Tools — Cosmos Candles Academy" },
      { name: "description", content: "Position size, risk-reward, compounding — and a 1,000-run Monte Carlo simulation of your edge." },
    ],
  }),
  component: ToolsPage,
});

/* ── ein Trade, alle Rechner ─────────────────────────────────────────
   Vorher hat jeder Rechner Entry und Stop separat gehalten: dieselbe Zahl
   dreimal eintippen, und die drei Karten widersprachen sich, sobald man
   eine vergass. Jetzt teilen sie einen Zustand — und ein echtes Signal
   kann ihn in einem Klick fuellen. */
type Trade = {
  account: number; riskPct: number; entry: number; stop: number; target: number;
  set: (p: Partial<Omit<Trade, "set">>) => void;
};
const TradeCtx = createContext<Trade | null>(null);
const useTrade = () => {
  const t = useContext(TradeCtx);
  if (!t) throw new Error("useTrade outside provider");
  return t;
};

function ToolsPage() {
  const [account, setAccount] = useState(10_000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(1.085);
  const [stop, setStop] = useState(1.081);
  const [target, setTarget] = useState(1.097);
  const trade: Trade = {
    account, riskPct, entry, stop, target,
    set: (p) => {
      if (p.account !== undefined) setAccount(p.account);
      if (p.riskPct !== undefined) setRiskPct(p.riskPct);
      if (p.entry !== undefined) setEntry(p.entry);
      if (p.stop !== undefined) setStop(p.stop);
      if (p.target !== undefined) setTarget(p.target);
    },
  };
  return (
    <TradeCtx.Provider value={trade}>
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Trader Tools</h1>
        <p className="mt-1 text-muted-foreground">Size the trade, judge the odds, then see what a few hundred of them do to your account.</p>
      </div>

      <SignalPicker />

      <div className="grid gap-4 lg:grid-cols-2">
        <PositionSizeCalc />
        <RiskRewardCalc />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecoveryCalc />
        <SessionClock />
      </div>
      <CompoundingCalc />

      {/* Die drei Rechner oben sagen, wie GROSS ein Trade sein darf. Dieser
          sagt, was 200 davon mit dem Konto machen — die Frage, die zaehlt. */}
      <MonteCarloCalc />
      </div>
    </TradeCtx.Provider>
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
  const { account, riskPct, entry, stop, set } = useTrade();
  const setAccount = (v: number) => set({ account: v });
  const setRiskPct = (v: number) => set({ riskPct: v });
  const setEntry = (v: number) => set({ entry: v });
  const setStop = (v: number) => set({ stop: v });

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
  const { entry, stop, target, set } = useTrade();
  const setEntry = (v: number) => set({ entry: v });
  const setStop = (v: number) => set({ stop: v });
  const setTarget = (v: number) => set({ target: v });

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

/* ── 4 · Instrument-Vorlagen ──────────────────────────────────────────
   Die Voreinstellung 1.085 gilt fuer EUR/USD. Wer BTC handelt und 64.200
   eintippt, bekommt eine Lot-Zahl, die nichts bedeutet — die Rechner
   kennen die Groessenordnung des Instruments nicht. Diese Zeile setzt
   Entry, Stop und Ziel auf realistische Werte des gewaehlten Marktes.  */

const PRESETS = [
  { name: "EUR / USD", entry: 1.0850, stop: 1.0810, target: 1.0970 },
  { name: "XAU / USD", entry: 2318.40, stop: 2311.00, target: 2334.00 },
  { name: "BTC / USDT", entry: 64200, stop: 63400, target: 65800 },
  { name: "NAS100", entry: 20050, stop: 19910, target: 20330 },
] as const;

function SignalPicker() {
  const { entry, set } = useTrade();
  const active = PRESETS.find((p) => Math.abs(p.entry - entry) < p.entry * 1e-6);
  return (
    <Card variant="surface" className="flex flex-wrap items-center gap-3 p-4">
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Radio className="h-3.5 w-3.5 text-primary" /> Load a market
      </span>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => set({ entry: p.entry, stop: p.stop, target: p.target })}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors",
              active?.name === p.name
                ? "bg-primary text-black"
                : "bg-white/5 text-foreground/70 hover:bg-white/10",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>
      <span className="ml-auto text-[11px] text-muted-foreground">
        Fills entry, stop and target below — every calculator on this page shares them.
      </span>
    </Card>
  );
}

/* ── 5 · Was ein Verlust wirklich kostet ──────────────────────────────
   Die unsymmetrischste Zahl im Trading und die, die am seltensten jemand
   ausrechnet: nach −50 % braucht es +100 %, nur um wieder bei null zu sein.
   Ein Werkzeug dafuer aendert mehr Verhalten als jeder Merksatz.        */

function RecoveryCalc() {
  const [dd, setDd] = useState(20);
  const need = (1 / (1 - dd / 100) - 1) * 100;
  const brutal = need >= 100;
  return (
    <Card variant="surface" className="space-y-4 p-6">
      <ToolHead icon={RotateCcw} title="Cost of a drawdown"
        sub="What you must earn back after a loss — the maths nobody runs before the trade." />
      <label className="block">
        <span className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account down by</span>
          <span className="font-display text-sm font-bold tabular-nums">−{dd}%</span>
        </span>
        <input
          type="range" min={5} max={90} step={1} value={dd}
          onChange={(e) => setDd(Number(e.target.value))}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Result label="Needed to break even" value={`+${need.toFixed(0)}%`} tone={brutal ? "warn" : "default"} big />
        <Result label="At 4% a month" value={`${Math.ceil(Math.log(1 / (1 - dd / 100)) / Math.log(1.04))} months`} />
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        <div className="bg-rose-400/70" style={{ width: `${Math.min(50, dd / 2)}%` }} />
        <div className="bg-primary" style={{ width: `${Math.min(50, need / 4)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {brutal
          ? `A ${dd}% loss needs you to more than double what is left. This is why the stop-loss is not optional.`
          : `Losing ${dd}% is not symmetric — you need +${need.toFixed(0)}%, not +${dd}%, to get back to flat.`}
      </p>
    </Card>
  );
}

/* ── 6 · Wann ueberhaupt etwas passiert ───────────────────────────────
   Signale kommen nicht gleichmaessig ueber den Tag. Die Ueberlappung
   London/New York traegt den Grossteil des Volumens — wer das nicht weiss,
   wartet nachts auf Bewegung, die nicht kommt.                          */

const SESSIONS = [
  { name: "Sydney", open: 21, close: 6 },
  { name: "Tokyo", open: 0, close: 9 },
  { name: "London", open: 7, close: 16 },
  { name: "New York", open: 12, close: 21 },
] as const;

function SessionClock() {
  const now = new Date();
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  const isOpen = (s: { open: number; close: number }) =>
    s.open < s.close ? utcH >= s.open && utcH < s.close : utcH >= s.open || utcH < s.close;
  const openNow = SESSIONS.filter(isOpen);
  const overlap = openNow.some((s) => s.name === "London") && openNow.some((s) => s.name === "New York");

  return (
    <Card variant="surface" className="space-y-4 p-6">
      <ToolHead icon={Clock} title="Where the volume is"
        sub="Signals cluster when the big desks are awake — not evenly across the day." />
      <div className="space-y-2.5">
        {SESSIONS.map((s) => {
          const on = isOpen(s);
          const left = (s.open / 24) * 100;
          const width = (((s.close - s.open + 24) % 24) / 24) * 100;
          return (
            <div key={s.name}>
              <div className="mb-1 flex items-baseline justify-between text-[11px]">
                <span className={cn("font-semibold", on ? "text-foreground" : "text-muted-foreground")}>{s.name}</span>
                <span className="font-mono text-muted-foreground">
                  {String(s.open).padStart(2, "0")}–{String(s.close).padStart(2, "0")} UTC
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn("absolute inset-y-0 rounded-full", on ? "bg-primary" : "bg-white/15")}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                {width + left > 100 && (
                  <div className={cn("absolute inset-y-0 left-0 rounded-full", on ? "bg-primary" : "bg-white/15")}
                       style={{ width: `${width + left - 100}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="relative h-px w-full bg-white/10">
        <span className="absolute -top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-400"
              style={{ left: `${(utcH / 24) * 100}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {overlap
          ? "London and New York are both open — this overlap carries most of the day's volume."
          : openNow.length
            ? `${openNow.map((s) => s.name).join(" and ")} open. The busiest window is the London–New York overlap, 12–16 UTC.`
            : "All major sessions closed. Spreads widen and moves get thin — this is not the hour to force a trade."}
      </p>
    </Card>
  );
}
