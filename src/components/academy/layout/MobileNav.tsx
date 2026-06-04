import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, Radio, Trophy, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/signals", label: "Signals", icon: Radio },
  { to: "/tier", label: "Tier", icon: Trophy },
  { to: "/settings", label: "More", icon: Settings },
];

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 flex rounded-full bg-[color:var(--surface-1)] p-1.5 shadow-[var(--shadow-card)] lg:hidden">
      {NAV.map((n) => {
        const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}