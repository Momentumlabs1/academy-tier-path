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

/**
 * Cosmo's idle float for the locked overlay — self-contained so it works even
 * though this component owns no global CSS. Honors prefers-reduced-motion.
 */
const COSMO_FLOAT = `
  @keyframes cosmo-gate-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  .cosmo-gate-float { animation: cosmo-gate-float 4.5s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .cosmo-gate-float { animation: none; } }
`;

export function LockedGate({
  locked,
  label = "Unlock with your first deposit",
  children,
}: {
  locked: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="animate-glow relative overflow-hidden rounded-[var(--radius)]">
      {/* @ts-expect-error inert is valid HTML but not yet in this React types version */}
      <div className="locked-veil" aria-hidden inert="">{children}</div>
      <style>{COSMO_FLOAT}</style>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/25 p-4 text-center backdrop-blur-[1px]">
        {/* Cosmo stands guard — the gate feels guided, not just bolted shut. */}
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-0 -m-3 rounded-full blur-2xl"
            style={{ background: "radial-gradient(circle, color-mix(in oklch, #75B9F5 55%, transparent), transparent 70%)" }}
            aria-hidden
          />
          <img
            src="/cosmo/cosmo-head.png"
            alt="Cosmo"
            className="cosmo-gate-float relative h-16 w-16 max-w-full object-contain drop-shadow-xl"
          />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-primary backdrop-blur-sm animate-pill-pulse">
            <Lock className="h-3 w-3" />
          </span>
        </div>
        <div className="max-w-[32ch] text-balance text-sm font-semibold text-white/90">{label}</div>
        <Link
          to="/tier"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5"
        >
          Deposit now <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
