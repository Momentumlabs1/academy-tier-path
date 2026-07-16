import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Flag, Plus, Trash2 } from "lucide-react";
import {
  addDayBlock,
  addTask,
  deleteBlock,
  deleteTask,
  fetchDayBlocks,
  fetchDayPlan,
  fetchTasks,
  fetchVentures,
  hhmm,
  setBlockDone,
  setTaskDone,
  setTaskPriority,
  todayISO,
  upsertDayPlan,
} from "@/lib/hq/api";
import type { LifeTask } from "@/lib/hq/types";
import { cn } from "@/lib/utils";
import {
  EmptyHint,
  GhostButton,
  HqCard,
  HqInput,
  HqTextarea,
  LoadingRow,
  PrimaryButton,
  SectionLabel,
} from "./primitives";

const P_STYLE: Record<number, string> = {
  1: "bg-red-400",
  2: "bg-amber-300",
  3: "bg-white/30",
};

function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

// ── Focus ────────────────────────────────────────────────────────────────────

function FocusCard({ day }: { day: string }) {
  const invalidate = useInvalidate();
  const plan = useQuery({ queryKey: ["dayplan", day], queryFn: () => fetchDayPlan(day) });
  const [draft, setDraft] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (focus: string) => upsertDayPlan(day, { focus }),
    onSuccess: () => {
      setDraft(null);
      invalidate(["dayplan"]);
    },
  });

  const focus = plan.data?.focus ?? null;

  return (
    <HqCard className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
      <SectionLabel>🎯 Fokus heute</SectionLabel>
      {draft === null ? (
        <button type="button" onClick={() => setDraft(focus ?? "")} className="w-full text-left">
          {focus ? (
            <p className="font-display text-lg font-semibold leading-snug">{focus}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Was ist heute das Wichtigste? Tippen zum Setzen.
            </p>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <HqTextarea
            rows={2}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Das eine Ding, das heute zählt…"
          />
          <div className="flex gap-2">
            <PrimaryButton onClick={() => save.mutate(draft.trim())} disabled={save.isPending}>
              Speichern
            </PrimaryButton>
            <GhostButton onClick={() => setDraft(null)}>Abbrechen</GhostButton>
          </div>
        </div>
      )}
    </HqCard>
  );
}

// ── Tasks ────────────────────────────────────────────────────────────────────

function TaskRow({ task, today }: { task: LifeTask; today: string }) {
  const invalidate = useInvalidate();
  const toggle = useMutation({
    mutationFn: () => setTaskDone(task.id, !task.done_at),
    onSuccess: () => invalidate(["tasks"]),
  });
  const cyclePrio = useMutation({
    mutationFn: () => setTaskPriority(task.id, ((task.priority % 3) + 1) as 1 | 2 | 3),
    onSuccess: () => invalidate(["tasks"]),
  });
  const remove = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => invalidate(["tasks"]),
  });

  const overdue = !task.done_at && task.due_date !== null && task.due_date < today;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={() => toggle.mutate()}
        aria-label={task.done_at ? "Als offen markieren" : "Als erledigt markieren"}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          task.done_at
            ? "border-primary bg-primary text-primary-foreground"
            : "border-white/25 hover:border-primary/60",
        )}
      >
        {task.done_at ? <Check className="h-3.5 w-3.5" /> : null}
      </button>

      <button
        type="button"
        onClick={() => cyclePrio.mutate()}
        aria-label={`Priorität ${task.priority} — ändern`}
        className="shrink-0 p-1"
      >
        <span className={cn("block h-2.5 w-2.5 rounded-full", P_STYLE[task.priority])} />
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={cn("truncate text-sm", task.done_at && "text-muted-foreground line-through")}
        >
          {task.title}
        </div>
        {task.due_date ? (
          <div
            className={cn(
              "text-[11px]",
              overdue ? "font-semibold text-red-400" : "text-muted-foreground",
            )}
          >
            {overdue ? "überfällig · " : ""}bis {task.due_date.slice(8, 10)}.
            {task.due_date.slice(5, 7)}.
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => remove.mutate()}
        aria-label="Aufgabe löschen"
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 hover:bg-white/5 hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function TasksCard({ today }: { today: string }) {
  const invalidate = useInvalidate();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [dueToday, setDueToday] = useState(false);

  const create = useMutation({
    mutationFn: () => addTask({ title: title.trim(), priority, due_date: dueToday ? today : null }),
    onSuccess: () => {
      setTitle("");
      invalidate(["tasks"]);
    },
  });

  const open = (tasks.data ?? []).filter((t) => !t.done_at);
  const doneToday = (tasks.data ?? []).filter((t) => t.done_at && t.done_at.slice(0, 10) === today);

  return (
    <HqCard>
      <SectionLabel
        action={
          <span className="text-[11px] text-muted-foreground">
            {open.length} offen · {doneToday.length} heute erledigt
          </span>
        }
      >
        ✅ Aufgaben
      </SectionLabel>

      <form
        className="mb-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) create.mutate();
        }}
      >
        <HqInput
          placeholder="Neue Aufgabe…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setPriority((p) => ((p % 3) + 1) as 1 | 2 | 3)}
          aria-label={`Priorität ${priority}`}
          title={`Priorität ${priority} (tippen zum Wechseln)`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
        >
          <span className={cn("block h-3 w-3 rounded-full", P_STYLE[priority])} />
        </button>
        <button
          type="button"
          onClick={() => setDueToday((v) => !v)}
          aria-label="Fällig heute"
          title="Fällig heute"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            dueToday
              ? "border-primary/60 bg-primary/15 text-primary"
              : "border-white/10 bg-white/[0.04] text-muted-foreground",
          )}
        >
          <Flag className="h-4 w-4" />
        </button>
        <PrimaryButton
          type="submit"
          disabled={!title.trim() || create.isPending}
          className="h-11 w-11 shrink-0 p-0"
        >
          <Plus className="h-5 w-5" />
        </PrimaryButton>
      </form>

      {tasks.isLoading ? (
        <LoadingRow />
      ) : open.length === 0 && doneToday.length === 0 ? (
        <EmptyHint>Keine Aufgaben. Fang mit deinem Fokus an. 🎯</EmptyHint>
      ) : (
        <div className="divide-y divide-white/5">
          {open.map((t) => (
            <TaskRow key={t.id} task={t} today={today} />
          ))}
          {doneToday.map((t) => (
            <TaskRow key={t.id} task={t} today={today} />
          ))}
        </div>
      )}
    </HqCard>
  );
}

// ── Day blocks / Tagesplaner ─────────────────────────────────────────────────

function BlocksCard({ day }: { day: string }) {
  const invalidate = useInvalidate();
  const blocks = useQuery({ queryKey: ["blocks", day], queryFn: () => fetchDayBlocks(day) });
  const ventures = useQuery({ queryKey: ["ventures"], queryFn: fetchVentures });

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [venture, setVenture] = useState<string>("");

  const create = useMutation({
    mutationFn: () => {
      const [h, m] = time.split(":").map(Number);
      return addDayBlock({
        day,
        start_min: h * 60 + m,
        duration_min: duration,
        title: title.trim(),
        venture_slug: venture || null,
      });
    },
    onSuccess: () => {
      setTitle("");
      setAdding(false);
      invalidate(["blocks"]);
    },
  });

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const ventureEmoji = (slug: string | null) =>
    ventures.data?.find((v) => v.slug === slug)?.emoji ?? null;

  return (
    <HqCard>
      <SectionLabel
        action={
          <GhostButton onClick={() => setAdding((v) => !v)} className="px-2.5 py-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Block
          </GhostButton>
        }
      >
        ⏰ Tagesplan
      </SectionLabel>

      {adding ? (
        <form
          className="mb-3 space-y-2 rounded-xl bg-white/[0.03] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) create.mutate();
          }}
        >
          <HqInput
            placeholder="Was steht an?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="time"
              value={time}
              step={300}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 [color-scheme:dark]"
            />
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 [color-scheme:dark]"
            >
              {[30, 45, 60, 90, 120, 180].map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
            <select
              value={venture}
              onChange={(e) => setVenture(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 [color-scheme:dark]"
            >
              <option value="">Kein Venture</option>
              {(ventures.data ?? []).map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.emoji} {v.name}
                </option>
              ))}
            </select>
          </div>
          <PrimaryButton
            type="submit"
            disabled={!title.trim() || create.isPending}
            className="w-full"
          >
            Zum Plan hinzufügen
          </PrimaryButton>
        </form>
      ) : null}

      {blocks.isLoading ? (
        <LoadingRow />
      ) : (blocks.data ?? []).length === 0 ? (
        <EmptyHint>
          <CalendarClock className="mx-auto mb-1 h-5 w-5 opacity-60" />
          Noch keine Zeitblöcke für heute.
        </EmptyHint>
      ) : (
        <div className="space-y-1.5">
          {(blocks.data ?? []).map((b) => {
            const active =
              !b.done && nowMin >= b.start_min && nowMin < b.start_min + b.duration_min;
            return (
              <div
                key={b.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5",
                  active ? "border border-primary/40 bg-primary/10" : "bg-white/[0.03]",
                )}
              >
                <div className="w-[86px] shrink-0 font-mono text-[11px] text-muted-foreground">
                  {hhmm(b.start_min)}–{hhmm(b.start_min + b.duration_min)}
                </div>
                <div
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    b.done && "text-muted-foreground line-through",
                  )}
                >
                  {ventureEmoji(b.venture_slug) ? (
                    <span className="mr-1">{ventureEmoji(b.venture_slug)}</span>
                  ) : null}
                  {b.title}
                </div>
                <button
                  type="button"
                  onClick={() => setBlockDone(b.id, !b.done).then(() => invalidate(["blocks"]))}
                  aria-label={b.done ? "Block als offen markieren" : "Block abhaken"}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    b.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/25",
                  )}
                >
                  {b.done ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => deleteBlock(b.id).then(() => invalidate(["blocks"]))}
                  aria-label="Block löschen"
                  className="shrink-0 rounded-lg p-1 text-muted-foreground/50 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </HqCard>
  );
}

// ── Reflection ───────────────────────────────────────────────────────────────

function ReflectionCard({ day }: { day: string }) {
  const invalidate = useInvalidate();
  const plan = useQuery({ queryKey: ["dayplan", day], queryFn: () => fetchDayPlan(day) });
  const [draft, setDraft] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (reflection: string) => upsertDayPlan(day, { reflection }),
    onSuccess: () => {
      setDraft(null);
      invalidate(["dayplan"]);
    },
  });

  return (
    <HqCard>
      <SectionLabel>🌙 Abend-Reflexion</SectionLabel>
      {draft === null ? (
        <button
          type="button"
          onClick={() => setDraft(plan.data?.reflection ?? "")}
          className="w-full text-left"
        >
          {plan.data?.reflection ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
              {plan.data.reflection}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Was war heute gut? Was hast du gelernt? Tippen zum Schreiben.
            </p>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <HqTextarea
            rows={4}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Kurz und ehrlich…"
          />
          <div className="flex gap-2">
            <PrimaryButton onClick={() => save.mutate(draft.trim())} disabled={save.isPending}>
              Speichern
            </PrimaryButton>
            <GhostButton onClick={() => setDraft(null)}>Abbrechen</GhostButton>
          </div>
        </div>
      )}
    </HqCard>
  );
}

// ── Tab ──────────────────────────────────────────────────────────────────────

export function TodayTab() {
  const today = useMemo(() => todayISO(), []);
  return (
    <div className="space-y-4">
      <FocusCard day={today} />
      <TasksCard today={today} />
      <BlocksCard day={today} />
      <ReflectionCard day={today} />
    </div>
  );
}
