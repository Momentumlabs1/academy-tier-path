import { Card } from "../primitives/Card";
import { LessonRow } from "./LessonRow";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import type { Lesson } from "@/lib/academy-data";

export function LessonGroup({
  title,
  lessons,
}: {
  title: string;
  lessons: Lesson[];
}) {
  const { isCompleted } = useCompletedLessons();
  const done = lessons.filter((l) => isCompleted(l.id)).length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  return (
    <Card variant="inner" className="p-5 lg:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-bold">{title}</h3>
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10 sm:w-28">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">{done}/{lessons.length}</span>
        </div>
      </div>
      <div className="space-y-3">
        {lessons.map((l) => (
          <LessonRow key={l.id} lesson={l} />
        ))}
      </div>
    </Card>
  );
}
