import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { TENANTS } from "@/lib/tenants";
import { Check, Copy, ExternalLink, KeyRound, Loader2, Radio, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: "White-Label — Admin" }] }),
  component: AdminTenants,
});

const FN = "https://fymbblasfpfuyhpsesxk.supabase.co/functions/v1/admin-tenants";
const KEY_STORE = "academy_admin_key";

interface TenantRow {
  slug: string;
  name: string;
  active: boolean;
  telegram_channel_id: number | null;
  broker_affiliate_url: string | null;
  signal_footer: string | null;
}

// Static branding (colors/logo) merged with the live DB settings by slug.
const BRAND = Object.fromEntries(TENANTS.map((t) => [t.slug, t]));

function AdminTenants() {
  const [adminKey, setAdminKey] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem(KEY_STORE) ?? "" : "",
  );
  const [keyInput, setKeyInput] = useState("");
  const [rows, setRows] = useState<TenantRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const call = useCallback(async (payload: object) => {
    const res = await fetch(FN, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) throw new Error("unauthorized");
    if (!res.ok) throw new Error((await res.json())?.error ?? "request failed");
    return res.json();
  }, [adminKey]);

  const load = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true); setError(null);
    try {
      const data = await call({ action: "list" });
      setRows(data.tenants ?? []);
    } catch (e) {
      setError(e instanceof Error && e.message === "unauthorized" ? "Wrong admin key." : "Could not load. Is the function deployed?");
      if (e instanceof Error && e.message === "unauthorized") { localStorage.removeItem(KEY_STORE); setAdminKey(""); }
    } finally { setLoading(false); }
  }, [adminKey, call]);

  useEffect(() => { load(); }, [load]);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(KEY_STORE, keyInput.trim());
    setAdminKey(keyInput.trim());
  }

  function copyLink(slug: string) {
    navigator.clipboard?.writeText(`${origin}/t/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1600);
  }

  // ── Key gate ──────────────────────────────────────────────────────────────
  if (!adminKey) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="White-Label Brands" sub="Configure each brand's Telegram channel and broker link." />
        <form onSubmit={unlock} className="max-w-md rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4 text-primary" /> Admin key required</div>
          <p className="mt-1 text-xs text-muted-foreground">Enter the ADMIN_KEY you set in Supabase → Edge Functions → Secrets. Stored locally on this device.</p>
          <input
            value={keyInput} onChange={(e) => setKeyInput(e.target.value)} type="password" placeholder="admin key"
            className="mt-3 w-full rounded-xl bg-white/5 px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Unlock</button>
        </form>
      </div>
    );
  }

  const configured = (rows ?? []).filter((r) => r.telegram_channel_id != null).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="White-Label Brands"
        sub="Set each brand's Telegram channel & broker link here — the relay bot reads these live."
        action={
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />} Reload
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Brands" value={rows?.length ?? "—"} tone="primary" />
        <AdminKpiCard label="Channels connected" value={configured} tone={configured ? "ok" : "warn"} sub="telegram wired" />
        <AdminKpiCard label="Landing pages" value={rows?.length ?? "—"} sub="/t/:slug" />
        <AdminKpiCard label="Relay bot" value="Live" tone="ok" />
      </div>

      {error && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {(rows ?? []).map((row) => (
          <BrandCard
            key={row.slug}
            row={row}
            origin={origin}
            copied={copied === row.slug}
            onCopy={() => copyLink(row.slug)}
            onSave={async (patch) => { await call({ action: "update", slug: row.slug, patch }); await load(); }}
          />
        ))}
        {!rows && loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      </div>
    </div>
  );
}

function BrandCard({ row, origin, copied, onCopy, onSave }: {
  row: TenantRow; origin: string; copied: boolean;
  onCopy: () => void; onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const brand = BRAND[row.slug];
  const [chan, setChan] = useState(row.telegram_channel_id?.toString() ?? "");
  const [broker, setBroker] = useState(row.broker_affiliate_url ?? "");
  const [footer, setFooter] = useState(row.signal_footer ?? "");
  const [active, setActive] = useState(row.active);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    chan !== (row.telegram_channel_id?.toString() ?? "") ||
    broker !== (row.broker_affiliate_url ?? "") ||
    footer !== (row.signal_footer ?? "") ||
    active !== row.active;

  async function save() {
    setSaving(true);
    try {
      await onSave({ telegram_channel_id: chan, broker_affiliate_url: broker, signal_footer: footer, active });
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    } finally { setSaving(false); }
  }

  const primary = brand?.primaryColor ?? "#888";
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)]">
      <div className="flex items-center gap-3 p-4" style={{ background: brand ? `linear-gradient(135deg, ${brand.bgFrom}, ${brand.bgTo})` : undefined }}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black" style={{ backgroundColor: primary, color: "oklch(0.15 0.03 250)" }}>
          {brand?.logoInitials ?? row.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold">{row.name}</div>
          <div className="truncate font-mono text-[11px]" style={{ color: primary }}>/t/{row.slug}</div>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", row.telegram_channel_id ? "bg-primary/20 text-primary" : "bg-amber-400/15 text-amber-400")}>
          {row.telegram_channel_id ? "connected" : "not wired"}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <Field label="Telegram channel ID" value={chan} onChange={setChan} placeholder="-1001234567890" mono />
        <Field label="Broker affiliate link" value={broker} onChange={setBroker} placeholder="https://broker.com/ref?a=…" mono />
        <Field label="Signal footer (optional)" value={footer} onChange={setFooter} placeholder="📈 Trade with our partner broker…" />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[color:var(--primary)]" />
          Active (receives relayed signals)
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={save} disabled={!dirty || saving}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all",
              dirty ? "bg-primary text-primary-foreground shadow-[var(--shadow-lime)]" : "bg-white/10 text-muted-foreground",
              saving && "opacity-70")}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
          <a href={`/t/${row.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15">
            <ExternalLink className="h-3.5 w-3.5" /> Preview
          </a>
          <button onClick={onCopy} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15">
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">Get the channel ID by forwarding a channel post to @getidsbot. The bot must be admin in that channel.</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn("mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50", mono && "font-mono text-[13px]")}
      />
    </label>
  );
}
