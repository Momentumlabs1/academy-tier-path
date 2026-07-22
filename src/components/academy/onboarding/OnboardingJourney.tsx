/**
 * OnboardingJourney — the dashboard's guided first-session state machine.
 *
 * Stages (persisted per-account in localStorage, derived from live member state):
 *   1. "video"     — fresh signup, €0: Cosmo's welcome video INTEGRATED at the
 *                    top of the dashboard (no popup). Ends/skip → stage 2.
 *   2. "ignite"    — video done, still €0: slim reminder strip; the deposit
 *                    ladder below pulses (dashboard adds the ignite class), and
 *                    a DEPOSIT WATCHER polls the member row every 20 s (plus on
 *                    tab focus) so the moment the broker webhook books the
 *                    deposit, the dashboard reacts by itself.
 *   3. "celebrate" — deposit detected: full-screen confetti + tier reveal +
 *                    staged unlock tour (Telegram → Signals → Lessons → Tools,
 *                    each popping in), ending in "Telegram verbinden".
 *   4. done        — renders nothing; the (existing) PostDepositWelcome videos
 *                    take over below.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown, ArrowRight, BookOpen, Calculator, PartyPopper, PlayCircle, Radio, Send, X,
} from "lucide-react";
import { useMemberRefresh, useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { Card } from "@/components/academy/primitives/Card";
import { cn } from "@/lib/utils";

export type OnboardingStage = "loading" | "video" | "ignite" | "celebrate" | "done";

const keyFor = (email: string, what: string) => `onb_${what}:${email.toLowerCase()}`;
const readFlag = (email: string, what: string) => {
  try { return localStorage.getItem(keyFor(email, what)) === "1"; } catch { return false; }
};
const writeFlag = (email: string, what: string) => {
  try { localStorage.setItem(keyFor(email, what), "1"); } catch { /* private mode */ }
};

/** Shared stage derivation so the dashboard can also react (ignite class). */
export function useOnboardingStage(): { stage: OnboardingStage; email: string; advance: (what: "video" | "celebrated") => void } {
  const state = useMemberState();
  const [, bump] = useState(0);
  const email = state.profile.email;

  const stage: OnboardingStage = useMemo(() => {
    if (!state.loaded || !email) return "loading";
    const funded = state.lifetimeDeposits > 0;
    if (!funded) return readFlag(email, "video") ? "ignite" : "video";
    return readFlag(email, "celebrated") ? "done" : "celebrate";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loaded, state.lifetimeDeposits, email, bump]);

  return {
    stage,
    email,
    advance: (what) => { writeFlag(email, what === "video" ? "video" : "celebrated"); bump((n) => n + 1); },
  };
}

/* ── Stage 1: integrated welcome video ──────────────────────────────────────── */

function WelcomeVideoCard({ accent, onDone }: { accent: string; onDone: () => void }) {
  const [videoOk, setVideoOk] = useState(true);
  return (
    <Card variant="hero" className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: `color-mix(in oklch, ${COSMO.primaryColor} 22%, transparent)` }} />
      <div className="relative">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: COSMO.primaryColor }}>Schritt 1 von 2</div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">Willkommen! Cosmo erklärt dir in 30 Sekunden, wie alles läuft</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Kurz gesagt: <span className="font-semibold text-foreground/85">du zahlst nichts an uns</span> — du kapitalisierst dein eigenes Broker-Konto, und genau das schaltet hier alles frei.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
          {videoOk ? (
            <video
              controls playsInline autoPlay muted={false} className="aspect-video w-full object-cover"
              onEnded={onDone} onError={() => setVideoOk(false)}
            >
              <source src="/intro.mp4" type="video/mp4" />
            </video>
          ) : (
            /* Video file not uploaded yet → graceful text fallback, flow intact. */
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom}, ${COSMO.bgTo})` }}>
              <PlayCircle className="h-12 w-12 text-white/30" />
              <p className="max-w-md text-sm text-white/70">
                <b>So funktioniert's:</b> Deine erste Einzahlung ab 100&nbsp;€ bleibt <b>dein Geld</b> auf <b>deinem</b> Broker-Konto — sie schaltet Signale, Lektionen und Tools frei. Wir verdienen über den Broker, nicht an dir.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={onDone}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-[#08111a] transition-transform hover:scale-[1.03]"
            style={{ background: accent }}
          >
            Alles klar — weiter <ArrowRight className="h-4 w-4" />
          </button>
          <span className="text-xs text-foreground/50">Danach zeigen wir dir, wo's losgeht.</span>
        </div>
      </div>
    </Card>
  );
}

/* ── Stage 2: ignite strip + deposit watcher ───────────────────────────────── */

function IgniteStrip({ accent }: { accent: string }) {
  const refresh = useMemberRefresh();

  // Deposit watcher: poll every 20 s while on this stage + refresh on tab focus.
  useEffect(() => {
    const iv = setInterval(refresh, 20_000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [refresh]);

  return (
    <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: `color-mix(in oklch, ${accent} 40%, transparent)`, background: `color-mix(in oklch, ${accent} 8%, transparent)` }}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: accent }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">Nächster Schritt:</span>{" "}
        <span className="text-foreground/75">Erste Einzahlung ab 100 € — unten im Einzahlungs-Pfad. Sobald sie ankommt, schaltet sich hier alles automatisch frei.</span>
      </p>
      <ArrowDown className="h-4 w-4 shrink-0 animate-bounce" style={{ color: accent }} />
    </div>
  );
}

/* ── Stage 3: celebration overlay + unlock tour ────────────────────────────── */

const UNLOCKS = [
  { icon: Send, title: "Telegram-Gruppe", body: "Live-Signale direkt aufs Handy" },
  { icon: Radio, title: "Live-Signale", body: "Echtzeit-Calls vom Desk" },
  { icon: BookOpen, title: "Academy-Lektionen", body: "Dein kompletter Kurs" },
  { icon: Calculator, title: "Trader-Tools", body: "Size- & Risiko-Rechner" },
];

function Confetti({ accent }: { accent: string }) {
  // 56 deterministic-ish particles; pure CSS animation, no library.
  const pieces = useMemo(() =>
    Array.from({ length: 56 }, (_, i) => ({
      left: (i * 37) % 100,
      delay: ((i * 13) % 24) / 10,
      dur: 2.6 + ((i * 7) % 18) / 10,
      size: 6 + ((i * 11) % 8),
      hue: i % 3,
      spin: ((i * 29) % 360),
    })), []);
  const colors = [accent, COSMO.primaryColor, "#ffcf5c"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="onb-confetti absolute top-[-4%] block rounded-[2px]"
          style={{
            left: `${p.left}%`, width: p.size, height: p.size * 0.45,
            background: colors[p.hue],
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
            transform: `rotate(${p.spin}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function CelebrationOverlay({ accent, tierName, onClose }: { accent: string; tierName: string; onClose: () => void }) {
  const [step, setStep] = useState(0); // reveals unlock cards one by one
  const closed = useRef(false);

  useEffect(() => {
    const timers = UNLOCKS.map((_, i) => setTimeout(() => setStep(i + 1), 900 + i * 550));
    return () => timers.forEach(clearTimeout);
  }, []);

  const close = () => { if (!closed.current) { closed.current = true; onClose(); } };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <Confetti accent={accent} />
      <div className="onb-pop-in relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1420] p-6 shadow-2xl sm:p-8">
        <button onClick={close} aria-label="Schließen" className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground/50 hover:bg-white/10 hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `color-mix(in oklch, ${accent} 18%, transparent)`, color: accent }}>
            <PartyPopper className="h-6 w-6" />
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Einzahlung erkannt</div>
            <h2 className="font-display text-2xl font-bold leading-tight">Willkommen im {tierName}-Level! 🎉</h2>
          </div>
        </div>

        <p className="mt-3 text-sm text-foreground/70">Dein Konto ist verifiziert — das hier ist ab sofort alles deins:</p>

        <div className="mt-4 grid gap-2.5">
          {UNLOCKS.map((u, i) => (
            <div
              key={u.title}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 transition-all",
                i < step ? "onb-unlock-pop opacity-100" : "opacity-0",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklch, ${accent} 14%, transparent)`, color: accent }}>
                <u.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight">{u.title}</div>
                <div className="text-[11px] text-foreground/55">{u.body}</div>
              </div>
              <span className="text-sm font-black" style={{ color: accent }}>✓</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/signals"
            onClick={close}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#08111a] transition-transform hover:scale-[1.02]"
            style={{ background: accent }}
          >
            <Send className="h-4 w-4" /> Telegram verbinden
          </Link>
          <button onClick={close} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-foreground/80 hover:bg-white/5">
            Später — zum Dashboard
          </button>
        </div>
      </div>

      {/* Scoped keyframes — kept with the component so the flow is self-contained. */}
      <style>{`
        @keyframes onb-fall { 0% { transform: translateY(-6vh) rotate(0deg); opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(108vh) rotate(540deg); opacity: 0; } }
        .onb-confetti { animation-name: onb-fall; animation-timing-function: linear; animation-iteration-count: 1; animation-fill-mode: forwards; }
        @keyframes onb-pop { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.02); } 100% { transform: scale(1); opacity: 1; } }
        .onb-pop-in { animation: onb-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes onb-unlock { 0% { transform: translateY(10px) scale(0.96); opacity: 0; } 60% { transform: translateY(-2px) scale(1.01); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        .onb-unlock-pop { animation: onb-unlock 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      `}</style>
    </div>
  );
}

/* ── Orchestrator ──────────────────────────────────────────────────────────── */

export function OnboardingJourney() {
  const { stage, advance } = useOnboardingStage();
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.primaryColor;

  if (stage === "loading" || stage === "done") return null;
  if (stage === "video") return <WelcomeVideoCard accent={accent} onDone={() => advance("video")} />;
  if (stage === "ignite") return <IgniteStrip accent={accent} />;
  return (
    <CelebrationOverlay
      accent={accent}
      tierName={state.currentTier?.name ?? "Foundation"}
      onClose={() => advance("celebrated")}
    />
  );
}
