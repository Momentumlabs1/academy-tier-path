/**
 * DeskResults — the results section, built only from results the desk actually
 * posted.
 *
 * The page used to carry "74% signal accuracy" and a "+€1,240 first month"
 * testimonial. Both were typed by hand and both are gone. This replaces them
 * with the same kind of proof, except every number here was parsed out of a
 * message the desk sent into Telegram, and each row still carries the id of the
 * message it came from.
 *
 * THREE RULES THIS SECTION FOLLOWS, AND WHY
 *
 * 1. R, NEVER EUROS. A result is shown as a multiple of the risk taken. R says
 *    nothing about anyone's account size, so it cannot be read as "you would
 *    have made X" — which is the exact claim a euro figure makes, and the one
 *    that turns a results page into a promise.
 *
 * 2. NO WIN RATE UNDER 20 TRADES. Three winners out of three is 100%, and
 *    publishing that destroys more trust than it buys — everyone knows it cannot
 *    hold. Below the threshold the section shows the trades themselves and says
 *    how many there are, which is honest and, oddly, more convincing.
 *
 * 3. THE PERIOD IS ALWAYS VISIBLE. "+18R" means nothing without "over 6 weeks".
 *    A number without its window is the oldest trick in this industry.
 *
 * If there is no data at all the section renders NOTHING rather than a hopeful
 * empty state — an results section with no results is worse than no section.
 */
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DeskRow {
  traded_on: string;
  asset: string | null;
  direction: string | null;
  r_multiple: number;
}

/** Below this, a percentage is noise dressed up as evidence. */
const MIN_TRADES_FOR_RATE = 20;

const db = () =>
  supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        order: (c: string, o: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: DeskRow[] | null }>;
        };
      };
    };
  };

export function DeskResults({ primary }: { primary: string }) {
  const [rows, setRows] = useState<DeskRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    db().from("desk_results")
      .select("traded_on, asset, direction, r_multiple")
      .order("traded_on", { ascending: false })
      .limit(400)
      .then(({ data }) => { if (alive) setRows(data ?? []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

  // Nothing to show → show nothing. Never a placeholder.
  if (!rows || rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + Number(r.r_multiple), 0);
  const wins = rows.filter((r) => Number(r.r_multiple) > 0).length;
  const days = new Set(rows.map((r) => r.traded_on));
  const from = rows[rows.length - 1].traded_on;
  const to = rows[0].traded_on;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const fmtR = (n: number) => `${n > 0 ? "+" : ""}${Number(n).toFixed(n % 1 === 0 ? 0 : 1)}R`;

  const stats: { label: string; value: string }[] = [
    { label: "Total", value: fmtR(total) },
    { label: "Trades", value: String(rows.length) },
    { label: "Trading days", value: String(days.size) },
  ];
  // The win rate joins only once it means something.
  if (rows.length >= MIN_TRADES_FOR_RATE) {
    stats.push({ label: "Winners", value: `${Math.round((100 * wins) / rows.length)}%` });
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: primary }}>
            Results
          </div>
          <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">
            Every trade the desk called.
          </h2>
        </div>
        <p className="text-sm text-white/50">
          {fmtDate(from)} – {fmtDate(to)} · straight from the signal channel
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-5">
            <div className="text-[9px] uppercase tracking-[0.12em] text-white/45 sm:text-[11px] sm:tracking-[0.16em]">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl" style={{ color: primary }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* The trades themselves. Losses included — a list with no red in it is
          the thing nobody believes, and hiding them is what makes the winners
          worthless. */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0b1020] text-left text-[11px] uppercase tracking-[0.14em] text-white/45">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Instrument</th>
                <th className="px-4 py-3 text-right font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const v = Number(r.r_multiple);
                const up = v > 0;
                return (
                  <tr key={i} className="border-t border-white/[0.06]">
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtDate(r.traded_on)}</td>
                    <td className="px-4 py-3 text-white/85">
                      {r.asset ?? "—"}
                      {r.direction && <span className="ml-2 text-white/40">{r.direction}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
                        {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {fmtR(v)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-white/45">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <b className="text-white/60">R</b> is the result as a multiple of the risk taken on that
          trade — +2R means it returned twice what it risked. It is deliberately not shown in euros:
          what you would have made depends entirely on your own position size.
          {rows.length < MIN_TRADES_FOR_RATE && (
            <> This is {rows.length} trade{rows.length === 1 ? "" : "s"} — too few to read a hit rate
            from, so we don't publish one.</>
          )}{" "}
          Past results do not predict future ones. Trading carries risk and most retail accounts lose
          money.
        </span>
      </p>
    </section>
  );
}
