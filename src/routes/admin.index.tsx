import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { useAdminStats } from "@/hooks/useAdminStats";
import { formatMoney } from "@/lib/format";
import { TENANTS } from "@/lib/tenants";
import {
  ArrowRight, Users, Wallet, Send, Network, Palette, Radio, BookOpen, Wifi, ExternalLink, Inbox,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — Trading Academy" }] }),
  component: AdminOverview,
});

const QUICK = [
  { to: "/admin/structure", label: "Structure", sub: "Tree & accounts", icon: Network },
  { to: "/admin/tenants", label: "White label", sub: "Manage brands", icon: Palette },
  { to: "/admin/signals", label: "Signal relay", sub: "Bot & channels", icon: Radio },
  { to: "/admin/members", label: "Members", sub: "Manage users", icon: Users },
] as const;

function AdminOverview() {
  const { loading, totals, error } = useAdminStats();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Overview"
        sub={`As of ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
        action={
          <Link to="/admin/structure" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            View structure <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Couldn&apos;t load live data — showing what we have. Check the connection and retry.
        </div>
      )}

      {/* KPI cards — live from Supabase; 0 until real data exists (never fake). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Total members" value={loading ? "…" : totals.members} icon={Users} />
        <AdminKpiCard label="Total leads" value={loading ? "…" : totals.leads} icon={Send} tone="ok" />
        <AdminKpiCard label="Deposits" value={loading ? "…" : formatMoney(totals.deposits, "€")} icon={Wallet} tone="primary" />
        <AdminKpiCard label="Partner brands" value={loading ? "…" : totals.partners} icon={Palette} />
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

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Activity — real feed comes online with the audit log; honest empty state until then */}
        <div className="rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Activity</div>
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/40" />
            <div className="text-sm text-muted-foreground">No activity yet.</div>
            <div className="text-xs text-muted-foreground/70">Sign-ups, deposits, and tier changes will show up here live.</div>
          </div>
        </div>

        {/* White-label brands (from config) */}
        <div className="rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Partner brands</div>
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
                  <div className="flex items-center gap-1 text-[11px] text-[oklch(0.78_0.16_150)]"><Wifi className="h-3 w-3" /> /{t.slug}</div>
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
