/**
 * IntroVideoCard — das Intro-Video bleibt im Dashboard stehen, bis die
 * Einzahlung durch ist.
 *
 * Das WelcomeModal zeigt Cosmos Film genau einmal. Wer es wegdrueckt, hatte
 * bisher keinen Weg zurueck zum Video — dabei ist es das eine Stueck, das
 * erklaert, warum sich die Einzahlung lohnt. Diese Karte steht deshalb fuer
 * jedes noch nicht ge-fundete Konto im Dashboard (erst NACHDEM das Modal
 * quittiert ist, sonst doppelt es sich dahinter) und raeumt sich selbst weg,
 * sobald Foundation erreicht ist — dann uebernimmt PostDepositWelcome.
 * Bewusst ohne Schliessen-Knopf: sie soll bleiben.
 */
import { PlayCircle } from "lucide-react";
import { useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { INTRO_VIDEO_SRC, INTRO_VIDEO_POSTER } from "@/components/academy/onboarding/WelcomeModal";
import { Card } from "@/components/academy/primitives/Card";

export function IntroVideoCard() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;

  if (!state.loaded) return null;
  if (state.lifetimeDeposits >= 100) return null;      // Einzahlung durch → weg
  if (!state.onboardingSeenAt) return null;            // Modal zeigt den Film gerade selbst

  return (
    <Card variant="hero" className="relative overflow-hidden p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black sm:w-[340px]">
          <video
            controls
            playsInline
            preload="metadata"
            poster={INTRO_VIDEO_POSTER}
            className="aspect-video w-full object-contain"
          >
            <source src={INTRO_VIDEO_SRC} type="video/mp4" />
          </video>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
            <PlayCircle className="h-3.5 w-3.5" /> Watch first
          </div>
          <h2 className="font-display text-lg font-bold sm:text-xl">How the academy works — 70 seconds</h2>
          <p className="mt-1 max-w-[48ch] text-sm text-foreground/65">
            Cosmo explains what you get and the one step that unlocks it. This stays here until your
            first deposit lands.
          </p>
        </div>
      </div>
    </Card>
  );
}
