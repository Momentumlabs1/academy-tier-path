import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader, AdminKpiCard } from "@/components/academy/admin/AdminShell";
import { TENANTS } from "@/lib/tenants";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: "White-Label — Admin" }] }),
  component: AdminTenants,
});

function AdminTenants() {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function copyLink(slug: string) {
    const url = `${origin}/t/${slug}`;
    navigator.clipboard?.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1600);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="White-Label Brands"
        sub="Each brand is a fully styled landing page on its own URL. Share the link — deposits and members roll up to this admin."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Active brands" value={TENANTS.length} tone="primary" />
        <AdminKpiCard label="Live landing pages" value={TENANTS.length} sub="/t/:slug" />
        <AdminKpiCard label="Telegram channels" value={new Set(TENANTS.map((t) => t.telegramChannel)).size} />
        <AdminKpiCard label="Affiliate payouts" value="3" sub="recipients" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {TENANTS.map((t) => (
          <div
            key={t.slug}
            className="overflow-hidden rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)]"
          >
            {/* Brand banner — uses the tenant's own gradient + color */}
            <div
              className="flex items-center gap-3 p-5"
              style={{ background: `linear-gradient(135deg, ${t.bgFrom}, ${t.bgTo})` }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                style={{ backgroundColor: t.primaryColor, color: "oklch(0.15 0.03 250)" }}
              >
                {t.logoInitials}
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-bold">{t.name}</div>
                <div className="truncate text-xs" style={{ color: t.primaryColor }}>{t.tagline}</div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">{t.description}</p>

              {/* meta */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Meta label="URL slug" value={`/t/${t.slug}`} mono />
                <Meta label="Broker" value={t.brokerName} />
                <Meta label="Affiliate" value={t.affiliateEmail} mono />
                <Meta label="Brand color" value={t.primaryColor} swatch={t.primaryColor} mono />
              </div>

              {/* brand stats */}
              <div className="flex flex-wrap gap-2">
                {t.stats.map((s) => (
                  <span key={s.label} className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px]">
                    <span className="font-bold text-foreground">{s.value}</span>{" "}
                    <span className="text-muted-foreground">{s.label}</span>
                  </span>
                ))}
              </div>

              {/* actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={`/t/${t.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Preview landing page
                </a>
                <button
                  onClick={() => copyLink(t.slug)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15 transition-colors"
                >
                  {copied === t.slug ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === t.slug ? "Copied!" : "Copy link"}
                </button>
                <a
                  href={t.telegramChannel}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Channel
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/5 bg-[oklch(0.14_0.05_250)] p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">How white-label works</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { n: "1", t: "One codebase", b: "Every brand renders from the same app — only colors, copy and broker change per tenant." },
            { n: "2", t: "Own URL & branding", b: "Each affiliate gets /t/their-slug with their logo, gradient and Telegram channel." },
            { n: "3", t: "Centralised rollup", b: "Members, deposits and tiers from all brands flow into this single admin panel." },
          ].map((step) => (
            <div key={step.n} className="rounded-xl bg-white/[0.03] p-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{step.n}</div>
              <div className="mt-2 text-sm font-semibold">{step.t}</div>
              <div className="mt-1 text-xs text-muted-foreground">{step.b}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, mono, swatch }: { label: string; value: string; mono?: boolean; swatch?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5">
        {swatch && <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: swatch }} />}
        <span className={cn("truncate text-foreground/90", mono && "font-mono text-[11px]")}>{value}</span>
      </div>
    </div>
  );
}
