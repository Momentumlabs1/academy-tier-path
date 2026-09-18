/**
 * Erst das eigene Passwort, dann das Willkommen.
 *
 * Ansage Diego 18.09.: das Konto wird fuer den Kunden angelegt (Freischaltung
 * durch Diego oder durch den Bot nach der Einzahlung), er kommt ueber den Link
 * aus der Mail oder dem Chat herein — und soll sich zuerst ein eigenes Passwort
 * waehlen, "wie ein Mini-Tutorial, erst Profil vervollstaendigen", damit der
 * Login danach vollstaendig ist und der Empfang sich richtig anfuehlt.
 *
 * Wer das betrifft, steht im Konto: user_metadata.needs_password = true (setzt
 * member-freischalten bzw. bot-unlock). Nach dem Speichern wird es geloescht,
 * und die App laeuft normal weiter — beim ersten Mal mit dem Willkommen
 * (OnboardingJourney) auf dem Dashboard.
 */
import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MIN_LENGTH = 6;

export function PasswordSetupGate({ children }: { children: React.ReactNode }) {
  const [noetig, setNoetig] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const pruefe = (user: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined) => {
      if (!alive) return;
      setEmail(user?.email ?? "");
      setNoetig(Boolean(user?.user_metadata?.needs_password));
    };
    void supabase.auth.getUser().then(({ data }) => pruefe(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => pruefe(session?.user));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  async function speichern(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) { setError(`Use at least ${MIN_LENGTH} characters.`); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password, data: { needs_password: false } });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setNoetig(false);
  }

  if (noetig === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!noetig) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={speichern} className="w-full max-w-md rounded-3xl border border-white/8 bg-white/[0.03] p-6 sm:p-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Step 1 of 2 · Your login</div>
        <h1 className="mt-3 font-display text-2xl font-bold">Welcome to Cosmos Candles 👋</h1>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">
          Your access is unlocked. First, choose your own password, so you can sign in any time
          with <b className="text-foreground">{email}</b>. Then your welcome tour starts.
        </p>

        <label className="mt-6 block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Password</span>
          <input
            type="password" value={password} autoComplete="new-password" autoFocus
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
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save & start my tour <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </div>
  );
}
