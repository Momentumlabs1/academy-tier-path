/**
 * OnboardingJourney — the dashboard's guided first-session state machine,
 * driven by the member's REAL deposit amount (not just funded yes/no).
 *
 * Core mechanic: we remember the last deposit amount the user was shown
 * (localStorage, per account). Whenever the live amount RISES above that,
 * a celebration fires — and its content is amount-aware:
 *   · amount < €100  → partial celebration: "€50 angekommen — noch €50 bis
 *     Foundation", progress bar, top-up CTA. No false unlock party.
 *   · amount ≥ €100  → full unlock/tier celebration with the staged tour
 *     (Telegram → Signals → Lessons → Tools) and the real tier name.
 *     Also fires again on later tier jumps (e.g. €100 → €2.000 Operator).
 *
 * Stages:
 *   "video"     — €0, intro not watched: Cosmo video integrated in the dashboard
 *   "ignite"    — €0, video done: pulsing next-step strip + deposit watcher
 *   "topup"     — €1–99: real-amount strip with progress to Foundation + watcher
 *   "celebrate" — amount rose: overlay (partial or full variant)
 *   "done"      — funded & everything acknowledged
 *
 * The deposit watcher polls the member row every 20 s and on tab focus, so the
 * dashboard reacts on its own when the broker webhook books the money.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown, ArrowRight, BookOpen, Calculator, PartyPopper, PiggyBank, PlayCircle, Radio, Send, Sparkles, X,
} from "lucide-react";
import { useMemberRefresh, useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { TIERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/academy/primitives/Card";
import { cn } from "@/lib/utils";

const FOUNDATION_MIN = TIERS[0].minDeposit; // €100

/* ── per-account persistence ────────────────────────────────────────────────── */
const k = (email: string, what: string) => `onb_${what}:${email.toLowerCase()}`;
const readFlag = (email: string, what: string) => {
  try { return localStorage.getItem(k(email, what)) === "1"; } catch { return false; }
};
const writeFlag = (email: string, what: string) => {
  try { localStorage.setItem(k(email, what), "1"); } catch { /* private mode */ }
};
const readSeen = (email: string) => {
  try { return Number(localStorage.getItem(k(email, "seen")) ?? 0) || 0; } catch { return 0; }
};
const writeSeen = (email: string, amount: number) => {
  try { localStorage.setItem(k(email, "seen"), String(amount)); } catch { /* private mode */ }
};

type Stage = "loading" | "video" | "ignite" | "topup" | "celebrate" | "done";

/* ── deposit watcher (poll + focus) ─────────────────────────────────────────── */
function useDepositWatcher(active: boolean) {
  const refresh = useMemberRefresh();
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(refresh, 20_000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [active, refresh]);
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
            <video controls playsInline className="aspect-video w-full object-cover" onEnded={onDone} onError={() => setVideoOk(false)}>
              <source src="/intro.mp4" type="video/mp4" />
            </video>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom}, ${COSMO.bgTo})` }}>
              <PlayCircle className="h-12 w-12 text-white/30" />
              <p className="max-w-md text-sm text-white/70">
                <b>So funktioniert's:</b> Deine erste Einzahlung ab {formatMoney(FOUNDATION_MIN, "€")} bleibt <b>dein Geld</b> auf <b>deinem</b> Broker-Konto — sie schaltet Signale, Lektionen und Tools frei. Wir verdienen über den Broker, nicht an dir.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={onDone} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-[#08111a] transition-transform hover:scale-[1.03]" style={{ background: accent }}>
            Alles klar — weiter <ArrowRight className="h-4 w-4" />
          </button>
          <span className="text-xs text-foreground/50">Danach zeigen wir dir, wo's losgeht.</span>
        </div>
      </div>
    </Card>
  );
}

/* ── Stage 2a: €0 ignite strip ──────────────────────────────────────────────── */
function IgniteStrip({ accent }: { accent: string }) {
  useDepositWatcher(true);
  return (
    <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: `color-mix(in oklch, ${accent} 40%, transparent)`, background: `color-mix(in oklch, ${accent} 8%, transparent)` }}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: accent }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">Nächster Schritt:</span>{" "}
        <span className="text-foreground/75">Erste Einzahlung ab {formatMoney(FOUNDATION_MIN, "€")} — unten im Einzahlungs-Pfad. Sobald sie ankommt, schaltet sich hier alles automatisch frei.</span>
      </p>
      <ArrowDown className="h-4 w-4 shrink-0 animate-bounce" style={{ color: accent }} />
    </div>
  );
}

/* ── Stage 2b: partial-deposit strip (real amount, progress to Foundation) ──── */
function TopupStrip({ accent, amount }: { accent: string; amount: number }) {
  useDepositWatcher(true);
  const missing = Math.max(0, FOUNDATION_MIN - amount);
  const pct = Math.min(100, Math.round((amount / FOUNDATION_MIN) * 100));
  return (
    <div className="rounded-2xl border px-4 py-3.5" style={{ borderColor: `color-mix(in oklch, ${accent} 45%, transparent)`, background: `color-mix(in oklch, ${accent} 8%, transparent)` }}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklch, ${accent} 16%, transparent)`, color: accent }}>
          <PiggyBank className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-bold">{formatMoney(amount, "€")} von {formatMoney(FOUNDATION_MIN, "€")}</span>{" "}
          <span className="text-foreground/75">— dir fehlen noch <b style={{ color: accent }}>{formatMoney(missing, "€")}</b> bis Foundation (Signale, Lektionen & Tools).</span>
        </p>
        <Link to="/tier" className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-[#08111a] transition-transform hover:scale-[1.03]" style={{ background: accent }}>
          Auffüllen →
        </Link>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: accent }} />
      </div>
    </div>
  );
}

/* ── Stage 3: celebration overlay (partial vs full) ─────────────────────────── */
const UNLOCKS = [
  { icon: Send, title: "Telegram-Gruppe", body: "Live-Signale direkt aufs Handy" },
  { icon: Radio, title: "Live-Signale", body: "Echtzeit-Calls vom Desk" },
  { icon: BookOpen, title: "Academy-Lektionen", body: "Dein kompletter Kurs" },
  { icon: Calculator, title: "Trader-Tools", body: "Size- & Risiko-Rechner" },
];

function Confetti({ accent, count = 56 }: { accent: string; count?: number }) {
  const pieces = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      left: (i * 37) % 100, delay: ((i * 13) % 24) / 10, dur: 2.6 + ((i * 7) % 18) / 10,
      size: 6 + ((i * 11) % 8), hue: i % 3, spin: (i * 29) % 360,
    })), [count]);
  const colors = [accent, COSMO.primaryColor, "#ffcf5c"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p, i) => (
        <span key={i} className="onb-confetti absolute top-[-4%] block rounded-[2px]"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.45, background: colors[p.hue],
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.spin}deg)` }} />
      ))}
    </div>
  );
}

function CelebrationOverlay({ accent, amount, tierName, onClose }: {
  accent: string; amount: number; tierName: string | undefined; onClose: () => void;
}) {
  const full = amount >= FOUNDATION_MIN;
  const missing = Math.max(0, FOUNDATION_MIN - amount);
  const pct = Math.min(100, Math.round((amount / FOUNDATION_MIN) * 100));
  const [step, setStep] = useState(0);
  const closed = useRef(false);

  useEffect(() => {
    if (!full) return;
    const timers = UNLOCKS.map((_, i) => setTimeout(() => setStep(i + 1), 900 + i * 550));
    return () => timers.forEach(clearTimeout);
  }, [full]);

  const close = () => { if (!closed.current) { closed.current = true; onClose(); } };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <Confetti accent={accent} count={full ? 56 : 26} />
      <div className="onb-pop-in relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1420] p-6 shadow-2xl sm:p-8">
        <button onClick={close} aria-label="Schließen" className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground/50 hover:bg-white/10 hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `color-mix(in oklch, ${accent} 18%, transparent)`, color: accent }}>
            {full ? <PartyPopper className="h-6 w-6" /> : <PiggyBank className="h-6 w-6" />}
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Einzahlung erkannt</div>
            <h2 className="font-display text-2xl font-bold leading-tight">
              {full ? <>Willkommen im {tierName ?? "Foundation"}-Level! 🎉</> : <>{formatMoney(amount, "€")} sind angekommen!</>}
            </h2>
          </div>
        </div>

        {full ? (
          <>
            <p className="mt-3 text-sm text-foreground/70">
              Verifizierte Einzahlung: <b>{formatMoney(amount, "€")}</b> — das hier ist ab sofort alles deins:
            </p>
            <div className="mt-4 grid gap-2.5">
              {UNLOCKS.map((u, i) => (
                <div key={u.title} className={cn("flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 transition-all", i < step ? "onb-unlock-pop opacity-100" : "opacity-0")}>
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
              <Link to="/signals" onClick={close} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#08111a] transition-transform hover:scale-[1.02]" style={{ background: accent }}>
                <Send className="h-4 w-4" /> Telegram verbinden
              </Link>
              <button onClick={close} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-foreground/80 hover:bg-white/5">
                Später — zum Dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-foreground/70">
              Stark — dein Geld ist auf deinem Broker-Konto angekommen. Für <b>Foundation</b> (Signale, Lektionen, Tools) fehlen dir nur noch <b style={{ color: accent }}>{formatMoney(missing, "€")}</b>:
            </p>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between font-mono text-xs text-foreground/60">
                <span>{formatMoney(amount, "€")}</span><span>{formatMoney(FOUNDATION_MIN, "€")}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="onb-fill h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
              </div>
            </div>
            <div className="mt-4 grid gap-2 opacity-70">
              {UNLOCKS.slice(0, 3).map((u) => (
                <div key={u.title} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5">
                  <u.icon className="h-4 w-4 shrink-0 text-foreground/40" />
                  <span className="flex-1 text-sm text-foreground/60">{u.title}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">ab {formatMoney(FOUNDATION_MIN, "€")}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/tier" onClick={close} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-[#08111a] transition-transform hover:scale-[1.02]" style={{ background: accent }}>
                <Sparkles className="h-4 w-4" /> {formatMoney(missing, "€")} auffüllen & freischalten
              </Link>
              <button onClick={close} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-foreground/80 hover:bg-white/5">
                Okay
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes onb-fall { 0% { transform: translateY(-6vh) rotate(0deg); opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(108vh) rotate(540deg); opacity: 0; } }
        .onb-confetti { animation-name: onb-fall; animation-timing-function: linear; animation-iteration-count: 1; animation-fill-mode: forwards; }
        @keyframes onb-pop { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.02); } 100% { transform: scale(1); opacity: 1; } }
        .onb-pop-in { animation: onb-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes onb-unlock { 0% { transform: translateY(10px) scale(0.96); opacity: 0; } 60% { transform: translateY(-2px) scale(1.01); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        .onb-unlock-pop { animation: onb-unlock 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes onb-grow { from { width: 0; } }
        .onb-fill { animation: onb-grow 1s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>
    </div>
  );
}

/* ── Orchestrator ──────────────────────────────────────────────────────────── */
export function OnboardingJourney() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.primaryColor;
  const [, bump] = useState(0);

  const email = state.profile.email;
  const amount = state.lifetimeDeposits;

  const stage: Stage = useMemo(() => {
    if (!state.loaded || !email) return "loading";
    const seen = readSeen(email);
    if (amount > seen) return "celebrate";                 // money arrived (or grew) → party (amount-aware)
    if (amount <= 0) return readFlag(email, "video") ? "ignite" : "video";
    if (amount < FOUNDATION_MIN) return "topup";           // partially funded → real-amount strip
    return "done";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loaded, email, amount, bump]);

  if (stage === "loading" || stage === "done") return null;
  if (stage === "video") {
    return <WelcomeVideoCard accent={accent} onDone={() => { writeFlag(email, "video"); bump((n) => n + 1); }} />;
  }
  if (stage === "ignite") return <IgniteStrip accent={accent} />;
  if (stage === "topup") return <TopupStrip accent={accent} amount={amount} />;
  return (
    <CelebrationOverlay
      accent={accent}
      amount={amount}
      tierName={state.currentTier?.name}
      onClose={() => { writeSeen(email, amount); writeFlag(email, "video"); bump((n) => n + 1); }}
    />
  );
}
