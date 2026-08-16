import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Mail, X } from "lucide-react";
import type { TenantConfig } from "@/lib/tenants";
import { usableBrokerUrl } from "@/lib/broker";

const LEADS_KEY = "academy_leads";

/**
 * Email-first join funnel: capture the lead BEFORE redirecting to the
 * broker, so every visitor is contactable and attributable (click_id).
 * Demo persistence: localStorage. Production: POST to an edge function
 * that inserts into the `leads` table (click_id comes back in the
 * broker's deposit postback for exact attribution).
 */
export function JoinFunnel({ tenant, open, onClose }: {
  tenant: TenantConfig;
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null); // click_id after submit

  if (!open) return null;

  const brokerConfigured = tenant.brokerUrl && tenant.brokerUrl !== "#";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    const clickId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    // Reinforce partner attribution before we send them off to the broker.
    if (typeof document !== "undefined") {
      document.cookie = `cosmo_ref=${encodeURIComponent(tenant.slug)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
    try {
      const leads = JSON.parse(localStorage.getItem(LEADS_KEY) ?? "[]");
      leads.push({ email, tenant: tenant.slug, clickId, status: "redirected", createdAt: new Date().toISOString() });
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    } catch { /* private mode */ }

    if (brokerConfigured) {
      // usableBrokerUrl(): a partner link without a referral id would drop the
      // visitor on the broker's homepage unattributed — fall back to master.
      const target = usableBrokerUrl(tenant.brokerUrl);
      const sep = target.includes("?") ? "&" : "?";
      window.location.href = `${target}${sep}cid=${clickId}`;
    } else {
      setDone(clickId);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl sm:p-7"
        style={{ background: `linear-gradient(160deg, ${tenant.bgFrom}, ${tenant.bgTo})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Get free access</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Signals and the full academy, free. We set it up with you on Telegram.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-foreground/50 hover:bg-white/10 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="mt-5 rounded-2xl bg-white/5 p-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8" style={{ color: tenant.primaryColor }} />
            <div className="mt-2 font-display text-base font-bold">You're on the list!</div>
            <p className="mt-1 text-xs text-foreground/60">
              The broker link goes live shortly — we'll email you the moment it does.
            </p>
            <p className="mt-2 font-mono text-[10px] text-foreground/40">ref: {done}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5">
            {/* the 3 steps, compact */}
            <ol className="mb-4 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
              {["Your email", "Join Telegram", "Get access"].map((s, i) => (
                <li key={s} className="rounded-xl bg-white/5 px-2 py-2">
                  <span className="mb-1 block font-display text-sm font-black" style={{ color: tenant.primaryColor }}>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>

            <label className="block">
              <span className="sr-only">Email</span>
              <span className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 focus-within:ring-2" style={{ ["--tw-ring-color" as string]: tenant.primaryColor }}>
                <Mail className="h-4 w-4 shrink-0 text-foreground/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoFocus
                  className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/30"
                />
              </span>
            </label>
            {error && <p className="mt-2 text-xs font-semibold text-red-400">{error}</p>}

            <button
              type="submit"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: tenant.primaryColor }}
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>

            <p className="mt-3 text-center text-[11px] text-foreground/40">
              Already a member?{" "}
              <Link to="/signals" className="underline hover:text-foreground/70">Connect your Telegram →</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
