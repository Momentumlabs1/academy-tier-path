/**
 * BrokerTrustStrip — the "official partner broker" section that sits on every
 * deposit surface. Broker wordmark (public/brokers/, tinted
 * white via CSS filter), license/trust badge pills borrowed from the broker's
 * own site, the not-to-us one-liner, and the real deposit CTA (external;
 * swaps to our IB referral link via VITE_BROKER_URL without a code change).
 *
 * Variants: default (full card) · compact (slim, for inside other cards) ·
 * rail (vertical mini-card for the right rail).
 */
import { ArrowUpRight, BadgeCheck, ShieldCheck, Star, Trophy } from "lucide-react";
import { ACTIVE_BROKER, BROKER, BROKERS, BROKER_SWITCH, depositUrl } from "@/lib/broker";
import { BrokerPausedNotice } from "@/components/academy/tier/BrokerPausedNotice";
import { RiskWarning } from "@/components/academy/legal/RiskWarning";
import { CommissionDisclosure } from "@/components/academy/legal/CommissionDisclosure";
import { BrokerIdentityCard } from "@/components/academy/tier/BrokerIdentityCard";
import { supabase } from "@/integrations/supabase/client";
import { useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand } from "@/lib/partner-brand";
import { markDepositClick } from "@/lib/deposit-intent";
import { cn } from "@/lib/utils";

// No wordmark until the new broker is confirmed — showing the old one would
// name a firm the member will never deal with.
const LOGO = "";
const invertWhite = { filter: "brightness(0) invert(1)" } as const;

function Pills({ center = false, dim = false }: { center?: boolean; dim?: boolean }) {
  const pill = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
    dim ? "border-white/10 bg-white/[0.04] text-foreground/65" : "border-white/12 bg-white/[0.06] text-foreground/80",
  );
  return (
    <div className={cn("flex flex-wrap gap-2", center && "justify-center")}>
      {/* The hardcoded pills that lived here — 4.9 Trustpilot, FSCA, CMA, FSA,
          "Award-winning broker", "Proof of Reserves" — were TRADEQUO's, and
          TradeQuo is no longer our broker. They were merely hidden behind
          BROKER_SWITCH.paused, which meant that unpausing would have republished
          another firm's licences under a new broker's name. Deleted rather than
          gated: each broker's verified claims belong in BROKERS[key].trust in
          broker.ts, which is deliberately empty until someone confirms them. */}
      {BROKER_SWITCH.paused ? null : BROKERS.hero.trust.map((t) => (
        <span key={t.label} className={pill}>{t.icon} {t.label}</span>
      ))}
    </div>
  );
}

function DepositCta({ className }: { className?: string }) {
  const { memberId, profile } = useMemberState();
  const brand = usePartnerBrand();
  // Mid-switch: never hand a member to a broker we are leaving. See BROKER_SWITCH.
  if (BROKER_SWITCH.paused) return <BrokerPausedNotice className={className} />;
  return (
    <a
      /* ACTIVE_BROKER, not a hardcoded one: VT has no registration URL, so this
         button used to point at an empty string. */
      href={depositUrl(memberId, ACTIVE_BROKER, brand?.brokerUrl)}
      onClick={() => {
        markDepositClick(profile.email);
        // Server-side too. The localStorage flag only drives this browser's
        // "verifying your deposit…" screen; it cannot tell us later WHO left for
        // the broker and when. That record is the only way to recognise a member
        // who registers there under a different address — and it is what finally
        // puts a real number on the partner dashboards' click counter, which has
        // read zero since the day it was built.
        void (supabase as unknown as {
          rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
        }).rpc("log_broker_click", {
          p_tenant_slug: brand?.slug ?? null,
          p_click_id: memberId || null,
        });
      }}
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
          {LOGO && <img src={LOGO} alt={BROKER.name} className="h-4 w-auto shrink-0 opacity-90" style={invertWhite} />}
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
            {/* LOGO is "" during the broker switch, and <img src=""> is not an
                empty image — the browser resolves it against the page URL and
                paints a broken-image box. Render nothing until there is a file. */}
            {LOGO && <img src={LOGO} alt={BROKER.name} className="h-5 w-auto" style={invertWhite} />}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/70">
            <span className="font-semibold text-foreground/90">Deposits go to {BROKER.name} — never to us.</span>{" "}
            You fund your own account in your own name, your money stays yours and withdrawable — and that verified deposit is what unlocks everything here for free.
          </p>
          <RiskWarning variant="compact" className="mt-3" />
          {/* The commission disclosure was only on the public landing page, which
              a signed-in member has no reason to revisit. It belongs where the
              deposit is actually asked for. */}
          <CommissionDisclosure className="mt-2" />
          {/* Shown BEFORE they leave: the address the broker has to see. */}
          <BrokerIdentityCard className="mt-3" />
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
      {LOGO && <img src={LOGO} alt={BROKER.name} className="mx-auto mt-3 h-5 w-auto" style={invertWhite} />}
      <p className="mt-3 text-xs leading-relaxed text-foreground/60">
        Your deposit lives in <b className="text-foreground/80">your own</b> account, in your own name, withdrawable anytime.
      </p>
      <div className="mt-3"><Pills center dim /></div>
      <DepositCta className="mt-4 w-full" />
    </div>
  );
}
