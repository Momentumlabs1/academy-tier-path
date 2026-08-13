import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { TENANTS } from "@/lib/tenants";
import { Check, Copy, ExternalLink, Loader2, Radio, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: "White-Label — Admin" }] }),
  component: AdminTenants,
});

const FN = functionUrl("admin-tenants");

interface TenantRow {
  slug: string;
  name: string;
  active: boolean;
  telegram_channel_id: number | null;
  broker_affiliate_url: string | null;
  signal_footer: string | null;
  config: Record<string, unknown> | null;
}

// Static branding (colors/logo) merged with the live DB settings by slug.
const BRAND = Object.fromEntries(TENANTS.map((t) => [t.slug, t]));

function AdminTenants() {
  const [rows, setRows] = useState<TenantRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const call = useCallback(async (payload: object) => {
    // Send the admin's access token — the function now verifies it on every action.
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch(FN, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json())?.error ?? "request failed");
    return res.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await call({ action: "list" });
      setRows(data.tenants ?? []);
    } catch {
      setError("Could not load brands. Is the function deployed?");
    } finally { setLoading(false); }
  }, [call]);

  useEffect(() => { load(); }, [load]);

  function copyLink(slug: string) {
    navigator.clipboard?.writeText(`${origin}/t/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1600);
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
  const brand = BRAND[row.slug];          // hard-coded static brand (if any)
  const isStatic = Boolean(brand);        // static brands ignore DB `config` on the page
  const cfg = (row.config ?? {}) as Record<string, string>;
  const [chan, setChan] = useState(row.telegram_channel_id?.toString() ?? "");
  const [broker, setBroker] = useState(row.broker_affiliate_url ?? "");
  const [footer, setFooter] = useState(row.signal_footer ?? "");
  const [active, setActive] = useState(row.active);
  // Landing branding (persisted into tenants.config jsonb)
  const [name, setName] = useState(row.name);
  const [headline, setHeadline] = useState(cfg.headline ?? "");
  const [subhead, setSubhead] = useState(cfg.subhead ?? "");
  const [primaryColor, setPrimaryColor] = useState(cfg.primaryColor ?? "");
  const [accentColor, setAccentColor] = useState(cfg.accentColor ?? "");
  const [logoInitials, setLogoInitials] = useState(cfg.logoInitials ?? "");
  const [tgLink, setTgLink] = useState(cfg.telegramChannel ?? "");
  const [brokerName, setBrokerName] = useState(cfg.brokerName ?? "");
  const [brokerUrl, setBrokerUrl] = useState(cfg.brokerUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    chan !== (row.telegram_channel_id?.toString() ?? "") ||
    broker !== (row.broker_affiliate_url ?? "") ||
    footer !== (row.signal_footer ?? "") ||
    active !== row.active ||
    name !== row.name ||
    headline !== (cfg.headline ?? "") ||
    subhead !== (cfg.subhead ?? "") ||
    primaryColor !== (cfg.primaryColor ?? "") ||
    accentColor !== (cfg.accentColor ?? "") ||
    logoInitials !== (cfg.logoInitials ?? "") ||
    tgLink !== (cfg.telegramChannel ?? "") ||
    brokerName !== (cfg.brokerName ?? "") ||
    brokerUrl !== (cfg.brokerUrl ?? "");

  async function save() {
    setSaving(true);
    try {
      // Merge branding into the existing config jsonb; only keep non-empty keys.
      const nextCfg: Record<string, unknown> = { ...cfg };
      const set = (k: string, v: string) => { if (v.trim()) nextCfg[k] = v.trim(); else delete nextCfg[k]; };
      set("headline", headline); set("subhead", subhead);
      set("primaryColor", primaryColor); set("accentColor", accentColor);
      set("logoInitials", logoInitials); set("telegramChannel", tgLink);
      set("brokerName", brokerName); set("brokerUrl", brokerUrl);
      await onSave({
        telegram_channel_id: chan, broker_affiliate_url: broker, signal_footer: footer, active,
        name: name.trim() || row.name, config: nextCfg,
      });
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    } finally { setSaving(false); }
  }

  const primary = primaryColor || brand?.primaryColor || "#888";
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
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Relay & broker</div>
        <Field label="Telegram channel ID" value={chan} onChange={setChan} placeholder="-1001234567890" mono />
        <Field label="Broker affiliate link (bot/attribution)" value={broker} onChange={setBroker} placeholder="https://broker.com/ref?a=…" mono />
        <Field label="Signal footer (optional)" value={footer} onChange={setFooter} placeholder="📈 Trade with our partner broker…" />

        {/* ── Landing page — we build the partner's page here at integration ── */}
        <div className="mt-2 border-t border-white/8 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Landing page branding</div>
            {isStatic && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400">hard-coded brand</span>}
          </div>
          {isStatic && <p className="mb-2 text-[11px] text-amber-400/80">This brand's page is defined in code (tenants.ts), so these fields won't change its live page. They apply to partner-created brands.</p>}
          <div className="space-y-3">
            <Field label="Brand name" value={name} onChange={setName} placeholder="Max Trading Academy" />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Primary color" value={primaryColor} onChange={setPrimaryColor} placeholder="#b6f04a" mono />
              <Field label="Accent color" value={accentColor} onChange={setAccentColor} placeholder="#75B9F5" mono />
              <Field label="Logo initials" value={logoInitials} onChange={setLogoInitials} placeholder="MT" />
            </div>
            <Field label="Hero headline" value={headline} onChange={setHeadline} placeholder="Trade smarter with Max" />
            <Field label="Hero subhead" value={subhead} onChange={setSubhead} placeholder="Live signals, a full academy…" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Broker name (shown on page)" value={brokerName} onChange={setBrokerName} placeholder="VT Markets" />
              <Field label="Broker link (page CTA)" value={brokerUrl} onChange={setBrokerUrl} placeholder="https://…?partner_code=…" mono />
            </div>
            <Field label="Telegram link (page CTA)" value={tgLink} onChange={setTgLink} placeholder="https://t.me/yourchannel" mono />
          </div>
        </div>

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
