import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlayCircle, Search } from "lucide-react";
import { CURRENT_MEMBER, LESSONS, TIERS, tierForDeposit } from "@/lib/academy-data";
import { LessonGroup } from "@/components/academy/lessons/LessonGroup";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/lessons/")({
  head: () => ({
    meta: [
      { title: "Lessons — Agent Trading Academy" },
      { name: "description", content: "Browse the full lesson catalog." },
    ],
  }),
  component: LessonsPage,
});

function ContinueHero() {
  const { isCompleted, stats } = useCompletedLessons();
  const memberTier = tierForDeposit(CURRENT_MEMBER.deposit);
  const memberRank = memberTier ? TIERS.findIndex((t) => t.key === memberTier.key) : -1;
  const next = LESSONS.find(
    (l) => TIERS.findIndex((t) => t.key === l.tier) <= memberRank && !isCompleted(l.id),
  );
  if (!next) return null;

  return (
    <Link
      to="/lessons/$lessonId"
      params={{ lessonId: next.id }}
      className="group relative block overflow-hidden rounded-[var(--radius)] shadow-[var(--shadow-card)]"
    >
      <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-[#101826] to-black opacity-80 transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
      <div className="relative flex items-center gap-5 p-5 sm:p-7">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-lime)] transition-transform duration-300 group-hover:scale-110">
          <PlayCircle className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Continue learning · {stats.completedCount}/{stats.totalLessons} done
          </div>
          <div className="mt-1 truncate font-display text-xl font-bold sm:text-2xl">{next.title}</div>
          <div className="mt-0.5 truncate text-sm text-foreground/70">{next.description} · {next.durationMin} min · +{next.durationMin * 10} XP</div>
        </div>
      </div>
    </Link>
  );
}

function LessonsPage() {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<string>("all");

  const filtered = useMemo(
    () =>
      LESSONS.filter(
        (l) =>
          (tier === "all" || l.tier === tier) &&
          (q === "" ||
            l.title.toLowerCase().includes(q.toLowerCase()) ||
            l.description.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, tier],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof LESSONS>();
    filtered.forEach((l) => {
      if (!map.has(l.category)) map.set(l.category, []);
      map.get(l.category)!.push(l);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Lessons</h1>
        <p className="mt-1 text-muted-foreground">
          {LESSONS.length} lessons. Locked items unlock as your verified deposit grows.
        </p>
      </div>

      <ContinueHero />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lessons…"
            className="h-11 w-full rounded-full bg-[color:var(--surface-2)] pl-11 pr-4 text-sm outline-none ring-1 ring-white/5 focus:ring-primary/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={tier === "all"} onClick={() => setTier("all")}>All</Chip>
          {TIERS.map((t) => (
            <Chip key={t.key} active={tier === t.key} onClick={() => setTier(t.key)}>
              {t.name}
            </Chip>
          ))}
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
          No lessons match.
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([cat, items]) => (
          <LessonGroup key={cat} title={cat} lessons={items} />
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-4 text-xs font-semibold uppercase tracking-wider transition-colors micro-press",
        active
          ? "bg-primary text-primary-foreground shadow-[var(--shadow-lime)]"
          : "bg-white/5 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
