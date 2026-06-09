import { Link } from "@tanstack/react-router";
import { TierTag } from "../primitives/TierTag";
import { Card } from "../primitives/Card";
import { Clock } from "lucide-react";
import type { Lesson } from "@/lib/academy-data";

export function LessonCardCompact({ lesson }: { lesson: Lesson }) {
  return (
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className="block">
      <Card variant="surface" className="p-4 transition-colors hover:bg-[color:var(--surface-3)]/40 micro-press">
        <div className="flex items-center justify-between">
          <TierTag tier={lesson.tier} />
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lesson.durationMin}m
          </span>
        </div>
        <div className="mt-3 font-display text-base font-bold leading-tight">{lesson.title}</div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lesson.description}</p>
      </Card>
    </Link>
  );
}