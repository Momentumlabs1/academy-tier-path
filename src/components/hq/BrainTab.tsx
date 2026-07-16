import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, Search, Trash2 } from "lucide-react";
import { addNote, deleteNote, fetchNotes, setNotePinned } from "@/lib/hq/api";
import type { LifeNote } from "@/lib/hq/types";
import { cn } from "@/lib/utils";
import {
  Chip,
  EmptyHint,
  HqCard,
  HqInput,
  HqTextarea,
  LoadingRow,
  PrimaryButton,
  SectionLabel,
} from "./primitives";

const KINDS: { key: LifeNote["kind"] | "all"; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "idea", label: "💡 Ideen" },
  { key: "note", label: "📝 Notizen" },
  { key: "link", label: "🔗 Links" },
  { key: "decision", label: "⚖️ Entscheidungen" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} min`;
  if (diff < day) return `${Math.floor(diff / 3_600_000)} h`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} d`;
  return `${Math.floor(diff / (30 * day))} mo`;
}

function NoteCard({ note }: { note: LifeNote }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notes"] });
  const [expanded, setExpanded] = useState(false);

  const isUrl = note.kind === "link" && /^https?:\/\//.test(note.body.trim());

  return (
    <div
      className={cn("rounded-xl bg-white/[0.03] p-3", note.pinned && "border border-primary/25")}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {note.title ? <div className="mb-0.5 text-sm font-semibold">{note.title}</div> : null}
          {isUrl ? (
            <a
              href={note.body.trim()}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-primary underline-offset-2 hover:underline"
            >
              {note.body.trim()}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full text-left"
            >
              <p
                className={cn(
                  "whitespace-pre-wrap text-sm leading-relaxed text-foreground/85",
                  !expanded && "line-clamp-3",
                )}
              >
                {note.body}
              </p>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setNotePinned(note.id, !note.pinned).then(invalidate)}
          aria-label={note.pinned ? "Pin entfernen" : "Anpinnen"}
          className={cn(
            "shrink-0 rounded-lg p-1.5",
            note.pinned ? "text-primary" : "text-muted-foreground/50 hover:text-foreground",
          )}
        >
          <Pin className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => deleteNote(note.id).then(invalidate)}
          aria-label="Notiz löschen"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {note.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-foreground/60"
          >
            #{t}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {timeAgo(note.created_at)}
        </span>
      </div>
    </div>
  );
}

export function BrainTab() {
  const qc = useQueryClient();
  const notes = useQuery({ queryKey: ["notes"], queryFn: fetchNotes });

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<LifeNote["kind"] | "all">("all");
  const [tag, setTag] = useState<string | null>(null);

  const [body, setBody] = useState("");
  const [newKind, setNewKind] = useState<LifeNote["kind"]>("idea");
  const [tagsInput, setTagsInput] = useState("");

  const create = useMutation({
    mutationFn: () =>
      addNote({
        body: body.trim(),
        kind: newKind,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
      }),
    onSuccess: () => {
      setBody("");
      setTagsInput("");
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes.data ?? [])
      for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t);
  }, [notes.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notes.data ?? []).filter((n) => {
      if (kind !== "all" && n.kind !== kind) return false;
      if (tag && !n.tags.includes(tag)) return false;
      if (q && !`${n.title ?? ""} ${n.body} ${n.tags.join(" ")}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [notes.data, query, kind, tag]);

  return (
    <div className="space-y-4">
      <HqCard>
        <SectionLabel>🧠 Quick Capture</SectionLabel>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) create.mutate();
          }}
        >
          <HqTextarea
            rows={2}
            placeholder="Idee, Gedanke, Link — einfach rein damit…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as LifeNote["kind"])}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 [color-scheme:dark]"
            >
              <option value="idea">💡 Idee</option>
              <option value="note">📝 Notiz</option>
              <option value="link">🔗 Link</option>
              <option value="decision">⚖️ Entscheidung</option>
            </select>
            <HqInput
              placeholder="Tags (Komma-getrennt)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <PrimaryButton
              type="submit"
              disabled={!body.trim() || create.isPending}
              className="shrink-0"
            >
              Save
            </PrimaryButton>
          </div>
        </form>
      </HqCard>

      <HqCard>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <HqInput
            placeholder="Second Brain durchsuchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {KINDS.map((k) => (
            <Chip key={k.key} active={kind === k.key} onClick={() => setKind(k.key)}>
              {k.label}
            </Chip>
          ))}
        </div>
        {allTags.length > 0 ? (
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {allTags.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </Chip>
            ))}
          </div>
        ) : null}

        {notes.isLoading ? (
          <LoadingRow />
        ) : filtered.length === 0 ? (
          <EmptyHint>
            {(notes.data ?? []).length === 0
              ? "Dein Second Brain ist noch leer — schreib die erste Idee rein!"
              : "Nichts gefunden."}
          </EmptyHint>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </div>
        )}
      </HqCard>
    </div>
  );
}
