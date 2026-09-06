/**
 * LevelRail — der Weg zum Signal als kleines Spiel: drei Level, eine Leiste.
 *
 * WARUM (Diego, 06.09.)
 * "Den gesamten Website-Flow so anpassen, dass es ein kleines Spiel fuer die
 * Leute ist." Die Leiste erzaehlt an JEDER Station dasselbe Bild — auf der
 * Partnerseite (Level 1 steht an), auf /preview (Level 1 geschafft, Level 2
 * steht an) — damit der Besucher immer weiss, wo er ist, was der naechste Tap
 * bringt und was er damit freischaltet. Belohnungen statt Pflichten: jedes
 * Level "unlocks" etwas.
 *
 * Die drei Level sind der echte Ablauf (Funnel ohne Registrierung, 05.09.):
 *   1 Akademie ansehen (/preview, gesperrtes Dashboard)
 *   2 Telegram verbinden (persoenliche Einladung)
 *   3 Konto beim Partner-Broker finanzieren (ab 100 $) -> Signale + Akademie
 * Nichts davon ist erfunden; die Texte nennen keine Gewinne (FACTS-Regel).
 */
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const LEVELS = [
  { title: "See your academy", reward: "Unlocks the preview", time: "1 tap" },
  { title: "Connect Telegram", reward: "Unlocks your invite", time: "2 min" },
  { title: "Fund your account", reward: "Unlocks live signals + academy", time: "from $100" },
] as const;

export function LevelRail({
  current, primary, onPrimary = "#000", tone = "dark", compact = false, className,
}: {
  /** Das Level, das jetzt ansteht (1–3). Alles davor gilt als geschafft. */
  current: 1 | 2 | 3;
  primary: string;
  onPrimary?: string;
  tone?: "dark" | "light";
  /** Kompakte Zeile fuer Seitenkoepfe (/preview). */
  compact?: boolean;
  className?: string;
}) {
  const hell = tone === "light";
  const ink = hell ? "#141210" : "#fff";
  const faint = hell ? "rgba(20,18,16,.42)" : "rgba(255,255,255,.4)";
  const line = hell ? "rgba(20,18,16,.14)" : "rgba(255,255,255,.12)";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)} aria-label={`Level ${current} of 3`}>
        {LEVELS.map((l, i) => {
          const n = i + 1;
          const done = n < current;
          const now = n === current;
          return (
            <div key={l.title} className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black tabular-nums"
                style={
                  done ? { background: primary, color: onPrimary }
                  : now ? { boxShadow: `inset 0 0 0 2px ${primary}`, color: ink }
                  : { boxShadow: `inset 0 0 0 1.5px ${line}`, color: faint }
                }
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
              </span>
              {now && <span className="text-[12px] font-semibold" style={{ color: ink }}>{l.title}</span>}
              {i < LEVELS.length - 1 && <span className="h-px w-5" style={{ background: done ? primary : line }} />}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ol className={cn("relative", className)}>
      {LEVELS.map((l, i) => {
        const n = i + 1;
        const done = n < current;
        const now = n === current;
        const locked = n > current;
        const last = i === LEVELS.length - 1;
        return (
          <li key={l.title} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span aria-hidden className="absolute left-[19px] top-10 bottom-0 w-px" style={{ background: done ? primary : line }} />
            )}
            <span
              className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[14px] font-black tabular-nums"
              style={
                done ? { background: primary, color: onPrimary }
                : now ? { background: primary, color: onPrimary, boxShadow: `0 0 0 6px color-mix(in oklch, ${primary} 22%, transparent), 0 14px 30px -14px ${primary}` }
                : { boxShadow: `inset 0 0 0 1.5px ${line}`, color: faint }
              }
            >
              {done ? <Check className="h-5 w-5" strokeWidth={3} /> : locked ? <Lock className="h-4 w-4" /> : n}
            </span>
            <div className={cn("min-w-0 flex-1 pt-1", locked && "opacity-60")}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: now || done ? primary : faint }}>
                  Level {n}
                </span>
                <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: faint }}>{l.time}</span>
                {now && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em]" style={{ background: `color-mix(in oklch, ${primary} 18%, transparent)`, color: hell ? "#141210" : primary }}>
                    you are here
                  </span>
                )}
              </div>
              <div className="mt-1 font-display text-[1.25rem] font-black leading-tight sm:text-[1.4rem]" style={{ color: ink }}>{l.title}</div>
              <div className="mt-1 text-[13.5px]" style={{ color: hell ? "rgba(20,18,16,.6)" : "rgba(255,255,255,.6)" }}>
                <span style={{ color: now || done ? (hell ? "#141210" : primary) : undefined }}>↳</span> {l.reward}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
