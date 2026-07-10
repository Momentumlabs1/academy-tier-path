import { Link } from "@tanstack/react-router";
import { PillValue } from "../primitives/PillValue";
import { TierTag } from "../primitives/TierTag";
import { CURRENT_MEMBER, TIERS, tierForDeposit, type Lesson } from "@/lib/academy-data";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { ArrowUpRight, CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function difficulty(tier: Lesson["tier"]): number {
  return TIERS.findIndex((t) => t.key === tier) + 1;
}

export function LessonRow({ lesson }: { lesson: Lesson }) {
  const memberTier = tierForDeposit(CURRENT_MEMBER.deposit);
  const memberRank = memberTier ? TIERS.findIndex((t) => t.key === memberTier.key) : -1;
  const locked = TIERS.findIndex((t) => t.key === lesson.tier) > memberRank;
  const { isCompleted, toggle } = useCompletedLessons();
  const completed = isCompleted(lesson.id);
  const xp = lesson.durationMin * 10;

  const tierName = TIERS.find((t) => t.key === lesson.tier)?.name ?? lesson.tier;

  const inner = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="hidden sm:block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {lesson.category}
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
                <Lock className="h-3.5 w-3.5" /> Unlocks at {tierName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <PlayCircle className="h-3.5 w-3.5" /> Watch
              </span>
            )}
          </div>
          <div className={cn("mt-1 truncate font-display text-base font-bold", completed && "text-foreground/70")}>
            {lesson.title}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PillValue label="LVL" value={difficulty(lesson.tier)} />
        <PillValue label="MIN" value={lesson.durationMin} active={!locked && !completed} />
        <PillValue label="XP" value={xp} />
        {locked ? (
          <span className="ml-1 hidden h-7 items-center rounded-lg bg-white/5 px-2 text-[10px] font-semibold text-muted-foreground sm:flex">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(lesson.id); }}
            className={cn(
              "ml-1 flex h-7 w-7 items-center justify-center rounded-lg transition-all",
              completed
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
            )}
            title={completed ? "Mark as incomplete" : "Mark as complete"}
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );

  // Every row is clickable — locked rows open the detail page, which explains the unlock.
  const baseClass = cn(
    "group flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--surface-2)]/60 px-4 py-3 lg:px-5 lg:py-4 transition-all duration-300 hover:bg-[color:var(--surface-2)] hover:translate-x-1 hover:shadow-[var(--shadow-card)]",
    locked && "opacity-70 hover:opacity-100",
  );

  return (
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className={baseClass}>
      {inner}
    </Link>
  );
}
