import { Link } from "@tanstack/react-router";
import { PillValue } from "../primitives/PillValue";
import { TierTag } from "../primitives/TierTag";
import { CURRENT_MEMBER, TIERS, tierForDeposit, type Lesson } from "@/lib/academy-data";
import { Lock, PlayCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function difficulty(tier: Lesson["tier"]): number {
  return TIERS.findIndex((t) => t.key === tier) + 1;
}

export function LessonRow({ lesson }: { lesson: Lesson }) {
  const memberTier = tierForDeposit(CURRENT_MEMBER.deposit);
  const memberRank = memberTier ? TIERS.findIndex((t) => t.key === memberTier.key) : -1;
  const locked = TIERS.findIndex((t) => t.key === lesson.tier) > memberRank;
  const xp = lesson.durationMin * 10;

  const inner = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="hidden sm:block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {lesson.category}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TierTag tier={lesson.tier} />
            {lesson.completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            ) : locked ? (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <div className="mt-1 truncate font-display text-base font-bold">{lesson.title}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PillValue label="LVL" value={difficulty(lesson.tier)} />
        <PillValue label="MIN" value={lesson.durationMin} active={!locked && !lesson.completed} />
        <PillValue label="XP" value={xp} />
      </div>
    </>
  );

  const baseClass = cn(
    "group flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--surface-2)]/60 px-4 py-3 lg:px-5 lg:py-4 transition-all duration-300",
    !locked && "hover:bg-[color:var(--surface-2)] hover:translate-x-1 hover:shadow-[var(--shadow-card)]",
    locked && "opacity-60",
  );

  if (locked) return <div className={baseClass}>{inner}</div>;
  return (
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className={baseClass}>
      {inner}
    </Link>
  );
}
