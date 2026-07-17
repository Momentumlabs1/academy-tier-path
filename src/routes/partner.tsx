/**
 * /partner — the affiliate portal (path-based, e.g. cosmos-candles.com/partner).
 *
 * A partner signs in with the credentials the master issues them (normal
 * Supabase auth — NOT the admin allowlist). Everything below is Row-Level
 * Security scoped: the affiliate_dashboard view + the members/leads/clicks
 * queries only ever return rows tied to a tenant this user owns
 * (tenants.owner_user_id = auth.uid()). No partner can see another's numbers.
 *
 * Empty/zero until real data lands — never a fake number.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Check, Copy, ExternalLink, Eye, Loader2, LogOut, MousePointerClick, TrendingUp, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { COMMISSION_LADDER, levelForVolume, volumeToNextLevel } from "@/lib/commission";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/partner")({
  head: () => ({ meta: [{ title: "Partner-Portal — Cosmos Candles" }] }),
  component: PartnerPortal,
});

interface PartnerRow {
  tenant_id: string;
  slug: string;
  name: string;
  partner_rate: number;
  partner_rate_unit: string;
  partner_volume: number;
  clicks: number;
  leads: number;
  members: number;
  total_deposits: number;
}

// The academy tables/views aren't in the generated Database types, so read them
// through an untyped view of the client. RLS still scopes every row.
const untyped = () =>
  supabase as unknown as {
    from: (t: string) => { select: (c: string) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> };
  };

function PartnerPortal() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<PartnerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const mail = session.session?.user?.email ?? null;
    setEmail(mail);
    setChecking(false);
    if (!mail) return;
    const { data, error } = await untyped().from("affiliate_dashboard").select("*");
    if (error) { setError(error.message); return; }
    setRows(
      (data ?? []).map((r) => ({
        tenant_id: String(r.tenant_id),
        slug: String(r.slug),
        name: String(r.name ?? r.slug),
        partner_rate: Number(r.partner_rate ?? 0),
        partner_rate_unit: String(r.partner_rate_unit ?? "usd_per_lot"),
        partner_volume: Number(r.partner_volume ?? 0),
        clicks: Number(r.clicks ?? 0),
        leads: Number(r.leads ?? 0),
        members: Number(r.members ?? 0),
        total_deposits: Number(r.total_deposits ?? 0),
      })),
    );
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.11_0.03_255)]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email) return <PartnerLogin onDone={load} />;

  return (
    <div className="min-h-screen bg-[oklch(0.11_0.03_255)] px-4 py-8 text-foreground [background-image:radial-gradient(900px_500px_at_100%_-10%,oklch(0.9_0.2_140/0.05),transparent_60%)]">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-bold">Partner-Portal</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Abmelden
          </button>
        </header>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

        {rows === null ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-8 text-center">
            <div className="font-display text-lg font-bold">Noch kein Partner-Account verknüpft</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
                ? "Du bist als Master eingeloggt — deine Gesamtübersicht liegt im Admin-Bereich unter /admin."
                : "Diesem Login ist noch keine Marke zugeordnet. Melde dich beim Master, damit dein Brand freigeschaltet wird."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">{rows.map((r) => <PartnerCard key={r.tenant_id} row={r} />)}</div>
        )}
      </div>
    </div>
  );
}

function PartnerCard({ row }: { row: PartnerRow }) {
  const isPercent = row.partner_rate_unit === "percent";
  const level = levelForVolume(row.partner_volume);
  const toNext = volumeToNextLevel(row.partner_volume);
  const rateLabel = isPercent ? `${row.partner_rate}%` : `${row.partner_rate} $/Lot`;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://cosmos-candles.com";
  const shareUrl = `${origin}/${row.slug}`;
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const stats = [
    { label: "Klicks", value: row.clicks.toLocaleString("de-AT"), icon: MousePointerClick },
    { label: "Leads", value: row.leads.toLocaleString("de-AT"), icon: BarChart3 },
    { label: "Kunden", value: row.members.toLocaleString("de-AT"), icon: Users },
    { label: "Einzahlungen", value: formatMoney(row.total_deposits, "€"), icon: Wallet },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="font-display text-xl font-bold">{row.name}</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">/{row.slug}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{rateLabel}</div>
          <div className="text-[11px] text-muted-foreground">deine Vergütung</div>
        </div>
      </div>

      {/* Dein teilbarer Link — genau den schickst du raus. */}
      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">Dein Link</div>
          <div className="truncate font-mono text-sm">{shareUrl}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
          <a
            href={shareUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold hover:bg-white/[0.08]"
          >
            Öffnen <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="mt-2 font-display text-lg font-bold">{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Commission staircase (USD/lot model) */}
      {!isPercent && (
        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Level {level.level} — {level.usdPerLot} $/Lot
          </div>
          <div className="flex gap-1.5">
            {COMMISSION_LADDER.map((l) => (
              <div
                key={l.level}
                className={`h-2 flex-1 rounded-full ${l.level <= level.level ? "bg-primary" : "bg-white/10"}`}
                title={`Level ${l.level}: ${l.usdPerLot} $/Lot ab ${formatMoney(l.fromVolume, "€")}`}
              />
            ))}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Kundenvolumen unter dir: {formatMoney(row.partner_volume, "€")}
            {toNext
              ? ` — noch ${formatMoney(toNext.remaining, "€")} bis Level ${toNext.next.level} (${toNext.next.usdPerLot} $/Lot)`
              : " — höchstes Level erreicht 🎉"}
          </div>
        </div>
      )}

      {/* Vorschau deiner Seite — genau das, was deine Kunden über den Link sehen (nur Ansicht). */}
      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 text-primary" /> Deine Seite
          </div>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold hover:bg-white/[0.08]"
          >
            {showPreview ? "Ausblenden" : "Vorschau anzeigen"}
          </button>
        </div>
        {showPreview && (
          <div className="mt-3">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
              {/* Browser-Mock-Leiste */}
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
                <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">{shareUrl}</span>
              </div>
              {/* Live-Vorschau (nur Ansicht) */}
              <div className="relative h-[420px] w-full overflow-hidden">
                <iframe
                  src={`/${row.slug}`}
                  title={`Vorschau ${row.name}`}
                  className="absolute left-0 top-0 origin-top-left"
                  style={{ width: "133.33%", height: "133.33%", transform: "scale(0.75)", border: "0" }}
                  loading="lazy"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Nur Ansicht — Bearbeiten deiner Seite kommt später. Über deinen Link registrieren sich Kunden automatisch unter dir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setError("E-Mail oder Passwort falsch."); return; }
    onDone();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.11_0.03_255)] px-4 text-foreground [background-image:radial-gradient(900px_500px_at_100%_-10%,oklch(0.9_0.2_140/0.05),transparent_60%)]">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-7 shadow-2xl">
        <div className="mb-6">
          <div className="font-display text-lg font-bold leading-tight">Partner-Portal</div>
          <div className="text-[11px] text-muted-foreground">Melde dich mit deinen Partner-Zugangsdaten an</div>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">E-Mail</span>
          <input
            type="email" required autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50"
            placeholder="partner@…"
          />
        </label>
        <label className="mb-5 block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Passwort</span>
          <input
            type="password" required autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50"
            placeholder="••••••••"
          />
        </label>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

        <button
          type="submit" disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Anmelden
        </button>
      </form>
    </div>
  );
}
