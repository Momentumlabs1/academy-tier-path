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
  brokerName = "unserem Partner-Broker",
  className = "",
}: {
  brokerName?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      aria-label="Transparenzhinweis"
      className={`rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/60 ${className}`}
    >
      <span className="font-semibold text-white/75">Transparenz:</span>{" "}
      Diese Seite enthält Werbung. Wir erhalten eine Provision von {brokerName}, wenn du
      über unsere Links ein Konto eröffnest und handelst — für dich entstehen dadurch
      keine zusätzlichen Kosten. Deine Einzahlung ist und bleibt dein eigenes Geld auf
      deinem Broker-Konto und ist jederzeit gemäß den Bedingungen des Brokers auszahlbar.
    </div>
  );
}
