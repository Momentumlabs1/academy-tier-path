import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, BookOpen, Calculator, LayoutDashboard, Radio, Settings, ShieldCheck, Trophy, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemberState } from "@/hooks/useMemberState";

const MENU = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/tools", label: "Tools", icon: Calculator },
  { to: "/unlocks", label: "Unlocks", icon: Unlock },
  { to: "/signals", label: "Signals", icon: Radio },
  { to: "/tier", label: "Tier", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const state = useMemberState();

  return (
    <aside className="hidden lg:flex h-[calc(100vh-2rem)] w-[260px] shrink-0 flex-col rounded-[28px] bg-[color:var(--surface-1)] p-5 shadow-[var(--shadow-card)] sticky top-4">
      <Link to="/" className="flex items-center gap-2.5 px-1 py-2">
        <span className="relative flex h-7 w-7 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
          <span className="relative h-5 w-5 rounded-full bg-primary" />
        </span>
        <span className="font-display text-2xl font-bold tracking-tight">EnterTrade</span>
      </Link>

      <div className="mt-8 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Menu</div>
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
                active ? "bg-[color:var(--sidebar-accent)] text-foreground" : "text-foreground/70 hover:bg-white/5 hover:text-foreground",
              )}
            >
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-colors", active ? "bg-primary text-primary-foreground shadow-[var(--shadow-lime)]" : "bg-white/5 text-foreground/80")}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.to === "/notifications" && state.unreadNotifications > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {state.unreadNotifications}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto" />

      {/* Admin shortcut */}
      <Link
        to="/admin"
        className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground/60 hover:bg-white/5 hover:text-muted-foreground transition-colors"
      >
        <ShieldCheck className="h-3.5 w-3.5" /> Admin panel
      </Link>

      <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Account</div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-foreground/80 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {state.unreadNotifications > 0 && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{state.profile.name || state.profile.email || "Your account"}</div>
          <div className="truncate text-[11px] text-muted-foreground">{state.currentTier?.name ?? "Below Foundation"} Member</div>
        </div>
      </div>
    </aside>
  );
}
