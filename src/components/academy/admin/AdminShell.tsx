import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart2, BookOpen, FileText, LayoutDashboard, LogOut, Palette, ScrollText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const MENU = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/deposits", label: "Deposits", icon: BarChart2 },
  { to: "/admin/lessons", label: "Content", icon: BookOpen },
  { to: "/admin/tenants", label: "White-Label", icon: Palette },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-[oklch(0.12_0.04_250)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-white/5 bg-[oklch(0.14_0.05_250)] px-4 py-6">
        <div className="flex items-center gap-2 px-2 pb-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[11px] font-black text-primary-foreground">A</span>
          <div>
            <div className="text-sm font-bold leading-tight">Admin</div>
            <div className="text-[10px] text-muted-foreground">Agent Trading</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {MENU.map((item) => {
            const active = item.to === "/admin"
              ? pathname === "/admin" || pathname === "/admin/"
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-foreground/50 hover:bg-white/5 hover:text-foreground/80",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/50 hover:text-foreground/80 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Back to Academy
          </Link>
          <div className="mt-3 flex items-center gap-2 px-3">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-[oklch(0.7_0.2_290)] flex items-center justify-center text-[10px] font-bold text-primary-foreground">M</span>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">MomentumLabs</div>
              <div className="text-[10px] text-muted-foreground">Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile: top bar */}
      <div className="fixed top-0 inset-x-0 z-20 flex items-center gap-3 border-b border-white/5 bg-[oklch(0.14_0.05_250)] px-4 py-3 lg:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[11px] font-black text-primary-foreground">A</span>
        <span className="font-bold">Admin</span>
        <div className="ml-auto flex gap-1">
          {MENU.map((item) => {
            const active = item.to === "/admin"
              ? pathname === "/admin" || pathname === "/admin/"
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-white/15 text-foreground" : "text-foreground/40 hover:text-foreground/70",
                )}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
        <Link to="/" className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-foreground/40 hover:text-foreground/70" title="Back to Academy">
          <LogOut className="h-4 w-4" />
        </Link>
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1 px-4 py-6 pt-20 lg:px-8 lg:py-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}

export function AdminPageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminKpiCard({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "primary" | "warn" | "ok" | "default" }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)] p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-1.5 font-display text-3xl font-bold",
        tone === "primary" && "text-primary",
        tone === "warn" && "text-amber-400",
        tone === "ok" && "text-[oklch(0.78_0.16_150)]",
        (!tone || tone === "default") && "text-foreground",
      )}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export { FileText };
