import { Link } from "@tanstack/react-router";
import { BookOpen, Flame, Star, Zap } from "lucide-react";
import { Card } from "@/components/academy/primitives/Card";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { LESSONS } from "@/lib/academy-data";
import { useMemberState } from "@/hooks/useMemberState";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

export function ProgressStats({ compact = false }: { compact?: boolean }) {
  const { stats, isCompleted } = useCompletedLessons();
  const state = useMemberState();

  // Next lesson the user hasn't completed yet, that their tier allows
  const tierRank = state.currentTier
    ? ["foundation", "operator", "elite"].indexOf(state.currentTier.key)
    : -1;
  const nextLesson = LESSONS.find((l) => {
    const rank = ["foundation", "operator", "elite"].indexOf(l.tier);
    return rank <= tierRank && !isCompleted(l.id);
  });

  const circumference = 2 * Math.PI * 20; // r=20
  const dashOffset = circumference * (1 - stats.completionPct / 100);

  if (compact) {
    return (
      <div className="flex items-center gap-4 rounded-2xl bg-[color:var(--surface-2)]/60 px-4 py-3">
        <ProgressRing pct={stats.completionPct} size={44} r={16} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lessons</div>
          <div className="font-display text-base font-bold">{stats.completedCount} / {stats.totalLessons}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">XP</div>
          <div className="font-display text-base font-bold text-primary">{formatNumber(stats.earnedXp)}</div>
        </div>
      </div>
    );
  }

  return (
    <Card variant="hero" className="p-5 sm:p-6">
      <div className="flex items-start gap-5">
        <ProgressRing pct={stats.completionPct} size={72} r={28} strokeWidth={4} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Your Progress</div>
          <h3 className="mt-0.5 font-display text-xl font-bold">
            {stats.completedCount} of {stats.totalLessons} lessons
          </h3>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${stats.completionPct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <StatChip icon={Star} label="XP earned" value={formatNumber(stats.earnedXp)} />
            <StatChip icon={Zap} label="XP total" value={formatNumber(stats.totalXp)} tone="muted" />
            <StatChip icon={Flame} label="Completion" value={`${stats.completionPct}%`} tone="primary" />
          </div>
        </div>
      </div>

      {nextLesson && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[color:var(--surface-2)]/60 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Up next</div>
            <div className="truncate text-sm font-semibold">{nextLesson.title}</div>
          </div>
          <Link
            to="/lessons/$lessonId"
            params={{ lessonId: nextLesson.id }}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Start →
          </Link>
        </div>
      )}

      {stats.completionPct === 100 && (
        <div className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary">
          🎉 All lessons complete! You're a trading legend.
        </div>
      )}
    </Card>
  );
}

function ProgressRing({
  pct, size, r, strokeWidth = 3,
}: {
  pct: number; size: number; r: number; strokeWidth?: number;
}) {
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const center = size / 2;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle
        cx={center} cy={center} r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
      <text
        x={center} y={center}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        className="rotate-90 origin-center font-display text-[10px] font-bold"
        transform={`rotate(90 ${center} ${center})`}
        fontSize={size > 60 ? 12 : 9}
      >
        {pct}%
      </text>
    </svg>
  );
}

function StatChip({
  icon: Icon, label, value, tone = "default",
}: {
  icon: React.ElementType; label: string; value: string; tone?: "default" | "muted" | "primary";
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("h-3 w-3", tone === "primary" && "text-primary", tone === "muted" && "text-muted-foreground", tone === "default" && "text-foreground/60")} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-[11px] font-bold", tone === "primary" && "text-primary")}>{value}</span>
    </div>
  );
}
