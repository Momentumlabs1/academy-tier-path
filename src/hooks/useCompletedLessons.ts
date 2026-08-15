import { useState, useCallback } from "react";
import { LESSONS } from "@/lib/academy-data";

const STORAGE_KEY = "academy_completed_lessons";

function readStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeStorage(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export interface LessonProgressStats {
  completedIds: Set<string>;
  totalLessons: number;
  completedCount: number;
  completionPct: number;
  totalXp: number;
  earnedXp: number;
}

export function useCompletedLessons() {
  // NO SEEDING. This used to pre-fill the set from `completed: true` in the
  // static lesson data, which is a leftover from the design mock — so a member
  // who had just signed up, deposited nothing and watched nothing was greeted
  // with "2 of 5 lessons" and a filled progress bar. Fake progress is worse than
  // no progress: it is the first number a new member sees, and it is wrong.
  // Everyone starts at zero and earns the bar.
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => readStorage());

  const toggle = useCallback((lessonId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      writeStorage(next);
      return next;
    });
  }, []);

  const isCompleted = useCallback(
    (lessonId: string) => completedIds.has(lessonId),
    [completedIds],
  );

  const stats: LessonProgressStats = {
    completedIds,
    totalLessons: LESSONS.length,
    completedCount: completedIds.size,
    // Guard the divide: LESSONS is filtered down to lessons that have a
    // recording, so it can legitimately be empty and 0/0 renders as "NaN%".
    completionPct: LESSONS.length ? Math.round((completedIds.size / LESSONS.length) * 100) : 0,
    totalXp: LESSONS.reduce((s, l) => s + l.durationMin * 10, 0),
    earnedXp: LESSONS.filter((l) => completedIds.has(l.id)).reduce((s, l) => s + l.durationMin * 10, 0),
  };

  return { completedIds, toggle, isCompleted, stats };
}
