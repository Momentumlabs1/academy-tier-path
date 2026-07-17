/**
 * RegistrationGate — the forced, non-dismissable onboarding overlay.
 *
 * Flow the funnel drives:
 *   partner landing (/<partner>) → "Registrieren" → dashboard → THIS overlay
 *   pops up and can't be closed → user registers → intro video unlocks →
 *   everything else stays locked until the €100 deposit.
 *
 * Auth: Supabase Auth signUp (customers register freely — sign-ups stay ON;
 * the ADMIN area is gated separately by an email allowlist, not by disabling
 * sign-ups). Partner attribution is read from the `cosmo_ref` cookie that the
 * partner landing set, and stamped into user metadata so the backend can write
 * members.referred_by_tenant.
 *
 * If a customer session already exists, this renders nothing (passes through).
 */
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Lock, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL } from "@/lib/admin-auth";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

type Phase = "checking" | "register" | "intro" | "authed";

export function RegistrationGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const mail = data.session?.user?.email?.toLowerCase();
      // Admins bypass the customer gate entirely.
      if (mail && mail === ADMIN_EMAIL.toLowerCase()) setPhase("authed");
      else if (data.session) setPhase("authed");
      else setPhase("register");
    });
    return () => { alive = false; };
  }, []);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ref = readCookie("cosmo_ref"); // partner slug attribution
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // app:"academy" tags this as a customer signup so the DB trigger
      // (handle_new_academy_user) provisions a members row + partner attribution,
      // WITHOUT touching the other apps that share this Supabase project.
      options: { data: { app: "academy", name: name.trim(), referred_by_tenant: ref } },
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setPhase("intro"); // registration done → show the intro video
  }

  if (phase === "checking") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.09_0.02_255)]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (phase === "authed") return <>{children}</>;

  return (
    <>
      {/* blurred dashboard behind the gate */}
      <div className="pointer-events-none absolute inset-0 blur-sm">{children}</div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        {phase === "register" && (
          <form onSubmit={register} className="w-full max-w-md rounded-3xl border border-white/10 bg-[oklch(0.14_0.04_255)] p-7 shadow-2xl">
            <div className="mb-1 font-display text-2xl font-bold">Willkommen — leg los</div>
            <p className="mb-5 text-sm text-foreground/60">
              Erstelle deinen kostenlosen Account. Danach schaltest du dein Einleitungs-Video frei; die Signale & Tools öffnen sich mit deiner ersten Einzahlung (100 €).
            </p>
            <input required placeholder="Dein Name" value={name} onChange={(e) => setName(e.target.value)}
              className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
            <input required type="email" placeholder="E-Mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
            <input required type="password" placeholder="Passwort" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mb-5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
            {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
            <button type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Kostenlos registrieren
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Kein Abo, keine Gebühr. Mit der Registrierung stimmst du unseren Bedingungen zu.</p>
          </form>
        )}

        {phase === "intro" && (
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[oklch(0.14_0.04_255)] p-6 shadow-2xl sm:p-8">
            <div className="mb-1 font-display text-2xl font-bold">Schön, dass du da bist! 🎉</div>
            <p className="mb-5 text-sm text-foreground/60">Schau dir kurz an, wie hier alles funktioniert:</p>
            <div className="relative mb-6 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
              {/* Intro video slot — drop the rendered MP4 into public/intro.mp4 */}
              <video controls playsInline poster="/zeko-hero.png" className="h-full w-full object-cover">
                <source src="/intro.mp4" type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/40">
                <PlayCircle className="h-14 w-14" />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setPhase("authed")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                Weiter zum Dashboard
              </button>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground/60">
                <Lock className="h-4 w-4" /> Signale & Tools: ab 100 € Einzahlung
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
