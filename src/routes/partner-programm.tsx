/**
 * /partner-programm — public affiliate-recruitment page.
 *
 * The link the founder sends to a PROSPECTIVE partner. It pitches the whole
 * model in a clear causal flow: not just a broker link but a complete white-label
 * system, how the payout staircase works, how the money is actually earned
 * (broker IB per lot — not by ripping customers off on spreads), how partners are
 * compensated, and how the whole tree works transparently. Professional, on-brand.
 *
 * Public. The partner LOGIN/dashboard lives at /partner; this is the pitch.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BadgeCheck, Bot, Check, Gauge, GraduationCap, LayoutDashboard,
  Radio, ShieldCheck, Sparkles, TrendingUp, Wallet,
} from "lucide-react";
import { COMMISSION_LADDER } from "@/lib/commission";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/partner-programm")({
  head: () => ({
    meta: [
      { title: "Partner Program — Cosmos Candles" },
      { name: "description", content: "Become a partner: a complete trading system for free + transparent commission per traded lot." },
    ],
  }),
  component: PartnerProgramm,
});

const CONTACT = "kontakt@momentumlabs.at";
const applyHref = `mailto:${CONTACT}?subject=${encodeURIComponent("Become a partner — Cosmos Candles")}`;

const WHAT_YOU_GET = [
  { icon: LayoutDashboard, title: "Ready-made, branded page", body: "Your own landing page at cosmos-candles.com/yourname — with your name, colors, your look. Nothing to build." },
  { icon: Radio, title: "Live Telegram signals", body: "Your community gets real trade calls (entry, stop, targets) delivered automatically to a private channel." },
  { icon: GraduationCap, title: "Complete trading academy", body: "Structured lessons from the basics to a real orderflow edge — not just a broker link." },
  { icon: Bot, title: "Auto-onboarding & bot", body: "Sign-up, deposit unlock, and Telegram access run fully automatically. Zero manual work." },
  { icon: LayoutDashboard, title: "Your own dashboard", body: "Clicks, customers, deposits, commission, and your current level — all in real time, visible only to you." },
  { icon: Sparkles, title: "No product of your own needed", body: "You promote a finished system that would otherwise cost you months and thousands of euros. Drop it in your bio link — done." },
];

const FAQ = [
  { q: "What does it cost me?", a: "Nothing. You get the complete system (website, academy, signals, bot, dashboard) for free. All you invest is your reach." },
  { q: "Do I need experience or a license?", a: "No. You bring people together — the academy, the signals, and the system handle the rest. You're not giving investment advice." },
  { q: "How do I get paid?", a: "Per lot your customers trade — transparently, following the ladder below. You see every amount live in your dashboard." },
  { q: "Why is this fair for customers?", a: "We earn from the broker commission per lot, not from inflated spreads. Cheaper than most — your customers stay active longer, and everyone benefits." },
];

function PartnerProgramm() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.03_260)] font-sans text-foreground [background-image:radial-gradient(1100px_600px_at_100%_-5%,oklch(0.9_0.2_150/0.06),transparent_60%)]">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">C</span>
          <span className="font-display text-lg font-bold">Cosmos Candles</span>
        </div>
        <a href={applyHref} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">Become a partner</a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-12 text-center sm:px-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Partner Program
        </div>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Monetize your community —<br /><span className="text-primary">without building a product yourself.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-foreground/70">
          You get a complete, ready-made trading system for free and earn per lot traded — transparent, fair, and cheaper than most out there.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href={applyHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5">
            Become a partner <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#verdienst" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-7 py-3.5 text-sm font-semibold hover:bg-white/10">
            How you earn
          </a>
        </div>
      </section>

      {/* Der Unterschied */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-7 sm:p-10">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">The difference</div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Not just a broker — a complete system.</h2>
          <p className="mt-4 max-w-3xl text-foreground/70">
            Most affiliate programs hand you a broker link and leave you on your own. With us, your audience gets a <span className="font-semibold text-foreground">full academy</span> — signals, lessons, bot, community — and <span className="font-semibold text-foreground">you</span> get a ready-made white-label system that runs for you. That makes your offer stronger, your customers stick around longer, and you earn recurring income.
          </p>
        </div>
      </section>

      {/* Was du bekommst */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">What you get as a partner</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHAT_YOU_GET.map((f) => (
            <div key={f.title} className="rounded-3xl border border-white/6 bg-white/[0.03] p-6">
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><f.icon className="h-5 w-5" /></span>
              <h3 className="font-display text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Wie du verdienst — Staffel */}
      <section id="verdienst" className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="mb-2 flex items-center justify-center gap-2 text-primary"><TrendingUp className="h-5 w-5" /></div>
        <h2 className="mb-2 text-center font-display text-2xl font-bold sm:text-3xl">How you earn</h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-foreground/70">
          You're paid <span className="font-semibold text-foreground">per lot your customers trade</span> — not per deposit. The more volume your community trades, the higher your rate climbs. Fully transparent, live in your dashboard.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          {COMMISSION_LADDER.map((l, i) => (
            <div key={l.level} className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Level {l.level}</div>
              <div className="mt-2 font-display text-3xl font-bold text-primary">{l.usdPerLot} $</div>
              <div className="text-[11px] text-muted-foreground">per lot</div>
              <div className="mt-3 border-t border-white/8 pt-3 text-[11px] text-foreground/60">
                {l.toVolume ? `${formatMoney(l.fromVolume, "€")} – ${formatMoney(l.toVolume, "€")}` : `from ${formatMoney(l.fromVolume, "€")}`}<br />customer volume
              </div>
              {i === COMMISSION_LADDER.length - 1 && (
                <span className="absolute right-2 top-2 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase text-primary">Top</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          Start low, climb with volume — that's how the system funds itself and you rise with your success. No downside cap, a clear path up.
        </p>
      </section>

      {/* Transparenz: wie das Geld entsteht */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/6 bg-white/[0.03] p-7">
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><Wallet className="h-5 w-5" /></span>
            <h3 className="font-display text-lg font-bold">Where the money comes from</h3>
            <p className="mt-2 text-sm text-foreground/70">
              We earn from the <span className="font-semibold text-foreground">broker commission per traded lot</span> (IB model) — <span className="font-semibold text-foreground">not</span> by squeezing customers with inflated spreads. Fair, low-cost conditions compared to many others: your customers stay active longer — and everyone in the tree benefits.
            </p>
          </div>
          <div className="rounded-3xl border border-white/6 bg-white/[0.03] p-7">
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><Gauge className="h-5 w-5" /></span>
            <h3 className="font-display text-lg font-bold">How we work</h3>
            <p className="mt-2 text-sm text-foreground/70">
              Everything runs centrally & cleanly through your tree: <span className="font-semibold text-foreground">Master → Partner → Customers</span>. Every click, every customer, every deposit, and your commission are traceable in your own dashboard. No hidden fees, no course fees for your customers.
            </p>
          </div>
        </div>
      </section>

      {/* Warum guter Deal */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-8">
        <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">Why this is a good deal for you</h2>
        <div className="mx-auto grid max-w-2xl gap-2.5">
          {[
            "No product to build — you promote a finished system.",
            "No costs, no risk: you get the system for free.",
            "Recurring commission per lot — not a one-off.",
            "You level up with your volume (5 → 10 $/lot).",
            "Your audience gets real value (academy + signals), not just a link.",
          ].map((p) => (
            <div key={p} className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm text-foreground/85">{p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">FAQ</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-white/6 bg-white/[0.03] px-5 py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold marker:content-['']">
                {f.q}
                <span className="ml-4 text-lg text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 flex items-start gap-2 text-sm text-foreground/70"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-8">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Ready to become a partner?</h2>
          <p className="mx-auto mt-3 max-w-md text-foreground/70">
            Drop us a quick message — we'll set up your branded page and you're ready to go within minutes.
          </p>
          <a href={applyHref} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5">
            Become a partner <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-[12px] text-muted-foreground">Or directly: <a href={`mailto:${CONTACT}`} className="underline hover:text-foreground">{CONTACT}</a></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/6 px-4 py-6 text-center text-[11px] text-muted-foreground">
        Cosmos Candles · Powered by <Link to="/" className="underline hover:text-foreground">Cosmos Candles Academy</Link> · Trading involves risk — 74–89% of retail CFD accounts lose money. Earnings depend on customer activity and are not guaranteed.
      </footer>
    </div>
  );
}
