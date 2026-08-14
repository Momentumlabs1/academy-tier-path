/**
 * BrokerIdentityCard — makes an email mismatch loud instead of silent.
 *
 * The academy unlocks on a deposit the broker reports against an email address.
 * A member who registers at the broker with a different address than they use
 * here deposits real money and stays locked out, and until now nobody would ever
 * learn why: no error, no warning, no row anywhere. They would conclude the
 * product is broken and leave.
 *
 * The clean fix is not available. Our tracking id does reach HeroFX — their back
 * office shows it — but their registration and partnership systems are separate
 * databases and bridging them means opening a hole in a licensed broker's
 * firewall. That is a reasonable no, so identity runs on the email address.
 *
 * Which leaves two jobs, and this card does both:
 *   1. BEFORE — show the exact address to use, with one tap to copy it. Most
 *      mismatches happen because nobody ever said "use this one".
 *   2. AFTER — let them check in one click, and if it did not match, ask which
 *      address they used. One question, answered while they are still here,
 *      instead of a support ticket three weeks later.
 */
import { useState } from "react";
import { ArrowRight, Check, Copy, Loader2, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { useMemberState } from "@/hooks/useMemberState";
import { cn } from "@/lib/utils";

type State = "idle" | "checking" | "found" | "missing" | "saving" | "error";

const rpc = () =>
  supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };

export function BrokerIdentityCard({ className }: { className?: string }) {
  const { profile } = useMemberState();
  const [state, setState] = useState<State>("idle");
  const [copied, setCopied] = useState(false);
  const [alt, setAlt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (!profile.email) return null;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the address is on screen anyway */ }
  }

  async function check() {
    setState("checking");
    setMessage(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) { setState("error"); setMessage("Please sign in again."); return; }

      const res = await fetch(functionUrl("broker-account-check"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setState("error"); setMessage(String(data.error ?? "Could not reach the broker.")); return; }
      setState(data.found ? "found" : "missing");
    } catch {
      setState("error");
      setMessage("Could not reach the broker. Try again in a moment.");
    }
  }

  async function saveAlt() {
    const email = alt.trim().toLowerCase();
    if (!email.includes("@")) { setMessage("That doesn't look like an email address."); return; }
    setState("saving");
    setMessage(null);
    const { error } = await rpc().rpc("set_broker_email", { p_email: email });
    if (error) { setState("error"); setMessage(error.message); return; }
    // Straight back into the check: the point is to tell them NOW whether it
    // worked, not to leave them wondering a second time.
    await check();
  }

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-5", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Use this email at the broker
      </div>

      <button
        type="button"
        onClick={copyEmail}
        className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[oklch(0.11_0.03_258)] px-4 py-3 text-left transition-colors hover:border-primary/40"
      >
        <span className="truncate font-mono text-sm text-foreground/90">{profile.email}</span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-primary">
          {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </span>
      </button>

      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        Your academy unlocks automatically when the broker reports your deposit — and it finds you
        by this address. A different one there means we can't connect the two.
      </p>

      {state === "found" && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/[0.07] p-3 text-[12px] leading-relaxed text-foreground/85">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Found your broker account. Your deposit will unlock the academy on its own — nothing else to do.
        </p>
      )}

      {(state === "missing" || state === "saving") && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-100">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            No broker account found for that address yet. If you haven't registered, that's expected —
            otherwise, which address did you use?
          </p>
          <div className="mt-2.5 flex gap-2">
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              /* 16px on phones or iOS Safari zooms the page on focus. */
              className="min-w-0 flex-1 rounded-lg border border-white/12 bg-[oklch(0.11_0.03_258)] px-3 py-2 text-base outline-none focus:border-primary/50 sm:text-sm"
            />
            <button
              type="button"
              onClick={saveAlt}
              disabled={state === "saving"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-2 text-[12px] text-destructive">{message}</p>}

      {state !== "found" && (
        <button
          type="button"
          onClick={check}
          disabled={state === "checking" || state === "saving"}
          className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold text-primary hover:underline disabled:opacity-60"
        >
          {state === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Already registered? Check the connection
        </button>
      )}
    </div>
  );
}
