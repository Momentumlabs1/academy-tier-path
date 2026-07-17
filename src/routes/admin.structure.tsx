import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { TENANTS } from "@/lib/tenants";
import { formatMoney } from "@/lib/format";
import {
  Building2, ChevronDown, ChevronRight, Crown, ExternalLink, Radio,
  Send, Users, Wallet, Database, Mail, Bot, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/structure")({
  head: () => ({ meta: [{ title: "Struktur — Admin" }] }),
  component: AdminStructure,
});

// Demo rollup per brand until the affiliate_dashboard view is live (deterministic,
// so the tree looks real). Swap for a Supabase query on the affiliate_dashboard view.
function rollup(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const members = 6 + (h % 40);
  const deposits = members * (180 + (h % 900));
  const rate = [5, 6, 8, 10][h % 4];
  const lots = Math.round(members * (1.1 + (h % 5) * 0.4));
  return { members, deposits, rate, lots, commission: lots * rate };
}

// Connected external accounts / integrations the whole system depends on.
const INTEGRATIONS = [
  { name: "Broker (IB)", detail: "Provision + Einzahlungs-Postback", icon: Wallet, connected: false, note: "API ausstehend" },
  { name: "Telegram Bot", detail: "Signal-Relay + Zugang-Gate", icon: Bot, connected: true },
  { name: "Supabase", detail: "Zentrale Datenbank (Leads, Members, Tenants)", icon: Database, connected: true },
  { name: "Resend", detail: "E-Mail-Versand (Transaktion + Newsletter)", icon: Mail, connected: false, note: "Domain + Key ausstehend" },
] as const;

function AdminStructure() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const rows = TENANTS.map((t) => ({ t, r: rollup(t.slug) }));
  const totals = rows.reduce(
    (a, { r }) => ({ members: a.members + r.members, deposits: a.deposits + r.deposits, commission: a.commission + r.commission }),
    { members: 0, deposits: 0, commission: 0 },
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Gesamtstruktur"
        sub="Stammbaum: Master → Partner-Marken → Kunden. Alles läuft zentral über euren Baum."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Partner-Marken" value={TENANTS.length} icon={Building2} />
        <AdminKpiCard label="Kunden gesamt" value={totals.members} icon={Users} tone="ok" />
        <AdminKpiCard label="Einzahlungen" value={formatMoney(totals.deposits, "€")} icon={Wallet} tone="primary" />
        <AdminKpiCard label="Provision / Mo (Modell)" value={formatMoney(totals.commission, "$")} icon={Crown} />
      </div>

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
          {rows.map(({ t, r }) => {
            const isOpen = open[t.slug];
            return (
              <div key={t.slug} className="relative">
                <span className="absolute -left-5 top-6 h-px w-5 bg-white/10" />
                <div className="rounded-xl border border-white/5 bg-white/[0.03]">
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [t.slug]: !o[t.slug] }))}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="text-muted-foreground">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black" style={{ background: t.primaryColor, color: "oklch(0.15 0.03 250)" }}>
                      {t.logoInitials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{t.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{t.slug}.cosmos-candles.com</div>
                    </div>
                    <div className="hidden items-center gap-4 pr-2 text-right sm:flex">
                      <div><div className="text-sm font-bold tabular-nums">{r.members}</div><div className="text-[10px] text-muted-foreground">Kunden</div></div>
                      <div><div className="text-sm font-bold tabular-nums">{formatMoney(r.deposits, "€")}</div><div className="text-[10px] text-muted-foreground">Einzahlung</div></div>
                      <div><div className="text-sm font-bold tabular-nums text-primary">{r.rate} $/Lot</div><div className="text-[10px] text-muted-foreground">Level</div></div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/5 px-4 py-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1"><Radio className="h-3 w-3" /> {t.telegramChannel?.replace("https://t.me/", "@") ?? "kein Kanal"}</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1"><Wallet className="h-3 w-3" /> {t.brokerName}</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1"><Send className="h-3 w-3" /> {r.lots} Lots/Mo → {formatMoney(r.commission, "$")}</span>
                        <Link to="/t/$slug" params={{ slug: t.slug }} target="_blank" className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary hover:bg-white/5">
                          Landing <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      {/* Customer leaves (sample) */}
                      <div className="grid gap-1.5 border-l border-white/10 pl-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: Math.min(6, r.members) }).map((_, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2.5 py-1.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold">{String.fromCharCode(65 + i)}</span>
                            <span className="truncate text-xs text-foreground/70">Kunde #{i + 1}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{i % 3 === 0 ? "Elite" : i % 2 === 0 ? "Operator" : "Foundation"}</span>
                          </div>
                        ))}
                        {r.members > 6 && <div className="flex items-center px-2.5 py-1.5 text-xs text-muted-foreground">+{r.members - 6} weitere Kunden…</div>}
                      </div>
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
