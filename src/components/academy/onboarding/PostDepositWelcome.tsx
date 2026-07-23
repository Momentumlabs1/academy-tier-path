/**
 * PostDepositWelcome — the two Cosmo welcome videos that light up AFTER the
 * first deposit lands (deposit > 0). Video C ("you're in — how to reach the
 * Telegram groups") + Video D ("copy your first signal"). Dismissable so it
 * doesn't nag forever. Co-branded accent; the videos themselves stay pure Cosmo.
 *
 * Renders nothing until the member is funded — so it simply appears (and can be
 * dismissed) the moment the broker webhook flips deposit > 0.
 */
import { useEffect, useState } from "react";
import { PlayCircle, Radio, Sparkles, X } from "lucide-react";
import { useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { Card } from "@/components/academy/primitives/Card";

const DISMISS_KEY = "cosmo_welcome_done";

const VIDEOS = [
  { src: "/welcome.mp4", icon: Radio, title: "Welcome — here's how to start", body: "Cosmo shows you how to join the Telegram groups and find your way around." },
  { src: "/signals-tutorial.mp4", icon: Sparkles, title: "Copy your first signal", body: "Entry, stop-loss, take-profit — how to mirror a signal into your account." },
];

export function PostDepositWelcome() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Only once Foundation is actually reached (>= €100) — a €50 partial deposit
  // must NOT trigger the "Freigeschaltet" welcome — and only until dismissed.
  if (!state.loaded || state.lifetimeDeposits < 100 || dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
    setDismissed(true);
  }

  return (
    <Card variant="hero" className="animate-glow relative overflow-hidden p-5 sm:p-6">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground/50 hover:bg-white/10 hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <style>{`
        @keyframes cosmo-welcome-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .cosmo-welcome-float { animation: cosmo-welcome-float 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cosmo-welcome-float { animation: none; } }
      `}</style>
      <div className="flex items-center gap-4">
        {/* Cosmo welcomes you in personally the moment your deposit lands. */}
        <div className="relative hidden shrink-0 sm:block">
          <div
            className="pointer-events-none absolute inset-0 -m-2 rounded-full blur-2xl"
            style={{ background: `radial-gradient(circle, color-mix(in oklch, #75B9F5 55%, transparent), transparent 70%)` }}
            aria-hidden
          />
          <img
            src="/cosmo/cosmo-thumbsup.png"
            alt="Cosmo celebrating"
            className="cosmo-welcome-float relative h-24 w-auto max-w-full object-contain object-bottom drop-shadow-xl"
          />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: COSMO.primaryColor }}>Unlocked 🎉</div>
          <h2 className="font-display text-xl font-bold text-balance sm:text-2xl">Welcome to Cosmos Candles</h2>
          <p className="mt-1 max-w-[56ch] text-sm text-foreground/65">Your deposit landed — you're fully in. Cosmo walks you through your first two steps below.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {VIDEOS.map((v) => (
          <div key={v.src} className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="relative aspect-video bg-black">
              <video controls playsInline className="h-full w-full object-cover">
                <source src={v.src} type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom}, ${COSMO.bgTo})` }}>
                <PlayCircle className="h-12 w-12 text-white/40" />
              </div>
            </div>
            <div className="flex items-start gap-3 p-4">
              <v.icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
              <div>
                <div className="font-display text-sm font-bold">{v.title}</div>
                <div className="mt-0.5 text-xs text-foreground/60">{v.body}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
