import { Link } from "@tanstack/react-router";
import { Clock, Lock, CheckCircle2, PlayCircle } from "lucide-react";
import { type Lesson, tierForDeposit, CURRENT_MEMBER, TIERS } from "@/lib/academy-data";
import { TierBadge } from "./TierBadge";
import { cn } from "@/lib/utils";

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const memberTier = tierForDeposit(CURRENT_MEMBER.deposit);
  const memberRank = TIERS.findIndex((t) => t.key === memberTier.key);
  const lessonRank = TIERS.findIndex((t) => t.key === lesson.tier);
  const locked = lessonRank > memberRank;

  const content = (
    <>
      <div className="flex items-center justify-between">
        <TierBadge tier={lesson.tier} />
        {lesson.completed ? (
          <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />
        ) : locked ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <PlayCircle className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{lesson.category}</div>
        <h3 className="mt-1 text-base font-semibold leading-tight">{lesson.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{lesson.description}</p>
      </div>
      <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {lesson.durationMin} min
      </div>
    </>
  );

  const className = cn(
    "group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all",
    locked ? "cursor-not-allowed opacity-60" : "hover:border-primary/50 hover:shadow-[var(--shadow-glow)]",
  );

  if (locked) {
    return <div className={className}>{content}</div>;
  }
  return (
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className={className}>
      {content}
    </Link>
  );
}