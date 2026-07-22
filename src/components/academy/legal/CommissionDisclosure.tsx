/**
 * CommissionDisclosure — the affiliate/IB commission disclosure (Kennzeichnungspflicht).
 *
 * Legally REQUIRED (orientation, not legal advice) under § 6 ECG + UWG: we must
 * disclose that we earn a commission from the broker, and that the content is
 * advertising. Place near the broker CTA on landing pages and in the
 * "How we earn money / Transparency" section. Keep the wording accurate — the
 * user's deposit is THEIR money at the broker, withdrawable under the broker's
 * terms; never phrase it as if we guarantee the refund.
 */
export function CommissionDisclosure({
  brokerName = "our partner broker",
  className = "",
}: {
  brokerName?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      aria-label="Transparency notice"
      className={`rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/60 ${className}`}
    >
      <span className="font-semibold text-white/75">Transparency:</span>{" "}
      This page contains advertising. We earn a commission from {brokerName} when you
      open an account and trade through our links — at no extra cost to you. Your
      deposit is and remains your own money in your broker account and can be withdrawn
      at any time under the broker's terms.
    </div>
  );
}
