import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, BookOpen, Calculator, LayoutDashboard, LogOut, MoreHorizontal, Radio, Settings, Trophy, Unlock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemberState } from "@/hooks/useMemberState";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/signals", label: "Signals", icon: Radio },
  { to: "/tier", label: "Tier", icon: Trophy },
];

// Everything not on the bottom bar lives in the "More" sheet so nothing is
// stranded on mobile (previously /tools, /unlocks, /settings were unreachable).
const MORE = [
  { to: "/tools", label: "Trader tools", icon: Calculator },
  { to: "/unlocks", label: "Unlocks", icon: Unlock },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const state = useMemberState();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  async function signOut() {
    setMoreOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const cell = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center gap-1 rounded-[16px] px-1 py-2.5 text-[10px] font-semibold tracking-wide transition-all",
      active
        ? "bg-primary text-primary-foreground shadow-[0_2px_12px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
        : "text-foreground/50 hover:text-foreground/80",
    );

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-3 bottom-3 rounded-3xl border border-white/10 bg-[color:var(--surface-1)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">More</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close" className="rounded-lg p-1 text-foreground/60 hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MORE.map((m) => {
                const Icon = m.icon;
                return (
                  <Link key={m.to} to={m.to} onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3 text-sm font-medium text-foreground/85 hover:bg-white/10">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--surface-2)]"><Icon className="h-4 w-4" /></span>
                    <span className="flex-1">{m.label}</span>
                    {m.to === "/notifications" && state.unreadNotifications > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{state.unreadNotifications}</span>
                    )}
                  </Link>
                );
              })}
            </div>
            <button onClick={signOut}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-3 text-sm font-semibold text-foreground/70 hover:bg-white/5">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-stretch rounded-[22px] bg-[color:var(--surface-1)] p-1.5 shadow-[var(--shadow-card)] lg:hidden">
        {NAV.map((n) => {
          const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to} className={cell(active)}>
              <Icon className="h-[18px] w-[18px]" />
              {n.label}
            </Link>
          );
        })}

        <button
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          className={cn(cell(MORE.some((m) => pathname.startsWith(m.to)) && !moreOpen), "relative")}
        >
          <span className="relative">
            <MoreHorizontal className="h-[18px] w-[18px]" />
            {state.unreadNotifications > 0 && (
              <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-[color:var(--surface-1)]" />
            )}
          </span>
          More
        </button>
      </nav>
    </>
  );
}
