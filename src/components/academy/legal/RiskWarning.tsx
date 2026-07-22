/**
 * RiskWarning — the ESMA-mandated CFD risk warning.
 *
 * Legally REQUIRED (orientation, not legal advice) on any page/email/ad that
 * markets CFD/forex trading to retail in the EU. Must be prominent and integral
 * — not hidden in a footer. Drop <RiskWarning /> onto every partner landing
 * page (near the broker CTA) and anywhere trading is promoted.
 *
 * The broker will usually mandate the FIRM-SPECIFIC percentage version:
 * pass `brokerLossPct` + `brokerName` once you have the broker's current
 * quarterly figure. Without them it renders the generic 74–89% range wording.
 */
import { AlertTriangle } from "lucide-react";

export function RiskWarning({
  brokerName,
  brokerLossPct,
  variant = "banner",
  className = "",
}: {
  brokerName?: string;
  brokerLossPct?: number;
  variant?: "banner" | "compact";
  className?: string;
}) {
  const body =
    brokerName && brokerLossPct != null
      ? `CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. ${brokerLossPct}% of retail investor accounts lose money when trading CFDs with ${brokerName}. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.`
      : `Trading involves risk — 74–89% of retail CFD accounts lose money. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.`;

  if (variant === "compact") {
    return (
      <p className={`text-[11px] leading-snug text-amber-200/80 ${className}`} role="note">
        ⚠️ {body}
      </p>
    );
  }

  return (
    <div
      role="note"
      aria-label="Risk warning"
      className={`flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      <p className="text-xs leading-relaxed">{body}</p>
    </div>
  );
}
