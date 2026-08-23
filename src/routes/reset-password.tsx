/**
 * /reset-password — where a password-recovery link actually lands.
 *
 * This route did not exist, which is why "forgot password" was broken end to
 * end rather than merely pointing somewhere odd. `resetPasswordForEmail` sent
 * the mail correctly, but its redirect went to /login — the admin Command
 * Center — and no screen anywhere in the app ever called
 * `supabase.auth.updateUser({ password })`. So the mail arrived, the link
 * opened a door the member could not pass, and there was no way to set a new
 * password at all.
 *
 * How the Supabase recovery flow works, since it is easy to get subtly wrong:
 * the link carries its token in the URL *fragment*. The browser client parses
 * that on load, establishes a short-lived recovery session and emits a
 * PASSWORD_RECOVERY event. From that point the member counts as signed in just
 * long enough to change their own password — so the only thing this page has to
 * do is confirm a session exists, take a new password, and call updateUser.
 *
 * The session check is deliberately tolerant: detection can land either before
 * or after this component mounts, so it listens for the event AND checks for an
 * existing session, rather than trusting whichever happens to win the race.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { supabase } from "@/integrations/supabase/client";
import { FunnelShell } from "@/components/academy/onboarding/FunnelShell";
import { usePartnerBrand } from "@/lib/partner-brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — Cosmos Candles Academy" }] }),
  component: ResetPasswordPage,
});

const MIN_LENGTH = 6;

type Phase = "checking" | "ready" | "expired" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const brand = usePartnerBrand();

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // The recovery event may fire before or after mount — take either.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive && session) setPhase("ready");
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setPhase(data.session ? "ready" : "expired");
    });

    // A link that was already used, or is older than Supabase's recovery window,
    // establishes no session at all. Say so plainly instead of showing a form
    // that cannot work.
    const t = setTimeout(() => {
      if (alive) setPhase((p) => (p === "checking" ? "expired" : p));
    }, 5000);

    return () => { alive = false; clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) { setError(`Use at least ${MIN_LENGTH} characters.`); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }

    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (err) { setError(err.message); return; }
    setPhase("done");
    // Already signed in by the recovery session. WHERE to go is caller-defined:
    // members land on the dashboard, a freshly approved partner must land in
    // the partner portal — partner-approve appends ?next=/partner for that.
    const next = new URLSearchParams(window.location.search).get("next");
    const to = next === "/partner" ? "/partner" : "/";
    setTimeout(() => navigate({ to }), 1400);
  }

  return (
    <FunnelShell brand={brand}>
      <div className="mx-auto w-full max-w-md">
        {phase === "checking" && (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </div>
        )}

        {phase === "expired" && (
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-7 text-center">
            <KeyRound className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 font-display text-xl font-bold">This link has expired</h1>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
              Password links can only be used once, and they time out. Request a fresh one and
              open it straight away.
            </p>
            <button
              onClick={() => navigate({ to: "/signup" })}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Request a new link <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-7 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 font-display text-xl font-bold">Password changed</h1>
            <p className="mt-2 text-sm text-foreground/70">You're signed in — taking you to your dashboard.</p>
          </div>
        )}

        {phase === "ready" && (
          <form onSubmit={submit} className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 sm:p-7">
            <h1 className="font-display text-xl font-bold">Set a new password</h1>
            <p className="mt-1.5 text-sm text-foreground/70">
              Pick something you'll remember — you'll be signed in straight after.
            </p>

            <label className="mt-5 block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">New password</span>
              <input
                type="password" value={password} autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`at least ${MIN_LENGTH} characters`}
                className="w-full rounded-xl border border-white/10 bg-[oklch(0.12_0.03_258)] px-4 py-3 text-base outline-none focus:border-primary/50"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Repeat it</span>
              <input
                type="password" value={confirm} autoComplete="new-password"
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[oklch(0.12_0.03_258)] px-4 py-3 text-base outline-none focus:border-primary/50"
              />
            </label>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <button
              type="submit" disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Save new password
            </button>
          </form>
        )}
      </div>
    </FunnelShell>
  );
}
