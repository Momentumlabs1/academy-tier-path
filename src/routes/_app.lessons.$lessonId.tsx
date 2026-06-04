import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, PlayCircle, CheckCircle2 } from "lucide-react";
import { LESSONS, CURRENT_MEMBER, TIERS, tierForDeposit } from "@/lib/academy-data";
import { TierBadge } from "@/components/academy/TierBadge";

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
    <div className="mx-auto max-w-2xl py-20 text-center">
      <h1 className="text-2xl font-bold">Lesson not found</h1>
      <Link to="/lessons" className="mt-4 inline-block text-primary hover:underline">
        Back to lessons
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl py-20 text-center text-sm text-destructive">{error.message}</div>
  ),
  component: LessonDetail,
});

function LessonDetail() {
  const { lesson } = Route.useLoaderData();
  const memberTier = tierForDeposit(CURRENT_MEMBER.deposit);
  const locked =
    TIERS.findIndex((t) => t.key === lesson.tier) > TIERS.findIndex((t) => t.key === memberTier.key);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All lessons
      </Link>

      <div className="flex items-center gap-3">
        <TierBadge tier={lesson.tier} />
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {lesson.durationMin} min
        </span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{lesson.category}</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{lesson.title}</h1>
      <p className="text-lg text-muted-foreground">{lesson.description}</p>

      <div
        className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-border"
        style={{ background: "var(--gradient-card)" }}
      >
        {locked ? (
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Locked at your current tier</div>
            <Link
              to="/tier"
              className="mt-3 inline-block rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
            >
              How to unlock
            </Link>
          </div>
        ) : (
          <button className="group flex items-center gap-2 rounded-full bg-primary/15 px-5 py-3 text-primary transition-transform hover:scale-105">
            <PlayCircle className="h-6 w-6" />
            <span className="font-medium">Play lesson</span>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">What you'll learn</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--success)]" />
              <span>Key takeaway #{i} for this lesson — concise, actionable, and tied to live charts.</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}