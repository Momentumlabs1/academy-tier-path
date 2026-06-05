import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Edit2, X } from "lucide-react";
import { AdminPageHeader } from "@/components/academy/admin/AdminShell";
import { LESSONS, TIERS, type Lesson, type TierKey } from "@/lib/academy-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/lessons")({
  head: () => ({ meta: [{ title: "Content — Admin" }] }),
  component: AdminLessons,
});

const TIER_COLOR: Record<TierKey, string> = {
  foundation: "oklch(0.78 0.16 150)",
  operator: "oklch(0.7 0.18 270)",
  elite: "oklch(0.82 0.16 80)",
};

type EditableLesson = Lesson & { _dirty?: boolean };

function AdminLessons() {
  const [lessons, setLessons] = useState<EditableLesson[]>(LESSONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Lesson>>({});
  const [saved, setSaved] = useState<string | null>(null);

  function startEdit(l: Lesson) {
    setEditingId(l.id);
    setDraft({ title: l.title, description: l.description, durationMin: l.durationMin, tier: l.tier });
  }

  function cancelEdit() { setEditingId(null); setDraft({}); }

  function saveEdit(id: string) {
    setLessons((prev) => prev.map((l) => l.id === id ? { ...l, ...draft, _dirty: true } : l));
    setEditingId(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Content"
        sub="Edit lesson metadata. Changes are demo-only — connect Supabase to persist."
      />

      <div className="space-y-2">
        {lessons.map((l) => {
          const isEditing = editingId === l.id;
          const tierObj = TIERS.find((t) => t.key === l.tier);
          return (
            <div
              key={l.id}
              className={cn(
                "rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)] p-4 transition-all",
                isEditing && "border-primary/30 ring-1 ring-primary/20",
                l._dirty && !isEditing && "border-[oklch(0.78_0.16_150)]/20",
              )}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Title</label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[oklch(0.13_0.04_250)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        value={draft.title ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Duration (min)</label>
                      <input
                        type="number"
                        className="w-full rounded-xl border border-white/10 bg-[oklch(0.13_0.04_250)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        value={draft.durationMin ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, durationMin: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Description</label>
                    <textarea
                      className="w-full rounded-xl border border-white/10 bg-[oklch(0.13_0.04_250)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                      rows={2}
                      value={draft.description ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tier</label>
                    <div className="flex gap-2">
                      {(["foundation", "operator", "elite"] as TierKey[]).map((tk) => (
                        <button
                          key={tk}
                          onClick={() => setDraft((d) => ({ ...d, tier: tk }))}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-all",
                            draft.tier === tk ? "ring-2 ring-offset-1 ring-offset-[oklch(0.16_0.06_250)]" : "opacity-50",
                          )}
                          style={{
                            backgroundColor: `color-mix(in oklch, ${TIER_COLOR[tk]} 20%, transparent)`,
                            color: TIER_COLOR[tk],
                            ringColor: TIER_COLOR[tk],
                          }}
                        >
                          {tk}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveEdit(l.id)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                    <button onClick={cancelEdit} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-muted-foreground">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                        style={{ backgroundColor: `color-mix(in oklch, ${TIER_COLOR[l.tier]} 18%, transparent)`, color: TIER_COLOR[l.tier] }}
                      >
                        {l.tier}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{l.category}</span>
                      <span className="text-[10px] text-muted-foreground">{l.durationMin} min</span>
                      {l._dirty && <span className="text-[10px] text-[oklch(0.78_0.16_150)]">● Unsaved</span>}
                      {saved === l.id && <span className="text-[10px] text-primary">✓ Saved</span>}
                    </div>
                    <div className="mt-1 font-display font-semibold">{l.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{l.description}</div>
                  </div>
                  <button
                    onClick={() => startEdit(l)}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
