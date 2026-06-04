import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LESSONS, TIERS } from "@/lib/academy-data";
import { LessonCard } from "@/components/academy/LessonCard";

export const Route = createFileRoute("/_app/lessons")({
  head: () => ({
    meta: [
      { title: "Lessons — Agent Trading Academy" },
      { name: "description", content: "Browse the full lesson catalog." },
    ],
  }),
  component: LessonsPage,
});

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Lessons</h1>
        <p className="mt-1 text-muted-foreground">
          {LESSONS.length} lessons across {TIERS.length} tiers. Locked lessons unlock as your deposit grows.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lessons…"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={tier === "all"} onClick={() => setTier("all")}>
            All
          </FilterChip>
          {TIERS.map((t) => (
            <FilterChip key={t.key} active={tier === t.key} onClick={() => setTier(t.key)}>
              {t.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => (
          <LessonCard key={l.id} lesson={l} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No lessons match your filters.
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "h-9 rounded-full border px-3 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}