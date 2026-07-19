import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { TIERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/deposits")({
  head: () => ({ meta: [{ title: "Deposits — Admin" }] }),
  component: AdminDeposits,
});

// Live deposit/withdrawal events from Supabase. Until the DB has data — or if
// the query fails — the table falls back to an honest empty state, never to
// demo numbers.
interface DepositRow {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal";
  tierBefore: string | null;
  tierAfter: string | null;
  note: string | null;
  createdAt: string;
  memberName: string;
}

function TierChip({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-muted-foreground">—</span>;
  const t = TIERS.find((x) => x.key === tier);
  if (!t) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-semibold" style={{ color: t.color }}>{t.name}</span>
  );
}

function AdminDeposits() {
  const [state, setState] = useState<{ loading: boolean; error: string | null; rows: DepositRow[] }>({
    loading: true,
    error: null,
    rows: [],
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      // `deposit_events` isn't in the generated Database types yet — query untyped.
      const { data, error } = await (supabase as any)
        .from("deposit_events")
        .select("*, members(name, email)")
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) {
        setState({ loading: false, error: error.message, rows: [] });
        return;
      }
      const rows: DepositRow[] = (data ?? []).map((r: any) => ({
        id: String(r.id),
        amount: Number(r.amount ?? 0),
        type: r.type === "withdrawal" ? "withdrawal" : "deposit",
        tierBefore: r.tier_before ?? null,
        tierAfter: r.tier_after ?? null,
        note: r.note ?? null,
        createdAt: String(r.created_at),
        memberName: r.members?.name ?? r.members?.email ?? "—",
      }));
      setState({ loading: false, error: null, rows });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const { loading, error, rows } = state;

  const totalDeposited = rows.filter((d) => d.type === "deposit" && d.amount > 0).reduce((s, d) => s + d.amount, 0);
  const totalWithdrawn = rows.filter((d) => d.type === "withdrawal").reduce((s, d) => s + Math.abs(d.amount), 0);
  const net = totalDeposited - totalWithdrawn;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Einzahlungs-Ledger" sub="Alle verifizierten Ein- und Auszahlungen" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AdminKpiCard label="Eingezahlt gesamt" value={formatMoney(totalDeposited, "€")} tone="ok" />
        <AdminKpiCard label="Ausgezahlt gesamt" value={formatMoney(totalWithdrawn, "€")} tone="warn" />
        <AdminKpiCard label="Netto AUM" value={formatMoney(net, "€")} tone="primary" />
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Daten konnten nicht geladen werden: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lade Einzahlungen…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            Noch keine Einzahlungen.
          </div>
        ) : (
          <table className="w-full min-w-[660px]">
            <thead className="border-b border-white/5">
              <tr>
                {["Datum", "Kunde", "Betrag", "Typ", "Tier-Wechsel", "Notiz"].map((h) => (
                  <th key={h} className="py-3 pl-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 pl-4 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 pl-4 text-sm font-medium">{d.memberName}</td>
                  <td className={cn("py-3 pl-4 font-mono text-sm font-bold", d.type === "withdrawal" ? "text-amber-400" : "text-[oklch(0.78_0.16_150)]")}>
                    {d.type === "withdrawal" ? "−" : "+"}{formatMoney(Math.abs(d.amount), "€")}
                  </td>
                  <td className="py-3 pl-4">
                    <span className={cn("flex items-center gap-1 text-[11px] font-semibold", d.type === "withdrawal" ? "text-amber-400" : "text-[oklch(0.78_0.16_150)]")}>
                      {d.type === "withdrawal"
                        ? <ArrowUpRight className="h-3.5 w-3.5" />
                        : <ArrowDownLeft className="h-3.5 w-3.5" />}
                      {d.type === "deposit" ? "Einzahlung" : "Auszahlung"}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-xs">
                    {d.tierBefore !== d.tierAfter ? (
                      <span className="flex items-center gap-1">
                        <TierChip tier={d.tierBefore} />
                        <span className="text-muted-foreground">→</span>
                        <TierChip tier={d.tierAfter} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Keine Änderung</span>
                    )}
                  </td>
                  <td className="py-3 pl-4 pr-4 text-xs text-muted-foreground max-w-[200px] truncate">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
