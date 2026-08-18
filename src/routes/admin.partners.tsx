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
import { Check, ExternalLink, Loader2, Mail, Phone, ShieldCheck, UserPlus } from "lucide-react";
import { functionUrl } from "@/integrations/supabase/functions-url";
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

interface IbClaim { id: string; tenant_slug: string; broker: string; ib_account: string; status: string; created_at: string }

/**
 * Pending IB claims — the only gate between a partner typing an account number
 * and that number being credited with real volume.
 *
 * A partner cannot write to tenant_ib_accounts (they could claim someone else's
 * account and nothing afterwards would detect it). They file a claim; this
 * confirms it through approve_ib_claim, which is the only path into the paying
 * table. Confirm against the broker's own records — not because the partner is
 * suspect, but because a typo here silently pays the wrong brand.
 */
function IbClaims() {
  const [rows, setRows] = useState<IbClaim[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const client = () => supabase as unknown as {
    from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => Promise<{ data: IbClaim[] | null }> } };
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };

  useEffect(() => {
    client().from("tenant_ib_claims").select("id, tenant_slug, broker, ib_account, status, created_at")
      .eq("status", "pending")
      .then(({ data }) => setRows(data ?? []));
  }, []);

  async function approve(id: string) {
    setBusy(id); setErr(null);
    const { error } = await client().rpc("approve_ib_claim", { p_claim_id: id });
    setBusy(null);
    if (error) { setErr(error.message); return; }
    setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
  }

  if (!rows || rows.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/[0.05] p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-amber-300" />
        <h3 className="font-display text-base font-bold">Broker accounts waiting for confirmation</h3>
      </div>
      <p className="mt-1.5 text-[12px] text-muted-foreground">
        Check each number against the broker's records before confirming — it decides where the
        commission goes.
      </p>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <span className="text-sm font-semibold">{r.tenant_slug}</span>
            <span className="rounded-full border border-white/12 px-2 py-0.5 text-[10px] font-bold uppercase">{r.broker}</span>
            <span className="font-mono text-[13px] text-foreground/85">{r.ib_account}</span>
            <button
              onClick={() => approve(r.id)}
              disabled={busy === r.id}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Confirm
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [notice, setNotice] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

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
  /**
   * Freigeben ist kein Etikett, sondern ein Vorgang: Login anlegen, Marke
   * anlegen, Bewerbung schliessen, Mail schicken. Vorher hat der Klick nur ein
   * Wort in der Datenbank geaendert und der Bewerber hat auf eine Nachricht
   * gewartet, die niemand geschickt hat.
   */
  async function approve(row: Application) {
    if (!confirm(`${row.name || row.email} freigeben?\n\nLegt Login und Marke an und schickt die Einladung an ${row.email}.`)) return;
    setApproving(row.id); setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(functionUrl("partner-approve"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ application_id: row.id }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { setError(String(out.error ?? `HTTP ${res.status}`)); return; }
      setRows((prev) => prev?.map((r) => (r.id === row.id ? { ...r, status: "approved" } : r)) ?? prev);
      setNotice(`${row.name || row.email} ist freigegeben — Marke "${out.slug}" angelegt.` +
        (out.mailed ? " E-Mail ist raus." : " ACHTUNG: E-Mail konnte nicht gesendet werden."));
    } catch (e) {
      setError(String(e));
    } finally {
      setApproving(null);
    }
  }

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

      {notice && (
        <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <IbClaims />

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
                  {r.status !== "approved" && (
                    <button
                      onClick={() => approve(r)}
                      disabled={approving === r.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {approving === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      Freigeben
                    </button>
                  )}
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
