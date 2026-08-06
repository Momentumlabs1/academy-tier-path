/**
 * BrokerPausedNotice — what stands in for a deposit button while the broker
 * relationship is mid-switch.
 *
 * Shown wherever a member would otherwise be handed off to the broker. It is
 * deliberately framed as an upgrade rather than an outage, because that is what it
 * is — the new broker verifies deposits over an API in seconds instead of the
 * current poll-every-two-minutes — and because a member who reads "something is
 * broken" on a trading product does not come back to check.
 *
 * It does not promise a date. A date we then miss costs more trust than the pause
 * itself.
 */
import { Clock } from "lucide-react";
import { BROKER_SWITCH } from "@/lib/broker";

export function BrokerPausedNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Clock className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="font-display text-base font-bold">{BROKER_SWITCH.headline}</div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/65">{BROKER_SWITCH.body}</p>
        </div>
      </div>
    </div>
  );
}
