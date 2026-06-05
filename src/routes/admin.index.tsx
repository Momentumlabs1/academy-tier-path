import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { ADMIN_KPI, DEPOSIT_CHART } from "@/lib/admin-data";
import { formatMoney } from "@/lib/format";
import { TENANTS } from "@/lib/tenants";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — Agent Trading Academy" }] }),
  component: AdminOverview,
});

const TIER_COLORS: Record<string, string> = {
  "No tier": "#6b6b7b",
  Foundation: "#7ec87b",
  Operator: "#8b73d4",
  Elite: "#d4b247",
};

function AdminOverview() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Overview"
        sub={`As of ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
        action={
          <Link to="/admin/members" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            All members <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Total members" value={ADMIN_KPI.totalMembers} sub="All time" />
        <AdminKpiCard label="Active" value={`${ADMIN_KPI.activeMembers} / ${ADMIN_KPI.totalMembers}`} sub="≥ 0.1 lots/mo" tone="ok" />
        <AdminKpiCard label="Total deposits" value={formatMoney(ADMIN_KPI.totalDeposits, "€")} sub="Net of withdrawals" tone="primary" />
        <AdminKpiCard label="New this month" value={ADMIN_KPI.newThisMonth} sub="May / Jun 2026" tone="default" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Area chart */}
        <div className="rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)] p-5">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cumulative deposits (last 30 days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEPOSIT_CHART} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#90d982" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#90d982" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "oklch(0.18 0.09 290)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [formatMoney(v, "€"), "Total"]}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#90d982" strokeWidth={2} fill="url(#depGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart tier distribution */}
        <div className="rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)] p-5">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Members by tier</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ADMIN_KPI.tierBreakdown} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="tier" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "oklch(0.18 0.09 290)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [v, "Members"]}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {ADMIN_KPI.tierBreakdown.map((entry) => (
                  <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? "#6b6b7b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Affiliates */}
      <div>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Affiliate tenants</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {TENANTS.map((t) => (
            <Link
              key={t.slug}
              to="/t/$slug"
              params={{ slug: t.slug }}
              target="_blank"
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)] p-4 hover:border-white/10 transition-colors"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-primary-foreground"
                style={{ background: t.primaryColor }}
              >
                {t.logoInitials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">/t/{t.slug}</div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
