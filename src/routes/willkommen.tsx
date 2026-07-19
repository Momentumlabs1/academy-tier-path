/**
 * /willkommen — the post-registration Cosmo welcome step. ONE Cosmo video for
 * ALL partners (Cosmo is the star; the partner is only the accent chip in the
 * header). Not a forced wall: "Jetzt loslegen" is the primary button and is
 * usable immediately — the video plays optionally beside it, so we don't burn
 * conversion by blocking on a watch.
 *
 * Requires a session (you arrive here right after registering). No session →
 * back to /registrieren.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Lock, PlayCircle, Radio, GraduationCap, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunnelShell } from "@/components/academy/onboarding/FunnelShell";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";

export const Route = createFileRoute("/willkommen")({
  head: () => ({ meta: [{ title: "Willkommen — Cosmos Candles Academy" }] }),
  component: WelcomePage,
});

const UNLOCKS = [
  { icon: Radio, title: "Live-Signale", body: "Echtzeit-Trades vom Desk — Entry, Stop, Ziele." },
  { icon: GraduationCap, title: "Die Academy", body: "Schritt-für-Schritt von den Grundlagen zum Edge." },
  { icon: Bot, title: "Cosmo Mentor", body: "Dein KI-Coach, rund um die Uhr im Dashboard." },
];

function WelcomePage() {
  const navigate = useNavigate();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) navigate({ to: "/registrieren" });
      else setReady(true);
    });
    return () => { alive = false; };
  }, [navigate]);

  if (!ready) {
    return (
      <FunnelShell brand={brand}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </FunnelShell>
    );
  }

  return (
    <FunnelShell brand={brand}>
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Schön, dass du da bist! 🎉</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-foreground/65">
            Cosmo zeigt dir in 90 Sekunden, wie hier alles funktioniert — und was du gleich freischaltest.
          </p>
        </div>

        {/* ONE Cosmo welcome video for all partners. Drop the rendered file into public/intro.mp4. */}
        <div className="relative mb-6 aspect-video overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
          <video controls playsInline className="h-full w-full object-cover">
            <source src="/intro.mp4" type="video/mp4" />
          </video>
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom}, ${COSMO.bgTo})` }}
          >
            <PlayCircle className="h-14 w-14 text-white/40" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Cosmo · Willkommensvideo</span>
          </div>
        </div>

        {/* What you're about to unlock */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {UNLOCKS.map((u) => (
            <div key={u.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <u.icon className="mb-2 h-5 w-5" style={{ color: accent }} />
              <div className="font-display text-sm font-bold">{u.title}</div>
              <div className="mt-1 text-xs text-foreground/60">{u.body}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
            style={{ background: COSMO.primaryColor }}
          >
            Jetzt loslegen <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm text-foreground/60">
            <Lock className="h-4 w-4" /> Live-Signale & Tools: ab 100 € Einzahlung
          </div>
        </div>
      </div>
    </FunnelShell>
  );
}
