import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, BookOpen, LayoutDashboard, Radio, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemberState } from "@/hooks/useMemberState";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/signals", label: "Signals", icon: Radio },
  { to: "/tier", label: "Tier", icon: Trophy },
];

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const state = useMemberState();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 flex items-stretch rounded-[22px] bg-[color:var(--surface-1)] p-1.5 shadow-[var(--shadow-card)] lg:hidden">
      {NAV.map((n) => {
        const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-[16px] px-1 py-2.5 text-[10px] font-semibold tracking-wide transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-[0_2px_12px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
                : "text-foreground/50 hover:text-foreground/80",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {n.label}
          </Link>
        );
      })}

      {/* Notifications — always last, with badge */}
      <Link
        to="/notifications"
        className={cn(
          "relative flex flex-1 flex-col items-center gap-1 rounded-[16px] px-1 py-2.5 text-[10px] font-semibold tracking-wide transition-all",
          pathname.startsWith("/notifications")
            ? "bg-primary text-primary-foreground shadow-[0_2px_12px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
            : "text-foreground/50 hover:text-foreground/80",
        )}
      >
        <span className="relative">
          <Bell className="h-[18px] w-[18px]" />
          {state.unreadNotifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-[color:var(--surface-1)]">
              {state.unreadNotifications}
            </span>
          )}
        </span>
        Inbox
      </Link>
    </nav>
  );
}
