import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, PlayCircle, CheckCircle2 } from "lucide-react";
import { LESSONS, CURRENT_MEMBER, TIERS, tierForDeposit } from "@/lib/academy-data";
import { TierTag } from "@/components/academy/primitives/TierTag";
import { Card } from "@/components/academy/primitives/Card";
import { LessonCardCompact } from "@/components/academy/lessons/LessonCardCompact";
import heroFloor from "@/assets/hero-floor.jpg";

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
      <Link to="/lessons" className="mt-4 inline-block text-primary hover:underline">
        Back to lessons
      </Link>
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
  const recommendations = LESSONS.filter((l) => l.id !== lesson.id && l.category === lesson.category).slice(0, 3);

  return (
    <div className="space-y-6">
      <Link to="/lessons" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> All lessons
      </Link>

      <Card variant="hero" className="relative aspect-video overflow-hidden">
        <img src={heroFloor} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-6 lg:p-10">
          <div className="flex items-center gap-2">
            <TierTag tier={lesson.tier} />
            <span className="inline-flex items-center gap-1 text-xs text-foreground/80">
              <Clock className="h-3 w-3" /> {lesson.durationMin} min
            </span>
            <span className="text-xs uppercase tracking-[0.16em] text-foreground/80">{lesson.category}</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight lg:text-5xl">{lesson.title}</h1>
            <p className="mt-3 max-w-2xl text-foreground/80">{lesson.description}</p>
            <div className="mt-5">
              {locked ? (
                <Link to="/tier" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold">
                  Unlock with {lesson.tier} tier
                </Link>
              ) : (
                <button className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)]">
                  <PlayCircle className="h-4 w-4" /> Play lesson
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card variant="surface" className="p-6">
        <h2 className="font-display text-lg font-bold">What you'll learn</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Key takeaway #{i} — concrete, actionable, tied to live charts.</span>
            </li>
          ))}
        </ul>
      </Card>

      {recommendations.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Recommended next</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((l) => (
              <LessonCardCompact key={l.id} lesson={l} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
