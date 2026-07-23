/**
 * BrokerTrustStrip — the "official partner broker" section that sits on every
 * deposit surface. Real TradeQuo wordmark (public/brokers/tradequo.svg, tinted
 * white via CSS filter), license/trust badge pills borrowed from the broker's
 * own site, the not-to-us one-liner, and the real deposit CTA (external;
 * swaps to our IB referral link via VITE_BROKER_URL without a code change).
 *
 * Variants: default (full card) · compact (slim, for inside other cards) ·
 * rail (vertical mini-card for the right rail).
 */
import { ArrowUpRight, BadgeCheck, ShieldCheck, Star, Trophy } from "lucide-react";
import { BROKER, depositUrl } from "@/lib/broker";
import { useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand } from "@/lib/partner-brand";
import { markDepositClick } from "@/lib/deposit-intent";
import { cn } from "@/lib/utils";

const LOGO = "/brokers/tradequo.svg";
const invertWhite = { filter: "brightness(0) invert(1)" } as const;

function Pills({ center = false, dim = false }: { center?: boolean; dim?: boolean }) {
  const pill = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
    dim ? "border-white/10 bg-white/[0.04] text-foreground/65" : "border-white/12 bg-white/[0.06] text-foreground/80",
  );
  return (
    <div className={cn("flex flex-wrap gap-2", center && "justify-center")}>
      <span className={pill}><Star className="h-3.5 w-3.5 fill-[#00b67a] text-[#00b67a]" /> 4.9 Trustpilot</span>
      <span className={pill}><ShieldCheck className="h-3.5 w-3.5 text-primary" /> FSCA</span>
      <span className={pill}><ShieldCheck className="h-3.5 w-3.5 text-primary" /> CMA</span>
      <span className={pill}><ShieldCheck className="h-3.5 w-3.5 text-primary" /> FSA</span>
      <span className={pill}><Trophy className="h-3.5 w-3.5 text-[#ffcf5c]" /> Award-winning broker</span>
      <span className={pill}><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Proof of Reserves</span>
    </div>
  );
}

function DepositCta({ className }: { className?: string }) {
  const { memberId, profile } = useMemberState();
  const brand = usePartnerBrand();
  return (
    <a
      href={depositUrl(memberId, brand?.brokerUrl || BROKER.url)}
      onClick={() => markDepositClick(profile.email)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.03]",
        className,
      )}
    >
      Deposit at {BROKER.name} <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}

export function BrokerTrustStrip({ cta = true, compact = false, className }: {
  cta?: boolean; compact?: boolean; className?: string;
}) {
  if (compact) {
    return (
      <div className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4", className)}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <img src={LOGO} alt={BROKER.name} className="h-4 w-auto shrink-0 opacity-90" style={invertWhite} />
          <span className="text-xs text-foreground/60">Official partner broker — your deposit goes there, never to us.</span>
          <div className="ml-auto"><Pills dim /></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6", className)}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Official partner broker
            </span>
            <img src={LOGO} alt={BROKER.name} className="h-5 w-auto" style={invertWhite} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/70">
            <span className="font-semibold text-foreground/90">Deposits go to {BROKER.name} — never to us.</span>{" "}
            You fund your own account at a licensed, award-winning global broker, your money stays yours and withdrawable — and that verified deposit is what unlocks everything here for free.
          </p>
          <div className="mt-3.5"><Pills /></div>
        </div>
        {cta && <DepositCta className="shrink-0" />}
      </div>
    </div>
  );
}

/** Vertical mini-card for the right rail. */
export function BrokerRailCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center", className)}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Official partner broker</div>
      <img src={LOGO} alt={BROKER.name} className="mx-auto mt-3 h-5 w-auto" style={invertWhite} />
      <p className="mt-3 text-xs leading-relaxed text-foreground/60">
        Your deposit lives in <b className="text-foreground/80">your own</b> {BROKER.name} account — licensed, award-winning, withdrawable anytime.
      </p>
      <div className="mt-3"><Pills center dim /></div>
      <DepositCta className="mt-4 w-full" />
    </div>
  );
}
