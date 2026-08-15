import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart2, BookOpen, FileText, Handshake, Headset, LayoutDashboard, LogOut, Network, Palette, Radio, ScrollText, Users , MessageSquare} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminSignOut } from "@/lib/admin-auth";

const MENU = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, group: "Main" },
  { to: "/admin/structure", label: "Structure", icon: Network, group: "Main" },
  { to: "/admin/members", label: "Members", icon: Users, group: "Main" },
  { to: "/admin/deposits", label: "Deposits", icon: BarChart2, group: "Main" },
  { to: "/admin/support", label: "Support", icon: Headset, group: "Main" },
  // The setter runs in private one-to-one chats, so without this page nobody on
  // the team can see what Cosmo is saying to prospects.
  { to: "/admin/leads", label: "Telegram leads", icon: MessageSquare, group: "Main" },
  // Applications sat in a table with no screen: the funnel promised an answer
  // "within a few hours" and nobody could see one had arrived.
  { to: "/admin/partners", label: "Applications", icon: Handshake, group: "Growth" },
  { to: "/admin/signals", label: "Signal Relay", icon: Radio, group: "Growth" },
  { to: "/admin/tenants", label: "White-Label", icon: Palette, group: "Growth" },
  { to: "/admin/lessons", label: "Content", icon: BookOpen, group: "Growth" },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText, group: "System" },
] as const;

const GROUPS = ["Main", "Growth", "System"] as const;

function isActive(to: string, pathname: string) {
  return to === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(to);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  async function signOut() {
    await adminSignOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-[oklch(0.11_0.03_255)] text-foreground [background-image:var(--gradient-page-wash)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-white/5 bg-[oklch(0.13_0.035_255)]/80 px-3 py-6 backdrop-blur lg:flex">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <img src="/cosmos-mark.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div>
            <div className="text-sm font-bold leading-tight">Command Center</div>
            <div className="text-[10px] text-muted-foreground">Cosmos Candles · Admin</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">{group}</div>
              <div className="flex flex-col gap-0.5">
                {MENU.filter((m) => m.group === group).map((item) => {
                  const active = isActive(item.to, pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        active ? "bg-primary/10 text-foreground" : "text-foreground/50 hover:bg-white/5 hover:text-foreground/90",
                      )}
                    >
                      {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-colors", active ? "bg-primary/15 text-primary" : "text-current group-hover:bg-white/5")}>
                        <Icon className="h-4 w-4 shrink-0" />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 border-t border-white/5 pt-4">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground/90">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.7_0.2_290)] text-[11px] font-bold text-primary-foreground">M</span>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">MomentumLabs</div>
              <div className="text-[10px] text-muted-foreground">Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-[oklch(0.13_0.035_255)]/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.72_0.2_150)] text-[11px] font-black text-primary-foreground">A</span>
        <span className="font-bold">Admin</span>
        <div className="ml-auto flex gap-1 overflow-x-auto">
          {MENU.map((item) => {
            const active = isActive(item.to, pathname);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} title={item.label}
                className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors", active ? "bg-primary/20 text-primary" : "text-foreground/40 hover:text-foreground/70")}>
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
          <button onClick={signOut} title="Sign out" aria-label="Sign out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-foreground/40 hover:text-foreground/70">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="min-w-0 flex-1 px-4 py-6 pt-20 lg:px-8 lg:py-8 lg:pt-8">{children}</main>
    </div>
  );
}

export function AdminPageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminKpiCard({
  label, value, sub, tone, icon: Icon, delta,
}: {
  label: string; value: string | number; sub?: string;
  tone?: "primary" | "warn" | "ok" | "default";
  icon?: React.ElementType; delta?: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5 transition-colors hover:border-white/10">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-foreground/60">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className={cn(
        "mt-2 font-display text-3xl font-bold tabular-nums",
        tone === "primary" && "text-primary",
        tone === "warn" && "text-amber-400",
        tone === "ok" && "text-[oklch(0.78_0.16_150)]",
        (!tone || tone === "default") && "text-foreground",
      )}>{value}</div>
      <div className="mt-1 flex items-center gap-2">
        {typeof delta === "number" && (
          <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
            delta >= 0 ? "bg-[oklch(0.78_0.16_150)]/15 text-[oklch(0.8_0.16_150)]" : "bg-red-500/15 text-red-400")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

export { FileText };
