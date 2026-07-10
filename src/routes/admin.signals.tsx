import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { SIGNAL_RELAY_LOG } from "@/lib/admin-data";
import { TENANTS } from "@/lib/tenants";
import { ArrowRight, Check, CheckCircle2, Copy, MessageCircle, Radio, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/signals")({
  head: () => ({ meta: [{ title: "Signal Relay — Admin" }] }),
  component: AdminSignals,
});

const SETUP_STEPS = [
  { title: "Bot erstellen", body: "Bei @BotFather /newbot ausführen → Bot-Token kopieren. Ein Bot bedient alle Brands." },
  { title: "Secrets setzen", body: "In Supabase → Edge Functions → Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET (random), MAIN_CHANNEL_ID." },
  { title: "Function deployen", body: "supabase functions deploy telegram-webhook --no-verify-jwt" },
  { title: "Webhook registrieren", body: "setWebhook mit der Function-URL + secret_token aufrufen (Befehl unten kopieren)." },
  { title: "Bot als Admin", body: "Bot in den Main-Channel UND in jeden Brand-Channel als Admin einladen (Recht: Nachrichten senden + Invite-Links)." },
  { title: "Channel-IDs eintragen", body: "telegram_channel_id pro Tenant in der Datenbank setzen — ab dann läuft der Fan-out automatisch." },
];

const WEBHOOK_CMD = `curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \\
  -d "url=https://<project>.supabase.co/functions/v1/telegram-webhook" \\
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"`;

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function AdminSignals() {
  const [copied, setCopied] = useState(false);
  const totalDeliveries = SIGNAL_RELAY_LOG.reduce((s, r) => s + Object.keys(r.delivered).length, 0);
  const failed = SIGNAL_RELAY_LOG.reduce((s, r) => s + Object.values(r.delivered).filter((d) => !d.ok).length, 0);
  const rate = Math.round(((totalDeliveries - failed) / totalDeliveries) * 100);

  function copyCmd() {
    navigator.clipboard?.writeText(WEBHOOK_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Signal Relay"
        sub="Ein Main-Channel, ein Bot — jede Brand bekommt jedes Signal automatisch in ihren eigenen Channel, mit eigenem Broker-Link."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Main channel" value="Demo" sub="wire up via setup below" />
        <AdminKpiCard label="Brand channels" value={TENANTS.length} tone="primary" />
        <AdminKpiCard label="Signals relayed" value={SIGNAL_RELAY_LOG.length} sub="last 3 days" />
        <AdminKpiCard label="Delivery rate" value={`${rate}%`} tone={rate === 100 ? "ok" : "warn"} sub={failed ? `${failed} failed` : "all delivered"} />
      </div>

      {/* Pipeline visual */}
      <div className="rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)] p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pipeline</div>
        <div className="mt-4 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          {/* Main channel */}
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 lg:w-56 lg:shrink-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Radio className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold">Main Signal Channel</div>
              <div className="text-[11px] text-muted-foreground">Du postest genau 1×</div>
            </div>
          </div>

          <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground lg:block" />
          <div className="text-center text-muted-foreground lg:hidden">↓</div>

          {/* Bot */}
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 lg:w-56 lg:shrink-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.7_0.18_270)]/20 text-[oklch(0.7_0.18_270)]">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold">Relay Bot</div>
              <div className="text-[11px] text-muted-foreground">copyMessage — kein „Forwarded"</div>
            </div>
          </div>

          <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground lg:block" />
          <div className="text-center text-muted-foreground lg:hidden">↓</div>

          {/* Tenant channels */}
          <div className="grid min-w-0 flex-1 gap-2">
            {TENANTS.map((t) => (
              <div key={t.slug} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                  style={{ backgroundColor: t.primaryColor, color: "oklch(0.15 0.03 250)" }}
                >
                  {t.logoInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{t.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">+ eigener Broker-Link im Footer</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <CheckCircle2 className="h-3 w-3" /> ready
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Relay log */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Relay log (Demo)</div>
          <div className="text-[11px] text-muted-foreground">wird live aus signal_relays gelesen</div>
        </div>
        <div className="divide-y divide-white/5">
          {SIGNAL_RELAY_LOG.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{r.preview}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {Object.entries(r.delivered).map(([slug, d]) => {
                  const t = TENANTS.find((x) => x.slug === slug);
                  return (
                    <span
                      key={slug}
                      title={d.ok ? `${t?.name ?? slug}: delivered` : `${t?.name ?? slug}: ${d.error}`}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-black",
                        d.ok ? "opacity-90" : "opacity-40 grayscale",
                      )}
                      style={{ backgroundColor: t?.primaryColor ?? "#888", color: "oklch(0.15 0.03 250)" }}
                    >
                      {d.ok ? (t?.logoInitials ?? "?") : <XCircle className="h-3.5 w-3.5" />}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup checklist */}
      <div className="rounded-2xl border border-white/5 bg-[oklch(0.14_0.05_250)] p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live schalten — 6 Schritte</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SETUP_STEPS.map((s, i) => (
            <div key={s.title} className="rounded-xl bg-white/[0.03] p-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{i + 1}</div>
              <div className="mt-2 text-sm font-semibold">{s.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-black/30 p-4">
          <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground/80">{WEBHOOK_CMD}</pre>
          <button
            onClick={copyCmd}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
