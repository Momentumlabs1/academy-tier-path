import { useCallback, useState } from "react";
import { QUIZZES, QUIZ_PASS_XP } from "@/lib/quiz-data";

const STORAGE_KEY = "academy_quiz_results";

export interface QuizResult {
  correct: number;
  total: number;
}

function load(): Record<string, QuizResult> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function isPassed(r: QuizResult | undefined): boolean {
  return !!r && r.total > 0 && r.correct / r.total >= 2 / 3;
}

export function useQuizProgress() {
  const [results, setResults] = useState<Record<string, QuizResult>>(load);

  const saveResult = useCallback((lessonId: string, correct: number, total: number) => {
    setResults((prev) => {
      const existing = prev[lessonId];
      // Keep the best attempt.
      const best = existing && existing.correct >= correct ? existing : { correct, total };
      const next = { ...prev, [lessonId]: best };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* private mode */ }
      return next;
    });
  }, []);

  const passedCount = Object.values(results).filter(isPassed).length;

  return {
    results,
    saveResult,
    getResult: (lessonId: string) => results[lessonId],
    passedCount,
    totalQuizzes: Object.keys(QUIZZES).length,
    quizXp: passedCount * QUIZ_PASS_XP,
  };
}
