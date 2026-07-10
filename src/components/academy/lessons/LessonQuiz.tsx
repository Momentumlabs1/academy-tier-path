import { useState } from "react";
import { Brain, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Card } from "@/components/academy/primitives/Card";
import { QUIZZES, QUIZ_PASS_XP } from "@/lib/quiz-data";
import { useQuizProgress, isPassed } from "@/hooks/useQuizProgress";
import { cn } from "@/lib/utils";

type Phase = "idle" | "playing" | "done";

export function LessonQuiz({ lessonId }: { lessonId: string }) {
  const questions = QUIZZES[lessonId];
  const { getResult, saveResult } = useQuizProgress();

  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  if (!questions?.length) return null;

  const best = getResult(lessonId);
  const passed = isPassed(best);
  const question = questions[index];

  function start() {
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setPhase("playing");
  }

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === question.correct) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setPicked(null);
    } else {
      const finalCorrect = correctCount;
      saveResult(lessonId, finalCorrect, questions.length);
      setPhase("done");
    }
  }

  return (
    <Card variant="surface" className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Brain className="h-5 w-5 text-primary" /> Knowledge check
        </h2>
        {passed && phase !== "playing" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Passed · +{QUIZ_PASS_XP} XP
          </span>
        )}
      </div>

      {phase === "idle" && (
        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {questions.length} quick questions · pass with {Math.ceil((questions.length * 2) / 3)}+ correct · earn +{QUIZ_PASS_XP} bonus XP
            {best && <span className="block text-xs">Best attempt: {best.correct}/{best.total}</span>}
          </p>
          <button
            onClick={start}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.02]"
          >
            {best ? "Retake quiz" : "Start quiz"}
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="mt-4">
          {/* progress dots */}
          <div className="mb-4 flex items-center gap-1.5">
            {questions.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i < index ? "w-6 bg-primary" : i === index ? "w-6 bg-primary/50" : "w-3 bg-white/10",
                )}
              />
            ))}
            <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
              {index + 1} / {questions.length}
            </span>
          </div>

          <div className="font-display text-base font-bold sm:text-lg">{question.q}</div>

          <div className="mt-3 grid gap-2">
            {question.options.map((opt, i) => {
              const isCorrect = i === question.correct;
              const isPicked = i === picked;
              const revealed = picked !== null;
              return (
                <button
                  key={opt}
                  onClick={() => pick(i)}
                  disabled={revealed}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all",
                    !revealed && "border-white/10 bg-white/5 hover:border-primary/40 hover:bg-white/10 cursor-pointer",
                    revealed && isCorrect && "border-primary/60 bg-primary/15 text-primary",
                    revealed && isPicked && !isCorrect && "border-red-400/50 bg-red-400/10 text-red-300",
                    revealed && !isPicked && !isCorrect && "border-white/5 bg-white/[0.03] opacity-50",
                  )}
                >
                  <span>{opt}</span>
                  {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  {revealed && isPicked && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-md">{question.explain}</p>
              <button
                onClick={next}
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {index + 1 < questions.length ? "Next question" : "See result"}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display text-2xl font-bold">
              {correctCount} / {questions.length}
              <span className={cn("ml-2 text-sm font-semibold", correctCount / questions.length >= 2 / 3 ? "text-primary" : "text-amber-400")}>
                {correctCount / questions.length >= 2 / 3 ? `Passed · +${QUIZ_PASS_XP} XP` : "Not passed yet — rewatch & retry"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Your best attempt is saved.</p>
          </div>
          <button
            onClick={start}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}
    </Card>
  );
}
