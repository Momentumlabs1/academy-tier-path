/**
 * /team — der interne Mitarbeiter-Bereich (Cosmos Candles).
 *
 * Fuer wen: Team-Mitglieder aus `staff_members` (pflegt nur der Admin per SQL/
 * Claude). KEIN Voll-Admin: hier gibt es genau die zwei Werkzeuge, die ein
 * Scout/Editor braucht — die Scout-Lead-Pipeline und die Partner-Bewerbungen.
 * Deposits, Members, Tenants, Secrets bleiben im /admin.
 *
 * Scout-Leads: Kandidaten-Accounts (aus dem Scout-Tool ODER von Hand), mit
 * Status-Pipeline neu → angeschrieben → antwort → gewonnen/kein_fit und dem
 * vorgeschriebenen Opener zum Kopieren. RLS: is_staff().
 *
 * Bewerbungen: dieselbe Liste wie im Admin; Freigeben laeuft durch die
 * partner-approve-Funktion (die Staff seit v4 akzeptiert), Ablehnen setzt den
 * Status. Der Bestaetigungsdialog nennt IMMER den Namen — die Lehre aus einem
 * echten Fehlklick.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight, Check, Copy, Loader2, LogOut, Plus, Search, UserCheck, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — Cosmos Candles" }] }),
  component: TeamArea,
});

const STATI = ["neu", "angeschrieben", "antwort", "kein_fit", "gewonnen"] as const;
const STATUS_LABEL: Record<string, string> = {
  neu: "Neu", angeschrieben: "Angeschrieben", antwort: "Antwort", kein_fit: "Kein Fit", gewonnen: "Gewonnen",
};
const STATUS_TONE: Record<string, string> = {
  neu: "text-sky-300 bg-sky-400/10 border-sky-400/25",
  angeschrieben: "text-amber-300 bg-amber-400/10 border-amber-400/25",
  antwort: "text-violet-300 bg-violet-400/10 border-violet-400/25",
  kein_fit: "text-white/40 bg-white/5 border-white/10",
  gewonnen: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
};

interface Lead {
  id: string; source: string; platform: string | null; handle: string; name: string | null;
  url: string | null; yt_subs: number | null; tg_subs: number | null; tt_followers: number | null;
  ig_followers: number | null;
  format: string | null; schwierigkeit: string | null;
  sprache: string | null; score: number | null; fit: string | null; opener: string | null;
  status: string; notes: string | null; released: boolean;
}
interface Application {
  id: string; name: string | null; email: string; phone: string | null; channel: string | null;
  reach: string | null; niche: string | null; note: string | null; status: string; created_at: string;
}

// Die Team-Tabellen sind nicht in den generierten Typen — RLS scoped trotzdem.
const db = () => supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { order: (c: string, o?: { ascending?: boolean; nullsFirst?: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }> };
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    update: (v: Record<string, unknown>) => { eq: (c: string, v2: string) => Promise<{ error: { message: string } | null }> };
  };
};

function TeamArea() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  const load = useCallback(async (sessionArg?: { user?: { email?: string | null } } | null) => {
    // Dieselbe Deadlock-Falle wie im Partner-Portal: getSession() niemals im
    // Auth-Callback aufrufen — die Session kommt als Argument herein.
    let mail: string | null;
    if (sessionArg !== undefined) mail = sessionArg?.user?.email ?? null;
    else {
      const { data } = await supabase.auth.getSession();
      mail = data.session?.user?.email ?? null;
    }
    setEmail(mail);
    setChecking(false);
    if (!mail) { setIsStaff(null); return; }
    const { data } = await db().from("staff_members").select("email").order("email");
    setIsStaff((data ?? []).length > 0 || mail.toLowerCase() === "kontakt@momentumlabs.at");
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-[oklch(0.11_0.03_255)]"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!email) return <TeamLogin onDone={() => load()} />;
  if (isStaff === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.11_0.03_255)] px-4 text-foreground">
        <div className="max-w-sm rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-7 text-center">
          <div className="font-display text-lg font-bold">Kein Team-Zugang</div>
          <p className="mt-2 text-sm text-muted-foreground">Dieses Login ({email}) ist nicht als Mitarbeiter freigeschaltet. Melde dich beim Admin.</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-4 text-xs text-muted-foreground underline hover:text-foreground">Abmelden</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.11_0.03_255)] px-4 py-8 text-foreground [background-image:var(--gradient-page-wash)]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-bold">Team</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Abmelden
          </button>
        </header>
        <div className="space-y-10">
          <ScoutLeads staffEmail={email} isAdmin={email.toLowerCase() === "kontakt@momentumlabs.at"} />
          <Applications />
        </div>
      </div>
    </div>
  );
}

/* ── Scout-Leads: die Anschreib-Pipeline ─────────────────────────────────── */

function ScoutLeads({ staffEmail, isAdmin }: { staffEmail: string; isAdmin: boolean }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("alle");
  const [plattform, setPlattform] = useState<string>("alle");
  const [schwierig, setSchwierig] = useState<string>("alle");
  const [suche, setSuche] = useState("");
  const [sortier, setSortier] = useState<"score" | "reichweite">("score");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await db().from("scout_leads")
      .select("*").order("score", { ascending: false, nullsFirst: false });
    if (error) { setError(error.message); return; }
    setLeads((data ?? []) as Lead[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    setLeads((p) => (p ?? []).map((l) => (l.id === id ? { ...l, status } : l)));
    const { error } = await db().from("scout_leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { setError(error.message); load(); }
  };

  // Nur der Admin: Tool-Leads fuers Team sichtbar schalten (RLS + Trigger
  // erzwingen das serverseitig — die UI blendet den Schalter nur aus).
  const setReleased = async (id: string, released: boolean) => {
    setLeads((p) => (p ?? []).map((l) => (l.id === id ? { ...l, released } : l)));
    const { error } = await db().from("scout_leads").update({ released }).eq("id", id);
    if (error) { setError(error.message); load(); }
  };
  const releaseAll = async () => {
    const gesperrt = (leads ?? []).filter((l) => !l.released);
    setLeads((p) => (p ?? []).map((l) => ({ ...l, released: true })));
    for (const l of gesperrt) {
      const { error } = await db().from("scout_leads").update({ released: true }).eq("id", l.id);
      if (error) { setError(error.message); break; }
    }
    load();
  };

  const copyOpener = async (l: Lead) => {
    try { await navigator.clipboard.writeText(l.opener ?? ""); setCopied(l.id); setTimeout(() => setCopied(null), 1500); } catch { /* egal */ }
  };

  const reichweite = (l: Lead) =>
    Math.max(l.yt_subs ?? 0, l.tg_subs ?? 0, l.tt_followers ?? 0, l.ig_followers ?? 0);
  const shown = (leads ?? [])
    .filter((l) => filter === "alle" || l.status === filter)
    .filter((l) => plattform === "alle" || l.platform === plattform)
    .filter((l) => schwierig === "alle" || l.schwierigkeit === schwierig)
    .filter((l) => {
      const q = suche.trim().toLowerCase();
      return !q || l.handle.toLowerCase().includes(q) || (l.name ?? "").toLowerCase().includes(q) || (l.notes ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => sortier === "score"
      ? (b.score ?? 0) - (a.score ?? 0) || reichweite(b) - reichweite(a)
      : reichweite(b) - reichweite(a));
  const zaehl = (p: string) => (leads ?? []).filter((l) => p === "alle" || l.platform === p).length;
  const fmt = (n: number | null) => (n == null ? "–" : n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : String(n));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Scout-Leads</h2>
          <span className="text-xs text-muted-foreground">{(leads ?? []).length} Accounts</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (leads ?? []).some((l) => !l.released) && (
            <button onClick={releaseAll} className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20">
              {(leads ?? []).filter((l) => !l.released).length} gesperrt — alle freischalten
            </button>
          )}
          <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Account eintragen
          </button>
        </div>
      </div>

      {adding && <AddLead staffEmail={staffEmail} onDone={() => { setAdding(false); load(); }} />}
      {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      {/* Zwei Filterebenen + Suche: bei ~180 Leads ist die flache Liste sonst
          unbenutzbar. Plattform zuerst (der Editor arbeitet kanalweise),
          Status fuer die Pipeline, Suche fuer den Rest. */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {[["alle", "Alle"], ["tiktok", "TikTok"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["telegram", "Telegram"]].map(([p, label]) => (
          zaehl(p) > 0 || p === "alle" ? (
            <button key={p} onClick={() => setPlattform(p)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${plattform === p ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}>
              {label} <span className="opacity-60">{zaehl(p)}</span>
            </button>
          ) : null
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        {/* Schwierigkeit = wie realistisch die Partnerschaft ist. LEICHT =
            Animations-/Faceless-Seite ohne eigene Monetarisierung — das
            Wunschprofil, zuerst anschreiben. SCHWER = echte Person mit Links
            und Reichweite — nur mit Plan. */}
        {[["alle", "Alle"], ["leicht", "🟢 Leicht"], ["mittel", "🟡 Mittel"], ["schwer", "🔴 Schwer"]].map(([s, label]) => (
          <button key={s} onClick={() => setSchwierig(s)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${schwierig === s ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button onClick={() => setSortier(sortier === "score" ? "reichweite" : "score")}
          className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
          Sortiert: {sortier === "score" ? "Score" : "Reichweite"} ⇅
        </button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {["alle", ...STATI].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${filter === s ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"}`}>
            {s === "alle" ? "Alle" : STATUS_LABEL[s]} <span className="opacity-60">{(leads ?? []).filter((l) => (s === "alle" || l.status === s) && (plattform === "alle" || l.platform === plattform)).length}</span>
          </button>
        ))}
        <input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Suchen…"
          className="ml-auto w-36 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] outline-none placeholder:text-muted-foreground focus:border-primary/40" />
      </div>

      {leads === null ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
          Noch keine Accounts{filter !== "alle" ? ` mit Status „${STATUS_LABEL[filter]}"` : ""} — trag den ersten ein oder lass das Scout-Tool laufen.
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((l) => (
            <div key={l.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {l.platform && (
                      <span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/60">
                        {l.platform === "instagram" ? "IG" : l.platform === "tiktok" ? "TT" : l.platform === "youtube" ? "YT" : "TG"}
                      </span>
                    )}
                    <span className="font-display text-sm font-bold">{l.name || l.handle}</span>
                    {l.url && (
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline">
                        @{l.handle} <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                    {l.format === "animation" && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">🎬 Animation</span>}
                    {l.format === "faceless" && <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-300">Faceless</span>}
                    {l.schwierigkeit && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${l.schwierigkeit === "leicht" ? "border-emerald-400/30 text-emerald-300" : l.schwierigkeit === "schwer" ? "border-red-400/30 text-red-300" : "border-amber-400/25 text-amber-300"}`}>{l.schwierigkeit}</span>}
                    {l.score != null && <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] font-bold">{l.score}</span>}
                    {l.sprache && <span className="text-[10px] uppercase text-muted-foreground">{l.sprache}</span>}
                    {isAdmin && !l.released && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">Gesperrt</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {l.yt_subs != null && <span>YT {fmt(l.yt_subs)}</span>}
                    {l.tg_subs != null && <span>TG {fmt(l.tg_subs)}</span>}
                    {l.tt_followers != null && <span>TT {fmt(l.tt_followers)}</span>}
                    {l.ig_followers != null && <span>IG {fmt(l.ig_followers)}</span>}
                    {l.yt_subs == null && l.tg_subs == null && l.tt_followers == null && l.ig_followers == null && <span>Reichweite unbekannt</span>}
                  </div>
                  {l.fit && <p className="mt-1.5 max-w-xl text-xs text-white/60">{l.fit}</p>}
                  {l.notes && <p className="mt-1 max-w-xl text-xs text-white/45">📝 {l.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isAdmin && (
                    <button onClick={() => setReleased(l.id, !l.released)}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${l.released ? "border-white/10 text-muted-foreground hover:text-foreground" : "border-amber-400/40 bg-amber-400/10 text-amber-300"}`}>
                      {l.released ? "Sperren" : "Freischalten"}
                    </button>
                  )}
                  {l.opener && (
                    <button onClick={() => copyOpener(l)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-white/[0.08]" title={l.opener}>
                      {copied === l.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />} Opener
                    </button>
                  )}
                  <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${STATUS_TONE[l.status] ?? ""} bg-transparent`}>
                    {STATI.map((s) => <option key={s} value={s} className="bg-[#0d141e] text-white">{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddLead({ staffEmail, onDone }: { staffEmail: string; onDone: () => void }) {
  const [v, setV] = useState({ platform: "tiktok", handle: "", name: "", url: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!v.handle.trim()) { setErr("Handle fehlt."); return; }
    setBusy(true); setErr(null);
    const { error } = await db().from("scout_leads").insert({
      source: "manuell", platform: v.platform, handle: v.handle.replace(/^@/, "").trim(),
      name: v.name.trim() || null, url: v.url.trim() || null, notes: v.notes.trim() || null,
      created_by: staffEmail,
    });
    setBusy(false);
    if (error) { setErr(error.message.includes("duplicate") ? "Diesen Handle gibt es schon in der Liste." : error.message); return; }
    onDone();
  };

  const input = "w-full rounded-lg border border-white/10 bg-[oklch(0.11_0.03_258)] px-3 py-2 text-sm outline-none focus:border-primary/50";
  return (
    <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <select value={v.platform} onChange={(e) => setV({ ...v, platform: e.target.value })} className={input}>
          {["tiktok", "youtube", "instagram", "telegram"].map((p) => <option key={p} value={p} className="bg-[#0d141e]">{p}</option>)}
        </select>
        <input placeholder="@handle *" value={v.handle} onChange={(e) => setV({ ...v, handle: e.target.value })} className={input} />
        <input placeholder="Name (optional)" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={input} />
        <input placeholder="Profil-URL (optional)" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} className={input} />
      </div>
      <input placeholder="Notiz — warum passt der Account?" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className={`${input} mt-2.5`} />
      {err && <div className="mt-2 text-xs text-red-300">{err}</div>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40">
          {busy ? "Speichert…" : "Speichern"}
        </button>
        <button onClick={onDone} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Abbrechen</button>
      </div>
    </div>
  );
}

/* ── Bewerbungen: einsehen, freigeben, ablehnen ──────────────────────────── */

function Applications() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Application | null>(null);
  /* Rueckmeldung nach der Freigabe — inklusive der Frage, ob die Einladung
     wirklich rausging. partner-approve legt Login und Marke an und versucht
     ERST DANACH die Mail; scheitert sie, bricht der Vorgang bewusst nicht ab
     (der Partner ist ja angelegt). Die Funktion meldet das als `mailed`
     zurueck — der Adminbereich zeigt es an, dieser Bereich hat es bisher
     verworfen. Der Mitarbeiter sah also "freigegeben" und konnte nicht
     wissen, dass der Partner nie eine Einladung bekommen hat. Genau dieser
     Fall ist am 30.08. aufgetreten. */
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await db().from("partner_applications")
      .select("id, name, email, phone, channel, reach, niche, note, status, created_at")
      .order("created_at", { ascending: false });
    if (error) { setError(error.message); return; }
    setApps((data ?? []) as Application[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (app: Application) => {
    setConfirming(null); setBusy(app.id); setError(null); setNotice(null);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    try {
      const res = await fetch(functionUrl("partner-approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ application_id: app.id }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? `HTTP ${res.status}`);
      setError(null);
      setNotice(
        out.mailed
          ? { ok: true, text: `${app.name || app.email} ist freigegeben — Marke „${out.slug}" angelegt, die Einladung ist unterwegs.` }
          : { ok: false, text: `${app.name || app.email} ist freigegeben und die Marke „${out.slug}" steht — aber die Einladungs-E-Mail ging NICHT raus. Er kann sich noch nicht anmelden. Nochmal freigeben (der Vorgang ist wiederholbar) oder ihm den Link von Hand schicken.` },
      );
    } catch (e) {
      setError(`Freigabe fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(null); load();
  };

  const reject = async (app: Application) => {
    setBusy(app.id);
    const { error } = await db().from("partner_applications").update({ status: "rejected" }).eq("id", app.id);
    if (error) setError(error.message);
    setBusy(null); load();
  };

  const tone: Record<string, string> = {
    new: "text-sky-300 bg-sky-400/10 border-sky-400/25",
    contacted: "text-amber-300 bg-amber-400/10 border-amber-400/25",
    approved: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
    rejected: "text-white/40 bg-white/5 border-white/10",
  };

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold">Partner-Bewerbungen</h2>
      </div>
      {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
      {notice && (
        <div
          className={
            notice.ok
              ? "mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-200"
              : "mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200"
          }
        >
          {notice.text}
        </div>
      )}

      {/* Bestaetigung nennt den NAMEN — ein Fehlklick hier legt Login, Marke
          und E-Mail-Versand an. Genau so ist ein echter Partner schon einmal
          versehentlich freigegeben worden. */}
      {confirming && (
        <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="text-sm font-semibold">„{confirming.name || confirming.email}" wirklich freigeben?</div>
          <p className="mt-1 text-xs text-white/60">Legt Login und Marke an und schickt die Einladung an {confirming.email}.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => approve(confirming)} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Ja, freigeben</button>
            <button onClick={() => setConfirming(null)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Abbrechen</button>
          </div>
        </div>
      )}

      {apps === null ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : apps.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">Keine Bewerbungen.</div>
      ) : (
        <div className="space-y-2.5">
          {apps.map((a) => (
            <div key={a.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold">{a.name || a.email}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${tone[a.status] ?? tone.new}`}>{a.status}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{a.email}</span>{a.phone && <span>{a.phone}</span>}{a.channel && <span>{a.channel}</span>}
                    {a.reach && <span>Reichweite: {a.reach}</span>}{a.niche && <span>{a.niche}</span>}
                  </div>
                  {a.note && <p className="mt-1.5 max-w-xl text-xs text-white/55">„{a.note}"</p>}
                </div>
                {a.status !== "approved" && a.status !== "rejected" && (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => setConfirming(a)} disabled={busy === a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40">
                      {busy === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Freigeben
                    </button>
                    <button onClick={() => reject(a)} disabled={busy === a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40">
                      <X className="h-3 w-3" /> Ablehnen
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Login ───────────────────────────────────────────────────────────────── */

function TeamLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setError("E-Mail oder Passwort falsch."); return; }
    onDone();
  }

  const input = "w-full rounded-lg border border-white/10 bg-[oklch(0.11_0.03_258)] px-3 py-2.5 text-sm outline-none focus:border-primary/50";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.11_0.03_255)] px-4 text-foreground [background-image:var(--gradient-page-wash)]">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-7 shadow-2xl">
        <div className="font-display text-xl font-bold">Team-Login</div>
        <p className="mt-1 text-sm text-muted-foreground">Nur für Cosmos-Candles-Mitarbeiter.</p>
        <div className="mt-5 space-y-3">
          <input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className={input} autoComplete="email" />
          <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} className={input} autoComplete="current-password" />
        </div>
        {error && <div className="mt-3 text-xs text-red-300">{error}</div>}
        <button type="submit" disabled={busy} className="mt-5 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40">
          {busy ? "Anmelden…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
