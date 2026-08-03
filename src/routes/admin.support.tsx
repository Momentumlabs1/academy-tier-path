/**
 * /admin/support — the human end of Cosmo.
 *
 * When Cosmo hands a question over (account/payout topics, complaints, or
 * anything it can't answer), it opens a ticket here and mails the team. Writing
 * an answer is the whole workflow: the DB trigger from migration 020 posts it
 * into the member's chat thread and closes the ticket, so there is no second
 * "send" step and nothing to forget.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Headset, Loader2, Send } from "lucide-react";
import { AdminPageHeader } from "@/components/academy/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support — Admin" }] }),
  component: AdminSupport,
});

type Status = "open" | "in_progress" | "resolved";

interface Ticket {
  id: string;
  member_id: string;
  question: string;
  reason: string | null;
  context: { summary?: string } | null;
  status: Status;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  members?: { name: string | null; email: string | null; deposit: number | null } | null;
}

const REASON_LABEL: Record<string, string> = {
  account_or_payment: "Account / payment",
  technical: "Technical",
  complaint: "Complaint",
  unknown_answer: "Cosmo didn't know",
  human_requested: "Human requested",
};

function useTickets() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const client = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: Ticket[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data, error } = await client
      .from("mentor_escalations")
      .select("id, member_id, question, reason, context, status, answer, answered_at, created_at, members(name, email, deposit)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) setError(error.message);
    else { setRows(data ?? []); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { rows, loading, error, reload: load };
}

function TicketCard({ t, onAnswered }: { t: Ticket; onAnswered: () => void }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const resolved = t.status === "resolved" && t.answer;

  async function submit() {
    const answer = draft.trim();
    if (!answer || sending) return;
    setSending(true);
    setErr(null);
    const { data: session } = await supabase.auth.getSession();
    const client = supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
    // The trigger posts this into the member's chat and flips status to resolved.
    const { error } = await client
      .from("mentor_escalations")
      .update({ answer, answered_by: session.session?.user?.id ?? null })
      .eq("id", t.id);
    if (error) { setErr(error.message); setSending(false); return; }
    setSending(false);
    setDraft("");
    onAnswered();
  }

  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-colors",
      resolved ? "border-white/5 bg-white/[0.02]" : "border-primary/25 bg-white/[0.04]",
    )}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              resolved ? "bg-white/5 text-muted-foreground" : "bg-primary/15 text-primary",
            )}>
              {resolved ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {resolved ? "Resolved" : "Open"}
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-foreground/70">
              {REASON_LABEL[t.reason ?? ""] ?? t.reason ?? "—"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(t.created_at).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-sm font-semibold">
            {t.members?.name || t.members?.email || "Member"}
            {t.members?.email && <span className="ml-2 font-normal text-muted-foreground">{t.members.email}</span>}
            {typeof t.members?.deposit === "number" && (
              <span className="ml-2 font-mono text-xs text-muted-foreground">€{t.members.deposit}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-black/25 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Question</div>
        <div className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{t.question}</div>
        {t.context?.summary && (
          <>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cosmo's summary</div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-foreground/70">{t.context.summary}</div>
          </>
        )}
      </div>

      {resolved ? (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Your answer</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{t.answer}</div>
          {t.answered_at && (
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              Delivered to the member's chat · {new Date(t.answered_at).toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Write the answer — it appears directly in the member's chat …"
            className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />
          {err && <div className="mt-1.5 text-xs text-destructive">{err}</div>}
          <div className="mt-2 flex justify-end">
            <button
              onClick={submit}
              disabled={sending || !draft.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to member
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSupport() {
  const { rows, loading, error, reload } = useTickets();
  const [tab, setTab] = useState<"open" | "all">("open");

  const shown = useMemo(
    () => (tab === "open" ? rows.filter((r) => r.status !== "resolved") : rows),
    [rows, tab],
  );
  const openCount = rows.filter((r) => r.status !== "resolved").length;

  return (
    <div>
      <AdminPageHeader
        title="Support"
        sub="Questions Cosmo handed over. Your answer lands straight in the member's chat."
      />

      <div className="mb-4 flex gap-2">
        {(["open", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "h-9 rounded-full px-4 text-xs font-semibold uppercase tracking-wider transition-colors",
              tab === t ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "open" ? `Open${openCount ? ` (${openCount})` : ""}` : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <Headset className="h-8 w-8 text-foreground/30" />
          <div className="font-display text-lg font-bold">
            {tab === "open" ? "No open tickets" : "Nothing here yet"}
          </div>
          <p className="max-w-[46ch] text-sm text-muted-foreground">
            Cosmo answers most questions himself. Account, payout and complaint topics land here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((t) => <TicketCard key={t.id} t={t} onAnswered={reload} />)}
        </div>
      )}
    </div>
  );
}
