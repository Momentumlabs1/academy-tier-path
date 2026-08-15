/**
 * /admin/leads — every conversation Cosmo has had, and where each one stopped.
 *
 * The setter runs in private one-to-one chats, which means that by default the
 * team sees NOTHING: not what Cosmo says, not what people ask, not where they
 * drop out. While a bot talks to prospects unsupervised, that is the thing you
 * need most and the thing that is hardest to get.
 *
 * The first version listed names and showed a transcript. That answers "what
 * did it say" but not the question you actually open this page with, which is
 * "is it working, and who is stuck". So the page now leads with the funnel:
 * how many arrived, how many replied at all, how many got the link, how many
 * deposited — and the drop between each pair, because the drop is where the
 * money is.
 *
 * TWO RULES.
 *
 * Conversion is only shown once there is enough to divide. One VIP out of one
 * lead is 100%, and a 100% on a dashboard is a number nobody can act on.
 *
 * Read-only, still. The transcript is the record of what was said to a
 * customer, and a record you can quietly edit is not a record. Replying happens
 * in Telegram, where the person actually is.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Search, User } from "lucide-react";
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
  step: string | null;
  experience: string | null;
  broker_email: string | null;
  deposit_usd: number | null;
  vip_granted_at: string | null;
  created_at: string;
  message_count: number | null;
  reply_count: number | null;
  last_message_at: string | null;
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
const statusOf = (s: string) => STATUS[s] ?? { label: s, tone: "text-white/60 bg-white/5 border-white/15" };

/**
 * The setter's funnel, in the order it happens. Each stage counts everyone who
 * reached it OR went past it — otherwise the bars go up and down as people move
 * on, which reads as noise rather than a funnel.
 */
const REACHED: Record<string, number> = {
  active: 1, link_sent: 2, deposited: 3, vip_granted: 4, won: 4, opted_out: 1,
};
const STAGES = [
  { at: 1, label: "Started", hint: "Wrote to Cosmo" },
  { at: 2, label: "Replied", hint: "Answered at least once" },
  { at: 3, label: "Link sent", hint: "Got the broker link" },
  { at: 4, label: "VIP", hint: "Deposit verified" },
];
/** Under this, a percentage is noise dressed up as evidence. */
const MIN_LEADS_FOR_RATE = 10;

const db = () => supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      order: (c: string, o: { ascending: boolean }) => {
        limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
      eq: (c: string, v: string) => {
        order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
};

const ago = (iso: string | null) => {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

function AdminLeads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Lead | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    db().from("setter_lead_overview")
      .select("id, first_name, telegram_username, telegram_user_id, status, step, experience, broker_email, deposit_usd, vip_granted_at, created_at, message_count, reply_count, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(500)
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
    db().from("setter_messages")
      .select("id, role, content, created_at")
      .eq("lead_id", active.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));
  }, [active]);

  const funnel = useMemo(() => {
    const rows = leads ?? [];
    return STAGES.map((s) => ({
      ...s,
      // "Replied" is the one stage the status cannot answer: a lead sits in
      // `active` whether they wrote back or never did. reply_count can.
      count: s.at === 2
        ? rows.filter((l) => (l.reply_count ?? 0) > 0).length
        : rows.filter((l) => (REACHED[l.status] ?? 0) >= s.at).length,
    }));
  }, [leads]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads ?? []).filter((l) => {
      if (filter && l.status !== filter) return false;
      if (!q) return true;
      return [l.first_name, l.telegram_username, l.broker_email, String(l.telegram_user_id)]
        .some((f) => (f ?? "").toLowerCase().includes(q));
    });
  }, [leads, query, filter]);

  const total = leads?.length ?? 0;
  const vip = funnel[3]?.count ?? 0;
  const time = (s: string) => new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <AdminPageHeader
        title="Telegram leads"
        sub="Every conversation Cosmo has had, and where each one stopped. Read-only — reply in Telegram."
      />

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      {leads === null ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : total === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Nobody has written to the bot yet. Conversations appear here the moment someone taps the
          VIP button in the info channel.
        </p>
      ) : (
        <>
          {/* ── The funnel, because "is it working" is why you opened this ── */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="font-display text-base font-bold">The funnel</h3>
              {total >= MIN_LEADS_FOR_RATE ? (
                <span className="text-sm text-muted-foreground">
                  <b className="text-primary">{Math.round((100 * vip) / total)}%</b> of leads reach VIP
                </span>
              ) : (
                <span className="text-[12px] text-muted-foreground">
                  {total} lead{total === 1 ? "" : "s"} — too few to read a rate from, so none is shown.
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {funnel.map((s, i) => {
                const prev = i === 0 ? null : funnel[i - 1].count;
                const lost = prev === null ? null : prev - s.count;
                const pct = total ? Math.round((100 * s.count) / total) : 0;
                return (
                  <div key={s.label} className="rounded-xl bg-[color:var(--surface-2)]/60 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{s.label}</div>
                    <div className="mt-1 font-display text-2xl font-bold tabular-nums">{s.count}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">{s.hint}</div>
                    {/* The drop is the useful half of a funnel; the counts alone
                        just say what happened, not where it went wrong. */}
                    {lost !== null && lost > 0 && (
                      <div className="mt-1 text-[11px] font-semibold text-red-400/80">−{lost} lost here</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Filter + search ── */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, @handle, email…"
                className="w-56 rounded-full border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={() => setFilter(null)}
              className={cn("rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                filter === null ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 hover:bg-white/5")}
            >
              All {total}
            </button>
            {Object.entries(STATUS)
              .filter(([k]) => (leads ?? []).some((l) => l.status === k))
              .map(([k, s]) => {
                const n = (leads ?? []).filter((l) => l.status === k).length;
                return (
                  <button
                    key={k}
                    onClick={() => setFilter(filter === k ? null : k)}
                    className={cn("rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      filter === k ? s.tone : "border-white/10 hover:bg-white/5")}
                  >
                    {s.label} {n}
                  </button>
                );
              })}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            {/* Who wrote */}
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {shown.length === 0 && (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">
                  Nothing matches.
                </p>
              )}
              {shown.map((l) => {
                const st = statusOf(l.status);
                const on = active?.id === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setActive(l)}
                    className={cn("w-full rounded-xl border p-3 text-left transition-colors",
                      on ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/[0.03] hover:border-white/20")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{l.first_name || "Lead"}</span>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", st.tone)}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-muted-foreground">
                      {l.telegram_username ? `@${l.telegram_username}` : l.telegram_user_id}
                      {" · "}{l.message_count ?? 0} msg
                      {" · "}{ago(l.last_message_at)}
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
                  <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-white/8 pb-3">
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
                      className={cn("ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline",
                        !active.telegram_username && "pointer-events-none opacity-40")}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Open in Telegram
                    </a>
                  </div>

                  {/* What the bot learned, so nobody has to read the transcript
                      to find out where this person actually stands. */}
                  <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
                    <span>First seen <b className="text-foreground/70">{time(active.created_at)}</b></span>
                    {active.experience && <span>Experience <b className="text-foreground/70">{active.experience}</b></span>}
                    {active.step && <span>Step <b className="text-foreground/70">{active.step}</b></span>}
                    {active.broker_email && <span>Broker email <b className="text-emerald-400/80">{active.broker_email}</b></span>}
                    {active.deposit_usd != null && <span>Deposit <b className="text-foreground/70">${active.deposit_usd}</b></span>}
                    {active.vip_granted_at && <span>VIP since <b className="text-emerald-400/80">{time(active.vip_granted_at)}</b></span>}
                  </div>

                  {msgs === null ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : (
                    <div className="max-h-[58vh] space-y-3 overflow-y-auto">
                      {msgs.map((m) => (
                        <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                            m.role === "user" ? "bg-primary/15 text-foreground/90"
                                              : "border border-white/10 bg-white/[0.04] text-foreground/80")}>
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
        </>
      )}
    </div>
  );
}
