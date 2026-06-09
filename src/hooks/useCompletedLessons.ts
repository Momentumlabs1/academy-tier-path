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
  // Seed with lessons that have completed: true in the static data on first load
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    const stored = readStorage();
    if (stored.size > 0) return stored;
    // default seeds from static data
    const defaults = new Set(LESSONS.filter((l) => l.completed).map((l) => l.id));
    writeStorage(defaults);
    return defaults;
  });

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
    completionPct: Math.round((completedIds.size / LESSONS.length) * 100),
    totalXp: LESSONS.reduce((s, l) => s + l.durationMin * 10, 0),
    earnedXp: LESSONS.filter((l) => completedIds.has(l.id)).reduce((s, l) => s + l.durationMin * 10, 0),
  };

  return { completedIds, toggle, isCompleted, stats };
}
