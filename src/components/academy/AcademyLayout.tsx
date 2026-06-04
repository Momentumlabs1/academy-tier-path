import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { GraduationCap, LayoutDashboard, BookOpen, Award, Settings } from "lucide-react";
import { DemoModePill } from "./DemoModePill";
import { TierBadge } from "./TierBadge";
import { CURRENT_MEMBER, tierForDeposit } from "@/lib/academy-data";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/tier", label: "My Tier", icon: Award },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AcademyLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tier = tierForDeposit(CURRENT_MEMBER.deposit);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--gradient-gold)" }}>
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Agent Trading</div>
            <div className="text-xs text-muted-foreground">Academy</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold">
              {CURRENT_MEMBER.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{CURRENT_MEMBER.name}</div>
              <TierBadge tier={tier.key} />
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-primary lg:hidden" />
            <DemoModePill />
          </div>
          <div className="text-xs text-muted-foreground">
            Deposit verified · ${CURRENT_MEMBER.deposit.toLocaleString()}
          </div>
        </header>
        <main className="px-4 py-6 pb-24 lg:px-8 lg:py-10 lg:pb-10">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-sidebar lg:hidden">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}