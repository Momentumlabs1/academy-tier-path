/**
 * /admin/leads — every conversation Cosmo has had on Telegram.
 *
 * The setter runs in private one-to-one chats, which means that by default the
 * team sees NOTHING: not what Cosmo says, not what people ask, not where they
 * drop out. While a bot is talking to prospects unsupervised, that is the thing
 * you need most and the thing that is hardest to get.
 *
 * Read-only on purpose. The transcript is the record of what was actually said
 * to a customer, and a record you can quietly edit is not a record. Replying
 * happens in Telegram, where the person actually is.
 *
 * Deliberately NOT paginated or filtered yet. With a handful of leads a filter
 * bar is furniture; the useful thing is seeing every conversation at once and
 * where each one stopped.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MessageSquare, User } from "lucide-react";
import { AdminPageHeader } from "@/components/academy/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [{ title: "Telegram leads — Admin" }] }),
  component: AdminLeads,
});

interface Lead {
  id: string;
  first_name: string | null;
  telegram_username: string | null;
  telegram_user_id: number;
  status: string;
  broker_email: string | null;
  created_at: string;
}
interface Msg { id: string; role: "user" | "assistant"; content: string; created_at: string }

/** Where a lead got to. The colour is the point: red = we lost them. */
const STATUS: Record<string, { label: string; tone: string }> = {
  active:      { label: "In conversation", tone: "text-sky-400 bg-sky-400/10 border-sky-400/25" },
  link_sent:   { label: "Link sent",       tone: "text-amber-300 bg-amber-300/10 border-amber-300/25" },
  deposited:   { label: "Deposited",       tone: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  vip_granted: { label: "VIP",             tone: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  won:         { label: "VIP",             tone: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  opted_out:   { label: "Opted out",       tone: "text-red-400 bg-red-400/10 border-red-400/25" },
};

const q = () => supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      order: (c: string, o: { ascending: boolean }) => {
        limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
        eq: (c: string, v: string) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
      eq: (c: string, v: string) => {
        order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
};

function AdminLeads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Lead | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);

  useEffect(() => {
    q().from("setter_leads")
      .select("id, first_name, telegram_username, telegram_user_id, status, broker_email, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); setLeads([]); return; }
        const rows = (data ?? []) as Lead[];
        setLeads(rows);
        if (rows.length) setActive(rows[0]);
      });
  }, []);

  useEffect(() => {
    if (!active) return;
    setMsgs(null);
    q().from("setter_messages")
      .select("id, role, content, created_at")
      .eq("lead_id", active.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));
  }, [active]);

  const time = (s: string) => new Date(s).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div>
      <AdminPageHeader
        title="Telegram leads"
        sub="Every conversation Cosmo has had. Read-only — reply in Telegram."
      />

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {leads === null ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : leads.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Nobody has written to the bot yet. Conversations appear here the moment
          someone taps the VIP button in the info channel.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Who wrote */}
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {leads.map((l) => {
              const st = STATUS[l.status] ?? { label: l.status, tone: "text-white/60 bg-white/5 border-white/15" };
              const on = active?.id === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setActive(l)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    on ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/[0.03] hover:border-white/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {l.first_name || "Lead"}
                    </span>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", st.tone)}>
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[11px] text-muted-foreground">
                    {l.telegram_username ? `@${l.telegram_username}` : l.telegram_user_id}
                    {" · "}{time(l.created_at)}
                  </div>
                  {l.broker_email && (
                    <div className="mt-1 truncate text-[11px] text-emerald-400/80">{l.broker_email}</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* What was said */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            {!active ? null : (
              <>
                <div className="mb-4 flex items-center gap-2 border-b border-white/8 pb-3">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">
                    {active.first_name || "Lead"}
                    {active.telegram_username && (
                      <span className="ml-2 font-normal text-muted-foreground">@{active.telegram_username}</span>
                    )}
                  </span>
                  <a
                    href={`https://t.me/${active.telegram_username ?? ""}`}
                    target="_blank" rel="noopener noreferrer"
                    className={cn(
                      "ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline",
                      !active.telegram_username && "pointer-events-none opacity-40",
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Open in Telegram
                  </a>
                </div>

                {msgs === null ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : (
                  <div className="max-h-[60vh] space-y-3 overflow-y-auto">
                    {msgs.map((m) => (
                      <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                          m.role === "user"
                            ? "bg-primary/15 text-foreground/90"
                            : "border border-white/10 bg-white/[0.04] text-foreground/80",
                        )}>
                          {m.content}
                          <div className="mt-1 text-[10px] text-muted-foreground">{time(m.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
