/**
 * /admin/partners — the inbox for partner applications.
 *
 * The funnel on /partner-program tells every applicant "we read every one
 * ourselves and come back within a few hours". Until now that was a promise
 * nothing could keep: the edge function wrote a row into partner_applications
 * and there was no screen, anywhere, that read it back. Applications arrived
 * into a table nobody opened.
 *
 * So this is deliberately plain. Who applied, how to reach them, what their
 * channel is, and one control that marks whether they have been dealt with —
 * because the only failure mode that matters here is an application sitting
 * unanswered while the applicant waits for the email we promised them.
 *
 * Everything the applicant cannot see about us — the rates, the broker — is the
 * reason they filled this in. That makes a slow reply expensive.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Mail, Phone } from "lucide-react";
import { AdminPageHeader } from "@/components/academy/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/partners")({
  head: () => ({ meta: [{ title: "Partner applications — Admin" }] }),
  component: AdminPartners,
});

interface Application {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: string | null;
  reach: string | null;
  niche: string | null;
  note: string | null;
  source: string | null;
  status: string | null;
}

const STATUS: Record<string, { label: string; tone: string }> = {
  new:      { label: "New",       tone: "text-sky-400 bg-sky-400/10 border-sky-400/25" },
  contacted:{ label: "Contacted", tone: "text-amber-300 bg-amber-300/10 border-amber-300/25" },
  approved: { label: "Approved",  tone: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  rejected: { label: "Declined",  tone: "text-red-400 bg-red-400/10 border-red-400/25" },
};
const NEXT: Record<string, string> = { new: "contacted", contacted: "approved", approved: "new", rejected: "new" };

const db = () => supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      order: (c: string, o: { ascending: boolean }) => Promise<{ data: Application[] | null; error: { message: string } | null }>;
    };
    update: (v: Record<string, unknown>) => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> };
  };
};

export function AdminPartners() {
  const [rows, setRows] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db().from("partner_applications")
      .select("id, created_at, name, email, phone, channel, reach, niche, note, source, status")
      .order("created_at", { ascending: false })
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); setRows([]); return; }
        setRows(data ?? []);
      });
  }, []);

  /* Optimistic: the status is a note-to-self, not a transaction. Waiting on a
     round trip to see your own click land is the kind of lag that makes people
     click twice. */
  async function cycle(row: Application) {
    const next = NEXT[row.status ?? "new"] ?? "contacted";
    setRows((prev) => prev?.map((r) => (r.id === row.id ? { ...r, status: next } : r)) ?? prev);
    const { error: e } = await db().from("partner_applications").update({ status: next }).eq("id", row.id);
    if (e) setError(e.message);
  }

  const time = (s: string) =>
    new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <AdminPageHeader
        title="Partner applications"
        sub="Everyone who finished the funnel on /partner-program. They are waiting on an email from you."
      />

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {rows === null ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No applications yet. They appear here the moment someone finishes the form on the
          partner page — there is nothing to check anywhere else.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((r) => {
            const st = STATUS[r.status ?? "new"] ?? { label: r.status ?? "—", tone: "text-white/60 bg-white/5 border-white/15" };
            return (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-bold">{r.name || "—"}</span>
                  <button
                    onClick={() => cycle(r)}
                    title="Click to change"
                    className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-opacity hover:opacity-80", st.tone)}
                  >
                    {st.label}
                  </button>
                  <span className="ml-auto text-[11px] text-muted-foreground">{time(r.created_at)}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
                  {r.email && (
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Mail className="h-3.5 w-3.5" /> {r.email}
                    </a>
                  )}
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 text-foreground/75 hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {r.phone}
                    </a>
                  )}
                  {r.channel && (
                    <span className="inline-flex items-center gap-1.5 text-foreground/75">
                      <ExternalLink className="h-3.5 w-3.5" /> {r.channel}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
                  {r.reach && <span>Reach: <b className="text-foreground/70">{r.reach}</b></span>}
                  {r.niche && <span>Topic: <b className="text-foreground/70">{r.niche}</b></span>}
                  {r.source && <span>From: {r.source}</span>}
                </div>

                {r.note && (
                  <p className="mt-2.5 whitespace-pre-wrap rounded-xl bg-white/[0.03] p-3 text-[13px] leading-relaxed text-foreground/80">
                    {r.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
