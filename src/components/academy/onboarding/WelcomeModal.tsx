import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Calculator, Check, PlayCircle, Send, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useMemberState } from "@/hooks/useMemberState";
import { usePartnerBrand, COSMO } from "@/lib/partner-brand";
import { TELEGRAM_ENTRY } from "@/lib/broker";
import { cn } from "@/lib/utils";

/**
 * WelcomeModal — das eine Fenster, das jemandem sagt, wo er gelandet ist.
 *
 * WARUM ES DAS BRAUCHT
 * Nach der Registrierung stand man im Dashboard und musste sich selbst
 * zusammenreimen, was jetzt zu tun ist. Der Weg dorthin ist bei fast allen
 * derselbe: Partnerseite ansehen -> registrieren -> hier landen. Genau an
 * dieser Stelle geht unter, was als Naechstes passiert.
 *
 * ZWEI FASSUNGEN, WEIL ZWEI LEUTE ANKOMMEN
 * Wer ueber einen PARTNER kam, hat dessen Video gesehen — nicht unseres. Der
 * bekommt hier Cosmos Film, der die Akademie erklaert.
 * Wer ueber UNSERE Seite kam, hat genau diesen Film schon gesehen. Ihm
 * denselben nochmal vorzusetzen waere die Sorte Wiederholung, die einem sagt,
 * dass niemand mitgedacht hat. Er bekommt stattdessen die drei Schritte.
 *
 * EINMAL, UND ZWAR WIRKLICH EINMAL
 * Der Merker liegt in members.onboarding_seen_at, nicht im Browser. Wer sich
 * am Laptop registriert und danach das Handy nimmt, hat es weggeklickt und
 * fertig. Alle anderen Onboarding-Merker liegen bewusst in localStorage —
 * eine Feier darf man zweimal sehen, eine Erklaerung nicht.
 *
 * ES WARTET AUF DIE DATEN
 * Erst wenn `loaded` steht, wird ueberhaupt etwas entschieden. Sonst blitzt
 * die falsche Fassung auf und tauscht sich vor den Augen des Nutzers aus.
 */

const COSMO_HEAD = "/cosmo/cosmo-head.png";

export function WelcomeModal() {
  const state = useMemberState();
  const brand = usePartnerBrand();
  const accent = brand?.accentColor ?? COSMO.accentColor;

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [watched, setWatched] = useState(false);

  // Wer ueber uns selbst kam (oder ohne Herkunft), hat den Film schon gesehen.
  const cameViaPartner = Boolean(state.referredBy) && state.referredBy !== "cosmos-candles";

  useEffect(() => {
    if (!state.loaded || !state.memberId) return;
    if (state.onboardingSeenAt) return;
    // Kurz warten, damit das Fenster nicht in denselben Frame faellt, in dem
    // das Dashboard erscheint — das liest sich als Ruckeln, nicht als Ankunft.
    const t = setTimeout(() => setOpen(true), 450);
    return () => clearTimeout(t);
  }, [state.loaded, state.memberId, state.onboardingSeenAt]);

  async function dismiss() {
    setClosing(true);
    setOpen(false);
    // Fehler hier duerfen den Nutzer nicht aufhalten: schlimmstenfalls sieht
    // er das Fenster beim naechsten Mal noch einmal.
    try {
      await (supabase as unknown as {
        from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (k: string, val: string) => Promise<unknown> } };
      }).from("members").update({ onboarding_seen_at: new Date().toISOString() }).eq("id", state.memberId);
    } catch { /* egal */ }
  }

  if (!open || closing) return null;

  const telegramUrl =
    brand?.telegramChannel && brand.telegramChannel !== "#" ? brand.telegramChannel : TELEGRAM_ENTRY.url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Cosmos Candles"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <style>{`
        @keyframes wmIn { from { opacity:0; transform: translateY(18px) scale(.985); } to { opacity:1; transform:none; } }
        .wm-card { animation: wmIn .34s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .wm-card { animation: none; } }
      `}</style>

      <div className="wm-card relative w-full max-w-xl overflow-hidden rounded-t-3xl border border-white/10 bg-[oklch(0.15_0.04_258)] shadow-2xl sm:rounded-3xl">
        {/* Farbiger Saum — das einzige Stueck Marke, das ohne Bilder ankommt */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
          <div className="flex items-center gap-3">
            <span
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full"
              style={{
                border: `2px solid color-mix(in oklch, ${accent} 70%, white)`,
                boxShadow: `0 0 22px -4px ${accent}`,
              }}
            >
              <img src={COSMO_HEAD} alt="" className="h-full w-full object-cover" style={{ objectPosition: "50% 28%", transform: "scale(1.15)" }} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                You're in
              </div>
              <h2 className="font-display text-xl font-black leading-tight sm:text-2xl">
                Welcome to Cosmos Candles
              </h2>
            </div>
          </div>

          {cameViaPartner ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {brand?.name ? `${brand.name} brought you here.` : "You're in the academy now."}{" "}
                Cosmo explains the whole thing in about a minute — what you get, and the one step
                that opens it.
              </p>
              {/* DER FILM LIEGT IM FENSTER, nicht hinter einem Link.
                  Ein Knopf "schau dir das Video an", der irgendwohin fuehrt, wo
                  man es dann suchen muss, ist genau die Reibung, wegen der
                  Leute hier abspringen. /pitch.mp4 ist derselbe Film wie auf
                  der Landingpage — er erklaert die Akademie, und ein
                  Partner-Besucher hat ihn noch nie gesehen. */}
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/pitch-poster.jpg?v=4"
                  className="aspect-video h-full w-full object-contain"
                  onPlay={() => setWatched(true)}
                  onEnded={() => setWatched(true)}
                >
                  <source src="/pitch.mp4?v=2" type="video/mp4" />
                </video>
              </div>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismiss}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black text-black transition-transform hover:scale-[1.01]"
                style={{ background: accent }}
              >
                {watched ? "Next: join on Telegram" : "Skip ahead — join on Telegram"} <ArrowRight className="h-4 w-4" />
              </a>
              <button
                onClick={dismiss}
                className="mt-2 w-full rounded-full px-5 py-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                I'll look around first
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                You've seen the video — here's what happens now, in three steps.
              </p>

              <ol className="mt-4 flex flex-col gap-2.5">
                {[
                  { icon: Send, title: "Join the Telegram channel", body: "Every call the desk makes lands there, with entry, stop and targets." },
                  { icon: BookOpen, title: "Start at lesson one", body: "The course begins at zero. No chart experience needed." },
                  { icon: Calculator, title: "Set your risk before you trade", body: "The position-size calculator is under Tools." },
                ].map((s, i) => (
                  <li key={s.title} className="flex gap-3 rounded-xl border border-white/8 bg-black/20 px-3.5 py-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                      style={{ background: `color-mix(in oklch, ${accent} 18%, transparent)`, color: accent }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[13px] font-bold">
                        <s.icon className="h-3.5 w-3.5" style={{ color: accent }} /> {s.title}
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismiss}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black text-black transition-transform hover:scale-[1.01]"
                style={{ background: accent }}
              >
                Start on Telegram <ArrowRight className="h-4 w-4" />
              </a>
              <button
                onClick={dismiss}
                className="mt-2 w-full rounded-full px-5 py-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Got it
              </button>
            </>
          )}

          {/* Die Risikozeile steht auch hier. Wer gerade "willkommen" liest,
              soll im selben Atemzug lesen, worauf er sich einlaesst. */}
          <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color: accent }} />
            Free to learn. Trading is risky and most retail accounts lose money — nothing here is
            investment advice.
          </p>
        </div>
      </div>
    </div>
  );
}
