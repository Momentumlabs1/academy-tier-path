/**
 * /willkommen — the post-registration Cosmo "Auffang" step. Research-backed:
 * a short, relevant explainer at the highest-intent moment LIFTS deposit
 * completion (15–35%) and — crucially — neutralises the "what's the catch?"
 * objection that otherwise kills free-broker-funded models. So we do NOT hard-
 * redirect to the broker; we frame it first.
 *
 * Flow on this page:
 *   1. ONE Cosmo video (all partners): "you don't pay us — you fund your own
 *      broker account, we earn from the broker deal. Here's your deposit bar,
 *      it's at €0. Deposit to unlock everything."
 *   2. When the video ends (or the visitor taps "weiter"), the deposit ladder +
 *      Foundation levels LIGHT UP (glow + pop) — the reveal.
 *   3. The deposit CTA ignites → broker (or the dashboard until the broker link
 *      is live). Partner stays a subtle accent (chip in header); videos are pure
 *      Cosmo.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, PlayCircle, Radio, GraduationCap, Bot, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunnelShell } from "@/components/academy/onboarding/FunnelShell";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { TIERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/willkommen")({
  head: () => ({ meta: [{ title: "Willkommen — Cosmos Candles Academy" }] }),
  component: WelcomePage,
});

const NODES = [{ name: "Start", minDeposit: 0, color: "oklch(0.65 0.02 250)" }, ...TIERS];
const scale = (a: number) => Math.log10(1 + a);
const MAX = scale(NODES[NODES.length - 1].minDeposit);
const posPct = (a: number) => (scale(a) / MAX) * 100;

const UNLOCKS = [
  { icon: Radio, title: "Live-Signale", body: "Echtzeit-Trades vom Desk." },
  { icon: GraduationCap, title: "Die Academy", body: "Von den Grundlagen zum Edge." },
  { icon: Bot, title: "Cosmo Mentor", body: "Dein KI-Coach rund um die Uhr." },
];

function WelcomePage() {
  const navigate = useNavigate();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) navigate({ to: "/registrieren" });
      else setReady(true);
    });
    return () => { alive = false; };
  }, [navigate]);

  const brokerConfigured = brand?.brokerUrl && brand.brokerUrl !== "#";
  function goDeposit() {
    if (brokerConfigured) window.location.href = brand!.brokerUrl;
    else navigate({ to: "/tier" }); // until the broker link is live, land on the deposit/connect page
  }

  if (!ready) {
    return <FunnelShell brand={brand}><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></FunnelShell>;
  }

  return (
    <FunnelShell brand={brand}>
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Schön, dass du da bist! 🎉</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-foreground/65">
            Cosmo erklärt dir in 30 Sekunden, wie das hier läuft — <span className="font-semibold text-foreground/85">du zahlst nichts an uns</span>.
          </p>
        </div>

        {/* ONE Cosmo video for all partners. Drop the rendered file into public/intro.mp4. */}
        <div className="relative mb-5 aspect-video overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
          <video ref={videoRef} controls playsInline className="h-full w-full object-cover" onEnded={() => setRevealed(true)}>
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

        {/* Explains the model in one line — the "what's the catch?" killer. */}
        <p className="mb-6 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center text-xs text-foreground/70">
          Wir haben einen Deal mit {brand?.brokerName ?? "unserem Partner-Broker"}: du finanzierst dein <span className="font-semibold text-foreground/90">eigenes</span> Trading-Konto — wir verdienen am Broker, nicht an dir. Deshalb ist die ganze Academy für dich gratis.
        </p>

        {/* The deposit bar — starts at €0. Dim until the reveal, then it lights up. */}
        <div className={cn("relative rounded-3xl border p-5 transition-all duration-700 sm:p-6", revealed ? "animate-glow border-primary/30" : "border-white/10")}
          style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom}, ${COSMO.bgTo})` }}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: COSMO.primaryColor }}>Dein Einzahl-Pfad</span>
            <span className="font-mono text-xs text-foreground/60">aktuell: <span className="font-bold text-foreground/90">€0</span></span>
          </div>
          <div className="relative mt-8 mb-2 h-16">
            <div className="absolute inset-x-0 top-2 h-1.5 rounded-full bg-white/10" />
            {NODES.map((n, i) => {
              const pct = posPct(n.minDeposit);
              const isStart = i === 0;
              return (
                <div key={n.name} className={cn("absolute -translate-x-1/2", revealed && !isStart && "animate-unlock-pop")}
                  style={{ left: `${pct}%`, top: 0, animationDelay: `${i * 140}ms` }}>
                  <div
                    className={cn("mx-auto flex h-5 w-5 items-center justify-center rounded-full border-2", isStart ? "border-white/30 bg-primary" : "border-white/10")}
                    style={!isStart && revealed ? { backgroundColor: n.color, borderColor: "rgba(255,255,255,0.25)" } : !isStart ? { background: "var(--surface-1)" } : undefined}
                  >
                    {isStart && <span className="h-1.5 w-1.5 rounded-full bg-black/70" />}
                  </div>
                  <div className="mt-2 whitespace-nowrap text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{isStart ? "Du" : n.name}</div>
                    <div className="font-mono text-[11px] font-semibold text-foreground/90">{formatMoney(n.minDeposit, "€")}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
            {UNLOCKS.map((u, i) => (
              <div key={u.title}
                className={cn("rounded-2xl border p-3 transition-all duration-500", revealed ? "border-white/12 bg-white/[0.05]" : "locked-veil border-white/8 bg-white/[0.02]")}
                style={revealed ? { animationDelay: `${i * 120}ms` } : undefined}>
                <u.icon className="mb-1.5 h-4 w-4" style={{ color: accent }} />
                <div className="font-display text-sm font-bold">{u.title}</div>
                <div className="text-[11px] text-foreground/55">{u.body}</div>
              </div>
            ))}
          </div>

          <button
            onClick={goDeposit}
            className={cn("mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-black transition-all hover:opacity-90", revealed && "animate-glow")}
            style={{ background: COSMO.primaryColor }}
          >
            <Sparkles className="h-4 w-4" /> Jetzt einzahlen & alles freischalten <ArrowRight className="h-4 w-4" />
          </button>

          {!revealed && (
            <button onClick={() => { setRevealed(true); videoRef.current?.pause(); }}
              className="mt-3 w-full text-center text-xs text-muted-foreground underline hover:text-foreground">
              Schon klar — überspringen
            </button>
          )}
          {revealed && (
            <button onClick={() => navigate({ to: "/" })}
              className="mt-3 w-full text-center text-xs text-muted-foreground underline hover:text-foreground">
              Erstmal umsehen →
            </button>
          )}
        </div>
      </div>
    </FunnelShell>
  );
}
