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
      ? `CFDs sind komplexe Instrumente und gehen wegen der Hebelwirkung mit einem hohen Risiko einher, schnell Geld zu verlieren. ${brokerLossPct}% der Kleinanlegerkonten verlieren Geld beim CFD-Handel mit ${brokerName}. Du solltest überlegen, ob du verstehst, wie CFDs funktionieren, und ob du dir das hohe Risiko, dein Geld zu verlieren, leisten kannst.`
      : `CFDs sind komplexe Instrumente und gehen wegen der Hebelwirkung mit einem hohen Risiko einher, schnell Geld zu verlieren. Zwischen 74% und 89% der Kleinanlegerkonten verlieren Geld beim Handel mit CFDs. Du solltest überlegen, ob du verstehst, wie CFDs funktionieren, und ob du dir das hohe Risiko, dein Geld zu verlieren, leisten kannst.`;

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
      aria-label="Risikohinweis"
      className={`flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      <p className="text-xs leading-relaxed">{body}</p>
    </div>
  );
}
