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
  { src: "/welcome.mp4", icon: Radio, title: "Willkommen — so geht's los", body: "Cosmo zeigt dir, wie du in die Telegram-Gruppen kommst und dich zurechtfindest." },
  { src: "/signals-tutorial.mp4", icon: Sparkles, title: "Dein erstes Signal kopieren", body: "Entry, Stop-Loss, Take-Profit — so übernimmst du ein Signal in dein Konto." },
];

export function PostDepositWelcome() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Only for funded members, and only until they dismiss it.
  if (!state.loaded || state.lifetimeDeposits <= 0 || dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
    setDismissed(true);
  }

  return (
    <Card variant="hero" className="animate-glow relative overflow-hidden p-5 sm:p-6">
      <button onClick={dismiss} aria-label="Ausblenden" className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground/50 hover:bg-white/10 hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: COSMO.primaryColor }}>Freigeschaltet 🎉</div>
      <h2 className="font-display text-xl font-bold sm:text-2xl">Willkommen in der Academy</h2>
      <p className="mt-1 text-sm text-foreground/65">Deine Einzahlung ist da — hier sind deine ersten zwei Schritte.</p>

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
