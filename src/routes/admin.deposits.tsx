import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { DEPOSITS_LEDGER, ADMIN_MEMBERS } from "@/lib/admin-data";
import { TIERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/admin/deposits")({
  head: () => ({ meta: [{ title: "Deposits — Admin" }] }),
  component: AdminDeposits,
});

function TierChip({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-muted-foreground">—</span>;
  const t = TIERS.find((x) => x.key === tier);
  if (!t) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-semibold" style={{ color: t.color }}>{t.name}</span>
  );
}

function AdminDeposits() {
  const totalDeposited = DEPOSITS_LEDGER.filter((d) => d.type === "deposit" && d.amount > 0).reduce((s, d) => s + d.amount, 0);
  const totalWithdrawn = DEPOSITS_LEDGER.filter((d) => d.type === "withdrawal").reduce((s, d) => s + Math.abs(d.amount), 0);
  const net = totalDeposited - totalWithdrawn;
  const events = [...DEPOSITS_LEDGER].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Deposits Ledger" sub="All verified deposit and withdrawal events" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AdminKpiCard label="Total deposited" value={formatMoney(totalDeposited, "€")} tone="ok" />
        <AdminKpiCard label="Total withdrawn" value={formatMoney(totalWithdrawn, "€")} tone="warn" />
        <AdminKpiCard label="Net AUM" value={formatMoney(net, "€")} tone="primary" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)]">
        <table className="w-full min-w-[660px]">
          <thead className="border-b border-white/5">
            <tr>
              {["Date", "Member", "Amount", "Type", "Tier change", "Note"].map((h) => (
                <th key={h} className="py-3 pl-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {events.map((d) => (
              <tr key={d.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="py-3 pl-4 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
                    {d.type === "deposit" ? "Deposit" : "Withdrawal"}
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
                    <span className="text-muted-foreground">No change</span>
                  )}
                </td>
                <td className="py-3 pl-4 pr-4 text-xs text-muted-foreground max-w-[200px] truncate">{d.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
