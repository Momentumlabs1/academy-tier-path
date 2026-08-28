/**
 * /signup — the co-branded registration page (replaces the old forced
 * RegistrationGate popup). Cosmo-primary, partner as a subtle accent.
 *
 * Deliberately slim: E-Mail + Passwort only. The single biggest documented
 * conversion lever is fewer fields — name/telegram are collected later
 * (progressive profiling) in the dashboard. Partner attribution rides the
 * `cosmo_ref` cookie into user metadata so the DB trigger writes
 * members.referred_by_tenant.
 *
 * Success (session returned) → /welcome. If "Confirm email" is ON in Supabase
 * (no session yet) → a confirm state. Already registered → /login? no: customers
 * sign in here too via the "Schon dabei?" link to the same auth.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { FunnelShell } from "@/components/academy/onboarding/FunnelShell";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { captureSetterToken, readSetterToken } from "@/lib/setter-token";

export const Route = createFileRoute("/signup")({
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
    // Goes through our own `password-reset` function rather than
    // supabase.auth.resetPasswordForEmail. That built-in path mails from
    // noreply@mail.app.supabase.io with a stock template — it reads as phishing
    // and lands in spam, so members reported the reset as simply broken. Ours
    // mints the same recovery link server-side and sends it through Resend from
    // send.cosmos-candles.com, landing on /reset-password.
    const res = await fetch(functionUrl("password-reset"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: mail }),
    }).catch(() => null);
    const error = res && res.ok ? null : { message: "Could not send the reset mail. Please try again." };
    setBusy(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

  // Den Token aus dem Bot-Link sofort wegsichern — bevor irgendein Klick oder
  // eine Weiterleitung die Adresszeile ueberschreibt.
  useEffect(() => { captureSetterToken(); }, []);

  // Already signed in? Skip straight ahead — no reason to show a register form.
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive || !data.session) return;
      const mail = data.session.user.email?.toLowerCase();
      navigate({ to: mail === ADMIN_EMAIL.toLowerCase() ? "/admin" : "/welcome" });
    });
    return () => { alive = false; };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ref = readCookie("cosmo_ref"); // partner slug attribution
    // Kam er ueber den Einzahlungs-Bot? Dann traegt der Link seinen Token, und
    // der ist der belastbare Weg zur Broker-Einzahlung — nicht die Adresse, die
    // er hier gleich tippt. Siehe lib/setter-token.ts.
    const st = readSetterToken();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { app: "academy", referred_by_tenant: ref, setter_token: st } },
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
      navigate({ to: mail === ADMIN_EMAIL.toLowerCase() ? "/admin" : "/welcome" });
      return;
    }

    if (error) { setBusy(false); setError(error.message); return; }
    setBusy(false);
    if (!data.session) { setConfirmSent(true); return; } // genuinely new user, Confirm-email ON
    navigate({ to: "/welcome" });
  }

  return (
    <>
    <style>{`
        @keyframes suRise { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform:none; } }
        .su-rise { animation: suRise .55s cubic-bezier(.22,1,.36,1) both; }
        .su-d1 { animation-delay: .06s; } .su-d2 { animation-delay: .16s; } .su-d3 { animation-delay: .26s; }
        @media (prefers-reduced-motion: reduce) { .su-rise { animation: none; } }
      `}</style>
      <FunnelShell brand={brand}>
      {resetSent ? (
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl backdrop-blur-sm">
          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full blur-xl" style={{ background: `radial-gradient(circle, color-mix(in oklch, ${accent} 45%, transparent), transparent 70%)` }} />
            <img src="/cosmo/cosmo-head.png" alt="Cosmo" className="cosmo-float relative h-16 w-16 object-contain" />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[oklch(0.13_0.04_260)]" style={{ background: accent, color: "#0b1220" }}>
              <CheckCircle2 className="h-4 w-4" />
            </span>
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
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl backdrop-blur-sm">
          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full blur-xl" style={{ background: `radial-gradient(circle, color-mix(in oklch, ${accent} 45%, transparent), transparent 70%)` }} />
            <img src="/cosmo/cosmo-head.png" alt="Cosmo" className="cosmo-float relative h-16 w-16 object-contain" />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[oklch(0.13_0.04_260)]" style={{ background: accent, color: "#0b1220" }}>
              <CheckCircle2 className="h-4 w-4" />
            </span>
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
        <div className="grid w-full max-w-4xl items-center gap-8 lg:grid-cols-[0.9fr_1fr] lg:gap-12">
          {/* Cosmo greeting — the face of the brand welcomes you in. */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="relative flex items-center justify-center">
              <div
                aria-hidden
                className="pointer-events-none absolute h-56 w-56 rounded-full blur-2xl sm:h-64 sm:w-64"
                style={{ background: `radial-gradient(circle, color-mix(in oklch, ${accent} 45%, transparent), transparent 70%)` }}
              />
              <img
                src="/cosmo/cosmo-wave.png"
                alt="Cosmo, your Academy guide, waving hello"
                className="cosmo-float relative h-56 w-auto max-w-full object-contain object-bottom drop-shadow-2xl sm:h-72"
              />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Welcome to the Academy
            </p>
            <h1 className="mt-2 text-balance font-display text-3xl font-bold leading-tight sm:text-4xl">
              Hey, I&apos;m Cosmo — let&apos;s get you trading.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/70">
              Create your free account in about 20 seconds and I&apos;ll unlock your welcome video right away.
              Live signals and the trader tools open up the moment you make your first deposit.
            </p>
          </div>

          <div className="su-rise su-d2 w-full">
          <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-7">
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Email address</span>
              <input
                required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none transition-colors focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/10"
                style={{ ["--tw-ring-color" as string]: accent }}
              />
            </label>
            <label className="mb-5 block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Choose a password</span>
              <input
                required type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none transition-colors focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/10"
              />
              <span className="mt-1.5 block text-[11px] text-muted-foreground">At least 6 characters — pick something only you would guess.</span>
            </label>

            {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

            <button
              type="submit" disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black text-black transition-all duration-200 hover:-translate-y-px hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: `linear-gradient(180deg, color-mix(in oklch, ${COSMO.primaryColor} 88%, white), ${COSMO.primaryColor})`,
                boxShadow: `0 8px 24px -12px ${COSMO.primaryColor}, inset 0 1px 0 rgba(255,255,255,0.45)`,
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
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
        </div>
      )}
    </FunnelShell>
    </>
  );
}
