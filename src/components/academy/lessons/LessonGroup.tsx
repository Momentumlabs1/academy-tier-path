import { Card } from "../primitives/Card";
import { LessonRow } from "./LessonRow";
import type { Lesson } from "@/lib/academy-data";

export function LessonGroup({
  title,
  lessons,
}: {
  title: string;
  lessons: Lesson[];
}) {
  return (
    <Card variant="inner" className="p-5 lg:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-xl font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground">{lessons.length} lessons</span>
      </div>
      <div className="space-y-3">
        {lessons.map((l) => (
          <LessonRow key={l.id} lesson={l} />
        ))}
      </div>
    </Card>
  );
}