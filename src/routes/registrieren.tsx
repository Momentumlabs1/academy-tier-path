/**
 * /registrieren — the co-branded registration page (replaces the old forced
 * RegistrationGate popup). Cosmo-primary, partner as a subtle accent.
 *
 * Deliberately slim: E-Mail + Passwort only. The single biggest documented
 * conversion lever is fewer fields — name/telegram are collected later
 * (progressive profiling) in the dashboard. Partner attribution rides the
 * `cosmo_ref` cookie into user metadata so the DB trigger writes
 * members.referred_by_tenant.
 *
 * Success (session returned) → /willkommen. If "Confirm email" is ON in Supabase
 * (no session yet) → a confirm state. Already registered → /login? no: customers
 * sign in here too via the "Schon dabei?" link to the same auth.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunnelShell } from "@/components/academy/onboarding/FunnelShell";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { ADMIN_EMAIL } from "@/lib/admin-auth";

export const Route = createFileRoute("/registrieren")({
  head: () => ({ meta: [{ title: "Sign up for free — Cosmos Candles Academy" }] }),
  component: RegisterPage,
});

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function RegisterPage() {
  const navigate = useNavigate();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.primaryColor;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function forgotPassword() {
    const mail = email.trim();
    if (!mail) { setError("Enter your email above first, then tap “Forgot password?”."); return; }
    setBusy(true); setError(null);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

  // Already signed in? Skip straight ahead — no reason to show a register form.
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive || !data.session) return;
      const mail = data.session.user.email?.toLowerCase();
      navigate({ to: mail === ADMIN_EMAIL.toLowerCase() ? "/admin" : "/willkommen" });
    });
    return () => { alive = false; };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ref = readCookie("cosmo_ref"); // partner slug attribution
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { app: "academy", referred_by_tenant: ref } },
    });
    // Existing account can surface two ways:
    //  (a) an explicit "already registered" error (Confirm-email OFF), or
    //  (b) Supabase enumeration protection: NO error, an obfuscated user with an
    //      EMPTY identities array, and no session. Both mean: this email exists.
    const looksExisting =
      (error && /already|registered|exists/i.test(error.message)) ||
      (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);

    if (looksExisting) {
      // Returning customer → sign them in instead of dead-ending on a fake "confirm sent".
      const signIn = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (signIn.error) {
        setError("This email is already registered. Check your password, or use “Forgot password?” below.");
        return;
      }
      const mail = signIn.data.session?.user.email?.toLowerCase();
      navigate({ to: mail === ADMIN_EMAIL.toLowerCase() ? "/admin" : "/willkommen" });
      return;
    }

    if (error) { setBusy(false); setError(error.message); return; }
    setBusy(false);
    if (!data.session) { setConfirmSent(true); return; } // genuinely new user, Confirm-email ON
    navigate({ to: "/willkommen" });
  }

  return (
    <FunnelShell brand={brand}>
      {resetSent ? (
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `color-mix(in oklch, ${accent} 18%, transparent)`, color: accent }}>
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="mb-1 font-display text-2xl font-bold">Check your inbox</div>
          <p className="text-sm text-foreground/60">
            We&apos;ve sent a password-reset link to <span className="font-semibold text-foreground/80">{email}</span>.
            Open it to set a new password, then sign in.
          </p>
          <button onClick={() => setResetSent(false)} className="mt-4 text-xs text-muted-foreground underline hover:text-foreground">
            Back to sign up
          </button>
        </div>
      ) : confirmSent ? (
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `color-mix(in oklch, ${accent} 18%, transparent)`, color: accent }}>
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="mb-1 font-display text-2xl font-bold">Almost there</div>
          <p className="text-sm text-foreground/60">
            We&apos;ve sent a confirmation link to <span className="font-semibold text-foreground/80">{email}</span>.
            Click it and you&apos;ll go straight to your welcome video.
          </p>
          <button onClick={() => setConfirmSent(false)} className="mt-4 text-xs text-muted-foreground underline hover:text-foreground">
            Use a different email
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              Your free access to the Academy
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-foreground/65">
              Create your account in 20 seconds — then unlock your welcome video. Signals & trader tools open up with your first deposit.
            </p>
          </div>

          <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl sm:p-7">
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Email</span>
              <input
                required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-white/30"
                style={{ ["--tw-ring-color" as string]: accent }}
              />
            </label>
            <label className="mb-5 block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Password</span>
              <input
                required type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 6 characters"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-white/30"
              />
            </label>

            {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

            <button
              type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: COSMO.primaryColor }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Sign up for free
            </button>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: accent }} /> No subscription · no fees
              </p>
              <button type="button" onClick={forgotPassword} disabled={busy}
                className="text-[11px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-60">
                Forgot password?
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already a member? Enter your email &amp; password above — you&apos;ll be signed in automatically.
          </p>
        </div>
      )}
    </FunnelShell>
  );
}
