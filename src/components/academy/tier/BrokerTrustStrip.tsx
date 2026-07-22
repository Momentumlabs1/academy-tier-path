/**
 * BrokerTrustStrip — the "your money goes to TradeQuo, not to us" block that
 * sits under every deposit surface. Two jobs:
 *   1. Kill the "am I paying these guys?" objection with the one-liner.
 *   2. Borrow the broker's credibility (Trustpilot 4.9, licenses, awards,
 *      proof of reserves) at exactly the moment of the deposit decision.
 * `cta` renders the real deposit button (external → the broker; swaps to our
 * IB referral link via VITE_BROKER_URL without a code change).
 */
import { ArrowUpRight } from "lucide-react";
import { BROKER } from "@/lib/broker";
import { cn } from "@/lib/utils";

export function BrokerTrustStrip({ cta = true, compact = false, className }: {
  cta?: boolean; compact?: boolean; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4", compact ? "sm:p-4" : "sm:p-5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Deposits go to our partner broker — not to us
          </div>
          {!compact && (
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{BROKER.oneLiner}</p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {BROKER.trust.map((t) => (
              <span key={t.label} className="inline-flex items-center gap-1.5 text-xs text-foreground/60">
                <span className="text-primary">{t.icon}</span> {t.label}
              </span>
            ))}
          </div>
        </div>
        {cta && (
          <a
            href={BROKER.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.03]"
          >
            Deposit at {BROKER.name} <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
