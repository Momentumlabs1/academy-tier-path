import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, Radio, Trophy, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENT_MEMBER, tierForDeposit } from "@/lib/academy-data";

const MENU = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, badge: null as string | null },
  { to: "/lessons", label: "Lessons", icon: BookOpen, badge: null },
  { to: "/signals", label: "Signals", icon: Radio, badge: "1" },
  { to: "/tier", label: "Tier", icon: Trophy, badge: null },
  { to: "/settings", label: "Settings", icon: Settings, badge: null },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tier = tierForDeposit(CURRENT_MEMBER.deposit);

  return (
    <aside className="hidden lg:flex h-[calc(100vh-2rem)] w-[260px] shrink-0 flex-col rounded-[28px] bg-[color:var(--surface-1)] p-5 shadow-[var(--shadow-card)] sticky top-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 px-1 py-2">
        <span className="relative flex h-7 w-7 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
          <span className="relative h-5 w-5 rounded-full bg-primary" />
        </span>
        <span className="font-display text-2xl font-bold tracking-tight">enter</span>
      </Link>

      {/* Menu */}
      <div className="mt-8 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Menu
      </div>
      <nav className="mt-3 flex flex-col gap-1.5">
        {MENU.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[color:var(--sidebar-accent)] text-foreground"
                  : "text-foreground/70 hover:bg-white/5 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-lime)]"
                    : "bg-white/5 text-foreground/80",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto" />

      {/* Account */}
      <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Account
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-foreground/80 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{CURRENT_MEMBER.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{tier.name} Member</div>
        </div>
      </div>
    </aside>
  );
}