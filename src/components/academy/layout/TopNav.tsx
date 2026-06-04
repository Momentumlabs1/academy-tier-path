import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { DemoModePill } from "../primitives/DemoModePill";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/lessons", label: "Lessons" },
  { to: "/signals", label: "Signals" },
  { to: "/tier", label: "Tier" },
];

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="flex items-center justify-between gap-4 pb-6">
      <nav className="hidden items-center gap-8 md:flex">
        {LINKS.map((l) => {
          const active = l.to === "/" ? pathname === "/" : pathname.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "text-base transition-colors",
                active
                  ? "font-semibold text-foreground"
                  : "text-foreground/65 hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="md:hidden">
        <DemoModePill />
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:block">
          <DemoModePill />
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5">
          Connect Broker
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}