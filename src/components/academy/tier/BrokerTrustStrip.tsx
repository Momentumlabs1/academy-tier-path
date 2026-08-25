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
import { BROKER, BROKERS, BROKER_SWITCH, TELEGRAM_ENTRY, brokerForCountry } from "@/lib/broker";
import { useVisitorCountry } from "@/hooks/useVisitorCountry";
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
  // Which broker this visitor is actually routed to. Not used for the href —
  // the CTA goes to Telegram — but it IS the decision, and it has to be written
  // down at the moment it is made. Reconstructing it later from a country and a
  // rule that may since have changed is guesswork.
  const country = useVisitorCountry();
  const routedBroker = brokerForCountry(country);
  // Mid-switch: never hand a member to a broker we are leaving. See BROKER_SWITCH.
  if (BROKER_SWITCH.paused) return <BrokerPausedNotice className={className} />;
  return (
    <a
      /* TELEGRAM, not the broker. The broker's sign-up is where people drop out —
         documents, two-factor, waiting for approval — and a direct link hands
         exactly those people a path where nobody can help them and nobody finds
         out they left. The broker link lives in the chat, one tap away, next to
         someone who can answer. See TELEGRAM_ENTRY in broker.ts. */
      href={TELEGRAM_ENTRY.url}
      onClick={() => {
        // KEIN markDepositClick hier.
        //
        // Dieser Knopf oeffnet Telegram. Er hat bis heute zusaetzlich
        // markDepositClick gesetzt, und damit lief das Dashboard drei Stunden
        // lang in "We're checking your deposit" — bei jemandem, der nur einen
        // Chat geoeffnet hat. Die Behauptung "dein Geld ist unterwegs" gehoert
        // dem Nutzer, nicht einem Klick auf einen Chatlink; im Dashboard sagt
        // er sie jetzt selbst ("I already deposited").
        //
        // Die Klick-Erfassung unten BLEIBT: sie ist eine Messung, keine
        // Behauptung, und sie ist die einzige Zahl, die die Partner-Dashboards
        // ueberhaupt fuellt.

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
          p_country: country,
          p_broker: routedBroker.key,
        });
      }}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.03]",
        className,
      )}
    >
      {TELEGRAM_ENTRY.label} <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}

/**
 * The full card: three steps, in order, and nothing else above the fold.
 *
 * What was here before was a paragraph explaining custody, then the risk
 * warning, then the commission disclosure, then the e-mail card, then the trust
 * pills — five blocks of prose stacked on the one surface whose only job is to
 * get someone from "I want in" to "I deposited". Nobody reads five blocks. The
 * steps now carry the message, the disclosures stay (they are required, and
 * they are the reason this page is honest) but sit underneath where they belong.
 */
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
    <div className={cn("relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] p-5 sm:p-6", className)}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />

      <div className="relative flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          Unlock your membership
        </span>
        {/* LOGO is "" during the broker switch, and <img src=""> is not an empty
            image — the browser resolves it against the page URL and paints a
            broken-image box. Render nothing until there is a file. */}
        {LOGO && <img src={LOGO} alt={BROKER.name} className="h-5 w-auto" style={invertWhite} />}
      </div>

      <h3 className="relative mt-3 font-display text-xl font-bold leading-tight sm:text-2xl">
        Three steps. No subscription, no card.
      </h3>

      <ol className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <Step n={1} title="Join us on Telegram" body="We send you the broker link and walk you through the account opening." />
        {/* KEIN Broker-Name im Schritt.
            Welcher Broker es wird, haengt vom Land ab (brokerForCountry) und
            wird ohnehin erst im Chat uebergeben — hier einen zu nennen legt
            etwas fest, was an dieser Stelle noch offen ist, und muss bei jedem
            Wechsel nachgezogen werden. Was zaehlt, steht ohnehin daneben: es
            ist SEIN Konto, auf SEINEN Namen, das Geld bleibt seins. */}
        <Step n={2} title="Deposit €100+ into your own account" body="Opened in your own name through the link we send you. The money stays yours and withdrawable." />
        <Step n={3} title="Everything unlocks" body="The broker confirms the deposit and your access opens automatically — no codes." />
      </ol>

      {cta && (
        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <DepositCta />
          <span className="text-xs text-muted-foreground">Takes about 10 minutes.</span>
        </div>
      )}

      {/* Shown BEFORE they leave: the address the broker has to see. */}
      <BrokerIdentityCard className="relative mt-5" />

      <div className="relative mt-4"><Pills /></div>

      {/* Required, and kept — but at the foot of the card, not in the middle of
          the instructions. */}
      <div className="relative mt-4 border-t border-white/8 pt-4">
        <RiskWarning variant="compact" />
        <CommissionDisclosure className="mt-2" />
      </div>
    </div>
  );
}

/** One numbered step. Deliberately short: a step nobody finishes reading is not a step. */
function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[13px] font-black text-primary-foreground">
        {n}
      </span>
      <div className="mt-2.5 text-sm font-bold leading-snug">{title}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
    </li>
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
