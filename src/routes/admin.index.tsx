import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { ADMIN_KPI, DEPOSIT_CHART, AUDIT_LOG } from "@/lib/admin-data";
import { formatMoney } from "@/lib/format";
import { TENANTS } from "@/lib/tenants";
import {
  ArrowRight, Users, Activity, Wallet, UserPlus, Palette, Radio, BookOpen,
  UserPlus2, TrendingUp, ScrollText, Megaphone, Wifi, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — Agent Trading Academy" }] }),
  component: AdminOverview,
});

const TIER_COLORS: Record<string, string> = {
  "No tier": "#6b6b7b", Foundation: "#7ec87b", Operator: "#8b73d4", Elite: "#d4b247",
};

const QUICK = [
  { to: "/admin/tenants", label: "White-Label", sub: "Configure brands", icon: Palette },
  { to: "/admin/signals", label: "Signal Relay", sub: "Bot & channels", icon: Radio },
  { to: "/admin/members", label: "Members", sub: "Manage users", icon: Users },
  { to: "/admin/lessons", label: "Content", sub: "Lessons & videos", icon: BookOpen },
] as const;

const ACTION_META: Record<string, { icon: React.ElementType; tint: string }> = {
  member_created: { icon: UserPlus2, tint: "text-[oklch(0.8_0.16_150)]" },
  tier_changed: { icon: TrendingUp, tint: "text-primary" },
  deposit_verified: { icon: Wallet, tint: "text-[oklch(0.8_0.16_150)]" },
  lesson_updated: { icon: BookOpen, tint: "text-sky-400" },
  affiliate_created: { icon: Palette, tint: "text-fuchsia-400" },
  broadcast_sent: { icon: Megaphone, tint: "text-amber-400" },
  member_deactivated: { icon: Users, tint: "text-red-400" },
  role_assigned: { icon: ScrollText, tint: "text-muted-foreground" },
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const day = 86400000;
  if (diff < day) return "today";
  if (diff < 2 * day) return "yesterday";
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo ago`;
  return `${Math.floor(diff / (365 * day))}y ago`;
}

function AdminOverview() {
  const activity = [...AUDIT_LOG].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Overview"
        sub={`As of ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
        action={
          <Link to="/admin/members" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            All members <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Total members" value={ADMIN_KPI.totalMembers} icon={Users} delta={12} sub="all time" />
        <AdminKpiCard label="Active" value={`${ADMIN_KPI.activeMembers} / ${ADMIN_KPI.totalMembers}`} icon={Activity} delta={5} sub="≥ 0.1 lots/mo" tone="ok" />
        <AdminKpiCard label="Total deposits" value={formatMoney(ADMIN_KPI.totalDeposits, "€")} icon={Wallet} delta={8} sub="net" tone="primary" />
        <AdminKpiCard label="New this month" value={ADMIN_KPI.newThisMonth} icon={UserPlus} delta={23} sub="vs last mo" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to}
            className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-4 transition-all hover:border-primary/30 hover:bg-[oklch(0.17_0.05_255)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <q.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{q.label}</div>
              <div className="truncate text-[11px] text-muted-foreground">{q.sub}</div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cumulative deposits · 30 days</div>
            <span className="rounded-md bg-[oklch(0.8_0.16_150)]/15 px-2 py-0.5 text-[11px] font-bold text-[oklch(0.8_0.16_150)]">▲ 8%</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
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
              <Tooltip contentStyle={{ background: "oklch(0.18 0.05 255)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [formatMoney(v, "€"), "Total"]} />
              <Area type="monotone" dataKey="cumulative" stroke="#90d982" strokeWidth={2} fill="url(#depGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Members by tier</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={ADMIN_KPI.tierBreakdown} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="tier" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.05 255)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [v, "Members"]} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {ADMIN_KPI.tierBreakdown.map((entry) => (
                  <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? "#6b6b7b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom: activity + tenants */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Activity feed */}
        <div className="rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recent activity</div>
            <Link to="/admin/audit" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          <div className="flex flex-col divide-y divide-white/5">
            {activity.map((e) => {
              const meta = ACTION_META[e.action] ?? { icon: ScrollText, tint: "text-muted-foreground" };
              const Icon = meta.icon;
              return (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5", meta.tint)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm"><span className="font-semibold">{e.target}</span> <span className="text-foreground/60">— {e.detail}</span></div>
                    <div className="text-[11px] text-muted-foreground">{e.actorEmail === "system" ? "System" : "Admin"}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(e.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tenants */}
        <div className="rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">White-label brands</div>
            <Link to="/admin/tenants" className="text-xs font-semibold text-primary hover:underline">Manage</Link>
          </div>
          <div className="flex flex-col gap-2">
            {TENANTS.map((t) => (
              <div key={t.slug} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black" style={{ background: t.primaryColor, color: "oklch(0.15 0.03 250)" }}>
                  {t.logoInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-[oklch(0.78_0.16_150)]"><Wifi className="h-3 w-3" /> /t/{t.slug}</div>
                </div>
                <Link to="/t/$slug" params={{ slug: t.slug }} target="_blank" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground" title="Open landing page">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
