import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Bell } from "lucide-react";
import { DemoModePill } from "../primitives/DemoModePill";
import { useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand } from "@/lib/partner-brand";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/lessons", label: "Lessons" },
  { to: "/signals", label: "Signals" },
  { to: "/tier", label: "Tier" },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/lessons": "Lessons",
  "/signals": "Signals",
  "/tier": "Tier",
  "/unlocks": "Unlocks",
  "/notifications": "Inbox",
  "/settings": "Settings",
};

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const state = useMemberState();
  const brand = usePartnerBrand();

  const pageTitle = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => key === "/" ? pathname === "/" : pathname.startsWith(key))?.[1]
    ?? "Academy";

  return (
    <header className="flex items-center justify-between gap-4 pb-5">
      {/* Desktop nav links */}
      <nav className="hidden items-center gap-8 md:flex">
        {LINKS.map((l) => {
          const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "text-base transition-colors",
                active ? "font-semibold text-foreground" : "text-foreground/65 hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: Cosmos Candles logo lockup + page title */}
      <div className="flex items-center gap-3 md:hidden">
        <Link to="/" className="flex items-center gap-2" aria-label="Cosmos Candles Academy — home">
          <span className="relative flex h-8 w-8 items-center justify-center">
            <span
              className="absolute inset-0 rounded-full blur-md"
              style={{ background: "color-mix(in oklch, var(--primary) 45%, transparent)" }}
            />
            <img
              src="/cosmo/cosmo-head.png"
              alt="Cosmo"
              className="relative h-8 w-8 max-w-full object-contain"
            />
          </span>
          <span className="flex flex-col leading-none">
            <img src="/cosmos-logo.png" alt="Cosmos Candles Academy" className="h-6 w-auto" />
          </span>
        </Link>
        {pageTitle !== "Dashboard" && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-semibold text-foreground/80">{pageTitle}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Partner co-branding — subtle recurring accent from the referring partner. */}
        {brand && (
          <div
            className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold lg:flex"
            style={{
              borderColor: `color-mix(in oklch, ${brand.accentColor} 40%, transparent)`,
              background: `color-mix(in oklch, ${brand.accentColor} 12%, transparent)`,
            }}
            title={`Recommended by ${brand.name}`}
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded text-[8px] font-black text-white"
              style={{ background: brand.accentColor }}
            >
              {brand.logoInitials}
            </span>
            <span className="text-foreground/70">via {brand.name}</span>
          </div>
        )}
        <div className="hidden md:block">
          <DemoModePill />
        </div>

        {/* Mobile: notification bell */}
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-foreground/70 hover:text-foreground md:hidden"
        >
          <Bell className="h-4 w-4" />
          {state.unreadNotifications > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-primary" />
          )}
        </Link>

        <Link
          to="/tier"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5 md:px-4 md:py-2.5 md:text-sm"
        >
          <span className="hidden sm:inline">Connect Broker</span>
          <span className="sm:hidden">Top up</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}
