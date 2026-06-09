import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Lock, Shield } from "lucide-react";
import { getTenant } from "@/lib/tenants";
import { TIERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/t/$slug")({
  loader: ({ params }) => {
    const tenant = getTenant(params.slug);
    if (!tenant) throw notFound();
    return { tenant };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.tenant.name} — Powered by Agent Trading` : "Trading Academy" },
      { name: "description", content: loaderData?.tenant.description ?? "" },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.15_0.06_260)] px-4 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">Affiliate not found</h1>
        <p className="mt-2 text-muted-foreground">This link may be invalid or expired.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-primary hover:underline">Back to Academy</Link>
      </div>
    </div>
  ),
  component: TenantLanding,
});

function TenantLanding() {
  const { tenant } = Route.useLoaderData();

  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: `linear-gradient(160deg, ${tenant.bgFrom} 0%, ${tenant.bgTo} 100%)` }}
    >
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white"
            style={{ background: tenant.primaryColor }}
          >
            {tenant.logoInitials}
          </span>
          <span className="font-display text-lg font-bold">{tenant.name}</span>
        </div>
        <a
          href={`mailto:${tenant.affiliateEmail}`}
          className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
        >
          Contact
        </a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-8">
        <div
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
          style={{ background: `color-mix(in oklch, ${tenant.primaryColor} 15%, transparent)`, color: tenant.primaryColor }}
        >
          <Shield className="h-3.5 w-3.5" /> Powered by Agent Trading Academy
        </div>

        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {tenant.tagline}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/70">
          {tenant.description}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={tenant.brokerUrl}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ background: tenant.primaryColor }}
          >
            Start with {tenant.brokerName} <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={tenant.telegramChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Join Telegram
          </a>
        </div>

        {/* Stats row */}
        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {tenant.stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/5 px-4 py-4 text-center">
              <div className="font-display text-2xl font-bold" style={{ color: tenant.primaryColor }}>{s.value}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground uppercase tracking-[0.12em]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">What you get</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {tenant.features.map((f) => (
            <div key={f.title} className="rounded-3xl border border-white/5 bg-white/[0.04] p-6">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <h2 className="mb-2 text-center font-display text-2xl font-bold sm:text-3xl">Membership tiers</h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">Deposit more, unlock more.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map((t, idx) => (
            <div
              key={t.key}
              className="relative flex flex-col rounded-3xl border border-white/5 bg-white/[0.04] p-6"
              style={idx === 1 ? { borderColor: `color-mix(in oklch, ${tenant.primaryColor} 40%, transparent)` } : {}}
            >
              {idx === 1 && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase text-white"
                  style={{ background: tenant.primaryColor }}
                >
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="font-display text-lg font-bold">{t.name}</span>
              </div>
              <div className="mt-3 font-display text-3xl font-bold">{formatMoney(t.minDeposit, "€")}<span className="text-base font-normal text-muted-foreground">+</span></div>
              <div className="mb-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">verified deposit</div>
              <ul className="flex flex-1 flex-col gap-2">
                {t.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.color }} />
                    {perk}
                  </li>
                ))}
              </ul>
              <a
                href={tenant.brokerUrl}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                style={idx === 1
                  ? { background: tenant.primaryColor, color: "white" }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)" }}
              >
                Get started <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { step: "01", title: "Open & fund your broker", body: `Deposit at least €100 at ${tenant.brokerName} using the link above.` },
            { step: "02", title: "Join Telegram", body: "Send your deposit screenshot to our bot. Access is granted within minutes." },
            { step: "03", title: "Trade with confidence", body: "Follow signals, complete lessons, and grow your account tier-by-tier." },
          ].map((s) => (
            <div key={s.step} className="rounded-3xl border border-white/5 bg-white/[0.04] p-6">
              <div className="mb-3 font-display text-4xl font-black opacity-20">{s.step}</div>
              <h3 className="font-display text-base font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <div
          className="rounded-3xl p-8 text-center sm:p-12"
          style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${tenant.primaryColor} 15%, transparent), color-mix(in oklch, ${tenant.accentColor} 10%, transparent))`, border: `1px solid color-mix(in oklch, ${tenant.primaryColor} 20%, transparent)` }}
        >
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Ready to start?</h2>
          <p className="mx-auto mt-3 max-w-md text-foreground/70">
            Join {tenant.name} today. Deposit at {tenant.brokerName}, verify via Telegram, and unlock your first signals within minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={tenant.brokerUrl}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: tenant.primaryColor }}
            >
              Fund your account <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Questions? <a href={`mailto:${tenant.affiliateEmail}`} className="underline hover:text-foreground">{tenant.affiliateEmail}</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-6 text-center text-[11px] text-muted-foreground">
        {tenant.name} · Powered by <Link to="/" className="hover:text-foreground underline">Agent Trading Academy</Link>
        {" "}· <Lock className="inline h-2.5 w-2.5" /> Demo data only
      </footer>
    </div>
  );
}
