/**
 * PostDepositWelcome — the Cosmo tutorial that lights up AFTER the first deposit
 * lands (Foundation reached, >= €100): "copy your first signal". Played from the
 * private `academy-videos` bucket via a gated, time-limited signed URL (fetched
 * only on play). Dismissable so it doesn't nag forever. Co-branded accent; the
 * video itself stays pure Cosmo.
 *
 * Renders nothing until the member is funded — so it simply appears (and can be
 * dismissed) the moment the broker webhook flips the deposit past Foundation.
 */
import { useEffect, useState } from "react";
import { PlayCircle, Sparkles, X, Loader2 } from "lucide-react";
import { useMemberState } from "@/hooks/useMemberState";
import { useSignedVideoUrl } from "@/hooks/useSignedVideoUrl";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
// Der Player lebt jetzt eigenstaendig, damit er auch im Signal-Bereich
// dauerhaft erreichbar ist — hier wird dieselbe Komponente verwendet.
import { SignalTutorialCard as SignalTutorial } from "@/components/academy/signals/SignalTutorialCard";
import { Card } from "@/components/academy/primitives/Card";

const DISMISS_KEY = "cosmo_welcome_done";


export function PostDepositWelcome() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Only once Foundation is actually reached (>= €100) — a €50 partial deposit
  // must NOT trigger the "Unlocked" welcome — and only until dismissed.
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
          <p className="mt-1 max-w-[56ch] text-sm text-foreground/65">Your deposit landed — you're fully in. Here's your first step.</p>
        </div>
      </div>

      <div className="mt-5 max-w-md">
        <SignalTutorial accent={accent} />
      </div>
    </Card>
  );
}
