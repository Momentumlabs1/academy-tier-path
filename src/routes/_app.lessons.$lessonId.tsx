import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, PlayCircle, RotateCcw } from "lucide-react";
import { LESSONS, CURRENT_MEMBER, TIERS, tierForDeposit } from "@/lib/academy-data";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { TierTag } from "@/components/academy/primitives/TierTag";
import { Card } from "@/components/academy/primitives/Card";
import { LessonCardCompact } from "@/components/academy/lessons/LessonCardCompact";
import { LessonVideo } from "@/components/academy/lessons/LessonVideo";

export const Route = createFileRoute("/_app/lessons/$lessonId")({
  loader: ({ params }) => {
    const lesson = LESSONS.find((l) => l.id === params.lessonId);
    if (!lesson) throw notFound();
    return { lesson };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.lesson.title ?? "Lesson"} — Agent Trading Academy` },
      { name: "description", content: loaderData?.lesson.description ?? "Lesson detail." },
    ],
  }),
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Lesson not found</h1>
      <Link to="/lessons" className="mt-4 inline-block text-primary hover:underline">Back to lessons</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="py-20 text-center text-sm text-destructive">{error.message}</div>
  ),
  component: LessonDetail,
});

function LessonDetail() {
  const { lesson } = Route.useLoaderData();
  const memberTier = tierForDeposit(CURRENT_MEMBER.deposit);
  const memberRank = memberTier ? TIERS.findIndex((t) => t.key === memberTier.key) : -1;
  const locked = TIERS.findIndex((t) => t.key === lesson.tier) > memberRank;
  const { isCompleted, toggle, stats } = useCompletedLessons();
  const completed = isCompleted(lesson.id);
  const xp = lesson.durationMin * 10;
  const recommendations = LESSONS.filter((l) => l.id !== lesson.id && l.category === lesson.category).slice(0, 3);
  const tierName = TIERS.find((t) => t.key === lesson.tier)?.name ?? lesson.tier;

  const [playing, setPlaying] = useState(false);

  return (
    <div className="space-y-6">
      <Link to="/lessons" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> All lessons
      </Link>

      {/* Video player */}
      <LessonVideo
        youtubeId={lesson.youtubeId}
        title={lesson.title}
        playing={playing}
        onPlay={() => setPlaying(true)}
        locked={locked}
        lockedTier={tierName}
      />

      {/* Title + meta + actions */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <TierTag tier={lesson.tier} />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {lesson.durationMin} min
          </span>
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{lesson.category}</span>
          <span className="text-xs font-semibold text-primary">+{xp} XP</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{lesson.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{lesson.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {locked ? (
            <Link to="/tier" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.02]">
              Unlock with {tierName} tier
            </Link>
          ) : completed ? (
            <>
              {!playing && (
                <button onClick={() => setPlaying(true)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15 transition-colors">
                  <RotateCcw className="h-4 w-4" /> Rewatch
                </button>
              )}
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-5 py-2.5 text-sm font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" /> Completed · +{xp} XP earned
              </div>
              <button
                onClick={() => toggle(lesson.id)}
                className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark incomplete
              </button>
            </>
          ) : (
            <>
              {!playing && (
                <button onClick={() => setPlaying(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.02]">
                  <PlayCircle className="h-4 w-4" /> Play lesson
                </button>
              )}
              <button
                onClick={() => toggle(lesson.id)}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/15 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark as done
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress nudge */}
      <div className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-2)]/60 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Your progress</span>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.completionPct}%` }} />
          </div>
          <span className="font-semibold text-primary">{stats.completedCount} / {stats.totalLessons}</span>
          <span className="font-mono text-xs text-muted-foreground">{stats.earnedXp} XP</span>
        </div>
      </div>

      {/* What you'll learn — real per-lesson objectives */}
      <Card variant="surface" className="p-6">
        <h2 className="font-display text-lg font-bold">What you'll learn</h2>
        <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {lesson.objectives.map((obj) => (
            <li key={obj} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{obj}</span>
            </li>
          ))}
        </ul>
      </Card>

      {recommendations.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Recommended next</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((l) => <LessonCardCompact key={l.id} lesson={l} />)}
          </div>
        </div>
      )}
    </div>
  );
}
