/**
 * LockedGate — wraps deposit-gated dashboard content so a not-yet-funded member
 * still SEES it (blurred, dimmed) but can't use it, with a slow-breathing glow
 * and a "unlock with your first deposit" hint. The "I can see it, I almost have
 * it" pull that turns a €0 member into a depositor.
 *
 * When the member is funded, it renders children plainly (no overlay).
 */
import { Link } from "@tanstack/react-router";
import { Lock, ArrowRight } from "lucide-react";

export function LockedGate({
  locked,
  label = "Mit deiner ersten Einzahlung freischalten",
  children,
}: {
  locked: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="animate-glow relative overflow-hidden rounded-[var(--radius)]">
      <div className="locked-veil" aria-hidden>{children}</div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/25 p-4 text-center backdrop-blur-[1px]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary animate-pill-pulse">
          <Lock className="h-5 w-5" />
        </span>
        <div className="text-sm font-semibold text-white/90">{label}</div>
        <Link
          to="/tier"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5"
        >
          Jetzt einzahlen <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
