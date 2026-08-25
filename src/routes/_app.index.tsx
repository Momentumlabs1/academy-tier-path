import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import artWave from "@/assets/art-wave.jpg";
import { HeroBento } from "@/components/academy/hero/HeroBento";
import { LessonGroup } from "@/components/academy/lessons/LessonGroup";
import { SectionTitle } from "@/components/academy/primitives/SectionTitle";
import { TierStrip } from "@/components/academy/tier/TierStrip";
import { DepositLadder } from "@/components/academy/tier/DepositLadder";
import { ProgressStats } from "@/components/academy/progress/ProgressStats";
import { Card } from "@/components/academy/primitives/Card";
import { MemberAvatar } from "@/components/academy/primitives/MemberAvatar";
import { LockedGate } from "@/components/academy/onboarding/LockedGate";
import { OnboardingJourney } from "@/components/academy/onboarding/OnboardingJourney";
import { PostDepositWelcome } from "@/components/academy/onboarding/PostDepositWelcome";
import { LESSONS } from "@/lib/academy-data";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { useMemberState } from "@/hooks/useMemberState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      // "/" is the indexed homepage: logged-out visitors (and Google) get the
      // public master landing here, so the marketing title has to win. Signed-in
      // members simply see the brand name in the tab.
      { title: "Cosmos Candles Academy — Learn to trade the whole cosmos" },
      {
        name: "description",
        content:
          "Live signals, a course that starts from zero and pro orderflow tools — free with a deposit at our partner broker.",
      },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* Own glyphs for the three shortcuts. The generic message/book/calculator icons
   read as placeholder furniture; these say what they are at a glance. */
function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-2.01 1.95c-.23.23-.42.42-.81.4z" />
    </svg>
  );
}
function BookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 6.5C10.6 5.2 8.7 4.5 6.5 4.5H3.5v13h3c2.2 0 4.1.7 5.5 2" />
      <path d="M12 6.5c1.4-1.3 3.3-2 5.5-2h3v13h-3c-2.2 0-4.1.7-5.5 2" />
      <path d="M12 6.5v13" />
      <path d="M6 8.5h3M6 11.5h3M15 8.5h3M15 11.5h3" opacity=".55" />
    </svg>
  );
}
function GaugeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3.6 16.5a9 9 0 1 1 16.8 0" />
      <path d="M12 16.5l4-4.6" />
      <circle cx="12" cy="16.6" r="1.5" fill="currentColor" stroke="none" />
      <path d="M5.2 12.2l1.3.5M12 5.1v1.4M18.8 12.2l-1.3.5" opacity=".55" />
    </svg>
  );
}

const QUICK_ACTIONS = [
  { label: "Open Telegram", sub: "Live signals", icon: TelegramGlyph, to: "/signals", accent: "oklch(0.72 0.15 235)" },
  // deliberately not green: green now reads as "market up", not "a category"
  { label: "Next lesson", sub: "Continue learning", icon: BookGlyph, to: "/lessons", accent: "oklch(0.72 0.16 285)" },
  { label: "Trader tools", sub: "Size & risk calculators", icon: GaugeGlyph, to: "/tools", accent: "oklch(0.82 0.16 80)" },
] as const;

function Dashboard() {
  const state = useMemberState();
  // Before the first deposit, everything gated should "breathe" — a gentle pull
  // toward the deposit that unlocks it. Once funded, the glow/veil fall away.
  const { isCompleted } = useCompletedLessons();
  const notFunded = state.loaded && state.accessDeposit <= 0;
  const tierRank = state.currentTier
    ? ["foundation", "operator", "elite"].indexOf(state.currentTier.key)
    : -1;

  // EINE Liste, nicht zwei.
  //
  // Vorher standen hier zwei Abschnitte: "Continue learning / Foundation" und
  // "Your tier unlocks / Available to you". Seit LESSONS auf Lektionen MIT
  // Aufnahme gefiltert ist (5 statt 12) enthalten beide fuer ein
  // Foundation-Mitglied exakt dieselben zwei Karten — zweimal untereinander,
  // unter zwei Ueberschriften. Und wegen slice(0,4) tauchte l11, die einzige
  // Elite-Lektion, im Abschnitt "Your tier unlocks" nie auf: die Ueberschrift
  // zeigte das Gegenteil dessen, was sie versprach.
  //
  // Erledigte werden nach UNTEN sortiert, nicht herausgefiltert — bei fuenf
  // Lektionen ist "alles gesehen" erreichbar, und eine leere Karte waere die
  // schlechtere Antwort. Gesperrte bleiben sichtbar: LessonRow zeigt Schloss
  // und Preis selbst, und genau das ist vor der Einzahlung der Zug nach vorn.
  const rankOf = (t: string) => ["foundation", "operator", "elite"].indexOf(t);
  const dashboardLessons = [...LESSONS].sort((a, b) => {
    const done = Number(isCompleted(a.id)) - Number(isCompleted(b.id));
    if (done !== 0) return done;
    const mine = (l: typeof a) => (rankOf(l.tier) <= tierRank ? 0 : 1);
    return mine(a) - mine(b) || rankOf(a.tier) - rankOf(b.tier);
  });

  return (
    <div className="space-y-6">
      {/* Cosmo's gentle idle float — respects reduced-motion. */}
      <style>{`
        @keyframes cosmo-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .cosmo-float { animation: cosmo-float 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cosmo-float { animation: none; } }
      `}</style>

      {/* Guided first session: integrated welcome video → deposit ignite strip
          (with live deposit watcher) → celebration + unlock tour. */}
      <OnboardingJourney />

      {/* After the first deposit: the two Cosmo welcome videos light up here. */}
      <PostDepositWelcome />

      {/* Greeting + action launcher — orientation only; tier/deposit/progress live in the Deposit Path card below */}
      <Card variant="hero" className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        {/* Signature particle artwork on the right so the greeting isn't a bare
            slab; a left-to-right scrim keeps the copy fully readable. */}
        <img
          src={artWave}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[58%] object-cover object-right opacity-70 sm:block"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(90deg, var(--surface-2) 32%, color-mix(in oklch, var(--surface-2) 55%, transparent) 62%, transparent)" }}
          aria-hidden
        />
        {/* Ambient glow blob */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-8 h-40 w-40 rounded-full bg-[oklch(0.62_0.16_232)]/15 blur-3xl" />

        <div className="relative flex items-start gap-4 sm:gap-5">
          {/* The member's own avatar — their identity, not the mascot. */}
          <MemberAvatar
            name={state.profile.name}
            email={state.profile.email}
            src={state.profile.avatarUrl}
            size={64}
          />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {greeting()},
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              {(state.profile.name || state.profile.email).split(/[ @]/)[0] || "Trader"}
              <span className="ml-1.5 inline-block" aria-hidden>👋</span>
            </h1>

            {/* Cosmo speaks as your guide — clearly labelled, never your face. */}
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 sm:max-w-[46ch]">
              <div className="relative shrink-0">
                <div className="pointer-events-none absolute inset-0 -m-1 rounded-full blur-lg" style={{ background: "radial-gradient(circle, color-mix(in oklch, #75B9F5 60%, transparent), transparent 70%)" }} aria-hidden />
                <img src="/cosmo/cosmo-head.png" alt="Cosmo" className="cosmo-float relative h-9 w-9 rounded-full object-contain ring-1 ring-primary/40" />
              </div>
              <p className="text-sm leading-snug text-foreground/75">
                <span className="font-semibold text-primary">Cosmo</span> has your next moves ready — jump back into your lessons, signals & tools below.
              </p>
            </div>
          </div>
        </div>

        {/* Quick-action launcher */}
        <div className="relative">
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-white/[0.06] bg-[color:var(--surface-2)]/60 px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-[color:var(--surface-2)] hover:shadow-[var(--shadow-card)]"
                >
                  <span
                    className="pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
                    style={{ background: a.accent }}
                    aria-hidden
                  />
                  <span className="relative shrink-0">
                    <span
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-50 blur-md"
                      style={{ background: a.accent }}
                      aria-hidden
                    />
                    <span
                      className="relative flex h-11 w-11 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `linear-gradient(140deg, color-mix(in oklch, ${a.accent} 30%, transparent), color-mix(in oklch, ${a.accent} 8%, transparent))`,
                        color: a.accent,
                        ["--tw-ring-color" as string]: `color-mix(in oklch, ${a.accent} 30%, transparent)`,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">{a.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{a.sub}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── ZWEI DASHBOARDS IN EINEM ────────────────────────────────────────
          Vor der Einzahlung und danach sind das zwei verschiedene Fragen, und
          deshalb zwei verschiedene Reihenfolgen.

          VORHER ist die einzige Frage "was bekomme ich fuer 100 EUR?". Die
          Leiter beantwortet sie und steht deshalb ganz oben, gross und
          leuchtend; die Produktkacheln stehen darunter, sichtbar aber gesperrt
          — sie sind das Versprechen, nicht das Werkzeug.

          NACHHER ist die Frage beantwortet, und ein bildschirmfuellender
          Fortschrittsbalken ueber etwas Erledigtem draengt genau das weg,
          was jetzt zaehlt. Also drehen sich die beiden um: die Kacheln
          ruecken nach oben und sind das Erste nach der Begruessung, der
          Stufenstand schrumpft auf eine Zeile und wandert nach unten. */}
      {notFunded ? (
        <>
          <div className="rounded-[var(--radius)] animate-glow">
            <DepositLadder />
          </div>
          <ProgressStats />
          <LockedGate locked label="Unlock live signals & mentors with your first deposit">
            <HeroBento />
          </LockedGate>
        </>
      ) : (
        <>
          <HeroBento />
          <ProgressStats />
          <TierStrip />
        </>
      )}

      <section>
        <SectionTitle
          action={
            <Link to="/lessons" className="text-sm font-medium text-primary hover:underline">
              All lessons →
            </Link>
          }
        >
          Continue learning
        </SectionTitle>
        <LessonGroup title="" lessons={dashboardLessons} />
      </section>
    </div>
  );
}
