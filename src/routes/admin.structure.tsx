import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { useAdminStats } from "@/hooks/useAdminStats";
import { formatMoney } from "@/lib/format";
import {
  Building2, ChevronDown, ChevronRight, Crown, ExternalLink, Loader2, Radio,
  Send, Users, Wallet, Database, Mail, Bot, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/structure")({
  head: () => ({ meta: [{ title: "Struktur — Admin" }] }),
  component: AdminStructure,
});

// Connected external accounts / integrations the whole system depends on.
const INTEGRATIONS = [
  { name: "Broker (IB)", detail: "Provision + Einzahlungs-Postback", icon: Wallet, connected: false, note: "API ausstehend" },
  { name: "Telegram Bot", detail: "Signal-Relay + Zugang-Gate", icon: Bot, connected: true },
  { name: "Supabase", detail: "Zentrale Datenbank (Leads, Members, Tenants)", icon: Database, connected: true },
  { name: "Resend", detail: "E-Mail-Versand (Transaktion + Newsletter)", icon: Mail, connected: false, note: "Domain + Key ausstehend" },
] as const;

function AdminStructure() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { loading, error, partners, totals } = useAdminStats();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Gesamtstruktur"
        sub="Stammbaum: Master → Partner-Marken → Kunden. Alles läuft zentral über euren Baum."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Partner-Marken" value={totals.partners} icon={Building2} />
        <AdminKpiCard label="Kunden gesamt" value={totals.members} icon={Users} tone="ok" />
        <AdminKpiCard label="Einzahlungen" value={formatMoney(totals.deposits, "€")} icon={Wallet} tone="primary" />
        <AdminKpiCard label="Leads gesamt" value={totals.leads} icon={Send} />
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Daten konnten nicht geladen werden: {error}
        </div>
      )}

      {/* ── The tree ── */}
      <div className="rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5 lg:p-7">
        {/* Master node */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.7_0.2_290)] text-lg font-black text-primary-foreground shadow-[var(--shadow-lime)]">
            <Crown className="h-6 w-6" />
          </span>
          <div>
            <div className="font-display text-lg font-bold">MomentumLabs</div>
            <div className="text-[11px] text-muted-foreground">Master-Account · alle Accounts laufen unter diesem Baum</div>
          </div>
          <span className="ml-auto rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Super Admin</span>
        </div>

        {/* Partner branches */}
        <div className="mt-2 space-y-2 border-l border-white/10 pl-5 lg:ml-6">
          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Lade Struktur…</div>
          )}
          {!loading && partners.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground">
              Noch keine Partner-Marken angelegt. Lege im Bereich <span className="font-semibold text-foreground/80">White-Label</span> die erste Marke an.
            </div>
          )}
          {partners.map((p) => {
            const isOpen = open[p.slug];
            const brandColor = p.brand?.primaryColor ?? "oklch(0.7 0.02 250)";
            return (
              <div key={p.slug} className="relative">
                <span className="absolute -left-5 top-6 h-px w-5 bg-white/10" />
                <div className="rounded-xl border border-white/5 bg-white/[0.03]">
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [p.slug]: !o[p.slug] }))}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="text-muted-foreground">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black" style={{ background: brandColor, color: "oklch(0.15 0.03 250)" }}>
                      {p.brand?.logoInitials ?? p.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">cosmos-candles.com/{p.slug}</div>
                    </div>
                    <div className="hidden items-center gap-4 pr-2 text-right sm:flex">
                      <div><div className="text-sm font-bold tabular-nums">{p.members}</div><div className="text-[10px] text-muted-foreground">Kunden</div></div>
                      <div><div className="text-sm font-bold tabular-nums">{formatMoney(p.totalDeposits, "€")}</div><div className="text-[10px] text-muted-foreground">Einzahlung</div></div>
                      <div><div className="text-sm font-bold tabular-nums text-primary">{p.partnerRate} {p.partnerRateUnit === "percent" ? "%" : "$/Lot"}</div><div className="text-[10px] text-muted-foreground">Level</div></div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/5 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {p.brand?.telegramChannel && <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1"><Radio className="h-3 w-3" /> {p.brand.telegramChannel.replace("https://t.me/", "@")}</span>}
                        {p.brand?.brokerName && <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1"><Wallet className="h-3 w-3" /> {p.brand.brokerName}</span>}
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1"><Send className="h-3 w-3" /> {p.clicks} Klicks · {p.leads} Leads</span>
                        <Link to="/t/$slug" params={{ slug: p.slug }} target="_blank" className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary hover:bg-white/5">
                          Landing <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      {p.members === 0 && <div className="mt-2 text-xs text-muted-foreground">Noch keine Kunden unter dieser Marke.</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Connected accounts / integrations ── */}
      <div className="rounded-2xl border border-white/5 bg-[oklch(0.15_0.045_255)] p-5">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Angebundene Accounts & Integrationen</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {INTEGRATIONS.map((it) => (
            <div key={it.name} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-foreground/70">
                <it.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{it.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{it.detail}</div>
              </div>
              {it.connected ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[oklch(0.78_0.16_150)]/15 px-2 py-1 text-[11px] font-semibold text-[oklch(0.8_0.16_150)]"><CheckCircle2 className="h-3 w-3" /> verbunden</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-400" title={it.note}><XCircle className="h-3 w-3" /> {it.note ?? "offen"}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
