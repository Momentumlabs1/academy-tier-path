/**
 * TenantLandingView — the branded partner landing page, driven by a resolved
 * TenantConfig (static OR DB-backed). Rendered by both /t/:slug and /:slug so a
 * partner link works either way. No intro video required — the page carries all
 * the info (hero, live-signal demo, features, tiers, testimonials, how-it-works,
 * FAQ, CTA).
 */
import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Lock, Shield, TrendingUp, TrendingDown, Star } from "lucide-react";
import { TIERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { writePartnerBrand } from "@/lib/partner-brand";
import type { TenantConfig } from "@/lib/tenants";
import { BROKER } from "@/lib/broker";

const DEMO_SIGNALS = [
  { dir: "LONG", pair: "XAU/USD · Gold", entry: "2,318.40", sl: "2,311.00", tps: ["2,326", "2,334", "Open"], status: "TP2 hit", won: true },
  { dir: "SHORT", pair: "NAS100", entry: "20,050", sl: "20,110", tps: ["19,980", "19,910"], status: "Running", won: null as boolean | null },
  { dir: "LONG", pair: "BTC/USDT", entry: "64,200", sl: "63,400", tps: ["65,000", "65,800", "Open"], status: "TP1 hit", won: true },
];

export function TenantLandingView({ tenant }: { tenant: TenantConfig }) {
  const navigate = useNavigate();
  const goRegister = () => navigate({ to: "/registrieren" });

  // Cosmo is the face of the master brand. He anchors the hero on the central
  // Cosmos Candles landing; partner pages keep their own mascot/skin untouched.
  const showCosmo = tenant.slug === "cosmos-candles";
  const heroHasMascot = tenant.mascot === "zeko" || showCosmo;

  // Partner attribution + co-branding skin. Two cookies, both 30 days:
  //  · cosmo_ref   — slug only; the register step stamps it into user metadata so
  //                  the DB trigger writes members.referred_by_tenant (credit).
  //  · cosmo_brand — the slim visual skin (logo, accent, name, telegram) so the
  //                  central Cosmo academy co-brands downstream WITHOUT a DB fetch.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.cookie = `cosmo_ref=${encodeURIComponent(tenant.slug)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    writePartnerBrand(tenant);
  }, [tenant]);

  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: `linear-gradient(160deg, ${tenant.bgFrom} 0%, ${tenant.bgTo} 100%)` }}
    >
      {/* Cosmo gets a gentle breathing float; stilled for reduced-motion users. */}
      <style>{`
        @keyframes cosmoFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        .cosmo-float { animation: cosmoFloat 5.5s ease-in-out infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .cosmo-float { animation: none; } }
      `}</style>
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
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-8">
        <div className={cn("grid items-center gap-8 lg:gap-12", heroHasMascot && "lg:grid-cols-[1.1fr_0.9fr]")}>
          <div className={heroHasMascot ? "text-center lg:text-left" : "mx-auto max-w-3xl text-center"}>
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ background: `color-mix(in oklch, ${tenant.primaryColor} 15%, transparent)`, color: tenant.primaryColor }}
            >
              <Shield className="h-3.5 w-3.5" /> {showCosmo ? "Meet Cosmo · Your trading guide" : "Powered by Cosmos Candles Academy"}
            </div>

            <h1 className="text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {tenant.headline ?? tenant.tagline}
            </h1>
            <p className={cn("mt-4 text-lg text-foreground/70", heroHasMascot ? "" : "mx-auto max-w-2xl")}>
              {tenant.subhead ?? tenant.description}
            </p>

            <div className={cn("mt-8 flex flex-wrap items-center gap-3", heroHasMascot ? "justify-center lg:justify-start" : "justify-center")}>
              <button
                onClick={goRegister}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ background: tenant.primaryColor }}
              >
                Sign up free <ArrowRight className="h-4 w-4" />
              </button>
              {tenant.telegramChannel && tenant.telegramChannel !== "#" && (
                <a
                  href={tenant.telegramChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Join Telegram
                </a>
              )}
            </div>
          </div>

          {tenant.mascot === "zeko" && (
            <div className="relative mx-auto w-full max-w-[360px]">
              <div
                className="absolute inset-4 rounded-full blur-3xl"
                style={{ background: `color-mix(in oklch, ${tenant.primaryColor} 40%, transparent)` }}
              />
              <div className="relative aspect-square overflow-hidden rounded-full ring-4 ring-white/10 shadow-2xl">
                <img src="/zeko-hero.png" alt="Zeko" className="h-full w-full scale-[1.35] object-cover object-top" />
              </div>
            </div>
          )}

          {showCosmo && (
            <div className="relative mx-auto flex w-full max-w-[420px] items-end justify-center">
              {/* Soft accent glow behind the mascot */}
              <div
                className="absolute bottom-6 left-1/2 h-[62%] w-[78%] -translate-x-1/2 rounded-full blur-[70px]"
                style={{ background: `color-mix(in oklch, ${tenant.accentColor} 55%, transparent)` }}
                aria-hidden="true"
              />
              <div
                className="absolute bottom-10 left-1/2 h-[42%] w-[52%] -translate-x-1/2 rounded-full blur-3xl"
                style={{ background: `color-mix(in oklch, ${tenant.primaryColor} 40%, transparent)` }}
                aria-hidden="true"
              />
              <img
                src="/cosmo/cosmo-full.png"
                alt="Cosmo, the Cosmos Candles Academy mascot"
                className="cosmo-float relative z-10 h-auto w-full max-w-full object-contain drop-shadow-2xl"
              />
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {tenant.stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/5 px-4 py-4 text-center">
              <div className="font-display text-2xl font-bold" style={{ color: tenant.primaryColor }}>{s.value}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground uppercase tracking-[0.12em]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cosmo explainer video — the soft Cosmo integration on the partner page.
          Drop the rendered pitch clip into public/pitch.mp4. Framed in the
          partner accent so the co-branding reads at a glance. */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        <div
          className="overflow-hidden rounded-3xl border p-1.5 shadow-2xl"
          style={{ borderColor: `color-mix(in oklch, ${tenant.accentColor} 35%, transparent)`, background: `color-mix(in oklch, ${tenant.accentColor} 8%, transparent)` }}
        >
          <div className="relative aspect-video overflow-hidden rounded-[1.35rem] bg-black">
            <video controls playsInline className="h-full w-full object-cover">
              <source src="/pitch.mp4" type="video/mp4" />
            </video>
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background: `linear-gradient(160deg, ${tenant.bgFrom}, ${tenant.bgTo})` }}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `color-mix(in oklch, ${tenant.primaryColor} 20%, transparent)` }}>
                <ArrowRight className="h-6 w-6" style={{ color: tenant.primaryColor }} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{tenant.name} × Cosmo · 60 sec</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">In short: what you get — and why it costs you nothing.</p>
      </section>

      {/* "You don't pay us" — the model, upfront. Kills the "what's the catch?"
          objection before the visitor ever reaches the deposit. */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-8">
        <div
          className="rounded-3xl border p-7 sm:p-9"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: `linear-gradient(160deg, color-mix(in oklch, ${tenant.primaryColor} 8%, transparent), transparent)` }}
        >
          {showCosmo && (
            <div className="mb-5 flex justify-center">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: `color-mix(in oklch, ${tenant.accentColor} 45%, transparent)` }}
                  aria-hidden="true"
                />
                <img
                  src="/cosmo/cosmo-avatar.png"
                  alt="Cosmo"
                  className="cosmo-float relative h-20 w-20 rounded-full object-cover ring-2 ring-white/10 sm:h-24 sm:w-24"
                />
              </div>
            </div>
          )}
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: tenant.primaryColor }}>The honest part</p>
          <h2 className="text-balance text-center font-display text-2xl font-bold sm:text-3xl">You're not buying anything here.</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-foreground/70">
            No course fee, no subscription. You fund your <span className="font-semibold text-foreground/90">own</span> trading account at {tenant.brokerName} — the money stays yours. We have a deal with the broker and earn there, not from you. That's why you get signals & academy for free.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
            {BROKER.trust.map((t) => (
              <span key={t.label} className="inline-flex items-center gap-1.5 text-xs text-white/55">
                <span style={{ color: tenant.primaryColor }}>{t.icon}</span> {t.label}
              </span>
            ))}
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {[
              { icon: "🔓", title: "Unlock for free", body: "Sign up, deposit — and all signals, lessons & trader tools open up." },
              { icon: "💼", title: "Your money stays yours", body: "The deposit sits in your own broker account. You can withdraw anytime." },
              { icon: "🤝", title: "We earn from the broker", body: "The broker pays us — not you. A fair, transparent partnership." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center">
                <div className="mb-2 text-2xl">{c.icon}</div>
                <div className="font-display text-base font-bold">{c.title}</div>
                <p className="mt-1.5 text-xs text-foreground/65">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 text-center">
            <button
              onClick={goRegister}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: tenant.primaryColor }}
            >
              Sign up free <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Live signals demo */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: tenant.primaryColor }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: tenant.primaryColor }} />
          </span>
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">See the signals</h2>
        </div>
        <p className="mb-8 text-center text-sm text-muted-foreground">Real calls, exactly as members get them — entry, stop-loss, targets. No screenshots, no hindsight.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {DEMO_SIGNALS.map((s) => {
            const long = s.dir === "LONG";
            return (
              <div key={s.pair} className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]">
                <div className="flex items-center justify-between px-4 py-3" style={{ background: long ? "rgba(52,209,122,.10)" : "rgba(255,85,102,.10)" }}>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-bold", long ? "text-[oklch(0.8_0.16_150)]" : "text-[oklch(0.72_0.18_20)]")}>
                    {long ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} {s.dir}
                  </span>
                  <span className="font-mono text-xs text-foreground/80">{s.pair}</span>
                </div>
                <div className="space-y-1.5 px-4 py-4 font-mono text-[13px]">
                  <Row k="Entry" v={s.entry} />
                  <Row k="Stop" v={s.sl} tone="red" />
                  {s.tps.map((tp, i) => <Row key={i} k={`TP${i + 1}`} v={tp} tone="green" />)}
                </div>
                <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn("font-semibold", s.won ? "text-[oklch(0.8_0.16_150)]" : "text-foreground/70")}>
                    {s.won && "✓ "}{s.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">For illustration only. Trading involves risk — never risk more than you can afford to lose.</p>
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
        <h2 className="mb-2 text-center font-display text-2xl font-bold sm:text-3xl">Member tiers</h2>
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
              <button
                onClick={goRegister}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                style={idx === 1
                  ? { background: tenant.primaryColor, color: "white" }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)" }}
              >
                Get started <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {tenant.testimonials && tenant.testimonials.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
          <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">Real members, real results</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {tenant.testimonials.map((t) => (
              <div key={t.handle} className="flex flex-col rounded-3xl border border-white/5 bg-white/[0.04] p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: tenant.accentColor }} />
                  ))}
                </div>
                <p className="flex-1 text-sm text-foreground/80">"{t.text}"</p>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.handle}</div>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `color-mix(in oklch, ${tenant.primaryColor} 16%, transparent)`, color: tenant.primaryColor }}>
                    {t.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { step: "01", title: "Sign up & fund your account", body: `Create your free account and deposit €100 or more at ${tenant.brokerName}.` },
            { step: "02", title: "Connect Telegram", body: "Connect your Telegram — our bot verifies your deposit automatically and sends you your personal invite." },
            { step: "03", title: "Trade with confidence", body: "Follow the signals, work through the lessons, and level up tier by tier." },
          ].map((s) => (
            <div key={s.step} className="rounded-3xl border border-white/5 bg-white/[0.04] p-6">
              <div className="mb-3 font-display text-4xl font-black opacity-20">{s.step}</div>
              <h3 className="font-display text-base font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      {tenant.faq && tenant.faq.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-8">
          <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">FAQ</h2>
          <div className="space-y-3">
            {tenant.faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-white/5 bg-white/[0.04] px-5 py-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold marker:content-['']">
                  {f.q}
                  <span className="ml-4 text-lg text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-foreground/70">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <div
          className="rounded-3xl p-8 text-center sm:p-12"
          style={{ background: `linear-gradient(135deg, color-mix(in oklch, ${tenant.primaryColor} 15%, transparent), color-mix(in oklch, ${tenant.accentColor} 10%, transparent))`, border: `1px solid color-mix(in oklch, ${tenant.primaryColor} 20%, transparent)` }}
        >
          {tenant.mascot === "zeko" && (
            <img src="/zeko-point.png" alt="" className="mx-auto mb-2 h-28 w-28 rounded-full object-cover object-top" />
          )}
          {showCosmo && (
            <div className="relative mx-auto mb-3 h-28 w-28">
              <div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: `color-mix(in oklch, ${tenant.accentColor} 50%, transparent)` }}
                aria-hidden="true"
              />
              <img src="/cosmo/cosmo-head.png" alt="Cosmo" className="cosmo-float relative h-28 w-28 object-contain" />
            </div>
          )}
          <h2 className="text-balance font-display text-2xl font-bold sm:text-3xl">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-md text-foreground/70">
            Join {tenant.name} today. Deposit at {tenant.brokerName}, verify via Telegram, and unlock your first signals in minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={goRegister}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: tenant.primaryColor }}
            >
              Sign up free <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Questions? <a href={`mailto:${tenant.affiliateEmail}`} className="underline hover:text-foreground">{tenant.affiliateEmail}</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-6 text-center text-[11px] text-muted-foreground">
        {tenant.name} · Powered by <Link to="/" className="hover:text-foreground underline">Cosmos Candles Academy</Link>
        {" "}· <Lock className="inline h-2.5 w-2.5" /> Trading involves risk — 74–89% of retail CFD accounts lose money.
      </footer>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "red" | "green" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn(
        "tabular-nums",
        tone === "red" && "text-[oklch(0.72_0.18_20)]",
        tone === "green" && "text-[oklch(0.8_0.16_150)]",
      )}>{v}</span>
    </div>
  );
}
