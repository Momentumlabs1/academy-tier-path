/**
 * PostDepositWelcome — the Cosmo welcome that lights up AFTER the first deposit
 * lands (Foundation reached, >= €100). Two videos, both streamed from the
 * private `academy-videos` bucket via gated, time-limited signed URLs (fetched
 * only on play): the 20s personal welcome and the "copy your first signal"
 * tutorial. Dismissable so it doesn't nag forever. Co-branded accent; the
 * videos themselves stay pure Cosmo.
 *
 * Renders nothing until the member is funded — and nothing while the
 * celebration overlay is still unacknowledged: confetti first, welcome second.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
// Der Player lebt eigenstaendig, damit er auch im Signal-Bereich dauerhaft
// erreichbar ist — hier wird dieselbe Komponente doppelt verwendet.
import { SignalTutorialCard as SignalTutorial } from "@/components/academy/signals/SignalTutorialCard";
import { readFlag, writeFlag, readSeen } from "@/components/academy/onboarding/OnboardingJourney";
import { Card } from "@/components/academy/primitives/Card";

// Flip when welcome.mp4 is uploaded to the academy-videos bucket. Until then
// only the signals tutorial shows — a play button on a missing file would
// answer with an error, which is worse than one card fewer.
const WELCOME_VIDEO_READY = true;

export function PostDepositWelcome() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;
  const [dismissed, setDismissed] = useState(true);
  const email = state.profile.email;

  // Frueher war der Dismiss-Schluessel global ("cosmo_welcome_done") — EIN
  // Klick hat die Karte fuer jedes Konto in diesem Browser beerdigt. Jetzt
  // gilt er pro Konto, mit derselben onb_*:email-Konvention wie der Rest.
  useEffect(() => {
    setDismissed(email ? readFlag(email, "welcome_done") : true);
  }, [email]);

  // Only once Foundation is actually reached (>= €100) — a €50 partial deposit
  // must NOT trigger the "Unlocked" welcome — and only until dismissed.
  if (!state.loaded || !email || state.lifetimeDeposits < 100 || dismissed) return null;

  // Sequence, not collision: while the deposit celebration overlay is still
  // unacknowledged (amount rose above the last seen amount), the confetti owns
  // the screen. The welcome appears the moment the overlay is closed.
  if (state.lifetimeDeposits > readSeen(email)) return null;

  function dismiss() {
    writeFlag(email, "welcome_done");
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

      <div className={WELCOME_VIDEO_READY ? "mt-5 grid gap-4 sm:grid-cols-2" : "mt-5 max-w-md"}>
        {WELCOME_VIDEO_READY && (
          <SignalTutorial
            accent={accent}
            object="welcome.mp4"
            poster="/posters/welcome.jpg"
            title="You're officially in — Cosmo, 20 seconds"
            subtitle="What your deposit unlocked, and your very first step."
          />
        )}
        <SignalTutorial accent={accent} />
      </div>
    </Card>
  );
}
