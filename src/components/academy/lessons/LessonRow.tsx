import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/format";
import { PillValue } from "../primitives/PillValue";
import { TierTag } from "../primitives/TierTag";
import { TIERS, lessonThumb, type Lesson } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function difficulty(tier: Lesson["tier"]): number {
  return TIERS.findIndex((t) => t.key === tier) + 1;
}

export function LessonRow({ lesson }: { lesson: Lesson }) {
  const { currentTier: memberTier, loaded } = useMemberState();
  const memberRank = memberTier ? TIERS.findIndex((t) => t.key === memberTier.key) : -1;
  // SOLANGE NICHTS GELADEN IST, IST NICHTS GESPERRT.
  //
  // currentTier ist undefined, bis der Mitglieds-Abruf zurueckkommt — damit war
  // memberRank -1 und JEDE Lektion galt kurz als gesperrt: Schloss, verwaschenes
  // Vorschaubild, "Unlocks at Foundation". Ein zahlendes Mitglied sah bei jedem
  // Seitenaufruf zuerst, dass es nichts darf. Das Dashboard prueft `loaded`
  // laengst mit; die Lektionsliste war die einzige Stelle, die es vergass.
  const locked = loaded && TIERS.findIndex((t) => t.key === lesson.tier) > memberRank;
  const { isCompleted, toggle } = useCompletedLessons();
  const completed = isCompleted(lesson.id);
  const lessonTier = TIERS.find((t) => t.key === lesson.tier);
  const xp = lesson.durationMin * 10;

  const tierName = TIERS.find((t) => t.key === lesson.tier)?.name ?? lesson.tier;

  const inner = (
    <>
      {/* Video thumbnail */}
      <div className="relative hidden h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-black sm:block">
        <img
          src={lessonThumb(lesson, "mq")}
          alt=""
          loading="lazy"
          className={cn("h-full w-full object-cover transition-transform duration-300 group-hover:scale-105", locked && "opacity-40 blur-[1px]")}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {locked ? (
            <Lock className="h-4 w-4 text-white/70" />
          ) : completed ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 text-primary-foreground"><CheckCircle2 className="h-4 w-4" /></span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform group-hover:scale-110"><PlayCircle className="h-4 w-4" /></span>
          )}
        </div>
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[9px] font-semibold text-white">{lesson.durationMin}m</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <TierTag tier={lesson.tier} />
          {completed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Done
            </span>
          ) : locked ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              {/* Die Sperre nennt den Preis. "Unlocks at Operator" sagt jemandem,
                  der die Stufen nicht auswendig kann, ueberhaupt nichts — der
                  Betrag ist die Information, nach der er sucht. */}
              <Lock className="h-3.5 w-3.5" /> Unlocks at {tierName} · {formatMoney(lessonTier?.minDeposit ?? 0, "€")}
            </span>
          ) : null}
        </div>
        <div className={cn("mt-1 truncate font-display text-base font-bold", completed && "text-foreground/70")}>
          {lesson.title}
        </div>
        <div className="mt-0.5 hidden truncate text-xs text-muted-foreground md:block">{lesson.description}</div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <PillValue label="LVL" value={difficulty(lesson.tier)} />
        <span className="hidden sm:block"><PillValue label="XP" value={xp} /></span>
        {locked ? (
          <span className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/5 px-3.5 text-xs font-semibold text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Unlock</span>
          </span>
        ) : (
          <>
            <span className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform group-hover:scale-105">
              <PlayCircle className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{completed ? "Rewatch" : "Watch"}</span>
            </span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(lesson.id); }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                completed
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
              )}
              title={completed ? "Mark as incomplete" : "Mark as complete"}
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </>
  );

  // Every row is clickable — locked rows open the detail page, which explains the unlock.
  const baseClass = cn(
    "group flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--surface-2)]/60 px-3 py-3 lg:px-4 transition-all duration-300 hover:bg-[color:var(--surface-2)] hover:shadow-[var(--shadow-card)]",
    locked && "opacity-70 hover:opacity-100",
  );

  return (
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className={baseClass}>
      {inner}
    </Link>
  );
}
